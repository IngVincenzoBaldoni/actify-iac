# SDD — Migrazione Backend Actify: da System Prompt Statico a RAG con S3 Vectors

**Versione:** 1.0  
**Data:** Maggio 2026  
**Stato:** Draft — da revisionare prima di passare a Claude Code

---

## 1. Obiettivo

Sostituire il system prompt statico da 15k token (sintesi AI Act) con un sistema RAG (Retrieval-Augmented Generation) che utilizza il testo integrale del Regolamento UE 2024/1689 (AI Act) come knowledge base su S3 Vectors.

**Obiettivi primari:**
- Ridurre le allucinazioni ancorando ogni output a chunks specifici del testo normativo
- Aumentare la precisione del matching tra profilo utente e obblighi AI Act
- Mantenere invariato il formato JSON di output verso il frontend
- Rendere la knowledge base aggiornabile indipendentemente dal codice

---

## 2. Architettura Corrente

```
[Form Utente] 
    → [Lambda: assessment-generator]
        → System Prompt (15k token, sintesi AI Act hardcoded)
        + Form JSON (input utente)
        → [Amazon Bedrock - LLM]
        ← JSON strutturato (assessment result)
    ← [Frontend / PDF Generator]
```

**Problemi:**
- Sintesi AI Act = perdita di dettaglio normativo → allucinazioni
- System prompt statico non aggiornabile senza deploy
- Nessuna tracciabilità delle fonti normative usate per la risposta
- 15k token fissi consumati ad ogni chiamata indipendentemente dalla rilevanza

---

## 3. Architettura Target

```
[PDF AI Act Locale]
    → [Pipeline di Ingestion - script one-time]
        → Parsing strutturato (Articoli, Considerando, Allegati)
        → Chunking + Metadata
        → Embeddings (Bedrock: Titan Embeddings V2 / Cohere Multilingual V3)
        → [S3 Vectors - knowledge base]

[Form Utente]
    → [Lambda: assessment-generator v2]
        → Query Construction (da form JSON → query mirate)
        → Embedding queries
        → [S3 Vectors] ← Semantic Search (top-k chunks per query)
        → Re-ranking + Deduplication chunks
        → Prompt Assembly (system + retrieved context + form data)
        → [Amazon Bedrock - LLM]
        ← JSON strutturato (invariato rispetto a oggi)
    ← [Frontend / PDF Generator]
```

---

## 4. Pipeline di Ingestion (One-Time + Aggiornamenti)

### 4.1 Input
- File: `AI_Act_EU_2024_1689.pdf` (testo ufficiale, preferibilmente versione italiana o inglese — scegliere una sola lingua per coerenza con la lingua del form)
- **Raccomandazione:** usare la versione italiana del GURI/EUR-Lex per coerenza con i form in italiano

### 4.2 Step della Pipeline

```
1. PDF Extraction
   - Tool: pypdf2 o pdfplumber (migliore per layout complessi)
   - Output: testo grezzo con struttura preservata

2. Structure Parsing
   - Identificare e taggare:
     - Considerando (Recitals): "Considerando (N)"
     - Articoli: "Articolo N — Titolo"
     - Allegati: "Allegato I/II/III..."
     - Definizioni: Articolo 3
   - Output: lista di oggetti strutturati con tipo + numero + testo

3. Chunking (vedi Sezione 5)

4. Embedding Generation
   - Model: Amazon Titan Text Embeddings V2 (via Bedrock)
     - 1536 dimensioni, supporto multilingue, ottimo per testo legale
     - Alternativa: Cohere Embed Multilingual V3 (1024 dim, più leggero)
   - Batch processing per contenere i costi

5. Upload su S3 Vectors
   - Ogni chunk → vettore + metadata JSON
   - Struttura bucket: actify-ai-act-kb / {language} / {chunk_id}
```

### 4.3 Script di Ingestion (struttura)

```python
# ingestion/ingest_ai_act.py

def extract_text_from_pdf(pdf_path: str) -> str: ...
def parse_structure(raw_text: str) -> list[AiActChunk]: ...
def chunk_document(parsed: list[AiActChunk]) -> list[Chunk]: ...
def generate_embeddings(chunks: list[Chunk]) -> list[ChunkWithEmbedding]: ...
def upload_to_s3_vectors(chunks: list[ChunkWithEmbedding], bucket: str): ...

if __name__ == "__main__":
    run_ingestion_pipeline(
        pdf_path="AI_Act_EU_2024_1689_IT.pdf",
        s3_bucket="actify-ai-act-kb",
        language="it"
    )
```

