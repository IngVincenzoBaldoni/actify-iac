import { getActiveSchema } from './dynamo';
import type { DocSchema, DocType } from '../types';

const cache = new Map<string, DocSchema>();

export async function loadSchema(docType: DocType): Promise<DocSchema> {
  const cacheKey = docType;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const schema = await getActiveSchema(docType);
  if (!schema) {
    throw new Error(`KB_SCHEMA_MISS: no active schema found for docType=${docType}`);
  }
  cache.set(cacheKey, schema);
  return schema;
}

// ─── Article reference extraction helpers ────────────────────────────────────
// Used by the context assembler to determine which S3 Vectors keys to fetch
// based on the gap's article reference.

export function articleRefToVectorKeys(articleRef: string): string[] {
  // Normalize "Art. 50" → "art_50", "Art. 26" → "art_26", etc.
  const clean = articleRef.replace(/Art\.?\s*/i, '').replace(/\s+/g, '_').toLowerCase();
  const num   = parseInt(clean, 10);
  if (isNaN(num)) return [];

  const keys = [`art_${num}`];
  // Common sub-paragraphs for articles that span multiple vector entries
  if ([9, 11, 12, 14, 26, 72].includes(num)) {
    keys.push(`art_${num}_p1`, `art_${num}_p2`);
  }
  return keys;
}

// Builds the set of allowed normative references given the article texts retrieved
export function buildAllowedRefs(
  articleNums: number[],
  includeAnnexes = false,
): string[] {
  const refs: string[] = [
    'Reg. (UE) 2024/1689',
    'Regolamento (UE) 2024/1689',
    'Regolamento UE 2024/1689',
  ];
  for (const n of articleNums) {
    refs.push(
      `Art. ${n}`,
      `Art ${n}`,
      `Articolo ${n}`,
      `articolo ${n}`,
    );
  }
  if (includeAnnexes) {
    ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].forEach(r => {
      refs.push(`Allegato ${r}`);
    });
  }
  return refs;
}
