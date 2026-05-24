# Engine Deterministico di Classificazione del Rischio

**Versione:** 1.0 | Maggio 2026  
**Componente:** `lambda-api/services/riskClassifier.ts`  
**Usato da:** `lambda-api/services/complianceEngine.ts`

---

## Il problema che risolve

Ogni compliance check chiama un modello AI (Amazon Nova Pro) che produce una risposta leggermente diversa ogni volta, anche per lo stesso sistema analizzato. Questo accade perché i modelli di linguaggio grandi non sono deterministici al 100%: anche a `temperature: 0`, il routing cross-region dell'inference profile introduce variabilità minima ma sufficiente a far cambiare quali articoli vengono citati nell'output.

Il problema concreto: se in un run il modello cita Art. 13 + Art. 14 e in un altro solo Art. 14, la somma dell'esposizione sanzionatoria cambia — perché le sanzioni vengono calcolate moltiplicando il fatturato per una percentuale che dipende dagli articoli violati. **Due assessment identici producevano stime di multa diverse**, dando l'impressione che il sistema fosse aleatorio.

L'engine deterministico risolve questo problema alla radice: **la classificazione del rischio e gli articoli normativi fondamentali vengono determinati da regole fisse**, non dal modello AI. Il modello si occupa solo di descrivere i gap e suggerire azioni correttive.

---

## Come funziona — visione d'insieme

```
Dati form (sistema AI + dati azienda)
              │
              ▼
   ┌─────────────────────────┐
   │  Pre-classificazione    │  ← regole deterministiche (nessun AI)
   │  riskClassifier.ts      │
   └────────────┬────────────┘
                │
                ▼
   Produce:  • livello di rischio (prohibited/high/limited/minimal)
             • lista articoli OBBLIGATORI
             • motivazione (per il prompt)
                │
                ├──────────────────────────────────────────────┐
                ▼                                              ▼
   Iniettato nel prompt LLM                    Usato in post-processing
   come vincolo non modificabile               per garantire presenza
                │                              degli articoli obbligatori
                ▼
        Risposta LLM (gap, descrizioni, score)
                │
                ▼
   ┌─────────────────────────┐
   │  Post-processing        │  ← override + merge garantiti
   │  complianceEngine.ts    │
   └────────────┬────────────┘
                │
                ▼
   Output finale con:
   • risk_classification sempre corretto
   • articoli obbligatori sempre presenti
   • esposizione sanzionatoria stabile
```

---

## Le tre fasi dell'engine

### Fase 1 — Pre-classificazione

Prima ancora di chiamare il LLM, il sistema analizza i dati strutturati del form e classifica il sistema AI secondo le regole dell'AI Act. Questa classificazione non usa nessun modello AI: è pura logica condizionale.

**Input analizzati:**
- `system.category` — categoria del sistema (hr, healthcare, llm, finance, ecc.)
- `system.decision_domains` — domini decisionali (testo libero, analizzato con regex)
- `system.data_types` — tipi di dati trattati
- `system.makes_automated_decisions` — se prende decisioni automatizzate
- `system.affects_vulnerable_groups` — se coinvolge soggetti vulnerabili
- `system.human_oversight_level` — livello di supervisione umana
- `company.ai_role` — se l'azienda è provider, deployer o entrambi

**Output prodotto:**
- `risk_level` — livello di rischio definitivo
- `mandatory_articles` — articoli che DEVONO apparire come gap
- `annex_ref` — riferimento all'Allegato III (se applicabile)
- `rationale` — spiegazione leggibile, iniettata nel prompt LLM

---

### Fase 2 — Iniezione nel prompt LLM

Il risultato della pre-classificazione viene iniettato nel prompt come blocco di **vincoli non modificabili**, prima dei dati aziendali:

