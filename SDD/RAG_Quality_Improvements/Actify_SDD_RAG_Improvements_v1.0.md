# Actify — Spec-Driven Development
## RAG & LLM Quality Improvements — Anti-Hallucination Pipeline

> **Pipeline compliance utenti loggati → qualità output LLM → affidabilità normativa**

| Campo | Valore |
|---|---|
| Versione | v1.0 |
| Data | Maggio 2026 |
| Autore | Actify Product Team |
| Status | Pronto per implementazione |
| Destinatario | Sviluppatore implementatore (Claude Code) |
| File sorgente analizzati | `lambda-api/services/complianceEngine.ts`, `ragService.ts`, `complianceOutputSchema.ts`, `sanctions.ts`, `routes/complianceCheck.ts` |

> **Scope di questo documento**
> Questo SDD descrive 9 interventi tecnici sulla pipeline RAG + LLM della compliance check per utenti loggati.
> L'obiettivo è ridurre le allucinazioni, migliorare la faithfulness dell'output e aumentare la completezza del segnale normativo.
> Nessuna modifica all'infrastruttura AWS, al frontend di navigazione né al modulo sanzioni (salvo dove esplicitamente indicato).

---

## 1. Executive Summary

La pipeline compliance di Actify (utenti loggati) presenta 9 vulnerabilità identificate che aumentano il rischio di output LLM non ancorati al testo normativo. Le vulnerabilità vanno dalla perdita di dati critici nel form (campi UI-only non trasmessi al backend) a contraddizioni nel prompt, assenza di source attribution per gap, e mancato utilizzo dei metadata di chunk per il filtering.

In un contesto legale come l'AI Act, un gap generato per allucinazione — o una classificazione di rischio errata — ha implicazioni dirette per il cliente finale. La priorità di questo SDD è **fedeltà normativa misurabile**, non performance generale.

### Interventi in scope (9 totali)

| # | Intervento | Priorità | File coinvolti |
|---|---|---|---|
| FIX-01 | Trasmetti `output_type`, `vulnerable_groups[]`, `customizations` al backend | 🔴 Critica | `types/aiSystem.ts`, form frontend, `ragService.ts`, `buildUserMessage` |
| FIX-02 | Risolvi contraddizione nel prompt (pre-determinato vs autonomo) | 🔴 Critica | `complianceEngine.ts`, `systemPrompt.ts` |
| FIX-03 | Source attribution per gap + verifica post-generazione | 🟠 Alta | `complianceOutputSchema.ts`, `complianceEngine.ts` |
| FIX-04 | Deduplicazione per `score × queryWeight` invece che per ordine | 🟠 Alta | `ragService.ts` |
| FIX-05 | Metadata filtering su S3 Vectors per `applies_to` | 🟠 Alta | `ragService.ts` |
| FIX-06 | Flag `rag_used` + warning frontend | 🟡 Media | `complianceEngine.ts`, frontend |
| FIX-07 | Includi `context_notes` nel user message | 🟡 Media | `complianceEngine.ts` |
| FIX-08 | Calibra soglia similarità (0.72 → 0.76) | 🟡 Media | env var `SIMILARITY_THRESHOLD` |
| FIX-09 | Allinea limiti template prompt vs validazione Zod | 🟡 Bassa | `complianceOutputSchema.ts`, `buildUserMessage` |

---

## 2. FIX-01 — Campi UI-only non trasmessi al backend

### 2.1 Problema

Tre campi raccolti nel form Step 1 vengono usati solo come helper UI e mai trasmessi al backend. Portano informazioni normative critiche per la classificazione rischio:

- `output_type`: distingue `automated_decision` da `recommendation` — differenza fondamentale per Art. 6 e Allegato III
- `vulnerable_groups` (array): viene ridotto a `affects_vulnerable_groups: boolean` in `buildSystemPayload()`, perdendo il dettaglio (`minors` impatta diversamente `economic_hardship` per Art. 5 e Allegato III punto 1)
- `customizations`: `fine_tuning` e `rag` impattano gli obblighi Art. 9 (quality management) e Art. 10 (data governance) per il provider

### 2.2 Modifiche richieste

**`lambda-api/types/aiSystem.ts`** — aggiungi campi all'interfaccia `AISystemInput`:

