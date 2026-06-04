# Pipeline Compliance — Utenti Loggati

**Versione:** 1.0 | Maggio 2026  
**Scope:** Flusso completo dal form di registrazione sistema all'output LLM, per utenti autenticati (Compliance Init + rianalisi manuale).  
**File di riferimento principali:**
- `lambda-api/services/complianceEngine.ts` — orchestrazione pipeline
- `lambda-api/services/ragService.ts` — retrieval e query building
- `lambda-api/routes/complianceCheck.ts` — trigger asincrono e polling
- `lambda-api/services/complianceOutputSchema.ts` — schema Zod di validazione output
- `lambda-api/services/sanctions.ts` — calcolo sanzioni post-LLM

---

## Panoramica del flusso

```
[Frontend — Form sistema AI]
           │
           │  POST /api/systems  (crea il record in DynamoDB)
           ▼
[Lambda — routes/systems.ts]
           │
           │  POST /api/systems/{systemId}/compliance-check  (trigger)
           ▼
[Lambda — routes/complianceCheck.ts :: triggerCheck()]
           │   → salva check record status=running in DynamoDB
           │   → aggiorna sistema compliance_status=checking
           │   → self-invoca Lambda in modalità "Event" (fire & forget)
           │   → risponde 202 immediatamente al frontend
           ▼
[Lambda — executeCheckAsync()]   ← invocazione asincrona separata
           │
           ├── legge AISystem + Company da DynamoDB
           ├── chiama runComplianceCheck(system, company, checklist)
           │       │
           │       ├── buildRagContext(system, company)  ← Fase RAG
           │       ├── buildUserMessage(...)              ← Costruzione prompt
           │       ├── Bedrock ConverseCommand            ← Chiamata LLM
           │       ├── applyChecklist(...)                ← Override checklist
           │       └── computeSanctions(...)              ← Calcolo sanzioni
           │
           ├── aggiorna check record status=completed + result
           └── aggiorna sistema: compliance_status, last_check_at, esposizione sanzioni
```

Il frontend fa **polling** ogni 4 secondi su `GET /api/systems/{systemId}/compliance-checks/latest` finché `status !== 'running'`.

---

## A. JSON del Form — Input

Il form di registrazione raccoglie i campi dell'interfaccia `AISystemInput` (TypeScript: `lambda-api/types/aiSystem.ts`).

```json
{
  "tool_name": "string (1-200 char)",
  "vendor": "string (0-200 char)",
  "category": "hr | finance | llm | marketing | operations | legal | tech | healthcare | altro",
  "role": "provider | deployer",
  "purpose": "string (1-1000 char) — descrizione dello scopo del sistema",
  "target_users": ["string max 50 char", "..."],
  "makes_automated_decisions": true | false,
  "human_oversight_level": "always | sometimes | never | na",
  "decision_domains": ["string max 100 char", "..."],
  "affects_vulnerable_groups": true | false,
  "data_types": ["string max 100 char", "..."],
  "compliance_checklist": {
    "Art. 14": "present | missing",
    "Art. 9": "present | missing"
  }
}
```

**Campi critici per la RAG** (quelli che guidano la costruzione delle query):

| Campo | Impatto RAG | Esempio |
|-------|-------------|---------|
| `category` | Query 2 — classificazione sistema | `"hr"` |
| `purpose` | Query 2 — scopo | `"screening CV candidati"` |
| `role` (via Company) | Query 1 — obblighi per ruolo | `"deployer"` |
| `decision_domains` | Query 3 — domini decisione (peso 1.5) | `["recruitment", "performance"]` |
| `data_types` | Query 4 — dati sensibili | `["health", "biometric"]` |
| `human_oversight_level` | Query 6 — trasparenza Art. 50 | `"never"` |

---

## B. Contesto Azienda (Company)

