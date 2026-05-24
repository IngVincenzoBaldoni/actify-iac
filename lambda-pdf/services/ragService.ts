import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  S3VectorsClient,
  QueryVectorsCommand,
  type QueryOutputVector,
} from "@aws-sdk/client-s3vectors";
import type { IntakePayload } from "../types/intake";

// ─── Config ───────────────────────────────────────────────────────────────────

const EMBEDDING_MODEL_ID =
  process.env.EMBEDDING_MODEL_ID ?? "amazon.titan-embed-text-v2:0";
const EMBEDDING_REGION =
  process.env.EMBEDDING_REGION ?? process.env.BEDROCK_REGION ?? "eu-central-1";

const S3_VECTORS_BUCKET =
  process.env.S3_VECTORS_BUCKET ?? "actify-ai-act-knowledge-base";
const S3_VECTORS_INDEX = process.env.S3_VECTORS_INDEX ?? "ai-act-it";
const S3_VECTORS_REGION =
  process.env.S3_VECTORS_REGION ?? process.env.S3_REGION ?? "eu-central-1";

const TOP_K_PER_QUERY      = Number(process.env.TOP_K ?? 5);
const MAX_TOTAL_CHUNKS     = Number(process.env.MAX_CHUNKS ?? 20);
const SIMILARITY_THRESHOLD = Number(process.env.SIMILARITY_THRESHOLD ?? 0.72);

// ─── Clients ──────────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({ region: EMBEDDING_REGION });
const s3vClient     = new S3VectorsClient({ region: S3_VECTORS_REGION });

// ─── Types ────────────────────────────────────────────────────────────────────

interface RetrievedChunk {
  chunk_id:       string;
  text:           string;
  chunk_type:     string;
  article_number?: number;
  article_title?:  string;
  annex_reference?: string[];
  applies_to?:    string[];
  risk_category?: string[];
  enforcement_date?: string;
  keywords?:      string[];
  score:          number;         // cosine similarity (1 − distance)
}

export interface RagContext {
  contextText:  string;           // assembled legal context for prompt
  chunksUsed:   string[];         // chunk_ids for debug / context_chunks_used field
}

// ─── Embedding ────────────────────────────────────────────────────────────────

async function embedText(text: string): Promise<number[]> {
  const body = JSON.stringify({
    inputText:  text.slice(0, 8000),  // Titan V2 input limit
    dimensions: 1024,                 // Titan v2: max is 1024 (v1 was 1536)
    normalize:  true,
  });

  const response = await bedrockClient.send(
    new InvokeModelCommand({
      modelId:      EMBEDDING_MODEL_ID,
      contentType:  "application/json",
      accept:       "application/json",
      body:         Buffer.from(body),
    })
  );

  const result = JSON.parse(Buffer.from(response.body).toString());
  return result.embedding as number[];
}

// ─── Query Construction ───────────────────────────────────────────────────────

interface Query {
  text:   string;
  weight: number;
}

