# SDD — AI Literacy Tracker v2: Redesign per Conformità Art. 4 AI Act

**Progetto:** Actify — AI Act Compliance Platform  
**Modulo:** AI Literacy Tracker  
**Versione documento:** 1.0 — Giugno 2026  
**Stato:** Draft per implementazione  
**Sostituisce:** implementazione corrente (pivot dipartimento → certificazioni)

---

## 1. Obiettivo e motivazione del redesign

### 1.1 Problema dell'implementazione attuale

L'implementazione corrente pivota sul **dipartimento**: l'utente crea manualmente un'unità (es. "HR"), la collega a uno o più tool AI, e registra certificazioni generiche per quel dipartimento.

Questo approccio ha tre difetti strutturali rispetto all'Art. 4 AI Act:

1. **Non distingue il ruolo normativo della PMI** (Provider vs Deployer) rispetto al singolo sistema AI — i requisiti di literacy cambiano radicalmente tra i due ruoli.
2. **Non distingue i profili di utenza** all'interno di chi usa un sistema — chi lo usa operativamente e chi lo supervisiona hanno obblighi diversi.
3. **Accetta solo certificazioni esterne** come evidenza — ma la norma non lo richiede, e la maggior parte delle PMI non ha certificazioni esterne.

### 1.2 Obiettivo del redesign

Costruire un Literacy Tracker che:

- Pivota sul **sistema AI** (già censito in AI Inventory), non sul dipartimento
- Genera automaticamente **profili di utenza** in base al ruolo normativo (Provider/Deployer) letto dall'Inventory
- Accetta **due tipi di evidenza**: certificazione esterna e formazione interna documentata
- Gestisce il caso **PMI piccola** dove i ruoli si sovrappongono (merge profili)
- Produce un **Report Art. 4 scaricabile** utilizzabile come prova ispettiva

---

## 2. Contesto architetturale esistente (assunto)

| Componente | Tecnologia |
|---|---|
| Frontend | Next.js — `/dashboard/literacy/page.tsx` |
| API | API Gateway HTTP API v2 + JWT Cognito (`companyId`) |
| Compute | AWS Lambda (Node.js/TypeScript) — `lambda-api/routes/literacy.ts` |
| Persistenza | DynamoDB — tabella `ai_systems` (sistemi censiti) + tabella literacy esistente |
| Regione | eu-central-1 |

**Componenti esistenti riutilizzabili:**
- `literacySuggestService.ts` — suggerimento certificazioni (spostato a livello profilo+sistema)
- Form aggiunta certificazione (adattato con campo `evidence_type`)
- `logEvent` / Audit Trail (invariato)

---

## 3. Modello dati

### 3.1 Struttura DynamoDB (tabella literacy esistente)

I record ID cambiano da `DEPT#` a un sistema a tre livelli:

```
PROFILE#{systemId}#{profileType}        → record profilo
EVIDENCE#{profileId}#{evidenceId}       → record evidenza (cert o formazione)
SUGGEST#{systemId}#{profileType}        → suggerimenti certificazioni per profilo
```

### 3.2 Record PROFILE

```typescript
interface LiteracyProfile {
  company_id:       string;           // partition key
  record_id:        string;           // PROFILE#{systemId}#{profileType}
  profile_id:       string;           // uuid
  system_id:        string;           // riferimento AI Inventory
  system_name:      string;           // snapshot tool_name al momento della creazione
  system_role:      'provider' | 'deployer';
  profile_type:     ProfileType;      // vedi enum sotto
  headcount:        number;           // n° persone in questo profilo
  merged_with:      string | null;    // profileType con cui è stato mergiato (PMI piccole)
  created_at:       string;
  updated_at:       string;
}

type ProfileType =
  // Deployer
  | 'operational_users'    // chi usa il tool operativamente
  | 'supervisors'          // chi controlla/valida l'output
  // Provider
  | 'dev_team'             // developer e data scientist
  | 'qa_team'              // testing e monitoring
  | 'commercial_team';     // chi vende/supporta il tool
```

### 3.3 Record EVIDENCE

```typescript
interface LiteracyEvidence {
  company_id:       string;
  record_id:        string;           // EVIDENCE#{profileId}#{evidenceId}
  evidence_id:      string;           // uuid
  profile_id:       string;
  system_id:        string;
  evidence_type:    'certification' | 'internal_training';

  // Campi comuni
  title:            string;           // nome cert o titolo sessione
  date:             string;           // YYYY-MM-DD
  people_count:     number;           // n° persone coperte
  notes:            string | null;

  // Solo per certification
  issuer:           string | null;    // ente erogatore
  url:              string | null;    // link al badge/certificato

  // Solo per internal_training
  topics:           string[];         // lista argomenti trattati
  responsible:      string | null;    // nome responsabile che firma la sessione
  attachment_key:   string | null;    // S3 key del materiale allegato (PDF slide, etc.)

  created_at:       string;
}
```