Oltre al sistema, il motore riceve il profilo azienda da DynamoDB (`Company` type). Questi dati entrano nel **prompt** (non nella RAG), per contestualizzare gli obblighi.

```json
{
  "company_id": "uuid",
  "name": "Acme Srl",
  "sector": "hr",
  "employees_range": "11-50 | 51-250 | ...",
  "country": "IT",
  "ai_role": "provider | deployer | both | unknown",
  "governance": {
    "has_dpo": false,
    "dpo_status": "inhouse | service | none",
    "has_ai_inventory": false,
    "has_impact_assessment": false,
    "has_human_oversight": false,
    "has_incident_procedure": false,
    "has_ai_policy": false,
    "has_training": false
  },
  "annual_revenue_range": "1m_3m | ...",
  "annual_revenue_exact": null
}
```

I campi `annual_revenue_range` / `annual_revenue_exact` vengono usati **solo dal modulo sanzioni** (post-LLM), non entrano nel prompt.

---

## C. Pipeline RAG

La RAG è attiva se `RAG_ENABLED=true` e la variabile `S3_VECTORS_BUCKET` è impostata. File: `lambda-api/services/ragService.ts`.

### C.1 — Costruzione delle query

Il sistema costruisce automaticamente **6-7 query tematiche** dai dati del sistema. Ogni query ha un peso che indica la sua priorità relativa.

```typescript
function buildQueries(system: AISystem, company: Company): Query[]
```

| # | Testo query (template) | Peso | Attivazione |
|---|------------------------|------|-------------|
| 1 | `"obblighi {role} AI Act Regolamento EU 2024 1689"` | 1.0 | Sempre |
| 2 | `"sistema AI {category} {purpose} rischio classificazione Allegato III"` | 1.2 | Sempre |
| 3 | `"decisioni automatiche {domain} persone fisiche alto rischio"` (1 query per dominio, max 4) | 1.5 | Se `decision_domains` non è vuoto |
| 4 | `"dati {data_type1} {data_type2} ... trattamento AI obblighi"` (max 4 tipi) | 1.0 | Se `data_types` non è vuoto |
| 5 | `"pratiche vietate proibite AI Act articolo 5 manipolazione sorveglianza biometrica"` | 2.0 | Sempre — peso massimo |
| 6 | `"obbligo trasparenza utenti interazione sistema AI articolo 50 disclosure"` | 1.3 | Se `human_oversight_level === 'never'` o `'na'` |
| 7 | `"sanzioni violazione AI Act articolo 99 multa percentuale fatturato"` | 0.8 | Sempre |

**Nota sul `role`:** se `company.ai_role === 'provider'` → `"provider"`, se `'both'` → `"provider deployer"`, altrimenti → `"deployer"`.

**Esempio pratico** — Sistema HR deployer, supervisione assente, dati biometrici:
```
Q1: "obblighi deployer AI Act Regolamento EU 2024 1689"
Q2: "sistema AI hr screening CV rischio classificazione Allegato III"
Q3: "decisioni automatiche recruitment persone fisiche alto rischio"
Q4: "dati biometric health trattamento AI obblighi"
Q5: "pratiche vietate proibite AI Act articolo 5 manipolazione sorveglianza biometrica"
Q6: "obbligo trasparenza utenti interazione sistema AI articolo 50 disclosure"
Q7: "sanzioni violazione AI Act articolo 99 multa percentuale fatturato"
```

---

### C.2 — Embedding

Ogni query viene convertita in un vettore numerico con **Amazon Titan Text Embeddings V2**.

```typescript
async function embedText(text: string): Promise<number[]>
```

```json
Chiamata Bedrock (InvokeModelCommand):
{
  "modelId": "amazon.titan-embed-text-v2:0",
  "body": {
    "inputText": "<query text, troncato a 8000 char>",
    "dimensions": 1024,
    "normalize": true
  }
}
```

Output: array di 1024 float32 normalizzati (lunghezza unitaria).

