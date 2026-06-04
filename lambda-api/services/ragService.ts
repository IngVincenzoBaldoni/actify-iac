import {
  S3VectorsClient,
  GetVectorsCommand,
} from '@aws-sdk/client-s3vectors';
import { determineApplicableArticles } from './articleRuleEngine';
import type { AISystem } from '../types/aiSystem';
import type { Company } from '../types/company';

const S3_VECTORS_BUCKET = process.env.S3_VECTORS_BUCKET ?? 'actify-saas-ai-act-knowledge-base';
const S3_VECTORS_INDEX  = process.env.S3_VECTORS_INDEX  ?? 'ai-act-it';
const S3_VECTORS_REGION = process.env.S3_VECTORS_REGION ?? process.env.S3_REGION ?? 'eu-central-1';

const s3vClient = new S3VectorsClient({ region: S3_VECTORS_REGION });

export interface RagContext {
  contextText:       string;
  chunksUsed:        string[];
  retrievedArticles: string[];
  ragUsed:           boolean;
  chunkCount:        number;
  fallbackReason?:   string;
  ruleEngineReasoning?: string[];
}

function formatChunk(key: string, text: string, meta: Record<string, unknown>): string {
  let source = 'AI Act (Reg. UE 2024/1689)';
  if (meta['article_number']) {
    source = `Articolo ${meta['article_number']}${meta['article_title'] ? ` — ${meta['article_title']}` : ''}`;
  } else if ((meta['annex_reference'] as string[] | undefined)?.length) {
    source = `Allegato ${(meta['annex_reference'] as string[]).join(', ')}`;
    if (meta['article_title']) source += ` — ${meta['article_title']}`;
  }
  return `[CONTESTO NORMATIVO — ${source}]\n${text.trim()}\nFonte: ${source}, Regolamento UE 2024/1689 (AI Act)`;
}

export async function buildRagContext(
  system: AISystem,
  company: Company,
  // FIX-11: when provided, skip the rule engine and fetch only these keys directly
  pendingKeysOverride?: string[],
): Promise<RagContext> {
  try {
    let applicableKeys: string[];
    let reasoning: string[];

    if (pendingKeysOverride !== undefined) {
      applicableKeys = pendingKeysOverride;
      reasoning = ['Keys provided directly by caller (incremental re-check)'];
    } else {
      ({ applicableKeys, reasoning } = determineApplicableArticles(system, company));
    }

    if (applicableKeys.length === 0) {
      return {
        contextText: '', chunksUsed: [], retrievedArticles: [],
        ragUsed: false, chunkCount: 0,
        fallbackReason: 'Rule engine returned no applicable articles',
        ruleEngineReasoning: reasoning,
      };
    }

    const response = await s3vClient.send(new GetVectorsCommand({
      vectorBucketName: S3_VECTORS_BUCKET,
      indexName:        S3_VECTORS_INDEX,
      keys:             applicableKeys,
      returnMetadata:   true,
    }));

    const vectors = response.vectors ?? [];
    const foundKeys = new Set(vectors.map(v => v.key));

    // Log any requested keys that were not found (missing from index)
    const missingKeys = applicableKeys.filter(k => !foundKeys.has(k));
    if (missingKeys.length > 0) {
      console.warn('[RAG] Missing vector keys:', missingKeys.join(', '));
    }

    if (vectors.length === 0) {
      return {
        contextText: '', chunksUsed: [], retrievedArticles: [],
        ragUsed: false, chunkCount: 0,
        fallbackReason: 'No vectors found for determined article keys',
      };
    }

    const chunks = vectors.map(v => ({
      key:  v.key ?? '',
      text: String((v.metadata as Record<string, unknown> | undefined)?.['text'] ?? '').slice(0, 1200),
      meta: (v.metadata as Record<string, unknown>) ?? {},
    }));

    const contextText = chunks
      .filter(c => c.text.trim().length > 0)
      .map(c => formatChunk(c.key, c.text, c.meta))
      .join('\n\n---\n\n');

    const retrievedArticles = chunks
      .filter(c => c.meta['article_number'] != null)
      .map(c => `Art. ${c.meta['article_number']}`);

    return {
      contextText,
      chunksUsed:        chunks.map(c => c.key),
      retrievedArticles: [...new Set(retrievedArticles)],
      ragUsed:           true,
      chunkCount:        chunks.length,
      ruleEngineReasoning: reasoning,
    };

  } catch (err) {
    return {
      contextText: '', chunksUsed: [], retrievedArticles: [],
      ragUsed: false, chunkCount: 0,
      fallbackReason: err instanceof Error ? err.message : 'RAG unavailable',
    };
  }
}
