"""
Actify RAG — Ingestion Pipeline for AI Act (Reg. UE 2024/1689)
Reads the official Italian PDF, parses normative structure, chunks by unit,
embeds with Titan Text Embeddings V2, and uploads to S3 Vectors.

Usage:
  pip install -r requirements.txt
  export AWS_PROFILE=<your-profile>  # or set AWS_ACCESS_KEY_ID / SECRET
  python ingest_ai_act.py --pdf AI_Act_EU_2024_1689_IT.pdf \
                          --bucket actify-ai-act-knowledge-base \
                          --index ai-act-it \
                          --region eu-central-1

Estimated cost: ~$0.10–0.20 (one-time embedding generation)
Estimated time: 5–15 minutes
"""

import argparse
import json
import re
import time
import sys
from dataclasses import dataclass, field, asdict
from typing import Optional
import boto3

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber not installed. Run: pip install pdfplumber")
    sys.exit(1)

try:
    import tiktoken
except ImportError:
    print("ERROR: tiktoken not installed. Run: pip install tiktoken")
    sys.exit(1)


# ─── Config ──────────────────────────────────────────────────────────────────

EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0"
EMBEDDING_DIMS = 1024   # Titan v2: 256 | 512 | 1024 (v1 was 1536)
BATCH_SIZE = 10          # vectors per PutVectors call
EMBED_RATE_LIMIT_S = 0.1 # seconds between embedding calls (avoid throttling)

# Token budget per chunk type (target, not hard limit)
CHUNK_TOKEN_TARGET = {
    "article":    500,
    "annex":      300,
    "recital":    400,
    "definition": 150,
}
CHUNK_TOKEN_MAX = 600
OVERLAP_TOKENS = 80