### 3.4 Profili per sistema in base al ruolo

La generazione dei profili è **automatica e deterministica** — non richiede input dell'utente:

```typescript
function getProfilesForRole(role: 'provider' | 'deployer'): ProfileType[] {
  if (role === 'deployer') return ['operational_users', 'supervisors'];
  if (role === 'provider') return ['dev_team', 'qa_team', 'commercial_team'];
  return [];
}
```

I profili vengono creati automaticamente la prima volta che l'utente apre il Literacy Tracker per un sistema (lazy initialization, non al censimento del sistema).

---

## 4. Logica di copertura

### 4.1 Copertura per profilo

```
coverage_pct = (persone coperte da almeno un'evidenza / headcount profilo) * 100
```

"Persone coperte" = somma dei `people_count` delle evidenze, cappata a `headcount` (non può superare il 100%).

### 4.2 Stato semaforo per sistema

| Stato | Condizione |
|---|---|
| `not_started` | Nessun profilo ha headcount > 0 |
| `in_progress` | Almeno un profilo con evidenze, ma non tutti ≥ 80% |
| `compliant` | Tutti i profili non mergiati hanno copertura ≥ 80% |

### 4.3 Merge profili (PMI piccole)

Quando l'utente flagga "stessa persona copre entrambi i ruoli" su due profili:

- Il profilo secondario viene marcato `merged_with: primaryProfileType`
- Viene nascosto nella UI (non richiede evidenze separate)
- Il profilo primario eredita le persone di entrambi
- Il Report Art. 4 riporta esplicitamente il merge con nota: *"Profili unificati: in questa organizzazione il ruolo di supervisore è svolto dagli stessi utenti operativi."*

Il merge è reversibile.

---

## 5. API Routes

### 5.1 Endpoints

```
GET    /api/literacy                          → lista sistemi con stato literacy
GET    /api/literacy/{systemId}/profiles      → profili per sistema (con lazy init)
PATCH  /api/literacy/{systemId}/profiles/{profileId}   → aggiorna headcount o merge
POST   /api/literacy/{systemId}/profiles/{profileId}/evidence   → aggiungi evidenza
DELETE /api/literacy/{systemId}/profiles/{profileId}/evidence/{evidenceId}
GET    /api/literacy/{systemId}/report        → genera Report Art. 4 (PDF)
GET    /api/literacy/suggestions/{systemId}/{profileType}  → certificazioni suggerite
```

### 5.2 GET /api/literacy — lista sistemi

Risposta: lista di sistemi AI dall'Inventory arricchita con stato literacy calcolato.

```typescript
interface LiteracySystemSummary {
  system_id:        string;
  tool_name:        string;
  vendor:           string;
  system_role:      'provider' | 'deployer';
  category:         string;
  literacy_status:  'not_started' | 'in_progress' | 'compliant';
  profiles_total:   number;
  profiles_covered: number;  // profili con copertura ≥ 80%
  evidence_count:   number;
}
```

### 5.3 GET /api/literacy/{systemId}/profiles — lazy init

Al primo accesso per un sistema:
1. Legge `system_role` dall'AI Inventory
2. Chiama `getProfilesForRole(role)`
3. Crea i record PROFILE con `headcount: 0` se non esistono
4. Restituisce i profili con le relative evidenze

### 5.4 POST evidence — schema Zod

```typescript
const evidenceSchema = z.discriminatedUnion('evidence_type', [
  z.object({
    evidence_type: z.literal('certification'),
    title:         z.string().min(1).max(300),
    date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    people_count:  z.number().int().min(1),
    issuer:        z.string().max(200).optional(),
    url:           z.string().url().max(2000).optional(),
    notes:         z.string().max(500).optional(),
  }),
  z.object({
    evidence_type: z.literal('internal_training'),
    title:         z.string().min(1).max(300),
    date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    people_count:  z.number().int().min(1),
    topics:        z.array(z.string().min(1).max(200)).min(1).max(20),
    responsible:   z.string().max(200).optional(),
    notes:         z.string().max(500).optional(),
    // attachment_key viene popolato separatamente tramite presigned URL S3
  }),
]);
```

---

## 6. User Journey completo

### 6.1 Flusso principale