```
VINCOLI NORMATIVI PRE-DETERMINATI (NON MODIFICABILI):
▸ Classificazione rischio: HIGH
  Motivo: Sistema HR/recruiting (Allegato III, punto 4) — decisioni su lavoratori
  → Allegato III, punto 4
▸ Il campo "risk_classification" nel JSON deve essere esattamente "high"
▸ Articoli OBBLIGATORI — devono apparire in compliance_gaps con status missing o partial:
  - Art. 6
  - Art. 9
  - Art. 13
  - Art. 14
  - Art. 26
```

Il modello AI viene istruito a non modificare questa classificazione e a includerla nel JSON di output. Può aggiungere articoli ulteriori che ritiene rilevanti, ma non può rimuovere quelli obbligatori.

---

### Fase 3 — Post-processing dell'output

Dopo che il LLM risponde, prima di calcolare le sanzioni, il sistema esegue due operazioni di garanzia:

**Operazione 1 — Override della classificazione**  
Il campo `risk_classification` viene sempre sovrascritto con il valore deterministico, indipendentemente da cosa ha scritto il LLM. Se il LLM ha scritto `"limited"` ma il pre-classificatore aveva determinato `"high"`, il valore finale è `"high"`.

**Operazione 2 — Merge degli articoli obbligatori**  
Il sistema controlla se tutti gli articoli obbligatori compaiono in `compliance_gaps`. Per ogni articolo mancante, lo aggiunge con:
- `status` inferito dai dati governance dell'azienda (vedi tabella sotto)
- `urgency: "critical"` (la deadline AI Act è 2026-08-02)
- `deadline: "2026-08-02"`
- Descrizione e azione correttiva pre-scritte (in italiano, specifiche per quell'articolo)

**Come viene inferito lo status dal dato governance:**

| Articolo | Campo governance usato | `false` → | `true` → |
|----------|----------------------|-----------|----------|
| Art. 9 (gestione rischi) | `has_impact_assessment` | `missing` | `partial` |
| Art. 14 (supervisione umana) | `has_human_oversight` | `missing` | `partial` |
| Art. 17 (QMS provider) | `has_ai_inventory` | `missing` | `partial` |
| Art. 18 (documentazione tecnica) | `has_ai_inventory` | `missing` | `partial` |
| Art. 20 (monitoraggio post-commercializzazione) | `has_incident_procedure` | `missing` | `partial` |
| Art. 26 (obblighi deployer) | `has_ai_policy` | `missing` | `partial` |
| Art. 50 (trasparenza utenti) | `has_training` | `missing` | `partial` |

La logica è conservativa: se un'azienda non ha mai fatto una valutazione d'impatto (`has_impact_assessment=false`), il gap Art. 9 è `missing`; se l'ha fatta ma non è ancora completa, è `partial`. In ogni caso il gap esiste e contribuisce all'esposizione sanzionatoria.

---

## Mappatura Allegato III → articoli obbligatori

Per ogni categoria di sistema ad alto rischio, gli articoli obbligatori variano a seconda del ruolo dell'azienda.

### Sistema ad alto rischio — Deployer

Articoli obbligatori: `Art. 6, Art. 9, Art. 13, Art. 14, Art. 26`

| Articolo | Cosa richiede |
|----------|---------------|
| Art. 6 | Classificazione formale come sistema ad alto rischio |
| Art. 9 | Sistema di gestione dei rischi documentato |
| Art. 13 | Trasparenza verso gli utenti del sistema |
| Art. 14 | Supervisione umana adeguata |
| Art. 26 | Misure organizzative specifiche del deployer |

### Sistema ad alto rischio — Provider

Articoli obbligatori: `Art. 6, Art. 9, Art. 13, Art. 14, Art. 17, Art. 18, Art. 20`

| Articolo | Cosa richiede |
|----------|---------------|
| Art. 6 | Classificazione formale come sistema ad alto rischio |
| Art. 9 | Sistema di gestione dei rischi |
| Art. 13 | Informazioni agli utenti |
| Art. 14 | Supervisione umana |
| Art. 17 | Sistema di gestione della qualità (QMS) |
| Art. 18 | Documentazione tecnica (Allegato IV) |
| Art. 20 | Monitoraggio post-commercializzazione |

### Sistema a rischio limitato (LLM / nessuna supervisione)

Articoli obbligatori: `Art. 50`

### Pratica potenzialmente vietata (Art. 5)

Articoli obbligatori: `Art. 5` — e il check viene contrassegnato come `prohibited`

---

## Categorie riconosciute dall'Allegato III

Il pre-classificatore abbina i dati del form alle categorie dell'Allegato III usando **corrispondenza per parole chiave** su `category`, `purpose` e `decision_domains`. Le corrispondenze sono:

| Categoria rilevata | Pattern | Allegato III |
|-------------------|---------|--------------|
| HR / Recruiting | `hr`, `recruit`, `selezione candidati`, `assunzione`, `licenziamento` | Punto 4 |
| Sanità | `healthcare`, `medic`, `diagnos`, `sanit`, `pazient` | Punto 5a |
| Credito / Assicurazioni | `credit`, `prestito`, `mutuo`, `assicura`, `scoring finan` | Punto 5b |
| Istruzione | `istruzion`, `scolast`, `universit`, `esame`, `ammission` | Punto 3 |
| Giustizia | `giustizia`, `sentenza`, `tribunale`, `procura` | Punto 8 |
| Migrazione / Frontiera | `migrazion`, `confine`, `border`, `asilo`, `visto` | Punto 7 |
| Elezioni / Democrazia | `elezioni`, `voto`, `democrazia`, `propaganda elettorale` | Punto 8b |
| Biometria + Law enforcement | dati biometrici + `polizia`, `forze dell'ordine` | Punto 1 |

Se nessuna categoria Allegato III viene rilevata ma il sistema fa decisioni automatizzate su soggetti vulnerabili, viene comunque classificato come ad alto rischio.

---

## Pratiche vietate (Art. 5) — quando scatta

Il classificatore verifica tre condizioni che possono far scattare la classificazione `prohibited`:

| Trigger | Condizione | Riferimento |
|---------|------------|-------------|
| Social scoring | `decision_domains` contiene "social scoring" o "punteggio sociale" | Art. 5, par. 1, lett. c |
| Biometria in spazi pubblici | dati biometrici + "spazio pubblico" + `human_oversight = never` | Art. 5, par. 1, lett. h |
| Inferenza emotiva sui lavoratori | dati con "emozione" + `target_users` include dipendenti | Art. 5, par. 1, lett. f |

Se una pratica vietata viene rilevata, il check si ferma: viene restituito solo `Art. 5` come gap obbligatorio, con `can_actify_automate: false` (Actify non può automatizzare la risoluzione di una pratica vietata).

---

## Perché le stime sanzionatorie sono ora stabili

Le sanzioni in `sanctions.ts` sono calcolate in modo completamente deterministico: stessa azienda + stessi articoli = stessa cifra. Prima dell'engine deterministico, il LLM poteva citare articoli diversi in run diversi, facendo variare il totale.

Ora la catena è:

```
Form data (invariante) 
    → pre-classificatore (deterministico, nessun AI) 
    → articoli obbligatori garantiti nell'output
    → computeSanctions() (deterministico, pura matematica)
    → esposizione sanzionatoria stabile
```

Le uniche variazioni residue possibili sono sugli articoli *aggiuntivi* che il LLM può decidere di citare oltre agli obbligatori — ma questi contribuiscono poco al totale (sono quasi sempre nel tier da 7.5M/1%, molto meno del tier da 15M/3% degli articoli obbligatori).

---

## Estendere il classificatore

Per aggiungere nuove categorie Allegato III (es. quando la Commissione pubblica atti delegati che ampliano l'Allegato III), è sufficiente aggiungere una entry nell'array `ANNEX_III_RULES` in `riskClassifier.ts`:

```typescript
{
  test:  s => match(s, /nuova.categoria|new.category/),
  annex: 'III, punto X',
  label: 'Descrizione della nuova categoria',
},
```

Per aggiungere un nuovo articolo obbligatorio, aggiungere il template in `MANDATORY_GAP_TEMPLATES` e referenziarlo nella funzione `buildHighRiskArticles`.