---

## 5. Strategia di Chunking

Questa è la sezione più critica per la qualità delle risposte.

### 5.1 Principio Guida
L'AI Act ha una struttura normativa precisa — Articoli, Considerando, Allegati. Il chunk naturale è l'unità normativa, non una finestra di N token arbitraria.

### 5.2 Tipologie di Chunk e Dimensioni

| Tipo | Strategia | Token target | Overlap |
|------|-----------|-------------|---------|
| **Articolo** (corpo) | 1 chunk per articolo | 300–600 token | 80 token con articolo adiacente |
| **Articolo lungo** (>600 token) | Split per comma/paragrafo | 400–500 token | 100 token |
| **Allegato III** (high-risk list) | 1 chunk per categoria di rischio | 200–400 token | 50 token |
| **Allegato I** (definizioni AI) | 1 chunk per definizione/gruppo | 150–300 token | 0 (definizioni atomiche) |
| **Considerando** | Gruppo di 3–5 considerando tematicamente correlati | 300–500 token | 50 token |
| **Articolo 3** (definizioni) | 1 chunk per definizione | 100–200 token | 0 |

### 5.3 Overlap Strategy

L'overlap serve per non perdere contesto normativo che attraversa più commi o articoli contigui. Regole:

- **Tra commi dello stesso articolo:** overlap di 1 comma completo (~80-100 token)
- **Tra articoli adiacenti dello stesso Capo:** overlap del titolo + primo comma dell'articolo successivo
- **Tra Allegato III e articoli che lo richiamano:** NO overlap — gestire con metadata linking (vedi 5.4)
- **Considerando:** overlap minimo (50 token) — sono interpretativi, non normativi

### 5.4 Metadata per Chunk

Ogni chunk deve avere questi metadata per permettere retrieval filtrato:

```json
{
  "chunk_id": "art_26_comma_1",
  "chunk_type": "article | recital | annex | definition",
  "article_number": 26,
  "article_title": "Obblighi dei deployer di sistemi AI ad alto rischio",
  "chapter": "III",
  "section": "4",
  "applies_to": ["deployer", "provider", "both"],
  "risk_category": ["high_risk", "prohibited", "limited", "minimal", "gpai"],
  "decision_domains": ["hiring", "credit_scoring", "healthcare", ...],
  "annex_reference": ["III", "IV"],
  "enforcement_date": "2026-08-02",
  "keywords": ["supervisione umana", "registro", "valutazione impatto"]
}
```

### 5.5 Articoli Prioritari (da verificare in fase di parsing)

Questi articoli devono essere chunked con cura massima — sono il cuore dell'assessment:

| Articolo | Contenuto | Rilevanza |
|----------|-----------|-----------|
| Art. 5 | Pratiche vietate | Massima — flag immediato |
| Art. 6-7 | Classificazione alto rischio | Massima — determina categoria |
| Allegato III | Lista sistemi alto rischio | Massima — matching diretto |
| Art. 8-15 | Requisiti sistemi alto rischio | Alta — obblighi provider |
| Art. 26 | Obblighi deployer | Alta — obblighi deployer |
| Art. 50 | Trasparenza verso utenti | Alta — Art. 50 check |
| Art. 53-55 | Modelli GPAI | Media — per LLM provider |
| Art. 3 | Definizioni | Media — disambiguazione |
| Art. 27 | FRIA | Alta — impatto assessment |
| Art. 72-73 | Sanzioni | Alta — mostrata nell'output |

---

## 6. Retrieval Strategy

### 6.1 Query Construction

Il form JSON viene trasformato in **query multiple mirate**, non in una query unica generica. Ogni query target un aspetto specifico dell'assessment.