```
[Dashboard Literacy]
  Lista sistemi AI con badge stato
         │
         ▼
[Clicca su sistema — es. "ChatGPT — HR Screening"]
  Actify legge: role=deployer, category=hr
  Lazy init → crea profili: operational_users + supervisors
         │
         ▼
[Scheda sistema]
  Due card profilo: "Utenti operativi" | "Supervisori"
  Ogni card mostra: headcount (editabile) · copertura % · lista evidenze
  Toggle "Stessa persona per entrambi i ruoli" → merge
         │
         ▼
[Clicca "Aggiungi evidenza" su un profilo]
  Scelta tipo:
  ┌─ Certificazione esterna ─────────────────────┐
  │ Titolo · Ente · Data · URL · N° persone      │
  └──────────────────────────────────────────────┘
  ┌─ Formazione interna ─────────────────────────┐
  │ Titolo · Data · Argomenti (tag) ·            │
  │ Responsabile · N° partecipanti · Allegato    │
  └──────────────────────────────────────────────┘
         │
         ▼
[Torna alla scheda sistema]
  Barre copertura aggiornate · Semaforo aggiornato
         │
         ▼
[Genera Report Art. 4]
  PDF scaricabile — vedi §7
```

### 6.2 Flusso merge profili (PMI piccola)

```
[Scheda sistema — es. Copilot usato da tutti]
  Toggle "Stessa persona copre entrambi i ruoli"
         │
         ▼
  Modale conferma: "Il profilo Supervisori verrà unificato con
  Utenti operativi. Le evidenze varranno per entrambi."
         │
         ▼
  Profilo "Supervisori" → grigio con label "Unificato con Utenti operativi"
  Evidenze aggiunte al profilo primario coprono entrambi
```

---

## 7. Report Art. 4 — struttura PDF

Il PDF viene generato **deterministicamente** — nessun LLM coinvolto. È un template compilato con i dati raccolti.

### 7.1 Struttura documento

```
ACTIFY — REPORT CONFORMITÀ ART. 4 AI ACT
Generato il: {data}  |  Sistema: {tool_name}  |  Ruolo: {Provider / Deployer}

─── SEZIONE 1: SISTEMA AI ───────────────────────────────────────
Denominazione:    {tool_name}
Fornitore:        {vendor}
Categoria:        {category}
Ruolo normativo:  Deployer / Provider
Riferimento:      Art. 4, Reg. (UE) 2024/1689

─── SEZIONE 2: PROFILI E COPERTURA ─────────────────────────────
[Per ogni profilo:]
Profilo:          Utenti operativi / Supervisori / ...
Persone nel ruolo: {headcount}
Persone formate:  {covered}
Copertura:        {pct}%
Stato:            ✓ Conforme / ⚠ Parziale / ✗ Non avviato

[Se merge:]
Nota: profili unificati — [motivazione]

─── SEZIONE 3: EVIDENZE REGISTRATE ─────────────────────────────
[Per ogni evidenza:]
Tipo:             Certificazione esterna / Formazione interna
Titolo:           {title}
Data:             {date}
Persone coperte:  {people_count}
[Se cert:]  Ente: {issuer}  |  URL: {url}
[Se training:]  Argomenti: {topics}  |  Responsabile: {responsible}

─── SEZIONE 4: DICHIARAZIONE ────────────────────────────────────
Il presente documento è generato da Actify su dichiarazione del
Responsabile Compliance di {company_name} e attesta le misure
adottate ai sensi dell'Art. 4, Reg. (UE) 2024/1689.

Il documento non certifica la conformità all'AI Act.
Le informazioni riportate sono sotto la responsabilità esclusiva
dell'organizzazione dichiarante.

Generato da Actify · actify.io · {timestamp ISO}
```

### 7.2 Implementazione PDF

Usa la stessa pipeline Lambda già esistente per il Document Vault (`lambda-pdf`), con un template dedicato `LITERACY_REPORT`. Nessuna nuova infrastruttura richiesta.

---

## 8. Frontend — componenti da costruire

### 8.1 Pagina principale `/dashboard/literacy`

**Da sostituire completamente** rispetto all'attuale.

Layout: lista sistemi AI con card per sistema. Ogni card mostra:
- Nome tool + vendor
- Ruolo (badge Deployer/Provider)
- Semaforo stato literacy (rosso/giallo/verde)
- N° profili coperti su totale
- CTA "Gestisci literacy"

### 8.2 Pagina sistema `/dashboard/literacy/{systemId}`

**Nuova pagina.**

Sezione header: info sistema (da Inventory), semaforo globale, bottone "Genera Report Art. 4".

Sezione profili: una card per profilo con:
- Nome profilo + descrizione breve del perché è richiesto
- Campo headcount editabile inline
- Barra copertura
- Lista evidenze compatta
- Bottone "Aggiungi evidenza"
- Toggle merge (solo se esattamente 2 profili — caso Deployer)

### 8.3 Modal AddEvidence

**Adatta** il modal `AddCertModal` esistente.