**Perché 1024 dimensioni:** Titan V2 supporta 256, 512 e 1024. Si usa il massimo per catturare la massima granularità semantica, a fronte di un overhead di storage e calcolo accettabile per 170 chunk totali.

---

### C.3 — Vector Search su S3 Vectors

Per ogni query viene eseguita una ricerca sulla knowledge base.

```typescript
async function retrieveForQuery(queryText: string, topK: number): Promise<RetrievedChunk[]>
```

```json
Chiamata S3 Vectors (QueryVectorsCommand):
{
  "vectorBucketName": "actify-saas-ai-act-knowledge-base",
  "indexName": "ai-act-it",
  "queryVector": { "float32": [/* 1024 numeri */] },
  "topK": 5,
  "returnMetadata": true,
  "returnDistance": true
}
```

**Parametri configurabili (env vars):**

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `S3_VECTORS_BUCKET` | `actify-saas-ai-act-knowledge-base` | Bucket S3 Vectors |
| `S3_VECTORS_INDEX` | `ai-act-it` | Indice vettoriale nella knowledge base |
| `S3_VECTORS_REGION` | `eu-central-1` | Regione AWS |
| `EMBEDDING_MODEL_ID` | `amazon.titan-embed-text-v2:0` | Modello embedding |
| `EMBEDDING_REGION` | `eu-central-1` | Regione Bedrock per embedding |
| `TOP_K` | `5` | Chunk recuperati per singola query |
| `MAX_CHUNKS` | `20` | Tetto totale chunk dopo deduplicazione |
| `SIMILARITY_THRESHOLD` | `0.72` | Soglia minima di similarità (0–1) |
| `RAG_ENABLED` | `true` (se bucket impostato) | On/off RAG |

**Filtro similarità:** la distanza coseno restituita da S3 Vectors viene convertita in similarità con `score = 1 - distance`. Chunk con `score < 0.72` vengono scartati.

**Struttura di un chunk recuperato:**

```typescript
interface RetrievedChunk {
  chunk_id:         string;          // chiave univoca nel bucket
  text:             string;          // testo normativo (≤700 char)
  chunk_type:       string;          // "article" | "annex" | "recital"
  article_number?:  number;          // es. 14
  article_title?:   string;          // es. "Supervisione umana"
  annex_reference?: string[];        // es. ["III"]
  applies_to?:      string[];        // es. ["provider", "deployer"]
  risk_category?:   string[];        // es. ["high"]
  enforcement_date?: string;         // es. "2026-08-02"
  keywords?:        string[];        // es. ["supervisione", "umana"]
  score:            number;          // similarità coseno [0-1]
}
```

Con 7 query × 5 chunk = **35 candidati massimi** prima della deduplicazione.

---

### C.4 — Deduplicazione e Re-ranking

```typescript
function deduplicateAndRerank(chunks: RetrievedChunk[]): RetrievedChunk[]
```

1. **Deduplicazione:** stesso `chunk_id` apparso da query diverse → si tiene una sola copia (la prima trovata).
2. **Re-ranking per priorità normativa:**

| Priorità | Condizione | Motivazione |
|----------|------------|-------------|
| 0 (massima) | `article_number` ∈ {5, 6, 7} | Pratiche vietate, classificazione alto rischio, GPAI — fondamentali |
| 1 | `annex_reference` include `"III"` | Allegato III: elenco categorie alto rischio |
| 2 (minima) | Tutti gli altri | Ordinati per score di similarità decrescente |

3. **Tetto finale:** `MAX_CHUNKS` (default 20).

---

### C.5 — Assemblaggio del contesto testuale

```typescript
function assembleLegalContext(chunks: RetrievedChunk[]): string
```

I chunk vengono formattati in un blocco testuale numerato:

