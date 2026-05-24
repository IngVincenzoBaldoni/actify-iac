# RAG — Sistema di Retrieval Augmented Generation

**Versione:** 1.0 | Maggio 2026  
**Componenti:** `lambda-pdf/services/ragService.ts`, `lambda-api/services/ragService.ts`  
**Knowledge base:** Amazon S3 Vectors — `actify-saas-ai-act-knowledge-base`

---

## Cos'è e a cosa serve

Quando Actify genera un assessment di compliance, il modello AI (Amazon Nova Pro) deve ragionare sul testo del Regolamento UE 2024/1689 (AI Act). Senza RAG, il modello si affida solo a quello che ha "memorizzato" durante il training — che può essere incompleto, impreciso o già superato da aggiornamenti normativi.

Con la RAG, il sistema recupera automaticamente i passaggi più pertinenti del testo ufficiale dell'AI Act e li fornisce al modello come contesto durante la generazione. Il modello non deve più "ricordare" la legge: la legge è già davanti a lui, in forma testuale, al momento della risposta.

**Risultato pratico:** citazioni di articoli più accurate, meno allucinazioni, risposte più ancorate al testo normativo reale.

---

## Come funziona — passo dopo passo

```
Form dati utente
      │
      ▼
 1. Query building      ← costruisce 6-7 domande tematiche dal form
      │
      ▼
 2. Embedding           ← trasforma ogni domanda in un vettore numerico
      │
      ▼
 3. Vector search       ← cerca i chunk più simili nella knowledge base
      │
      ▼
 4. Dedup + re-ranking  ← elimina duplicati, prioritizza articoli chiave
      │
      ▼
 5. Context assembly    ← assembla i chunk in un blocco testo strutturato
      │
      ▼
 6. LLM prompt          ← il contesto normativo viene iniettato nel prompt
```

---

## La Knowledge Base

### Struttura

La knowledge base contiene **170 vettori**, ognuno dei quali rappresenta un'unità normativa dell'AI Act:

| Tipo | Quantità | Descrizione |
|------|----------|-------------|
| Articoli | 113 | Ogni articolo del Regolamento (Art. 1 → Art. 113) come chunk separato |
| Allegati | 33 | Sezioni degli Allegati I–XIII (Allegato III è scomposto per categoria) |
| Considerando | 24 | Considerando rilevanti per l'interpretazione |

### Metadati per vettore

Ogni vettore ha metadati strutturati che permettono il re-ranking e la formattazione del contesto:

| Campo | Tipo | Esempio | Descrizione |
|-------|------|---------|-------------|
| `text` | string (≤700 char) | "I sistemi di IA ad alto rischio..." | Estratto testuale del chunk |
| `chunk_type` | string | `"article"`, `"annex"` | Tipo di unità normativa |
| `article_number` | number | `14` | Numero articolo, se applicabile |
| `article_title` | string | `"Supervisione umana"` | Titolo dell'articolo |
| `annex_reference` | string[] | `["III"]` | Allegati di riferimento |
| `applies_to` | string[] | `["provider", "deployer"]` | A chi si applica |
| `risk_category` | string[] | `["high"]` | Categorie di rischio coperte |
| `enforcement_date` | string | `"2026-08-02"` | Data di applicabilità |
| `keywords` | string[] | `["supervisione", "umana", "override"]` | Parole chiave per il retrieval |

**Limite tecnico importante:** S3 Vectors impone un massimo di 2048 byte per record di metadati e non accetta array vuoti — per questo i campi opzionali vengono omessi se non hanno valore.

---

## Fase 1 — Costruzione delle Query

Per ogni assessment, il sistema costruisce automaticamente **6-7 query tematiche** a partire dai dati del form. Ogni query ha un peso (`weight`) che ne determina l'importanza relativa nel retrieval.

| # | Tema | Peso | Trigger |
|---|------|------|---------|
| 1 | Obblighi per ruolo (provider/deployer) | 1.0 | Sempre |
| 2 | Classificazione del sistema AI per categoria | 1.2 | Per ogni tool dichiarato |
| 3 | Decisioni automatizzate per dominio | 1.5 | Per ogni dominio decisionale |
| 4 | Trattamento dati sensibili | 1.0 | Se `data_types` non è vuoto |
| 5 | Pratiche vietate (Art. 5) | 2.0 | Sempre — peso massimo |
| 6 | Trasparenza verso utenti (Art. 50) | 1.3 | Se `human_oversight = never` o presenza chatbot |
| 7 | Sanzioni (Art. 99) | 0.8 | Sempre |

**Esempio** per un sistema HR deployer con dati sanitari:
```
Q1: "obblighi deployer AI Act Regolamento EU 2024 1689"
Q2: "sistema AI hr recruiting rischio classificazione Allegato III"
Q3: "decisioni automatiche hr persone fisiche alto rischio"
Q4: "dati health trattamento AI obblighi"
Q5: "pratiche vietate proibite AI Act articolo 5 manipolazione sorveglianza biometrica"
Q7: "sanzioni violazione AI Act articolo 99 multa percentuale fatturato"
```