```typescript
// Aggiungi questi campi all'interfaccia AISystemInput
output_type?: 'content_generation' | 'recommendation' | 'scoring' | 'automated_decision';
vulnerable_groups?: string[];  // ['minors', 'elderly', 'disabled', 'economic_hardship', 'emotional_distress']
customizations?: string[];     // ['system_prompt', 'fine_tuning', 'rag']
```

**Frontend `buildSystemPayload()`** — includi i campi nel payload `POST /api/systems`:

```typescript
// Prima (da rimuovere):
affects_vulnerable_groups: sys.vulnerable_groups.length > 0,

// Dopo (sostituire con):
affects_vulnerable_groups: sys.vulnerable_groups.length > 0,
vulnerable_groups: sys.vulnerable_groups,        // array completo
output_type: sys.output_type,
customizations: sys.customizations,
```

**`lambda-api/services/ragService.ts` — `buildQueries()`** — aggiungi query 8 condizionale per `output_type`:

```typescript
// Aggiungi dopo la query 7 esistente
if (system.output_type === 'automated_decision') {
  queries.push({
    text: `decisioni completamente automatizzate senza intervento umano articolo 22 GDPR impatto persone fisiche`,
    weight: 1.8,
  });
}

// Aggiorna query 3 per includere vulnerable_groups dettagliato
if (system.vulnerable_groups && system.vulnerable_groups.length > 0) {
  const groups = system.vulnerable_groups.join(' ');
  queries.push({
    text: `soggetti vulnerabili ${groups} protezione AI Act manipolazione sfruttamento vietato`,
    weight: 1.6,
  });
}
```

**`lambda-api/services/complianceEngine.ts` — `buildUserMessage()`** — aggiungi i campi nel blocco 3 (SISTEMA AI DA ANALIZZARE):

```typescript
// Nel JSON serializzato del sistema, aggiungi:
{
  ...campi esistenti,
  "tipo_output": system.output_type ?? null,
  "gruppi_vulnerabili": system.vulnerable_groups ?? [],
  "personalizzazioni_llm": system.customizations ?? [],
}
```

### 2.3 DynamoDB

Aggiungi i tre nuovi attributi alla tabella `AISystem`. Non è necessaria una migration formale (DynamoDB è schema-less) — i record esistenti avranno `undefined` su questi campi, il che è gestito dai default `null`/`[]` sopra.

---

## 3. FIX-02 — Contraddizione nel prompt

### 3.1 Problema

Il `RAG_SYSTEM_PROMPT` conteneva la riga:
> *"La classificazione di rischio e gli articoli obbligatori sono PRE-DETERMINATI (vedi vincoli nel messaggio utente) — non modificarli"*

Il blocco ISTRUZIONI del user message dichiarava invece:
> *"Determina autonomamente la classificazione del rischio e tutti gli articoli AI Act applicabili in base ai dati del sistema"*

Istruzioni opposte nella stessa chiamata — fonte di inconsistenza tra run successivi dello stesso sistema.

### 3.2 Soluzione implementata

La riga contraddittoria è stata rimossa dal `RAG_SYSTEM_PROMPT`. L'LLM determina liberamente classificazione e articoli applicabili basandosi sul contesto RAG e sui dati del sistema. Nessun vincolo esterno viene iniettato.

Il `RAG_SYSTEM_PROMPT` aggiornato recita:
```
- La classificazione di rischio è fornita come contesto nel messaggio utente — valutala rispetto ai dati del sistema
- Identifica gli articoli applicabili, valuta i gap, e descrivi le azioni correttive
```

### 3.3 Modifiche apportate

**`lambda-api/services/complianceEngine.ts` — `RAG_SYSTEM_PROMPT`**: rimossa la riga "PRE-DETERMINATI", aggiunta istruzione coerente con l'approccio RAG+LLM.

**Nessuna altra modifica richiesta.** Il `buildUserMessage()` mantiene `"Determina autonomamente"` nelle ISTRUZIONI — coerente con il system prompt aggiornato.

---

## 4. FIX-03 — Source Attribution per gap + verifica post-generazione

### 4.1 Problema

Il JSON di output non include quale chunk normativo ha supportato ciascun gap. Se l'LLM genera un gap su Art. 22 che non è presente nei chunk recuperati, non c'è modo di rilevarlo automaticamente. In un contesto legale questo è il rischio principale.