Step 1: scelta tipo (Certificazione esterna / Formazione interna) — due card radio come nell'attuale AddDeptModal.

Step 2: form contestuale in base al tipo scelto.

Per **formazione interna**, il campo "Argomenti" è un input tag (premi invio per aggiungere un argomento) — max 20 tag.

Il campo "Allegato" usa un presigned URL S3: al submit, Actify crea prima il record, poi restituisce un presigned PUT URL, il frontend carica il file direttamente su S3. La `attachment_key` viene aggiornata con una PATCH successiva. Se il caricamento fallisce, il record evidenza rimane valido senza allegato.

### 8.4 Suggerimenti certificazioni

**Mantieni** il `literacySuggestService.ts` esistente ma cambia l'input: invece di `deptId`, passa `{ systemId, systemRole, profileType, category }`. Questo rende i suggerimenti molto più precisi (es. per `operational_users` su un sistema HR Deployer suggerisce corsi specifici su AI e recruitment, non corsi generici).

Mostra i suggerimenti come card collassabili in fondo alla scheda sistema, sotto le card profilo.

---

## 9. Migrazione dati

I record esistenti con `record_id` che inizia con `DEPT#` non vengono eliminati ma vengono **ignorati** dalla nuova UI. Non è necessaria una migrazione: i dati dei vecchi dipartimenti sono pochi e in fase di rollout si può semplicemente presentare all'utente la nuova struttura come "configura da zero".

Se si vuole preservare le certificazioni esistenti, si può implementare un migration script one-shot che:
1. Legge i record `CERT#` esistenti
2. Li riattribuisce al profilo `operational_users` del sistema più rilevante (matching su `system_ids` del dipartimento)
3. Li converte in evidenze di tipo `certification`

Questa migrazione è **opzionale** e può essere posticipata al post-lancio.

---

## 10. Checklist implementazione

### Backend
- [ ] Aggiornare `literacy.ts` — nuovi endpoint (vedi §5)
- [ ] Aggiornare schema DynamoDB keys (`PROFILE#`, `EVIDENCE#`)
- [ ] Implementare `getProfilesForRole()` e lazy init
- [ ] Implementare calcolo copertura per profilo e semaforo per sistema
- [ ] Implementare logica merge profili
- [ ] Aggiungere `evidence_type: 'internal_training'` con campi `topics`, `responsible`, `attachment_key`
- [ ] Presigned URL S3 per upload allegati formazione interna
- [ ] Aggiornare `literacySuggestService.ts` — input `{ systemId, systemRole, profileType, category }`
- [ ] Endpoint `GET /api/literacy/{systemId}/report` → invoca `lambda-pdf` con template `LITERACY_REPORT`
- [ ] Aggiungere template `LITERACY_REPORT` a `lambda-pdf`
- [ ] Registrare eventi Audit Trail per: aggiunta evidenza, merge profili, generazione report

### Frontend
- [ ] Riscrivere `/dashboard/literacy/page.tsx` — lista sistemi (vedi §8.1)
- [ ] Creare `/dashboard/literacy/[systemId]/page.tsx` — scheda sistema (vedi §8.2)
- [ ] Adattare modal `AddCertModal` → `AddEvidenceModal` con step tipo (vedi §8.3)
- [ ] Implementare toggle merge profili con modale conferma
- [ ] Implementare upload allegato con presigned URL
- [ ] Bottone "Genera Report Art. 4" con polling stato generazione
- [ ] Aggiornare `lib/types.ts` — nuovi tipi `LiteracyProfile`, `LiteracyEvidence`
- [ ] Aggiornare `lib/api.ts` — nuovi endpoint

### Test
- [ ] Verificare lazy init su sistema Provider vs Deployer
- [ ] Verificare calcolo copertura con people_count > headcount (deve cappare a 100%)
- [ ] Verificare merge: evidenze del profilo primario coprono entrambi
- [ ] Verificare generazione PDF con profili mergiati
- [ ] Verificare upload allegato: fallimento upload non invalida il record evidenza

---

## 11. Decisioni di design aperte

| Decisione | Opzione A (raccomandata) | Opzione B |
|---|---|---|
| Allegati formazione interna | S3 presigned URL, file max 10MB, PDF/DOCX/PNG | No allegati al lancio — aggiungere post-v1 |
| Soglia "conforme" | 80% copertura per profilo | 100% (più rigoroso ma meno raggiungibile) |
| Migrazione dati vecchi DEPT# | Script one-shot opzionale post-lancio | Ignora i vecchi record (raccomandato per il lancio) |
| Suggerimenti LLM | Mantieni `literacySuggestService` esistente con nuovo input | Rimuovi al lancio, reintroduci post-v1 |

---

*Documento generato con supporto Claude — Actify Engineering, Giugno 2026*