```python
def build_queries_from_form(form_data: dict) -> list[Query]:
    queries = []
    
    # Query 1: Ruolo base
    role = "provider" if form_data["is_provider"] else "deployer"
    queries.append(Query(
        text=f"obblighi {role} AI Act regolamento EU 2024",
        metadata_filter={"applies_to": [role, "both"]},
        weight=1.0
    ))
    
    # Query 2: Per ogni sistema AI censito
    for system in form_data["systems"]:
        queries.append(Query(
            text=f"sistema AI {system['category']} {system['output_type']} rischio classificazione Allegato III",
            metadata_filter={"chunk_type": ["article", "annex"]},
            weight=1.2  # peso maggiore — specifica per sistema
        ))
    
    # Query 3: Per ogni decision domain selezionato
    for domain in form_data["decision_domains"]:
        queries.append(Query(
            text=f"decisioni automatiche {domain} persone fisiche alto rischio",
            metadata_filter={"decision_domains": [domain]},
            weight=1.5  # peso massimo — determina alto rischio
        ))
    
    # Query 4: Per tipologie di dati sensibili
    if form_data["data_types"]:
        queries.append(Query(
            text=f"dati {' '.join(form_data['data_types'])} trattamento AI obblighi",
            metadata_filter={"risk_category": ["high_risk"]},
            weight=1.0
        ))
    
    # Query 5: Pratiche vietate (sempre inclusa)
    queries.append(Query(
        text="pratiche vietate proibite AI Act articolo 5",
        metadata_filter={"article_number": 5},
        weight=2.0  # sempre recuperata
    ))
    
    # Query 6: Trasparenza Art. 50 se utenti non informati
    if not form_data.get("users_aware_of_ai"):
        queries.append(Query(
            text="obbligo trasparenza utenti interazione sistema AI articolo 50",
            metadata_filter={"article_number": 50},
            weight=1.3
        ))
    
    return queries
```

### 6.2 Retrieval Parameters

```python
RETRIEVAL_CONFIG = {
    "top_k_per_query": 5,        # chunk per query
    "max_total_chunks": 20,       # cap totale dopo deduplicazione
    "similarity_threshold": 0.72, # scartare chunk sotto questa soglia
    "max_context_tokens": 8000,   # budget token per il contesto RAG
    "rerank": True                # riordinare per relevance score
}
```

### 6.3 Deduplication e Re-ranking

```python
def prepare_context(retrieved_chunks: list[Chunk]) -> list[Chunk]:
    # 1. Deduplicazione per chunk_id
    seen = set()
    unique = [c for c in retrieved_chunks if not (c.id in seen or seen.add(c.id))]
    
    # 2. Ordinamento: prima per tipo (art. 5 e Allegato III sempre primi)
    priority_articles = {5, 6, 7}
    priority_annexes = {"III"}
    
    def priority_score(chunk):
        if chunk.article_number in priority_articles: return 0
        if chunk.annex_reference in priority_annexes: return 1
        return 2
    
    sorted_chunks = sorted(unique, key=lambda c: (priority_score(c), -c.similarity_score))
    
    # 3. Troncamento al budget token
    return truncate_to_token_budget(sorted_chunks, max_tokens=8000)
```

---

## 7. Prompt Assembly

### 7.1 Struttura del Prompt (invariata nella logica, migliorata nel contenuto)

```
SYSTEM:
Sei un esperto di AI Act (Regolamento UE 2024/1689). 
Analizza il profilo aziendale fornito e produci un assessment di compliance strutturato.
Basa OGNI conclusione esclusivamente sui passaggi normativi forniti nel contesto.
NON fare affermazioni normative non supportate da un articolo o allegato specifico.
Quando citi un obbligo, indica sempre l'articolo di riferimento.

CONTESTO NORMATIVO RECUPERATO:
[CHUNK 1 - Art. 5: Pratiche vietate]
{chunk_text}
Fonte: Articolo 5, AI Act

[CHUNK 2 - Allegato III: Sistemi Alto Rischio]
{chunk_text}
Fonte: Allegato III, AI Act

[... altri chunks recuperati ...]

PROFILO AZIENDALE:
{form_json}

OUTPUT:
Rispondi ESCLUSIVAMENTE con il JSON strutturato nel formato specificato.
```

### 7.2 Anti-hallucination Instructions (da aggiungere al system)

```
Regole ferme:
- Se un obbligo non è supportato da un chunk nel contesto, NON includerlo
- Per ogni finding nel JSON, popola il campo "legal_basis" con l'articolo/allegato di riferimento
- Se il contesto recuperato non è sufficiente per rispondere a un aspetto, 
  setta quel campo come "insufficient_context" invece di inventare
```

---

## 8. Output JSON (invariato)

Mantenere la struttura JSON esistente, aggiungere solo il campo `legal_basis` per tracciabilità:

```json
{
  "company_profile": { ... },
  "ai_role": "deployer | provider | both",
  "systems": [
    {
      "tool_name": "...",
      "risk_classification": "high_risk | limited | minimal | prohibited",
      "risk_reasons": ["..."],
      "legal_basis": ["Art. 6", "Allegato III cat. 4"],  // NUOVO
      "obligations": ["..."],
      "gaps": ["..."]
    }
  ],
  "governance_gaps": [...],
  "sanctions_exposure": {
    "max_fine_percentage": 3,
    "max_fine_absolute": 15000000,
    "legal_basis": "Art. 72"  // NUOVO
  },
  "priority_actions": [...],
  "compliance_score": 0-100,
  "context_chunks_used": ["art_5", "allegato_III_cat4", ...]  // NUOVO - per debug
}
```

