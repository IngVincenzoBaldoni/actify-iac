# Rule Engine — Bug Report & Fix Spec

**Versione:** 1.0 | Giugno 2026  
**Autore:** Review Claude / Vince  
**Scope:** Analisi dei bug normativi e logici nei file `articleRuleEngine.ts` (lambda-api e lambda-pdf) rispetto al testo ufficiale del Regolamento UE 2024/1689 (AI Act).  
**File di riferimento:**
- `lambda-api/services/articleRuleEngine.ts` — engine principale (gap analysis utenti loggati)
- `lambda-pdf/services/articleRuleEngine.ts` — engine PDF (gap analysis utenti non loggati / free assessment)

---

## Riepilogo bug

| # | Priorità | File | Tipo | Articolo AI Act |
|---|----------|------|------|-----------------|
| 1 | 🔴 Critico | `lambda-pdf` | Falso positivo | Art. 11 |
| 2 | 🔴 Critico | `lambda-api` | Falso positivo | Art. 5(1)(d) |
| 3 | 🟠 Alto | `lambda-api` + `lambda-pdf` | Missing logic | Art. 25 |
| 4 | 🟠 Alto | `lambda-api` | Falso positivo | Art. 27 |
| 5 | 🟡 Medio | `lambda-api` + `lambda-pdf` | Wrong trigger | Art. 50 |
| 6 | 🟡 Medio | `lambda-api` + `lambda-pdf` | Over-inclusion | Art. 49 |
| 7 | 🟢 Basso | entrambi | Scope troppo stretto | Art. 51-55 (GPAI) |

---

## Bug #1 — Art. 11 assegnato a deployer puri (CRITICO)

**File:** `lambda-pdf/services/articleRuleEngine.ts`  
**Riga:** 73  

### Problema

```typescript
// ❌ ATTUALE — art_11 aggiunto a TUTTI i sistemi high-risk, provider E deployer
if (isHighRisk) {
  ['art_9','art_10','art_11','art_12','art_13_p1','art_13_p2','art_14','art_15']
    .forEach(k => keys.add(k));
  // ...
}
```

L'Art. 11 (documentazione tecnica) è un obbligo esclusivo del **provider** (Capo 2, Titolo III). I deployer ricevono la documentazione tecnica dal provider — non la redigono. Questa logica errata genera un gap su Art. 11 per qualsiasi deployer di sistema alto rischio censito tramite il free assessment PDF.

**Testo di riferimento:** Art. 11(1) — *"Providers of high-risk AI systems shall draw up technical documentation..."*

La versione `lambda-api` è **già corretta** — usa il guard `if (isProvider)` prima di aggiungere Art. 9-15. La versione `lambda-pdf` è desync.

### Fix

```typescript
// ✅ FIX — separare gli obblighi per ruolo, come già fatto in lambda-api
if (isHighRisk) {
  // Art. 12 e 14 si applicano anche ai deployer (via Art. 26(5) e 26(2))
  ['art_12', 'art_14'].forEach(k => keys.add(k));

  if (isProvider) {
    ['art_9','art_10','art_11','art_13_p1','art_13_p2','art_15']
      .forEach(k => keys.add(k));
  }

  if (isProvider) {
    ['art_16','art_17_p1','art_17_p2','art_18','art_19','art_20','art_21','art_22','art_23']
      .forEach(k => keys.add(k));
  }

  if (isDeployer) {
    ['art_26_p1','art_26_p2','art_27','art_28','art_29']
      .forEach(k => keys.add(k));
  }
}
```

---

## Bug #2 — Art. 5(1)(d): identificazione biometrica non è proibita per privati (CRITICO)

**File:** `lambda-api/services/articleRuleEngine.ts`  
**Righe:** 80–85  

### Problema

```typescript
// ❌ ATTUALE — marca come PROIBITO qualsiasi biometric_identification su general_public
if (annexDomains.includes('biometric_identification') &&
  system.target_users?.includes('general_public')) {
  isProhibited = true;
  reasoning.push('Art. 5(1)(d) — Identificazione biometrica remota real-time in spazi pubblici');
}
```

L'Art. 5(1)(d) vieta l'uso di sistemi di identificazione biometrica remota real-time in spazi pubblici **esclusivamente per finalità di contrasto (law enforcement)**. Un'azienda privata che usa la biometria su utenti generici (es. accesso a uno stadio, check-in aeroporto) rientra in **Annex III Cat. 1** (alto rischio), non in Art. 5 (proibito).

Questo genera un falso positivo grave: un deployer privato con biometric_identification viene erroneamente classificato come sistema proibito anziché alto rischio.

**Testo di riferimento:** Art. 5(1)(d) — *"...for the purpose of law enforcement in publicly accessible spaces..."*

### Fix