### 4.2 Modifiche richieste

**`lambda-api/services/complianceOutputSchema.ts`** — aggiungi campo `source_chunks` per gap:

```typescript
// Schema Zod — oggetto gap (aggiunta campo):
const complianceGapSchema = z.object({
  gap_id: z.string().uuid(),
  article: z.string(),
  requirement: z.string(),
  status: z.enum(['missing', 'partial', 'compliant']),
  deadline: z.string().nullable(),
  urgency: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string().max(600),
  what_to_do: z.string().max(600),
  can_actify_automate: z.boolean(),
  automation_type: z.enum([...]).nullable(),
  source_chunks: z.array(z.string()).optional(), // NUOVO — chunk_id dei chunk sorgente
  ungrounded: z.boolean().optional(),            // NUOVO — true se nessun chunk supporta il gap
});
```

**`lambda-api/services/complianceEngine.ts`** — aggiungi al template JSON nel blocco 4 del user message:

```
// Nel template JSON del gap, aggiungi:
"source_chunks": ["chunk_id del chunk che supporta questo gap — es. art14_deployer_01"]
```

**`lambda-api/services/complianceEngine.ts`** — aggiungi funzione di verifica post-generazione dopo la chiamata Bedrock:

```typescript
/**
 * Verifica che ogni gap citato sia ancorato ad almeno un chunk recuperato.
 * Gap non ancorati vengono marcati ungrounded: true.
 */
function verifyGrounding(
  output: ComplianceOutput,
  retrievedChunks: RetrievedChunk[]
): ComplianceOutput {
  const retrievedArticles = new Set(
    retrievedChunks
      .filter(c => c.article_number != null)
      .map(c => `Art. ${c.article_number}`)
  );

  const retrievedChunkIds = new Set(retrievedChunks.map(c => c.chunk_id));

  const verifiedGaps = output.compliance_gaps.map(gap => {
    // Verifica 1: almeno uno dei source_chunks è nei chunk recuperati
    const chunkMatch = gap.source_chunks?.some(id => retrievedChunkIds.has(id)) ?? false;
    // Verifica 2: l'articolo citato è presente nei chunk recuperati
    const articleMatch = retrievedArticles.has(gap.article);

    if (!chunkMatch && !articleMatch) {
      return { ...gap, ungrounded: true };
    }
    return { ...gap, ungrounded: false };
  });

  return { ...output, compliance_gaps: verifiedGaps };
}
```

**Chiamata in `runComplianceCheck()`:**

```typescript
let parsedOutput = complianceOutputSchema.parse(rawLLMOutput);
parsedOutput = verifyGrounding(parsedOutput, retrievedChunks); // NUOVO
```

**Nota per il frontend:** i gap con `ungrounded: true` devono essere visualizzati con un badge "⚠ Da verificare" e non includono il campo `can_actify_automate` come affidabile.

---

## 5. FIX-04 — Deduplicazione per score × queryWeight

### 5.1 Problema

In `deduplicateAndRerank()`, quando lo stesso `chunk_id` è recuperato da più query, viene tenuta la **prima occorrenza** (ordine di arrivo). La query 1 ha peso 1.0, la query 3 ha peso 1.5: un chunk trovato prima dalla query 1 viene tenuto, mentre la stessa copia trovata dalla query 3 — con score coseno più alto e peso maggiore — viene scartata.

### 5.2 Modifica richiesta

**`lambda-api/services/ragService.ts` — `deduplicateAndRerank()`:**

```typescript
// Prima:
// Mantieni prima occorrenza di chunk_id duplicato

// Dopo — mantieni quella con score × queryWeight massimo:
function deduplicateAndRerank(
  chunksWithWeights: Array<RetrievedChunk & { queryWeight: number }>
): RetrievedChunk[] {
  const bestByChunkId = new Map<string, RetrievedChunk & { queryWeight: number }>();

  for (const chunk of chunksWithWeights) {
    const existing = bestByChunkId.get(chunk.chunk_id);
    if (!existing || chunk.score * chunk.queryWeight > existing.score * existing.queryWeight) {
      bestByChunkId.set(chunk.chunk_id, chunk);
    }
  }

  // Re-ranking per priorità normativa (logica esistente invariata)
  const deduplicated = Array.from(bestByChunkId.values());
  return applyNormativePriority(deduplicated).slice(0, MAX_CHUNKS);
}
```