---

## 9. Infrastructure

### 9.1 AWS Resources

```
S3 Vectors Bucket:
  - Nome: actify-ai-act-knowledge-base
  - Dimensioni vettori: 1536 (Titan V2) o 1024 (Cohere)
  - Chunks stimati: ~350-450 totali
  - Costo storage: trascurabile (<$1/mese)

Lambda: assessment-generator-v2
  - Runtime: Python 3.12
  - Memory: 512MB (aumentare da attuale se necessario)
  - Timeout: 60s (RAG + Bedrock call)
  - Env vars:
    - S3_VECTORS_BUCKET=actify-ai-act-knowledge-base
    - EMBEDDING_MODEL_ID=amazon.titan-embed-text-v2:0
    - LLM_MODEL_ID={model attuale invariato}
    - TOP_K=5
    - MAX_CHUNKS=20

IAM Policy aggiuntiva per Lambda:
  - s3vectors:QueryVectors
  - s3vectors:GetVectors
  - bedrock:InvokeModel (già presente, aggiungere embedding model)
```

### 9.2 Ingestion Script (eseguito one-time in locale o su EC2)

```
Dipendenze Python:
  - pdfplumber (estrazione PDF)
  - boto3 (S3 Vectors + Bedrock)
  - tiktoken (conteggio token)
  - langdetect (verifica lingua)

Esecuzione stimata: 5-15 minuti per l'intero AI Act
Costo embedding: ~$0.10-0.20 (one-time)
```

---

## 10. Migration Plan

### Step 1 — Ingestion Pipeline (Locale)
- [ ] Installare dipendenze: `pip install pdfplumber boto3 tiktoken`
- [ ] Implementare `ingest_ai_act.py` secondo spec sezione 4
- [ ] Testare parsing strutturale su 10 articoli campione
- [ ] Verificare chunk size distribution (target: 80% dei chunk tra 300-600 token)
- [ ] Eseguire ingestion completa su S3 Vectors
- [ ] Verificare upload: contare chunks, spot-check metadata

### Step 2 — Lambda v2 (sviluppo)
- [ ] Creare `assessment-generator-v2` partendo dalla Lambda esistente
- [ ] Implementare `build_queries_from_form()` 
- [ ] Implementare retrieval da S3 Vectors
- [ ] Implementare `prepare_context()` (dedup + rerank)
- [ ] Aggiornare prompt assembly
- [ ] Mantenere invariato il blocco di chiamata Bedrock e il parsing JSON output

### Step 3 — Testing
- [ ] Test con 5 profili aziendali campione (1 deployer puro, 1 provider puro, 1 both, 1 alto rischio, 1 minimo rischio)
- [ ] Confrontare output v1 (system prompt statico) vs v2 (RAG) su stessi input
- [ ] Verificare che ogni finding abbia `legal_basis` popolato
- [ ] Verificare assenza di hallucination su articoli specifici (spot-check manuale)
- [ ] Misurare latenza: target <15s end-to-end

### Step 4 — Switch
- [ ] Deploy Lambda v2
- [ ] Tenere Lambda v1 come fallback per 2 settimane
- [ ] Monitorare CloudWatch per errori e latenza
- [ ] Switch definitivo dopo validazione

---

## 11. Considerazioni Aggiuntive

### Lingua
Scegliere UNA lingua per la knowledge base (consigliato: italiano, per coerenza con i form). Se in futuro si vuole supportare inglese, creare un secondo bucket separato, non mescolare lingue nello stesso vector store.

### Aggiornamenti Normativi
L'AI Act avrà atti delegati e linee guida successive. Il vantaggio del RAG è che si aggiorna riprocessando solo i documenti modificati senza toccare il codice Lambda. Creare quindi un processo di aggiornamento documentato.

### Costi Bedrock
Il RAG aggiunge una chiamata di embedding per ogni assessment (~$0.0001). Il contesto inviato al LLM sarà più lungo ma più preciso — il delta di costo è marginale rispetto al guadagno in qualità.

### Fallback
Se S3 Vectors non è disponibile o il retrieval fallisce, implementare fallback al system prompt statico esistente (mantenere il vecchio prompt come env var) per garantire continuità del servizio.