# Article-level metadata overrides for priority articles
ARTICLE_META: dict[int, dict] = {
    5:  {"applies_to": ["provider", "deployer", "both"], "risk_category": ["prohibited"],
         "enforcement_date": "2025-02-02", "keywords": ["pratiche vietate", "proibito", "divieto"]},
    6:  {"applies_to": ["provider"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["classificazione", "alto rischio", "annex III"]},
    7:  {"applies_to": ["provider"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["aggiornamento allegato III", "atti delegati"]},
    8:  {"applies_to": ["provider"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["requisiti", "conformità"]},
    9:  {"applies_to": ["provider"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["gestione rischio", "risk management"]},
    10: {"applies_to": ["provider"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["dati", "governance dati", "addestramento"]},
    11: {"applies_to": ["provider"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["documentazione tecnica"]},
    12: {"applies_to": ["provider"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["registri", "log", "logging"]},
    13: {"applies_to": ["provider"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["trasparenza", "istruzioni uso", "deployer"]},
    14: {"applies_to": ["provider", "deployer", "both"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["supervisione umana", "human oversight"]},
    15: {"applies_to": ["provider"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["accuratezza", "robustezza", "sicurezza informatica"]},
    26: {"applies_to": ["deployer"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["obblighi deployer", "utilizzatore", "supervisione"]},
    27: {"applies_to": ["deployer"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["FRIA", "valutazione impatto diritti fondamentali"]},
    50: {"applies_to": ["provider", "deployer", "both"], "risk_category": ["limited"],
         "enforcement_date": "2026-08-02",
         "keywords": ["trasparenza utenti", "chatbot", "AI disclosure", "interazione"]},
    53: {"applies_to": ["provider"], "risk_category": ["gpai"],
         "enforcement_date": "2025-08-02", "keywords": ["modelli GPAI", "obblighi GPAI", "documentazione GPAI"]},
    54: {"applies_to": ["provider"], "risk_category": ["gpai"],
         "enforcement_date": "2025-08-02", "keywords": ["open source", "GPAI open source"]},
    55: {"applies_to": ["provider"], "risk_category": ["gpai"],
         "enforcement_date": "2025-08-02",
         "keywords": ["rischio sistemico", "GPAI rischio sistemico", "red teaming"]},
    72: {"applies_to": ["provider"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02",
         "keywords": ["monitoraggio post-commercializzazione", "post-market monitoring"]},
    73: {"applies_to": ["provider", "deployer", "both"], "risk_category": ["high_risk"],
         "enforcement_date": "2026-08-02", "keywords": ["incidenti gravi", "segnalazione incidenti"]},
    99: {"applies_to": ["provider", "deployer", "both"],
         "risk_category": ["prohibited", "high_risk", "limited"],
         "enforcement_date": "2025-02-02",
         "keywords": ["sanzioni", "multe", "penalità", "violazione"]},
    3:  {"applies_to": ["provider", "deployer", "both"], "risk_category": ["all"],
         "enforcement_date": "2025-02-02", "keywords": ["definizioni"]},
}

ANNEX_META: dict[str, dict] = {
    "I":   {"applies_to": ["provider"], "risk_category": ["high_risk"],
            "enforcement_date": "2027-08-02",
            "keywords": ["legislazione armonizzazione", "prodotti sicurezza", "Annex I"]},
    "III": {"applies_to": ["provider", "deployer", "both"], "risk_category": ["high_risk"],
            "enforcement_date": "2026-08-02",
            "keywords": ["sistemi alto rischio", "Annex III", "categorie rischio"]},
    "IV":  {"applies_to": ["provider"], "risk_category": ["high_risk"],
            "enforcement_date": "2026-08-02",
            "keywords": ["documentazione tecnica", "Annex IV"]},
    "VI":  {"applies_to": ["provider"], "risk_category": ["high_risk"],
            "enforcement_date": "2026-08-02",
            "keywords": ["conformità", "self-assessment", "Annex VI"]},
    "VII": {"applies_to": ["provider"], "risk_category": ["high_risk"],
            "enforcement_date": "2026-08-02",
            "keywords": ["sistema gestione qualità", "QMS", "Annex VII"]},
}

# Domain keywords → decision_domains tags
DOMAIN_KEYWORDS = {
    "hiring":           ["assunzione", "reclutamento", "selezione candidati", "CV", "colloquio"],
    "credit_scoring":   ["credito", "rating creditizio", "affidabilità creditizia", "prestito"],
    "healthcare":       ["sanitario", "medico", "diagnosi", "paziente", "salute"],
    "education":        ["istruzione", "educazione", "studente", "valutazione apprendimento"],
    "law_enforcement":  ["polizia", "forze dell'ordine", "law enforcement", "contrasto"],
    "insurance":        ["assicurazione", "polizza", "tariffazione", "underwriting"],
    "public_services":  ["servizi pubblici", "prestazioni sociali", "sussidi", "autorità pubblica"],
    "biometrics":       ["biometrico", "riconoscimento facciale", "identificazione biometrica"],
    "workplace":        ["lavoratori", "dipendenti", "posto di lavoro", "prestazioni lavoratori"],
}


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class ParsedUnit:
    """One normative unit extracted from the PDF (article, recital, annex section)."""
    unit_type: str          # "article" | "recital" | "annex" | "definition"
    number: Optional[int]   # article/recital number
    annex_id: Optional[str] # "I", "II", "III" …
    title: Optional[str]
    text: str
    chapter: str = ""
    section: str = ""


@dataclass
class Chunk:
    """Final chunk ready for embedding and upload."""
    chunk_id: str
    chunk_type: str
    text: str
    article_number: Optional[int]
    article_title: Optional[str]
    chapter: str
    section_: str        # renamed to avoid shadowing builtins
    applies_to: list[str]
    risk_category: list[str]
    decision_domains: list[str]
    annex_reference: list[str]
    enforcement_date: str
    keywords: list[str]
    token_count: int = 0


# ─── PDF Extraction ───────────────────────────────────────────────────────────

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract full text from PDF, preserving page breaks as '\n\n'."""
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            text = page.extract_text(layout=False) or ""
            pages.append(text)
            if (i + 1) % 20 == 0:
                print(f"  Extracted page {i+1}/{total}…")
    return "\n\n".join(pages)


# ─── Structure Parser ─────────────────────────────────────────────────────────

# Regexes for Italian AI Act structure
RE_ARTICLE    = re.compile(r"(?:^|\n)\s*Articolo\s+(\d+)\s*[\n\r—–-]?\s*(.{0,120}?)(?=\n)", re.IGNORECASE)
RE_RECITAL    = re.compile(r"(?:^|\n)\s*[Cc]onsiderando\s+\((\d+)\)", re.IGNORECASE)
RE_ANNEX      = re.compile(r"(?:^|\n)\s*ALLEGATO\s+([IVX]+)\b", re.IGNORECASE)
RE_CHAPTER    = re.compile(r"(?:^|\n)\s*CAPO\s+([IVXLC]+)\b", re.IGNORECASE)
RE_SECTION    = re.compile(r"(?:^|\n)\s*Sezione\s+(\d+)\b", re.IGNORECASE)

def parse_structure(raw_text: str) -> list[ParsedUnit]:
    """
    Walk the raw text and split it into ParsedUnit objects.
    Strategy: find all article/recital/annex headings, then slice text between them.
    """
    # Build a sorted list of (position, type, identifier) markers
    markers = []

    for m in RE_ARTICLE.finditer(raw_text):
        art_num = int(m.group(1))
        art_title = m.group(2).strip().rstrip("—–-").strip()
        markers.append((m.start(), "article", art_num, art_title, None))

    for m in RE_RECITAL.finditer(raw_text):
        rec_num = int(m.group(1))
        markers.append((m.start(), "recital", rec_num, None, None))

    for m in RE_ANNEX.finditer(raw_text):
        annex_id = m.group(1).upper()
        markers.append((m.start(), "annex", None, None, annex_id))

    markers.sort(key=lambda x: x[0])

    units: list[ParsedUnit] = []
    current_chapter = ""
    current_section = ""

    for i, marker in enumerate(markers):
        pos, unit_type, number, title, annex_id = marker

        # Determine text span
        end_pos = markers[i + 1][0] if i + 1 < len(markers) else len(raw_text)
        text_slice = raw_text[pos:end_pos].strip()

        # Update chapter/section context from text
        chap_m = RE_CHAPTER.search(text_slice)
        if chap_m:
            current_chapter = chap_m.group(1)
        sec_m = RE_SECTION.search(text_slice)
        if sec_m:
            current_section = sec_m.group(1)

        if not text_slice:
            continue

        units.append(ParsedUnit(
            unit_type=unit_type,
            number=number,
            annex_id=annex_id,
            title=title,
            text=text_slice,
            chapter=current_chapter,
            section=current_section,
        ))

    print(f"  Parsed {len(units)} normative units "
          f"({sum(1 for u in units if u.unit_type=='article')} articles, "
          f"{sum(1 for u in units if u.unit_type=='recital')} recitals, "
          f"{sum(1 for u in units if u.unit_type=='annex')} annex sections)")
    return units


# ─── Chunking ─────────────────────────────────────────────────────────────────

_enc = tiktoken.get_encoding("cl100k_base")

def token_count(text: str) -> int:
    return len(_enc.encode(text))


def split_by_comma(text: str, max_tokens: int, overlap_tokens: int) -> list[str]:
    """Split text into sub-chunks by paragraph/comma boundaries under max_tokens."""
    # Split on double newlines (paragraph breaks) or numbered list items
    paragraphs = re.split(r"\n{2,}|\n(?=\d+\.\s)", text)
    chunks: list[str] = []
    current = ""
    overlap_text = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        candidate = (overlap_text + "\n" + para).strip() if overlap_text else para
        if token_count(candidate) <= max_tokens:
            current = candidate
        else:
            if current:
                chunks.append(current)
                # Compute overlap: last ~overlap_tokens from current
                words = current.split()
                overlap_words: list[str] = []
                acc = 0
                for w in reversed(words):
                    acc += token_count(w)
                    if acc > overlap_tokens:
                        break
                    overlap_words.insert(0, w)
                overlap_text = " ".join(overlap_words)
            current = (overlap_text + "\n" + para).strip() if overlap_text else para

    if current:
        chunks.append(current)

    return chunks or [text]


def infer_decision_domains(text: str) -> list[str]:
    text_lower = text.lower()
    domains = []
    for domain, keywords in DOMAIN_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            domains.append(domain)
    return domains


def make_chunk(
    unit: ParsedUnit,
    sub_idx: int,
    text: str,
    total_sub: int,
) -> Chunk:
    """Build a Chunk from a parsed unit + sub-chunk text."""
    if unit.unit_type == "article" and unit.number is not None:
        suffix = "" if total_sub == 1 else f"_p{sub_idx+1}"
        chunk_id = f"art_{unit.number}{suffix}"
    elif unit.unit_type == "recital" and unit.number is not None:
        suffix = "" if total_sub == 1 else f"_p{sub_idx+1}"
        chunk_id = f"rec_{unit.number}{suffix}"
    elif unit.unit_type == "annex" and unit.annex_id:
        suffix = "" if total_sub == 1 else f"_p{sub_idx+1}"
        chunk_id = f"annex_{unit.annex_id.lower()}{suffix}"
    else:
        chunk_id = f"unit_{sub_idx}"

    # Pull metadata from overrides, fall back to inference
    meta: dict = {}
    if unit.unit_type == "article" and unit.number in ARTICLE_META:
        meta = ARTICLE_META[unit.number]
    elif unit.unit_type == "annex" and unit.annex_id in ANNEX_META:
        meta = ANNEX_META[unit.annex_id]

    applies_to    = meta.get("applies_to", [])
    risk_category = meta.get("risk_category", [])
    enforcement   = meta.get("enforcement_date", "2026-08-02")
    keywords      = meta.get("keywords", [])
    decision_domains = infer_decision_domains(text)
    annex_ref = [unit.annex_id] if unit.annex_id else []

    return Chunk(
        chunk_id=chunk_id,
        chunk_type=unit.unit_type,
        text=text,
        article_number=unit.number,
        article_title=unit.title,
        chapter=unit.chapter,
        section_=unit.section,
        applies_to=applies_to,
        risk_category=risk_category,
        decision_domains=decision_domains,
        annex_reference=annex_ref,
        enforcement_date=enforcement,
        keywords=keywords,
        token_count=token_count(text),
    )


def chunk_document(units: list[ParsedUnit]) -> list[Chunk]:
    """Convert parsed units into final chunks respecting token budgets."""
    chunks: list[Chunk] = []
    seen_ids: set[str] = set()

    for unit in units:
        target  = CHUNK_TOKEN_TARGET.get(unit.unit_type, 400)
        max_tok = CHUNK_TOKEN_MAX

        if token_count(unit.text) <= max_tok:
            sub_chunks = [unit.text]
        else:
            sub_chunks = split_by_comma(unit.text, target, OVERLAP_TOKENS)

        sub_list = [make_chunk(unit, i, sc, len(sub_chunks))
                    for i, sc in enumerate(sub_chunks)]

        # Ensure unique chunk IDs
        for ch in sub_list:
            original_id = ch.chunk_id
            counter = 1
            while ch.chunk_id in seen_ids:
                ch.chunk_id = f"{original_id}_v{counter}"
                counter += 1
            seen_ids.add(ch.chunk_id)

        chunks.extend(sub_list)

    print(f"  Generated {len(chunks)} chunks "
          f"(avg {sum(c.token_count for c in chunks)//max(1,len(chunks))} tokens)")
    return chunks


# ─── Embedding Generation ─────────────────────────────────────────────────────

def embed_text(bedrock_client, text: str) -> list[float]:
    """Call Titan Text Embeddings V2 via Bedrock InvokeModel."""
    body = json.dumps({
        "inputText":  text,
        "dimensions": EMBEDDING_DIMS,   # 1024 for v2
        "normalize":  True,
    })
    response = bedrock_client.invoke_model(
        modelId=EMBEDDING_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=body,
    )
    result = json.loads(response["body"].read())
    return result["embedding"]


def generate_embeddings(
    bedrock_client,
    chunks: list[Chunk],
) -> list[tuple[Chunk, list[float]]]:
    """Embed all chunks, with progress reporting and rate limiting."""
    result = []
    total = len(chunks)
    for i, chunk in enumerate(chunks):
        try:
            embedding = embed_text(bedrock_client, chunk.text)
            result.append((chunk, embedding))
        except Exception as e:
            print(f"  WARN: embedding failed for {chunk.chunk_id}: {e} — skipping")
            continue

        if (i + 1) % 10 == 0 or (i + 1) == total:
            print(f"  Embedded {i+1}/{total} chunks…")

        time.sleep(EMBED_RATE_LIMIT_S)

    return result


# ─── S3 Vectors Upload ────────────────────────────────────────────────────────

def build_vector_payload(chunk: Chunk, embedding: list[float]) -> dict:
    """Build the vector payload for PutVectors.

    S3 Vectors limits: metadata ≤ 2048 bytes total, no empty arrays allowed.
    We store a short text excerpt (~700 chars) plus compact metadata fields.
    Full chunk text is retrievable via chunk_id if needed.
    """
    # Start with compact mandatory fields
    metadata: dict = {
        "text":       chunk.text[:700],      # excerpt for context — keeps metadata < 2048 bytes
        "chunk_type": chunk.chunk_type,
        "enforcement_date": chunk.enforcement_date,
    }

    # Add optional fields only if they have values (no empty arrays/strings)
    if chunk.article_number is not None:
        metadata["article_number"] = chunk.article_number
    if chunk.article_title:
        metadata["article_title"] = chunk.article_title[:100]  # truncate long titles
    if chunk.chapter:
        metadata["chapter"] = chunk.chapter
    if chunk.section_:
        metadata["section"] = chunk.section_
    if chunk.applies_to:
        metadata["applies_to"] = chunk.applies_to
    if chunk.risk_category:
        metadata["risk_category"] = chunk.risk_category
    if chunk.decision_domains:
        metadata["decision_domains"] = chunk.decision_domains[:4]  # cap list size
    if chunk.annex_reference:
        metadata["annex_reference"] = chunk.annex_reference
    if chunk.keywords:
        metadata["keywords"] = chunk.keywords[:5]   # cap at 5 keywords

    return {
        "key":      chunk.chunk_id,
        "data":     {"float32": embedding},
        "metadata": metadata,
    }


def upload_to_s3_vectors(
    s3vectors_client,
    chunks_with_embeddings: list[tuple[Chunk, list[float]]],
    bucket_name: str,
    index_name: str,
) -> None:
    """Upload vectors in batches to S3 Vectors."""
    total = len(chunks_with_embeddings)
    uploaded = 0
    errors = 0

    for batch_start in range(0, total, BATCH_SIZE):
        batch = chunks_with_embeddings[batch_start:batch_start + BATCH_SIZE]
        vectors = [build_vector_payload(c, e) for c, e in batch]

        try:
            s3vectors_client.put_vectors(
                vectorBucketName=bucket_name,
                indexName=index_name,
                vectors=vectors,
            )
            uploaded += len(batch)
            print(f"  Uploaded {uploaded}/{total} vectors…")
        except Exception as e:
            print(f"  ERROR: batch upload failed ({e})")
            errors += len(batch)

    print(f"\n  Upload complete: {uploaded} succeeded, {errors} failed")


def ensure_index(s3vectors_client, bucket_name: str, index_name: str) -> None:
    """Create the vector index if it doesn't exist."""
    try:
        s3vectors_client.get_index(
            vectorBucketName=bucket_name,
            indexName=index_name,
        )
        print(f"  Index '{index_name}' already exists — skipping creation")
    except s3vectors_client.exceptions.NotFoundException:
        print(f"  Creating index '{index_name}'…")
        s3vectors_client.create_index(
            vectorBucketName=bucket_name,
            indexName=index_name,
            dataType="float32",
            dimension=EMBEDDING_DIMS,
            distanceMetric="cosine",
        )
        print(f"  Index '{index_name}' created")
    except s3vectors_client.exceptions.ConflictException:
        print(f"  Index '{index_name}' already exists — skipping creation")
    except Exception as e:
        print(f"  WARNING: could not verify/create index: {e}")


# ─── Main Pipeline ────────────────────────────────────────────────────────────

def run_ingestion_pipeline(
    pdf_path: str,
    s3_bucket: str,
    index_name: str,
    region: str,
    bedrock_region: str,
    dry_run: bool = False,
) -> None:
    print("\n" + "="*60)
    print("Actify RAG — AI Act Ingestion Pipeline")
    print("="*60)

    # Step 1: Extract text
    print("\n[1/5] Extracting text from PDF…")
    raw_text = extract_text_from_pdf(pdf_path)
    print(f"  Extracted {len(raw_text):,} characters from '{pdf_path}'")

    # Step 2: Parse structure
    print("\n[2/5] Parsing normative structure…")
    units = parse_structure(raw_text)

    # Step 3: Chunk
    print("\n[3/5] Chunking by normative unit…")
    chunks = chunk_document(units)

    # Distribution stats
    type_counts = {}
    for c in chunks:
        type_counts[c.chunk_type] = type_counts.get(c.chunk_type, 0) + 1
    for t, n in type_counts.items():
        print(f"  {t}: {n} chunks")

    if dry_run:
        print("\n[DRY RUN] Skipping embedding and upload. Sample chunks:")
        for ch in chunks[:5]:
            print(f"  {ch.chunk_id} | {ch.token_count}tok | {ch.applies_to} | {ch.keywords[:3]}")
        print(f"\nTotal chunks that would be uploaded: {len(chunks)}")
        return

    # Step 4: Generate embeddings
    print(f"\n[4/5] Generating embeddings via Bedrock ({bedrock_region}) — Titan V2…")
    bedrock_client = boto3.client("bedrock-runtime", region_name=bedrock_region)
    chunks_with_embeddings = generate_embeddings(bedrock_client, chunks)
    print(f"  {len(chunks_with_embeddings)}/{len(chunks)} chunks embedded successfully")

    # Step 5: Upload to S3 Vectors
    print(f"\n[5/5] Uploading to S3 Vectors bucket '{s3_bucket}' / index '{index_name}'…")
    s3v_client = boto3.client("s3vectors", region_name=region)
    ensure_index(s3v_client, s3_bucket, index_name)
    upload_to_s3_vectors(s3v_client, chunks_with_embeddings, s3_bucket, index_name)

    print("\n" + "="*60)
    print("Ingestion pipeline COMPLETE")
    print(f"  Bucket:  {s3_bucket}")
    print(f"  Index:   {index_name}")
    print(f"  Vectors: {len(chunks_with_embeddings)}")
    print("="*60 + "\n")


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Actify RAG ingestion — AI Act PDF → S3 Vectors")
    parser.add_argument("--pdf",            required=True,  help="Path to AI Act PDF (Italian)")
    parser.add_argument("--bucket",         default="actify-ai-act-knowledge-base")
    parser.add_argument("--index",          default="ai-act-it")
    parser.add_argument("--region",         default="eu-central-1",  help="S3 Vectors region")
    parser.add_argument("--bedrock-region", default="eu-central-1",  help="Bedrock region for embeddings")
    parser.add_argument("--dry-run",        action="store_true",     help="Parse and chunk only, no AWS calls")

    args = parser.parse_args()

    run_ingestion_pipeline(
        pdf_path=args.pdf,
        s3_bucket=args.bucket,
        index_name=args.index,
        region=args.region,
        bedrock_region=args.bedrock_region,
        dry_run=args.dry_run,
    )