**Prerequisito:** `retrieveForQuery()` deve propagare il `queryWeight` associato a ciascuna query nel risultato, così `deduplicateAndRerank` può usarlo. Aggiungi `queryWeight` al tipo intermedio interno (non a `RetrievedChunk` che è l'interfaccia pubblica).

---

## 6. FIX-05 — Metadata filtering su S3 Vectors per `applies_to`

### 6.1 Problema

I chunk hanno il metadato `applies_to: ["provider", "deployer"]` ma la `QueryVectorsCommand` non lo usa come filtro. Per un deployer vengono recuperati chunk che parlano esclusivamente di obblighi provider (Art. 16-26), aumentando il rumore nel contesto e riducendo i chunk utili entro il limite `topK=5`.

### 6.2 Modifica richiesta

**`lambda-api/services/ragService.ts` — `retrieveForQuery()`:**

```typescript
// Aggiungi il parametro role e il filtro alla QueryVectorsCommand
async function retrieveForQuery(
  queryText: string,
  topK: number,
  role: 'provider' | 'deployer' | 'both'  // NUOVO parametro
): Promise<RetrievedChunk[]> {

  // Costruisci il filtro — se role === 'both', nessun filtro (tutti i chunk)
  const filter = role !== 'both'
    ? { applies_to: { $contains: role } }
    : undefined;

  const command = new QueryVectorsCommand({
    vectorBucketName: process.env.S3_VECTORS_BUCKET,
    indexName: process.env.S3_VECTORS_INDEX,
    queryVector: { float32: embedding },
    topK,
    returnMetadata: true,
    returnDistance: true,
    ...(filter ? { filter } : {}),  // NUOVO — filtro condizionale
  });
  // ...resto invariato
}
```

**`lambda-api/services/ragService.ts` — `buildRagContext()`** — passa il role a ogni `retrieveForQuery`:

```typescript
const role = company.ai_role === 'provider' ? 'provider'
           : company.ai_role === 'both'     ? 'both'
           : 'deployer';

for (const query of queries) {
  const chunks = await retrieveForQuery(query.text, TOP_K, role); // MODIFICATO
  // ...
}
```

**Nota:** verifica che S3 Vectors supporti il filtro `$contains` su array metadata nell'indice `ai-act-it`. Se non supportato nativamente, applica il filtro in-memory post-retrieval (meno efficiente ma funzionale):

```typescript
const filtered = chunks.filter(c =>
  !c.applies_to || c.applies_to.includes(role) || role === 'both'
);
```

---

## 7. FIX-06 — Flag `rag_used` e warning frontend

### 7.1 Problema

Se S3 Vectors o Bedrock Embeddings fallisce, la RAG viene saltata silenziosamente (fallback al `systemPrompt` statico). L'utente riceve un'analisi basata su knowledge hard-coded senza saperlo. Il prompt statico può essere disallineato rispetto al testo OJEU e non è mantenuto con la stessa frequenza dei chunk.

### 7.2 Modifiche richieste

**`lambda-api/services/complianceEngine.ts`** — aggiungi `rag_metadata` all'output del check:

```typescript
// Nella risposta salvata su DynamoDB, aggiungi:
{
  ...complianceResult,
  rag_metadata: {
    rag_used: boolean,           // true se RAG attiva e ha restituito chunk
    rag_chunk_count: number,     // numero chunk effettivamente usati
    rag_fallback_reason?: string // es. "S3 Vectors timeout" se rag_used=false
  }
}
```

**`lambda-api/services/ragService.ts` — `buildRagContext()`** — restituisci metadata:

```typescript
// Cambia il tipo di ritorno:
async function buildRagContext(
  system: AISystem,
  company: Company
): Promise<{ contextText: string | null; ragUsed: boolean; chunkCount: number; fallbackReason?: string }> {
  try {
    // ...logica esistente
    return { contextText, ragUsed: true, chunkCount: chunks.length };
  } catch (err) {
    return {
      contextText: null,
      ragUsed: false,
      chunkCount: 0,
      fallbackReason: err instanceof Error ? err.message : 'RAG unavailable',
    };
  }
}
```

**Frontend** — nel componente di visualizzazione risultati, mostra un banner se `rag_used === false`:

```
⚠ Analisi basata su contesto semplificato (knowledge base non disponibile al momento dell'analisi).
  I gap identificati potrebbero essere incompleti. Richiedi una nuova analisi per aggiornare i risultati.
  [Rianalizza ora]
```

---

## 8. FIX-07 — Includi `context_notes` nel user message

### 8.1 Problema

`Company.context_notes` viene salvato nello Step 4 del form ma `buildUserMessage()` non lo include nel prompt. Informazioni esplicite fornite dall'utente (es. "già in possesso di certificazione ISO 42001", "sistema in fase pilota non ancora in produzione") vengono ignorate nell'analisi.

### 8.2 Modifica richiesta

**`lambda-api/services/complianceEngine.ts` — `buildUserMessage()`** — aggiungi sezione dopo il blocco CONTESTO AZIENDA:

```typescript
// Aggiungi condizionalmente dopo il blocco CONTESTO AZIENDA:
if (company.context_notes && company.context_notes.trim().length > 0) {
  message += `
NOTE AGGIUNTIVE AZIENDA (fornite dall'utente — considera nel contesto dell'analisi):
${company.context_notes.trim()}

---
`;
}
```

---

## 9. FIX-08 — Calibrazione soglia similarità

### 9.1 Problema

La soglia `SIMILARITY_THRESHOLD=0.72` è un default generico non calibrato sul corpus legale italiano di Actify (170 chunk). Il testo normativo ha alta densità terminologica: due chunk su Art. 9 possono avere similarità 0.85 ma uno essere del tutto irrilevante per la query specifica. Una soglia troppo bassa aumenta il rumore; troppo alta fa perdere chunk rilevanti.

### 9.2 Intervento richiesto

Modifica la variabile d'ambiente (nessun cambio di codice necessario se il parametro è già letto da env):

```
SIMILARITY_THRESHOLD=0.76
```

**Motivazione:** con Titan V2 (1024 dim) su testo normativo italiano strutturato, 0.76 riduce il rumore mantenendo recall accettabile. Validare empiricamente costruendo un test set di 30-50 coppie query/chunk-atteso e misurando precision/recall a 0.72, 0.74, 0.76, 0.78.

**Test set consigliato (esempi):**

| Query | Chunk atteso (article_number) | Chunk da escludere |
|---|---|---|
| "obblighi deployer sistemi alto rischio" | Art. 26 | Art. 16-20 (solo provider) |
| "requisiti trasparenza sistemi AI generativi" | Art. 50, Art. 53 | Art. 9, Art. 14 |
| "pratiche vietate manipolazione subliminale" | Art. 5(1)(a) | Art. 5(1)(d) (biometrica) |

---

## 10. FIX-09 — Allineamento template prompt vs validazione Zod

### 10.1 Problema

Il template JSON nel blocco 4 di `buildUserMessage()` specifica `max 500 caratteri` per `description`, `what_to_do` e `executive_summary`. Il validatore Zod in `complianceOutputSchema.ts` accetta fino a 600 caratteri. L'LLM viene istruito su un limite diverso da quello reale: può generare 520 caratteri (che passano Zod ma violano il template), oppure tagliarsi a 500 perdendo informazioni utili.

### 10.2 Modifica richiesta

Scegli un valore unico (raccomandato: **600**) e allinea entrambi.

**`lambda-api/services/complianceEngine.ts` — template nel blocco 4:**

```
// SOSTITUISCI:
"description": "Descrizione gap in italiano (max 500 caratteri)",
"what_to_do": "Azione correttiva specifica in italiano (max 500 caratteri)",
...
"executive_summary": "Sommario esecutivo in italiano (max 500 caratteri)"

// CON:
"description": "Descrizione gap in italiano (max 600 caratteri)",
"what_to_do": "Azione correttiva specifica in italiano (max 600 caratteri)",
...
"executive_summary": "Sommario esecutivo in italiano (max 600 caratteri)"
```

**`lambda-api/services/complianceOutputSchema.ts`** — già a 600, nessuna modifica necessaria.

---

## 11. Ordine di implementazione consigliato

Implementa gli interventi in questo ordine per minimizzare i rischi di regressione:

```
Fase 1 — Prompt (nessun cambio schema, zero rischio regressione):
  FIX-09 → FIX-02 → FIX-07

Fase 2 — RAG layer (modifiche a ragService.ts):
  FIX-08 → FIX-04 → FIX-05

Fase 3 — Schema e dati (richiede aggiornamento DynamoDB + frontend):
  FIX-01 → FIX-06 → FIX-03
```

---

## 12. Test di accettazione

Per ogni FIX, i seguenti test devono passare prima del merge.

### FIX-01
- [ ] Payload `POST /api/systems` include `output_type`, `vulnerable_groups` (array), `customizations`
- [ ] `buildQueries()` genera query aggiuntiva per `output_type === 'automated_decision'`
- [ ] JSON inviato all'LLM include i tre nuovi campi nel blocco SISTEMA AI

### FIX-02
- [ ] System prompt e user message non contengono istruzioni contraddittorie sulla classificazione
- [ ] `preClassifyRisk()` restituisce `prohibited` per sistema automatizzato senza supervisione su soggetti vulnerabili
- [ ] `preClassifyRisk()` restituisce `high` per sistema HR con decisioni automatizzate in `hiring`
- [ ] La classificazione nell'output LLM corrisponde a quella pre-calcolata

### FIX-03
- [ ] Schema Zod include `source_chunks` e `ungrounded` come campi opzionali
- [ ] Template JSON nel prompt include `source_chunks`
- [ ] `verifyGrounding()` marca `ungrounded: true` per gap su articoli non presenti nei chunk recuperati
- [ ] Gap ungrounded non bloccano l'output ma sono marcati visibilmente

### FIX-04
- [ ] Un chunk recuperato da query con peso 1.5 e score 0.80 prevale sulla stessa copia da query peso 1.0 score 0.75

### FIX-05
- [ ] Query per un deployer non recupera chunk con `applies_to: ["provider"]` esclusivo
- [ ] Query per `role === 'both'` recupera chunk di entrambi i ruoli

### FIX-06
- [ ] `rag_metadata.rag_used` è `false` quando la RAG fallisce
- [ ] Frontend mostra banner warning se `rag_used === false`
- [ ] Il banner include il pulsante "Rianalizza ora"

### FIX-07
- [ ] User message include `context_notes` quando il campo è valorizzato
- [ ] User message non include la sezione quando `context_notes` è null/empty

### FIX-08
- [ ] Env var `SIMILARITY_THRESHOLD=0.76` è documentata nel `.env.example`
- [ ] Chunk con score 0.73 vengono scartati con la nuova soglia

### FIX-09
- [ ] Template prompt e schema Zod hanno gli stessi limiti (600 char) per `description`, `what_to_do`, `executive_summary`

---

## 13. Note per Claude Code

Quando implementi questi fix, tieni presenti questi vincoli architetturali:

1. **Lambda cold start**: `ragService.ts` non può fare operazioni I/O sincrone al top-level. Tutte le chiamate a S3 Vectors e Bedrock devono restare dentro funzioni async.

2. **Temperature=0**: Nova Pro è deterministico. Se un test produce output diversi su input identici, il problema è nel prompt (ambiguità), non nel modello.

3. **Fallback silenzioso (esistente)**: il meccanismo di fallback al `systemPrompt` statico è intenzionale per availability. FIX-06 non lo rimuove — lo rende visibile. Non alterare la logica di fallback, solo aggiungere il logging e il metadata.

4. **`applyChecklist` (post-LLM)**: questa funzione forza `status: 'compliant'` per articoli marcati `present` dall'utente. FIX-03 (`verifyGrounding`) deve essere eseguito **prima** di `applyChecklist`, altrimenti gap ungrounded potrebbero essere mascherati dall'override.

   ```typescript
   // Ordine corretto in runComplianceCheck():
   let output = parseBedrockResponse(rawResponse);
   output = verifyGrounding(output, retrievedChunks);  // FIX-03 — prima
   output = applyChecklist(output, system.compliance_checklist);  // dopo
   output = computeSanctions(output, company);          // ultima
   ```

5. **`gap_id` uuid-v4**: già generato dall'LLM nel template. Non rigenerarlo in post-processing o `source_chunks` non potrà mappare correttamente ai gap.
