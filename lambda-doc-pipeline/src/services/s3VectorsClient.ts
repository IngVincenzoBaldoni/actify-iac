import { S3VectorsClient, GetVectorsCommand } from '@aws-sdk/client-s3vectors';
import type { ArticleText } from '../types';

const BUCKET = process.env.S3_VECTORS_BUCKET ?? 'actify-saas-ai-act-knowledge-base';
const INDEX  = process.env.S3_VECTORS_INDEX  ?? 'ai-act-it';
const REGION = process.env.S3_VECTORS_REGION ?? process.env.AWS_REGION ?? 'eu-central-1';

const s3v = new S3VectorsClient({ region: REGION });

// Key-based lookup (never semantic search) — fetches article texts for given keys
export async function fetchArticleTexts(keys: string[]): Promise<ArticleText[]> {
  if (keys.length === 0) return [];

  const response = await s3v.send(new GetVectorsCommand({
    vectorBucketName: BUCKET,
    indexName:        INDEX,
    keys,
    returnMetadata:   true,
  }));

  const vectors = response.vectors ?? [];
  const missing = keys.filter(k => !vectors.some(v => v.key === k));
  if (missing.length > 0) {
    console.warn('[s3Vectors] Missing keys:', missing.join(', '));
  }

  return vectors
    .filter(v => {
      const meta = v.metadata as Record<string, unknown> | undefined;
      return meta?.['text'] && String(meta['text']).trim().length > 0;
    })
    .map(v => {
      const meta = v.metadata as Record<string, unknown>;
      return {
        key:           v.key ?? '',
        articleNumber: meta['article_number'] as number | undefined,
        articleTitle:  meta['article_title']  as string | undefined,
        text:          String(meta['text']).slice(0, 2000),
      };
    });
}

// Format article texts for inclusion in the Bedrock prompt context block
export function formatArticleTextsForPrompt(articles: ArticleText[]): string {
  return articles.map(a => {
    const label = a.articleNumber
      ? `Articolo ${a.articleNumber}${a.articleTitle ? ` — ${a.articleTitle}` : ''}`
      : a.key;
    return `[${label}]\n${a.text.trim()}`;
  }).join('\n\n---\n\n');
}

// Derive article numbers from fetched texts (for buildAllowedRefs)
export function extractArticleNumbers(articles: ArticleText[]): number[] {
  return [...new Set(
    articles
      .map(a => a.articleNumber)
      .filter((n): n is number => n !== undefined),
  )];
}