```
[CONTESTO NORMATIVO 1 — Articolo 14 — Supervisione umana]
I deployer di sistemi AI ad alto rischio adottano misure tecniche e organizzative
adeguate per garantire che i sistemi siano utilizzati in conformità alle istruzioni
d'uso allegate...
Fonte: Articolo 14, Regolamento UE 2024/1689 (AI Act)

---

[CONTESTO NORMATIVO 2 — Allegato III]
Sistemi di AI ad alto rischio di cui all'articolo 6, paragrafo 2:
4. Occupazione, gestione dei lavoratori e accesso al lavoro autonomo...
Fonte: Allegato III, Regolamento UE 2024/1689 (AI Act)

---

[CONTESTO NORMATIVO 3 — AI Act (Reg. UE 2024/1689)]
...
```

Questo blocco è la variabile `ragContextText` che viene iniettata nel messaggio utente.

**Fallback silenzioso:** se S3 Vectors o Bedrock Embeddings non risponde, la RAG viene saltata senza errori. Il sistema usa il `systemPrompt` statico (15k token, hard-coded in `lambda-api/services/systemPrompt.ts`) invece del `RAG_SYSTEM_PROMPT`.

---

## D. Prompt LLM

### D.1 — System Prompt (con RAG attiva)

Quando la RAG recupera almeno un chunk, si usa il `RAG_SYSTEM_PROMPT` (breve, 6 regole operative):

```
Sei il motore di analisi compliance di Actify, specializzato nel Regolamento UE 2024/1689 (EU AI Act).

Principi operativi:
- Usa il CONTESTO NORMATIVO fornito per identificare obblighi e gap di compliance
- Cita solo articoli presenti nel contesto fornito — non inventare o generalizzare
- Analizza SOLO il sistema AI indicato; non fare analisi generica sull'azienda
- La classificazione di rischio e gli articoli obbligatori sono PRE-DETERMINATI (vedi vincoli nel messaggio utente) — non modificarli
- Tutti i campi testuali in italiano. Valori enum sempre in inglese come specificato
- Rispondi ESCLUSIVAMENTE con il JSON con lo schema esatto indicato. Zero testo fuori dal JSON.
```

**Con RAG disabilitata/fallback:** si usa il `systemPrompt` statico completo (~350 righe), che contiene definizioni, timeline, Allegato III, requisiti Art. 8-15, obblighi provider/deployer, sanzioni e regole di analisi.

---

### D.2 — User Message

```typescript
function buildUserMessage(system: AISystem, company: Company, ragContext?: string): string
```

Il messaggio è strutturato in 4 blocchi:

**Blocco 1 — Contesto normativo RAG** (presente solo se RAG attiva):
```
CONTESTO NORMATIVO AI ACT (usa questi testi per identificare obblighi e gap):
[CONTESTO NORMATIVO 1 — Articolo 14 — ...]
...
---
```

**Blocco 2 — Contesto azienda** (dati Company da DynamoDB):
```
CONTESTO AZIENDA:
- Nome: {company.name}
- Settore: {company.sector}
- Dipendenti: {company.employees_range}
- Ruolo AI Act aziendale: {company.ai_role}
- DPO presente: {company.governance.has_dpo} (tipo: {company.governance.dpo_status})
- Inventory AI formalizzato: {company.governance.has_ai_inventory}
- Valutazione impatto condotta: {company.governance.has_impact_assessment}
- Policy AI interna: {company.governance.has_ai_policy}
- Formazione personale: {company.governance.has_training}
```

**Blocco 3 — Sistema AI da analizzare** (dati AISystem serializzati come JSON):
```json
SISTEMA AI DA ANALIZZARE:
{
  "nome": "Claude Code",
  "vendor": "Anthropic",
  "categoria": "llm",
  "ruolo_azienda": "deployer",
  "scopo": "generazione IaC per infrastrutture cloud",
  "utenti_target": ["internal_employees"],
  "decisioni_automatizzate": false,
  "supervisione_umana": "always",
  "ambiti_decisione": [],
  "soggetti_vulnerabili": false,
  "tipologie_dati": ["code", "infrastructure_configs"]
}
```