```typescript
// ✅ FIX — la proibizione si applica SOLO se uso per law enforcement
const isLawEnforcement = annexDomains.includes('law_enforcement_risk') ||
                         annexDomains.includes('criminal_investigation');

if (annexDomains.includes('biometric_identification') &&
    system.target_users?.includes('general_public') &&
    isLawEnforcement) {
  isProhibited = true;
  reasoning.push('Art. 5(1)(d) — Identificazione biometrica remota real-time in spazi pubblici per finalità di contrasto');
}

// Se biometric_identification senza law enforcement → è alto rischio (Annex III Cat. 1), non proibito
// isHighRisk sarà già true per via della presenza in annexDomains
```

---

## Bug #3 — Art. 25 assente: transizione deployer → provider (ALTO)

**File:** `lambda-api/services/articleRuleEngine.ts` e `lambda-pdf/services/articleRuleEngine.ts`  
**Righe:** n/a (logica completamente mancante)  

### Problema

Nessuno dei due engine gestisce il caso in cui un deployer assuma le obbligazioni del provider ai sensi dell'Art. 25. Questo accade quando il deployer:

1. Immette il sistema sul mercato con il proprio nome o marchio (Art. 25(1)(a))
2. Apporta una **modifica sostanziale** al sistema (Art. 25(1)(b))
3. Integra un modello GPAI in un'applicazione high-risk non prevista dal provider originale (Art. 25(3))

In questi casi il deployer diventa provider a tutti gli effetti e deve adempiere a tutti gli obblighi del Capitolo 2 Titolo III, incluso Art. 11.

### Fix

Aggiungere nel form di input un campo esplicito (es. `deployer_becomes_provider`) con le tre casistiche, e nella logica del rule engine:

```typescript
// ✅ FIX — controllare se il deployer è diventato provider per Art. 25
const isDeployerActingAsProvider =
  isDeployer &&
  (system.puts_own_name_on_system === true ||
   system.made_substantial_modification === true ||
   (system.integrated_gpai_into_high_risk === true && isHighRisk));

if (isDeployerActingAsProvider) {
  // Acquisisce tutti gli obblighi del provider
  isProvider = true;
  reasoning.push('Art. 25 — Deployer assume obbligazioni del provider: modifica sostanziale / apposizione proprio marchio / integrazione GPAI in use-case high-risk');
}
```

**Nota:** richiede l'aggiunta di nuovi campi al form di intake (`puts_own_name_on_system`, `made_substantial_modification`, `integrated_gpai_into_high_risk`).

---

## Bug #4 — Art. 27 applicato a tutti i deployer, ma è solo per enti pubblici (ALTO)

**File:** `lambda-api/services/articleRuleEngine.ts`  
**Riga:** 134  

### Problema

```typescript
// ❌ ATTUALE — art_27 aggiunto a TUTTI i deployer high-risk
if (isDeployer) {
  ['art_26_p1','art_26_p2','art_27','art_28','art_29'].forEach(k => keys.add(k));
}
```

L'Art. 27 (fundamental rights impact assessment) si applica esclusivamente ai deployer che sono:
- **Enti pubblici** (bodies governed by public law), oppure
- **Soggetti privati che erogano servizi pubblici** (es. banche per servizi essenziali, ospedali pubblici)

Un'azienda privata che usa un sistema HR per i propri dipendenti **non** è obbligata dall'Art. 27.

**Testo di riferimento:** Art. 27(1) — *"Deployers that are bodies governed by public law, or are private entities that provide public services..."*

### Fix

```typescript
// ✅ FIX — art_27 condizionato al tipo di deployer
const isPublicBodyOrPublicService =
  company.entity_type === 'public_body' ||
  company.entity_type === 'private_public_service';

if (isDeployer) {
  ['art_26_p1','art_26_p2','art_28','art_29'].forEach(k => keys.add(k));

  if (isPublicBodyOrPublicService) {
    keys.add('art_27');
    reasoning.push('Art. 27 — Fundamental Rights Impact Assessment: obbligatorio per enti pubblici e privati che erogano servizi pubblici');
  }
}
```

**Nota:** richiede l'aggiunta del campo `entity_type` al profilo company (es. `public_body`, `private_public_service`, `private`).

---

## Bug #5 — Art. 50: trigger errato su `human_oversight_level === 'never'` (MEDIO)

**File:** `lambda-api/services/articleRuleEngine.ts`  
**Righe:** 150–161  

### Problema

```typescript
// ❌ ATTUALE — human_oversight_level 'never' triggerizza Art. 50
const needsTransparency =
  system.category === 'llm' ||
  system.human_oversight_level === 'never' ||   // ← SBAGLIATO
  system.output_type === 'content_generation' ||
  annexDomains.includes('emotion_recognition');
```

L'Art. 50 riguarda gli **obblighi di trasparenza verso le persone fisiche** che interagiscono con il sistema (chatbot, deepfake, contenuti sintetici). Un sistema senza supervisione umana (es. trading algoritmico, anomaly detection su log) **non** triggera Art. 50 — non interagisce con persone fisiche.

Il trigger corretto è la presenza di interazione diretta con utenti finali, non l'assenza di supervisione.

**Testo di riferimento:** Art. 50(1) — *"Providers shall ensure that AI systems intended to interact directly with natural persons are designed and developed..."*

### Fix