---

## Fase 2 — Embedding

Ogni query testuale viene convertita in un **vettore numerico** di 1024 dimensioni usando **Amazon Titan Text Embeddings V2**.

```
"obblighi deployer AI Act"  →  [0.023, -0.187, 0.441, ..., 0.012]  (1024 numeri)
```

Il vettore cattura il significato semantico della frase: query simili producono vettori simili, indipendentemente dalle parole esatte usate. Questo permette di trovare articoli pertinenti anche se usano una terminologia diversa dalla query.

**Parametri tecnici:**
- Modello: `amazon.titan-embed-text-v2:0`
- Dimensioni: `1024` (Titan V2 supporta 256, 512, 1024 — è stato scelto il massimo)
- Normalizzazione: `true` (vettori normalizzati a lunghezza unitaria per comparabilità)
- Input limit: `8000 caratteri` per query

---

## Fase 3 — Vector Search

Per ogni query, il sistema interroga S3 Vectors cercando i **chunk più simili** nella knowledge base usando la **similarità coseno** (1 − distanza coseno).

```
Configurazione ricerca:
  TOP_K                = 5        → max 5 chunk per query
  SIMILARITY_THRESHOLD = 0.72     → scarta chunk con similarità < 72%
  MAX_CHUNKS (totale)  = 20       → tetto globale dopo dedup
```

Con 7 query × 5 chunk = 35 candidati massimi, ridotti a ≤20 dopo deduplicazione.

**Come si interpreta la soglia 0.72:** un chunk con score 0.90+ è fortemente pertinente, 0.75-0.89 è pertinente, 0.72-0.74 è al limite. Sotto 0.72 viene scartato.

---

## Fase 4 — Deduplicazione e Re-ranking

Molte query diverse recuperano gli stessi chunk (es. Art. 14 compare per la query "supervisione umana" E per la query "obblighi deployer"). La deduplicazione elimina i duplicati tenendo il chunk con lo score migliore.

Dopo la dedup, i chunk vengono **ri-ordinati** secondo una logica di priorità normativa:

| Priorità | Condizione | Motivazione |
|----------|------------|-------------|
| 1 (più alta) | `article_number` ∈ {5, 6, 7} | Articoli fondamentali: pratiche vietate, alto rischio, GPAI |
| 2 | `annex_reference` include "III" | Allegato III: categorie alto rischio |
| 3 (più bassa) | Tutti gli altri | Ordinati per score di similarità |

Questo garantisce che il contesto iniziale del prompt contenga sempre gli articoli più rilevanti dal punto di vista normativo, anche se non hanno lo score di similarità più alto.

---

## Fase 5 — Assemblaggio del Contesto

I chunk vengono formattati in un blocco testuale strutturato, numerato, con la citazione della fonte:

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
...
```

Questo blocco viene iniettato nel prompt del LLM prima dei dati aziendali.

---

## Parametri configurabili (env vars)

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `S3_VECTORS_BUCKET` | `actify-saas-ai-act-knowledge-base` | Bucket S3 Vectors con la knowledge base |
| `S3_VECTORS_INDEX` | `ai-act-it` | Nome dell'indice vettoriale |
| `S3_VECTORS_REGION` | `eu-central-1` | Regione AWS del bucket |
| `EMBEDDING_MODEL_ID` | `amazon.titan-embed-text-v2:0` | Modello di embedding |
| `EMBEDDING_REGION` | `eu-central-1` | Regione per le chiamate Bedrock embedding |
| `TOP_K` | `5` | Chunk recuperati per singola query |
| `MAX_CHUNKS` | `20` | Tetto totale chunk dopo dedup |
| `SIMILARITY_THRESHOLD` | `0.72` | Soglia minima di similarità (0–1) |
| `RAG_ENABLED` | `true` | Disabilita la RAG senza rimuovere il codice |

---

## Comportamento in caso di errore

Se S3 Vectors o Bedrock Embeddings non risponde, il sistema fa **fallback silenzioso** al system prompt statico (15k token di testo normativo hard-coded). L'assessment continua normalmente — l'utente non vede errori.

Il fallback viene loggato internamente a livello `warn` per il monitoraggio operativo.

---

## Limiti attuali

- **Aggiornamenti normativi:** se l'AI Act viene aggiornato (atti delegati, linee guida EAIA), la knowledge base va re-ingerita manualmente con `ingestion/ingest_ai_act.py`.
- **Lingua:** la knowledge base è in italiano. Query in altre lingue funzionano (embedding è multilingue) ma con performance leggermente inferiore.
- **Chunk context:** ogni chunk è limitato a 700 caratteri di testo — articoli molto lunghi sono troncati. Per articoli chiave (Art. 5, Art. 6) questo non è un problema perché compaiono in chunk multipli.