**Blocco 4 — Istruzioni + schema di output:**
```
ISTRUZIONI:
- Analizza SOLO questo sistema AI, non fare analisi generica sull'azienda
- Determina autonomamente la classificazione del rischio e tutti gli articoli AI Act applicabili in base ai dati del sistema
- Deadline principale AI Act: 2026-08-02
- Per ogni gap valuta se Actify può automatizzare la risoluzione
- Rispondi ESCLUSIVAMENTE con il JSON con lo schema esatto qui sotto. Zero testo fuori dal JSON.

{OUTPUT_TEMPLATE JSON}
```

---

## E. Schema di output richiesto al LLM

Il template JSON passato all'LLM è il seguente (con commenti sui vincoli di validazione):

```json
{
  "risk_classification": "prohibited | high | limited | minimal",

  "applicable_articles": ["Art. X", "Annex III cat. Y"],

  "compliance_gaps": [
    {
      "gap_id": "uuid-v4",
      "article": "Art. 14",
      "requirement": "Supervisione umana",
      "status": "missing | partial | compliant",
      "deadline": "YYYY-MM-DD o null",
      "urgency": "critical | high | medium | low",
      "description": "Descrizione gap in italiano (max 500 caratteri)",
      "what_to_do": "Azione correttiva specifica in italiano (max 500 caratteri)",
      "can_actify_automate": true,
      "automation_type": "document_generation | policy_template | transparency_notice | risk_assessment | monitoring_plan | conformity_declaration — null se can_actify_automate è false"
    }
  ],

  "score": {
    "governance": 0,
    "transparency": 0,
    "documentation": 0,
    "monitoring": 0
  },

  "compliance_summary": {
    "compliant_count": 0,
    "non_compliant_count": 0,
    "monitoring_count": 0,
    "most_urgent_deadline": "YYYY-MM-DD o null",
    "months_to_urgency": 0
  },

  "priority_actions": [
    {
      "priority": "immediate | short_term | medium_term",
      "action": "Azione prioritaria in italiano",
      "rationale": "Motivazione con riferimento articolo e scadenza"
    }
  ],

  "executive_summary": "Sommario esecutivo in italiano (max 500 caratteri)"
}
```

### Validazione Zod post-LLM

Lo schema Zod (`complianceOutputSchema.ts`) valida l'output prima che entri nel pipeline di post-processing. Differenze chiave rispetto al template:

| Campo | Limite template | Limite Zod (effettivo) |
|-------|-----------------|------------------------|
| `description` | 500 char | 600 char |
| `what_to_do` | 500 char | 600 char |
| `executive_summary` | 500 char | 600 char |
| `action` (priority_actions) | — | 250 char |
| `rationale` (priority_actions) | — | 250 char |
| `score.*` | 0-10 | 0-10, int |
| `automation_type` | enum | enum + null (con coercione da stringa `"null"`) |

---

## F. Post-processing

### F.1 — applyChecklist

Se il sistema ha un `compliance_checklist` salvato (valorizzato durante la Compliance Initialization), gli articoli marcati `"present"` vengono forzati a `status: 'compliant'` nell'output LLM.

```typescript
// checklist esempio:
{ "Art. 14": "present", "Art. 13": "missing" }

// L'articolo "Art. 14" nei gap viene forzato → status: 'compliant'
// L'articolo "Art. 13" rimane invariato
```

Il match è **case-insensitive** e normalizza gli spazi.

### F.2 — computeSanctions

Ogni gap non-compliant riceve una stima di sanzione calcolata deterministicamente da Art. 99 AI Act:

```
Tier 1 (Art. 5 — pratiche vietate):     cap €35M o 7% fatturato
Tier 2 (Art. 8-27, 49, 50):             cap €15M o 3% fatturato
Tier 3 (default / altri articoli):      cap €7.5M o 1% fatturato
```