function buildQueries(payload: IntakePayload): Query[] {
  const queries: Query[] = [];
  const role = payload.ai_role === "provider"
    ? "provider"
    : payload.ai_role === "both"
    ? "provider deployer"
    : "deployer";

  // Query 1: Base role obligations
  queries.push({
    text:   `obblighi ${role} AI Act Regolamento EU 2024 1689`,
    weight: 1.0,
  });

  // Query 2: Per AI tool declared
  for (const tool of payload.ai_tools.slice(0, 5)) {   // cap at 5 tools
    queries.push({
      text:   `sistema AI ${tool.category} ${tool.purpose} rischio classificazione Allegato III`,
      weight: 1.2,
    });
  }

  // Query 3: Decision domains (highest weight — determines high-risk classification)
  for (const domain of payload.decisions.decision_domains.slice(0, 4)) {
    queries.push({
      text:   `decisioni automatiche ${domain} persone fisiche alto rischio`,
      weight: 1.5,
    });
  }

  // Query 4: Sensitive data types
  if (payload.decisions.data_types.length > 0) {
    queries.push({
      text:   `dati ${payload.decisions.data_types.slice(0, 4).join(" ")} trattamento AI obblighi`,
      weight: 1.0,
    });
  }

  // Query 5: Prohibited practices — always included
  queries.push({
    text:   "pratiche vietate proibite AI Act articolo 5 manipolazione sorveglianza biometrica",
    weight: 2.0,
  });

  // Query 6: Transparency Art. 50 — when users are not informed of AI
  const notInformed =
    !payload.decisions.human_oversight_level ||
    payload.decisions.human_oversight_level === "never";
  if (notInformed || payload.context_notes.toLowerCase().includes("chatbot")) {
    queries.push({
      text:   "obbligo trasparenza utenti interazione sistema AI articolo 50 disclosure",
      weight: 1.3,
    });
  }

  // Query 7: Sanctions — always useful for report
  queries.push({
    text:   "sanzioni violazione AI Act articolo 99 multa percentuale fatturato",
    weight: 0.8,
  });

  return queries;
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

async function retrieveForQuery(
  queryText: string,
  topK: number,
): Promise<RetrievedChunk[]> {
  const vector = await embedText(queryText);

  const response = await s3vClient.send(
    new QueryVectorsCommand({
      vectorBucketName: S3_VECTORS_BUCKET,
      indexName:        S3_VECTORS_INDEX,
      queryVector:      { float32: vector },
      topK,
      returnMetadata:   true,
      returnDistance:   true,
    })
  );

  return (response.vectors ?? [])
    .filter((v: QueryOutputVector) => {
      const distance   = v.distance ?? 1;
      const similarity = 1 - distance;
      return similarity >= SIMILARITY_THRESHOLD;
    })
    .map((v: QueryOutputVector): RetrievedChunk => {
      // metadata is DocumentType — cast via unknown to access string keys
      const meta = (v.metadata ?? {}) as Record<string, unknown>;
      const distance = v.distance ?? 1;
      return {
        chunk_id:         v.key ?? "",
        text:             ((meta["text"] as string | undefined) ?? "").slice(0, 700),
        chunk_type:       (meta["chunk_type"] as string | undefined) ?? "unknown",
        article_number:   meta["article_number"] as number | undefined,
        article_title:    meta["article_title"] as string | undefined,
        annex_reference:  meta["annex_reference"] as string[] | undefined,
        applies_to:       meta["applies_to"] as string[] | undefined,
        risk_category:    meta["risk_category"] as string[] | undefined,
        enforcement_date: meta["enforcement_date"] as string | undefined,
        keywords:         meta["keywords"] as string[] | undefined,
        score:            1 - distance,
      };
    });
}

// ─── Deduplication + Re-ranking ───────────────────────────────────────────────

const PRIORITY_ARTICLES = new Set([5, 6, 7]);

function priorityScore(chunk: RetrievedChunk): number {
  if (chunk.article_number && PRIORITY_ARTICLES.has(chunk.article_number)) return 0;
  if (chunk.annex_reference?.includes("III"))                               return 1;
  return 2;
}

function deduplicateAndRerank(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const seen    = new Set<string>();
  const unique  = chunks.filter((c) => {
    if (!c.chunk_id || seen.has(c.chunk_id)) return false;
    seen.add(c.chunk_id);
    return true;
  });

  unique.sort((a, b) => {
    const pDiff = priorityScore(a) - priorityScore(b);
    if (pDiff !== 0) return pDiff;
    return b.score - a.score;
  });

  return unique.slice(0, MAX_TOTAL_CHUNKS);
}

// ─── Context Assembly ─────────────────────────────────────────────────────────

function formatChunkSource(chunk: RetrievedChunk): string {
  if (chunk.article_number) {
    const title = chunk.article_title ? ` — ${chunk.article_title}` : "";
    return `Articolo ${chunk.article_number}${title}`;
  }
  if (chunk.annex_reference?.length) {
    return `Allegato ${chunk.annex_reference.join(", ")}`;
  }
  return "AI Act (Reg. UE 2024/1689)";
}

function assembleLegalContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => {
      const source = formatChunkSource(c);
      const text   = c.text.trim();
      return (
        `[CONTESTO NORMATIVO ${i + 1} — ${source}]\n` +
        `${text}\n` +
        `Fonte: ${source}, Regolamento UE 2024/1689 (AI Act)`
      );
    })
    .join("\n\n---\n\n");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildRagContext(
  payload: IntakePayload,
): Promise<RagContext> {
  const queries = buildQueries(payload);

  // Retrieve in parallel (all queries at once)
  const retrievalResults = await Promise.allSettled(
    queries.map((q) => retrieveForQuery(q.text, TOP_K_PER_QUERY))
  );

  const allChunks: RetrievedChunk[] = [];
  for (const result of retrievalResults) {
    if (result.status === "fulfilled") {
      allChunks.push(...result.value);
    }
  }

  const finalChunks = deduplicateAndRerank(allChunks);
  const contextText = assembleLegalContext(finalChunks);
  const chunksUsed  = finalChunks.map((c) => c.chunk_id);

  return { contextText, chunksUsed };
}