```typescript
// ✅ FIX — trigger basato su interazione con persone o generazione contenuti
const needsTransparency =
  system.category === 'llm' ||
  system.output_type === 'content_generation' ||
  system.output_type === 'deepfake' ||
  system.interacts_with_end_users === true ||    // nuovo campo form
  annexDomains.includes('emotion_recognition') ||
  annexDomains.includes('biometric_categorization');
```

Rimuovere `human_oversight_level === 'never'` dal trigger. Aggiungere `interacts_with_end_users` (boolean) al form di intake se non già presente.

---

## Bug #6 — Art. 49: registrazione EU database over-applicata ai deployer (MEDIO)

**File:** `lambda-api/services/articleRuleEngine.ts` e `lambda-pdf/services/articleRuleEngine.ts`  
**Riga lambda-api:** 139 | **Riga lambda-pdf:** 86  

### Problema

```typescript
// ❌ ATTUALE — art_49 aggiunto a TUTTI i sistemi high-risk indipendentemente dal ruolo
keys.add('art_49');
```

L'Art. 49 distingue chiaramente:
- **Provider** (Art. 49(1)): obbligo di registrarsi **prima** di immettere il sistema sul mercato
- **Deployer** (Art. 49(2)): obbligo di registrarsi **solo** se il sistema rientra in Annex III punto 2 (infrastrutture critiche) **e** il deployer è un ente pubblico o soggetto assimilato
- Deployer privati di sistemi Annex III (categorie 1, 3, 4, 5, 6, 7, 8): **non** hanno obbligo diretto di registrazione

### Fix

```typescript
// ✅ FIX — differenziare obbligo registrazione per ruolo
if (isProvider && isHighRisk) {
  keys.add('art_49');
  reasoning.push('Art. 49(1) — Registrazione obbligatoria nel database EU prima dell\'immissione sul mercato (obbligo provider)');
}

if (isDeployer && isHighRisk && annexDomains.includes('critical_infrastructure') && isPublicBodyOrPublicService) {
  keys.add('art_49');
  reasoning.push('Art. 49(2) — Registrazione obbligatoria nel database EU (deployer di infrastrutture critiche / ente pubblico)');
}
```

---

## Bug #7 — GPAI: scope limitato a `category === 'llm'` (BASSO)

**File:** `lambda-api/services/articleRuleEngine.ts` (riga 144) e `lambda-pdf` (riga 91)  

### Problema

```typescript
// ❌ ATTUALE — rileva GPAI solo per LLM
if (system.category === 'llm') { ... }
```

Il Titolo VIII (Art. 51-55) si applica a tutti i **General Purpose AI Models**, non solo agli LLM. Rientrano nella definizione anche modelli multimodali (testo+immagine), modelli di generazione immagini/video, modelli foundation per code generation, ecc. — purché possano svolgere un'ampia gamma di task distinti.

**Testo di riferimento:** Art. 3(63) — *"'general-purpose AI model' means an AI model... that displays significant generality and is capable of competently performing a wide range of distinct tasks..."*

### Fix

Estendere le categorie che triggerano GPAI:

```typescript
// ✅ FIX — includere tutte le categorie GPAI note
const GPAI_CATEGORIES = ['llm', 'multimodal', 'image_generation', 'video_generation', 'foundation_model', 'code_generation'];

const isGpai = GPAI_CATEGORIES.includes(system.category);

if (isGpai) {
  ['art_51','art_52','art_53','art_54','art_55'].forEach(k => keys.add(k));
  reasoning.push(`Art. 51-55 — GPAI: sistema classificato come modello per uso generale (categoria: ${system.category})`);
}
```

Aggiornare le opzioni di `category` nel form di intake per includere le nuove categorie.

---

## Nota sulla desync tra lambda-api e lambda-pdf

I due engine hanno divergito. La versione `lambda-api` è più avanzata e corretta su diversi punti (es. bug #1). Si raccomanda di:

1. Applicare tutti i fix su `lambda-api` (engine principale)
2. Portare `lambda-pdf` allo stesso livello di `lambda-api` come baseline
3. Valutare se mantenere due engine separati oppure estrarre la logica in un package condiviso (`shared/services/articleRuleEngine.ts`) importato da entrambe le lambda — questo eliminerebbe il rischio di futura desync

---

## Campi form da aggiungere

Per implementare i fix #3, #4, #5 sono necessari nuovi campi nel form di intake:

| Campo | Tipo | Bug | Note |
|-------|------|-----|------|
| `puts_own_name_on_system` | boolean | #3 | "Immetti il sistema con il tuo nome/marchio?" |
| `made_substantial_modification` | boolean | #3 | "Hai apportato modifiche sostanziali al sistema?" |
| `integrated_gpai_into_high_risk` | boolean | #3 | "Hai integrato un modello GPAI in un use-case high-risk?" |
| `entity_type` | enum: `public_body` / `private_public_service` / `private` | #4 | Nel profilo company |
| `interacts_with_end_users` | boolean | #5 | "Il sistema interagisce direttamente con persone fisiche?" |