La stima usa il fatturato aziendale in questo ordine di precisione:
1. `annual_revenue_exact` → fonte `"exact"`, range min 50-100% del max
2. `annual_revenue_range` → fonte `"declared"`, range min 30-100% del max
3. `employees_range` × moltiplicatore settore → fonte `"estimated"`, range min 8-100% del max

Le PMI (`employees_range` ∈ {1-10, 11-50, 51-250}) ricevono una riduzione del 50% (Art. 100 AI Act).

Articoli duplicati (stesso numero con phrasing diverso) vengono normalizzati e deduplicati: un articolo conta **una sola volta** nel totale, prendendo il valore più alto.

---

## G. Parametri LLM

```json
Chiamata Bedrock (ConverseCommand):
{
  "modelId": "eu.amazon.nova-pro-v1:0",
  "system": [{ "text": "<RAG_SYSTEM_PROMPT o systemPrompt>" }],
  "messages": [
    {
      "role": "user",
      "content": [{ "text": "<buildUserMessage output>" }]
    }
  ],
  "inferenceConfig": {
    "maxTokens": 5120,
    "temperature": 0
  }
}
```

| Parametro | Valore | Motivazione |
|-----------|--------|-------------|
| `modelId` | `eu.amazon.nova-pro-v1:0` | Nova Pro EU — residenza dati europea |
| `maxTokens` | 5120 | Sufficiente per 10-15 gap con tutti i campi |
| `temperature` | 0 | Output deterministico e riproducibile |

**Variabili d'ambiente:**

| Variabile | Default |
|-----------|---------|
| `BEDROCK_REGION` | `eu-central-1` |
| `BEDROCK_MODEL_ID` | `eu.amazon.nova-pro-v1:0` |

---

## H. Campi del Form — Utenti Loggati

Il form si divide in **4 step** per il setup iniziale, o **2 step** in modalità "Aggiungi sistema" (parametro `?add=1`). Di seguito tutti i campi raccolti, organizzati per step.

---

### Step 1 — Sistema AI

#### Ruolo rispetto al sistema

| Campo interno | Tipo | Valori | Inviato all'API |
|---------------|------|--------|-----------------|
| `role` | radio | `deployer` \| `provider` | ✅ `role` |

- **Deployer:** usa un sistema AI di terzi (API, SaaS, LLM).
- **Provider:** sviluppa e commercializza il sistema con il proprio marchio.

#### Identità del Sistema

| Campo interno | Tipo | Valori / Note | Inviato all'API |
|---------------|------|----------------|-----------------|
| `is_llm` | checkbox | boolean — solo per deployer | ❌ UI-only |
| `llm_preset` | chip grid | `chatgpt` \| `claude` \| `gemini` \| `copilot` \| `llama` \| `mistral` \| `perplexity` \| `grok` \| `other` | ❌ UI-only (auto-compila `tool_name`, `vendor`, `category`) |
| `tool_name` | text input | Nome del sistema (es. "HireVue", "ChatGPT") | ✅ `tool_name` |
| `vendor` | text input | Fornitore (es. "OpenAI", "HireVue Inc.") | ✅ `vendor` |
| `category` | select | `hr` \| `finance` \| `llm` \| `marketing` \| `operations` \| `legal` \| `tech` \| `healthcare` \| `altro` | ✅ `category` |
| `purpose` | textarea | Descrizione dell'uso: processi, attività, tipo di decisioni supportate | ✅ `purpose` |

**Nota `llm_preset`:** quando si seleziona un preset (es. `claude`) vengono auto-popolati `tool_name = "Claude"`, `vendor = "Anthropic"`, `category = "llm"`. L'utente può sovrascrivere manualmente.

---

#### Configurazione & Accesso

