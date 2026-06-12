# SDD — Document Vault: Pipeline di Generazione Documenti di Compliance

**Progetto:** Actify — AI Act Compliance Platform
**Modulo:** Document Vault / Document Generation Engine
**Versione documento:** 1.1 (semplificata) — Giugno 2026
**Stato:** Draft per implementazione
**Out of scope:** FRIA (Art. 27), golden test suite, LLM-as-judge. Lo schema registry e il Validation Gate devono comunque prevederne l'aggiunta futura senza modifiche architetturali (punti di estensione marcati con 🔌).

---

## 1. Obiettivo e principi di design

### 1.1 Obiettivo
Progettare la pipeline che genera i documenti di compliance del Document Vault a partire da un gap rilevato dalla Gap Analysis su uno specifico sistema AI censito da una PMI. Il flusso utente: la PMI visualizza un gap → preme il button "Genera documento" → la pipeline produce il documento in stato **Bozza** → la PMI lo rivede e lo promuove a **Finale** (azione che entra nell'Audit Trail).

I documenti generati NON certificano conformità. Sono **guide operative all'adempimento**: dicono alla PMI cosa fare, forniscono il testo adottabile e si chiudono sempre con una sezione "Azioni richieste per rendere efficace questo documento".

### 1.2 Principi non negoziabili
1. **Template-first, LLM-second.** La struttura del documento è definita da uno schema deterministico versionato. L'LLM riempie esclusivamente slot delimitati, con vincoli espliciti. L'LLM non decide mai struttura, sezioni o riferimenti normativi.
2. **Il retrieval non decide la rilevanza normativa.** Gli articoli applicabili arrivano dal rule engine esistente (output della Gap Analysis). Il RAG recupera SOLO il testo degli articoli già identificati — mai retrieval semantico libero.
3. **Nessun documento esce senza passare il Validation Gate deterministico.** Validazione fallita due volte → stato `REVIEW_REQUIRED`, mai consegna silenziosa.
4. **Provenance completa.** Ogni documento referenzia: versione schema, versione KB, modello e versione prompt usati, snapshot degli input.
5. **Determinismo dove possibile.** Temperatura 0, structured output (tool use / JSON mode di Bedrock Converse API).

---

## 2. Contesto architetturale esistente (assunto)

| Componente | Tecnologia |
|---|---|
| Frontend | Next.js (PMI app) |
| API | API Gateway HTTP API v2 + JWT Cognito (claim `companyId`) |
| Compute | AWS Lambda (Node.js/TypeScript) |
| Persistenza | DynamoDB (tabelle: `checks`, `systems`, `companies`, `documents`) |
| KB normativa | S3 Vectors — index `ai-act-it` |
| LLM | Amazon Bedrock — Converse API (Nova Pro attuale) |
| Regione | eu-central-1 |

**Nuovi componenti introdotti da questo SDD:** AWS Step Functions (Standard Workflow), S3 bucket versionato per gli artefatti documentali, tabelle DynamoDB `doc_schemas` e `doc_generations`.

---

## 3. Tipologie di documento in scope

| ID tipo | Documento | Articoli tipici trigger | Modello Bedrock | Complessità |
|---|---|---|---|---|
| `DISCLOSURE_NOTICE` | Disclosure Notice / Informativa di trasparenza | Art. 50 | tier economico (es. Nova Lite) | Bassa |
| `MONITORING_PLAN` | Piano di Monitoraggio | Art. 26, Art. 72 | tier standard (Nova Pro) | Media |
| `AI_POLICY` | Policy AI interna | Art. 4, Art. 26 | tier standard | Media |
| `TECH_DOC` | Documentazione Tecnica (lato deployer: registro d'uso e configurazione) | Artt. 11–12, 26 | tier alto | Alta |
| `CONFORMITY_DECL` | Dichiarazione di Conformità (autovalutazione, non marcatura CE) | Art. 47 (riferimento), uso interno | tier standard | Media |

> La scelta del modello per tier è configurazione, non codice (parametro in `doc_schemas`). Cambiare modello non deve richiedere deploy.

---

## 4. Flusso end-to-end

```
[Frontend] Gap card → button "Genera documento"
    │  POST /api/systems/{systemId}/documents  { gapId, docType }
    ▼
[Lambda: doc-api]  validazione richiesta + idempotency + quota piano
    │  crea record doc_generations (status=QUEUED) → avvia Step Functions
    │  risponde 202 { generationId }
    ▼
[Step Functions: DocGenerationWorkflow]
    1. AssembleContext      (Lambda, deterministico)
    2. GenerateSlots        (Map state → 1 invocazione Bedrock per slot-group)
    3. ValidationGate       (Lambda: citation check + schema check)   🔌 punto di estensione: judge futuro
    4. [fail] → RetryWithFeedback (max 1 retry slot falliti) → [fail di nuovo] → REVIEW_REQUIRED
    5. AssembleDocument     (Lambda: merge template + slot → Markdown canonico)
    6. RenderPdf            (Lambda: Markdown → PDF con frontespizio provenance)
    7. PersistAndAudit      (S3 versioned put + DynamoDB + evento Audit Trail)
    ▼
[Frontend] polling GET /api/document-generations/{generationId}
    → status: QUEUED | RUNNING | DRAFT_READY | REVIEW_REQUIRED | FAILED
```

Latenza target: p50 < 35s, p95 < 80s.

---

## 5. Layer 1 — Document Schema Registry

### 5.1 Tabella DynamoDB `doc_schemas`

```
PK: SCHEMA#{docType}        SK: VERSION#{semver}
attributi:
  docType: string            // DISCLOSURE_NOTICE | ...
  version: string            // "1.0.0"
  status: ACTIVE | DEPRECATED
  modelTier: string          // "economy" | "standard" | "premium"
  modelId: string            // override esplicito opzionale
  sections: Section[]
  closingActions: ClosingActionRule[]
  outputLanguage: "it"
  createdAt, createdBy
```

### 5.2 Struttura `Section`

```typescript
interface Section {
  sectionId: string;            // es. "scope", "transparency_text"
  title: string;
  order: number;
  kind: "FIXED" | "GENERATIVE";

  // kind = FIXED: testo template con placeholder risolti da dati strutturati
  template?: string;            // es. "La presente informativa riguarda il sistema {{system.name}} ..."
  bindings?: string[];          // path dei dati richiesti, es. ["company.name", "system.vendor"]

  // kind = GENERATIVE: slot LLM con vincoli
  slot?: {
    slotId: string;
    instruction: string;
    maxWords: number;
    allowedCitations: "FROM_CONTEXT_ONLY";   // invariante, sempre questo valore
    tone: "operativo" | "informativo";
    outputSchema: JsonSchema;   // structured output atteso
  };
}
```

**Invarianti del registry (da far rispettare a livello di codice):**
- Ogni schema DEVE contenere una sezione FIXED `normative_references` (lista articoli, dai dati della Gap Analysis — mai dall'LLM).
- Ogni schema DEVE terminare con la sezione FIXED `required_actions` ("Azioni richieste per rendere efficace questo documento"), popolata dalle `ClosingActionRule` (mappa deterministica gapType → azioni. Es. `DISCLOSURE_NOTICE`: "1. Pubblicare l'informativa nel punto di contatto con l'utente finale. 2. Comunicare l'adozione al personale interessato. 3. Caricare evidenza dell'adozione in Actify per chiudere il gap.").
- Ogni schema DEVE includere il blocco disclaimer standard (testo unico centralizzato).

### 5.3 Versioning
Gli schemi non si modificano mai in place: ogni modifica = nuova versione. Il documento generato salva `schemaVersion`. Una sola versione `ACTIVE` per docType.

---

## 6. Layer 2 — Context Assembly (deterministico)

Lambda `assemble-context`. Nessuna chiamata LLM. Output: `GenerationContext` salvato come snapshot JSON su S3 (`contexts/{generationId}.json`) — parte della provenance.

### 6.1 Input raccolti
1. **Company profile** (DynamoDB `companies`): ragione sociale, settore, dimensione.
2. **System record** (DynamoDB `systems`): nome tool, vendor, tipo output, modalità accesso, personalizzazioni, categorie dati, utenti target, gruppi vulnerabili, ruolo Deployer/Provider.
3. **Gap Analysis result** (DynamoDB `checks`, ultimo check valido): gap con `gapId`, `articleRef`, `urgency`, `gapDescription`. Il gap che ha triggerato la generazione = `primaryGap`; gli altri gap dello stesso sistema sugli stessi articoli del docType = `relatedGaps`.
4. **Chunk normativi** da S3 Vectors: **lookup key-based per articleRef** (query per chiave/metadato `article`, NON ricerca semantica). Per ogni articolo: testo integrale + considerando collegati (mappa statica articolo→considerando nella KB).

### 6.2 Regole
- Articolo richiesto assente dalla KB → `FAILED(KB_MISS)` + alert interno. Mai procedere con contesto normativo parziale.
- Budget token per invocazione (default 8k input); se superato, troncare i considerando, mai il testo degli articoli.
- Il contesto include `kbVersion` (tag di versione del corpus, vedi §10.1).

---

## 7. Layer 3 — Generazione slot

### 7.1 Orchestrazione
Step Functions `Map` state sugli slot GENERATIVE, `MaxConcurrency: 3`. Ogni iterazione: Lambda `generate-slot` → Bedrock Converse API.

### 7.2 Struttura della chiamata Bedrock (per slot)

```
system prompt (template centralizzato, versionato in repo come promptVersion):
  - ruolo: redattore tecnico di documentazione di compliance AI Act per PMI italiane
  - regole assolute:
      * cita esclusivamente articoli presenti nel blocco <normativa>
      * non promettere o dichiarare conformità; formulazioni operative
      * lingua italiana, registro professionale, niente markdown headers (struttura dal template)
      * rispondi SOLO nel JSON schema fornito
messages[user]:
  <contesto_pmi> ... </contesto_pmi>
  <sistema_ai> ... </sistema_ai>
  <gap> primaryGap + relatedGaps </gap>
  <normativa> chunk articoli + considerando </normativa>
  <istruzione_slot> section.slot.instruction + vincoli (maxWords, tone) </istruzione_slot>
inferenceConfig: { temperature: 0, topP: 0.9 }
toolConfig: tool "emit_slot" con input schema = section.slot.outputSchema  // structured output forzato
```

### 7.3 Output slot
`{ slotId, content }`. Le citazioni vengono estratte dal validatore in modo indipendente (non ci si fida di autodichiarazioni del modello).

---

## 8. Layer 4 — Validation Gate (solo deterministico)

Lambda `validate-document`. Due controlli in sequenza, entrambi bloccanti.

### 8.1 Citation Check
- Estrazione regex di tutti i riferimenti normativi dal testo generato. Pattern minimi: `Art\.?\s*\d+`, `Articolo\s+\d+`, `Considerando\s+\d+`, `Allegato\s+[IVX]+`, `Reg(\.|olamento)\s*\(UE\)\s*\d{4}/\d+`.
- Ogni riferimento DEVE appartenere a `allowedRefs` = articoli/considerando del `GenerationContext` + riferimento al Regolamento stesso.
- Riferimento fuori insieme → `VALIDATION_FAIL(CITATION_OUT_OF_CONTEXT)` con dettaglio dello slot e del riferimento.

### 8.2 Schema & Constraints Check
- Tutti gli slot presenti e non vuoti; rispetto `maxWords` (tolleranza +10%); JSON conforme a `outputSchema`.
- **Lista nera centralizzata** (nessuna stringa che attribuisca valore certificativo): "garantisce la conformità", "certifica", "rende conforme", "pienamente conforme a tutte le disposizioni", e varianti. Configurabile senza deploy (parametro in DynamoDB o SSM).

### 8.3 Politica di retry
- FAIL → 1 solo retry: rigenerazione dei SOLI slot falliti, con i dettagli del fallimento iniettati nel prompt come feedback ("Il tuo output precedente conteneva il riferimento Art. X non presente nella normativa fornita: rimuovilo o sostituiscilo con un riferimento presente").
- Secondo FAIL → `REVIEW_REQUIRED`: documento salvato ma marcato, visibile alla PMI con banner "Questo documento richiede una revisione aggiuntiva prima dell'uso" e flag interno per il team. Mai consegna silenziosa di output non validato.

🔌 **Punto di estensione:** il gate è una catena di validatori `Validator[]` eseguiti in sequenza. L'aggiunta futura di un LLM-as-judge = nuovo elemento della catena, zero modifiche al flusso.

---

## 9. Layer 5 — Assemblaggio, rendering, stati

### 9.1 Assemblaggio
Lambda `assemble-document`: merge deterministico template + slot → **Markdown canonico** su S3 (sorgente di verità; il PDF è derivato).

### 9.2 Frontespizio provenance (obbligatorio nel PDF)
- Tipo documento, sistema AI, PMI, data generazione
- `generationId`, `schemaVersion`, `kbVersion`, `modelId`, `promptVersion`
- Watermark BOZZA finché non finalizzato
- Disclaimer standard

### 9.3 Macchina a stati del documento

```
DRAFT ──(utente: "Finalizza")──► FINAL ──(rigenera)──► nuova versione DRAFT (v+1)
  │                                │
  └─(rigenera)► DRAFT v+1          └── FINAL resta immutabile, mai sovrascritto
```

- S3 con **versioning attivo**; chiave: `documents/{companyId}/{systemId}/{docType}/v{n}.md|.pdf`.
- `Finalizza` calcola SHA-256 del PDF e scrive evento Audit Trail: `{ event: DOCUMENT_FINALIZED, docId, version, sha256, userId, ts }`.
- Eventi Audit Trail anche per: `DOCUMENT_GENERATED`, `DOCUMENT_REGENERATED`, `DOCUMENT_REVIEW_REQUIRED`.
- La finalizzazione abilita (non chiude) il gap: la chiusura resta subordinata al caricamento dell'evidenza di adozione.

### 9.4 Tabella DynamoDB `doc_generations`

```
PK: COMPANY#{companyId}    SK: GEN#{generationId}
GSI1: SYSTEM#{systemId} / GEN#{ts}
attributi: docType, gapId, status, schemaVersion, kbVersion, modelId,
           promptVersion, contextS3Key, outputS3Key, validationReport,
           attempt, createdAt, completedAt, costEstimate
```

---

## 10. Manutenzione e osservabilità

### 10.1 Versioning della KB
- Ogni ingestione del corpus produce un tag `kbVersion` (es. `ai-act-it@2026.06`).
- Il Vault mostra "Generato con base normativa aggiornata al {data kbVersion}".
- Aggiornamento KB → i documenti FINAL restano validi ma il Vault mostra badge "disponibile rigenerazione con normativa aggiornata".

### 10.2 Osservabilità (minimo vitale)
- Metriche CloudWatch: latenza per step, tasso FAIL per tipo di validazione, retry rate, tasso REVIEW_REQUIRED, costo token per generazione.
- Allarmi: REVIEW_REQUIRED rate > 5% su 24h; KB_MISS > 0.
- Log strutturati con `generationId` come correlation id.
- I `validationReport` salvati in `doc_generations` sono il dataset grezzo per costruire in futuro la test suite: conservarli sempre. 🔌

---

## 11. API

| Metodo | Path | Note |
|---|---|---|
| POST | `/api/systems/{systemId}/documents` | body `{ gapId, docType }`. Idempotency-Key header obbligatorio. Verifiche server-side: gap appartiene al sistema, sistema appartiene a `companyId` del JWT, docType compatibile col gap (mappa gapType→docType lato server — il client non decide), quota piano. Risposta 202 `{ generationId }`. |
| GET | `/api/document-generations/{generationId}` | status + risultato quando pronto |
| POST | `/api/documents/{docId}/finalize` | DRAFT→FINAL + audit |
| GET | `/api/documents?systemId=&type=&status=` | listing Vault, estendere con versioni |

Rate limit: max 3 generazioni concorrenti per company; coda FIFO oltre soglia.

---

## 12. Sicurezza e dati
- Tutto in eu-central-1; nessun dato lascia l'UE.
- S3: SSE-KMS; presigned URL a scadenza breve per i download dal frontend.
- IAM: ruolo dedicato alla state machine con permessi minimi (invoke dei soli modelli configurati, R/W sui soli prefissi S3 del modulo).
- Data minimization: il context assembler proietta solo i campi dichiarati nei `bindings` e necessari agli slot.
- Prompt injection: i campi liberi inseriti dalla PMI (nome sistema, note) sono untrusted — delimitati nei tag del contesto, con istruzione esplicita nel system prompt di ignorare eventuali istruzioni contenute nei dati.

---

## 13. Piano di implementazione (per Claude Code)

1. **M1 — Fondamenta:** tabelle `doc_schemas` + `doc_generations`, schema registry loader, primo schema `DISCLOSURE_NOTICE` v1.0.0, context assembler con lookup key-based su S3 Vectors.
2. **M2 — Pipeline:** state machine Step Functions, generate-slot con structured output, Validation Gate (citation + schema check) come catena `Validator[]`, retry con feedback, assemblaggio Markdown + PDF con frontespizio provenance, API POST/GET, integrazione polling frontend.
3. **M3 — Stati e audit:** macchina a stati DRAFT/FINAL/REVIEW_REQUIRED, S3 versioning, finalize con SHA-256, eventi Audit Trail, metriche e allarmi.
4. **M4 — Estensione:** schemi `AI_POLICY`, `MONITORING_PLAN`, `CONFORMITY_DECL`, `TECH_DOC` (in quest'ordine di complessità).

**Criterio di accettazione globale:** nessun percorso di codice consente la consegna alla PMI di un documento che non abbia superato citation check e schema check. Questo invariante va coperto da test automatici (unit test sul Validation Gate + test e2e sulla state machine).