| Campo interno | Tipo | Valori | Inviato all'API |
|---------------|------|--------|-----------------|
| `output_type` | radio (card) | `content_generation` \| `recommendation` \| `scoring` \| `automated_decision` | ❌ UI-only |
| `access_mode` | radio (card) | `web_chat` \| `api` \| `plugin` \| `integrated` | ❌ UI-only |
| `customizations` | checkbox multiplo | `system_prompt` \| `fine_tuning` \| `rag` | ❌ UI-only |

Questi campi arricchiscono la comprensione dell'utente ma **non vengono attualmente trasmessi al backend**. Sono stati pensati per evoluzioni future del form o come input per la RAG.

---

#### Persone & Trasparenza

| Campo interno | Tipo | Valori | Inviato all'API |
|---------------|------|--------|-----------------|
| `target_users` | checkbox multiplo | `internal_employees` \| `clients_users` \| `third_parties` | ✅ `target_users` (array) |
| `vulnerable_groups` | checkbox multiplo | `minors` \| `elderly` \| `disabled` \| `economic_hardship` \| `emotional_distress` | ⚠️ Mappato a `affects_vulnerable_groups: boolean` |
| `users_aware_of_ai` | checkbox | boolean — "gli utenti sono informati di interagire con un sistema AI" | ❌ UI-only |

**Nota `vulnerable_groups`:** il frontend raccoglie i gruppi specifici, ma `buildSystemPayload()` li riduce a `affects_vulnerable_groups: sys.vulnerable_groups.length > 0`. La lista dettagliata dei gruppi non arriva al backend in questa versione.

**Nota `users_aware_of_ai`:** flag informativo Art. 50 AI Act, visibile all'utente ma non trasmesso — serve per sensibilizzare durante la compilazione.

---

#### Impatto Decisionale

| Campo interno | Tipo | Valori | Inviato all'API |
|---------------|------|--------|-----------------|
| `makes_automated_decisions` | checkbox | boolean — "produce decisioni/raccomandazioni che impattano persone fisiche" | ✅ `makes_automated_decisions` |
| `human_oversight_level` | radio (card) | `always` \| `sometimes` \| `never` \| `na` | ✅ `human_oversight_level` |
| `decision_domains` | checkbox multiplo | `hiring` \| `performance_management` \| `credit_scoring` \| `insurance` \| `healthcare_diagnosis` \| `education_assessment` \| `public_services` \| `law_enforcement` \| `content_moderation` \| `other_decisions` | ✅ `decision_domains` (array) |

I `decision_domains` sono il segnale più forte per determinare il rischio Annex III — sono usati con peso 1.5 nella RAG (query 3).

---

#### Dati Trattati

| Campo interno | Tipo | Valori | Inviato all'API |
|---------------|------|--------|-----------------|
| `data_types` | checkbox multiplo | `biometric` \| `health` \| `financial` \| `behavioral` \| `location` \| `personal_identifiers` \| `sensitive_categories` | ✅ `data_types` (array) |

---

### Step 2 — AI Readiness *(solo setup iniziale)*

Questo step valuta i presidi di governance già in atto nell'organizzazione. I dati vengono salvati sul profilo **Company** (non sul sistema), tramite `api.company.setup()` in fase di submit finale.

| Campo | Tipo | Descrizione | API (Company.governance) |
|-------|------|-------------|--------------------------|
| `dpo_status` | radio | `inhouse` \| `service` \| `none` | ✅ `governance.dpo_status` + `has_dpo` |
| `has_ai_inventory` | checkbox | Registro documentato di tutti i sistemi AI in uso | ✅ `governance.has_ai_inventory` |
| `has_impact_assessment` | checkbox | FRIA (Art. 27 AI Act) o DPIA (GDPR Art. 35) condotta | ✅ `governance.has_impact_assessment` |
| `has_incident_procedure` | checkbox | Procedura gestione incidenti AI formalizzata | ✅ `governance.has_incident_procedure` |
| `has_ai_policy` | checkbox | Policy interna sull'uso dell'AI | ✅ `governance.has_ai_policy` |
| `has_training` | checkbox | Formazione del personale sull'AI | ✅ `governance.has_training` |
| `has_human_oversight` | checkbox | Procedure documentate di supervisione umana | ✅ `governance.has_human_oversight` |

Questi campi entrano nel **prompt LLM** come contesto aziendale (sezione `CONTESTO AZIENDA`) ma **non** influenzano le query RAG.

---

### Step 3 — Compliance Initialization

Nessun nuovo campo di form. In questo step viene:
1. Creato il sistema in DynamoDB con `buildSystemPayload()`
2. Avviato il compliance check asincrono (LLM + RAG)
3. Mostrato il risultato con la lista dei gap — l'utente marca ogni articolo come `present` o `missing`

Il risultato di questo step produce il `compliance_checklist`:

```json
{
  "Art. 9": "present",
  "Art. 13": "missing",
  "Art. 14": "missing",
  "Art. 50": "present"
}
```

Questo dizionario viene salvato su `AISystem.compliance_checklist` tramite `api.systems.update(ciSystemId, { compliance_checklist })` al momento del submit finale. Nella **rianalisi successiva**, gli articoli marcati `present` vengono forzati a `status: 'compliant'` senza passare per l'LLM (vedi sezione F.1).

---

### Step 4 — Note & Conferma *(solo setup iniziale)*

| Campo | Tipo | Destinazione |
|-------|------|--------------|
| `context_notes` | textarea libera | `Company.context_notes` — salvato sul profilo azienda, usato come contesto aggiuntivo nelle analisi future |

---

### Riepilogo: cosa arriva effettivamente all'API

Al momento del submit, vengono effettuate **due chiamate distinte**:

**1. `POST /api/systems` (Step 1 → Step 3)**
```json
{
  "tool_name": "string",
  "vendor": "string",
  "category": "hr | finance | llm | ...",
  "role": "deployer | provider",
  "purpose": "string",
  "target_users": ["internal_employees", "clients_users", "third_parties"],
  "makes_automated_decisions": true,
  "human_oversight_level": "always | sometimes | never | na",
  "decision_domains": ["hiring", "credit_scoring", "..."],
  "affects_vulnerable_groups": true,
  "data_types": ["biometric", "health", "..."]
}
```

**2. `PUT /api/systems/{systemId}` (Step 3 → submit)**
```json
{
  "compliance_checklist": {
    "Art. 9": "present",
    "Art. 14": "missing"
  }
}
```

**3. `PUT /api/company/setup` (Step 2 + Step 4 → submit, solo setup iniziale)**
```json
{
  "ai_role": "deployer | provider",
  "context_notes": "...",
  "governance": {
    "has_dpo": true,
    "dpo_status": "inhouse",
    "has_ai_inventory": false,
    "has_impact_assessment": false,
    "has_human_oversight": false,
    "has_incident_procedure": false,
    "has_ai_policy": true,
    "has_training": false
  }
}
```

---

### Campi del form NON trasmessi al backend (UI-only)

| Campo | Motivazione assenza |
|-------|---------------------|
| `is_llm` | Helper UI per mostrare il picker LLM — il suo effetto è già in `category = 'llm'` |
| `llm_preset` | Auto-popola `tool_name`/`vendor`/`category` — poi il suo valore diventa ridondante |
| `output_type` | Non ancora mappato su `AISystem` — candidato per una versione futura |
| `access_mode` | Non ancora mappato su `AISystem` — candidato per una versione futura |
| `customizations` | Non ancora mappato su `AISystem` — candidato per una versione futura |
| `users_aware_of_ai` | Elemento di sensibilizzazione UI — non modifica la compliance analysis |
| `vulnerable_groups` (array) | Ridotto a `affects_vulnerable_groups: boolean` — il dettaglio dei gruppi è perso |
