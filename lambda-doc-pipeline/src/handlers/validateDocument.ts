import type {
  ValidateDocumentInput, ValidationResult, ValidationReport,
  CitationViolation, SchemaViolation, BlacklistMatch, FailedSlotFeedback,
  SlotResult,
} from '../types';

// Blacklist strings that must NEVER appear in generated content
const BLACKLIST = [
  'garantisce la conformità',
  'garantisce la conformita',
  'certifica la conformità',
  'certifica la conformita',
  'pienamente conforme a tutte le disposizioni',
  'rende conforme',
  'dichiara la conformità completa',
  'certifica che il sistema è conforme',
  'attesta la piena conformità',
];

// Patterns for extracting normative references from text
const REF_PATTERNS = [
  /Art\.?\s*\d+(?:\s+bis)?(?:\s+ter)?/gi,
  /Articol[oi]\s+\d+/gi,
  /Considerand[oi]\s+\d+/gi,
  /Allegato\s+[IVXLC]+/gi,
  /Reg(?:\.|\wolamento)?\s*\(UE\)\s*\d{4}\/\d+/gi,
  /Regolamento\s+UE\s+\d{4}\/\d+/gi,
];

function extractRefs(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of REF_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern.source, pattern.flags));
    for (const m of matches) {
      found.add(m[0].trim());
    }
  }
  return [...found];
}

function textFromContent(content: Record<string, unknown>): string {
  const values: string[] = [];
  function traverse(obj: unknown): void {
    if (typeof obj === 'string') { values.push(obj); return; }
    if (Array.isArray(obj))      { obj.forEach(traverse); return; }
    if (obj && typeof obj === 'object') {
      Object.values(obj as Record<string, unknown>).forEach(traverse);
    }
  }
  traverse(content);
  return values.join(' ');
}

function countWords(content: Record<string, unknown>): number {
  return textFromContent(content).split(/\s+/).filter(Boolean).length;
}

function validateSlotSchema(
  slotId: string,
  content: Record<string, unknown>,
  outputSchema: Record<string, unknown>,
): SchemaViolation[] {
  const violations: SchemaViolation[] = [];
  const required = (outputSchema['required'] as string[] | undefined) ?? [];
  const props     = (outputSchema['properties'] as Record<string, unknown> | undefined) ?? {};

  for (const field of required) {
    if (content[field] === undefined || content[field] === null || content[field] === '') {
      violations.push({ slotId, field, reason: `Campo obbligatorio "${field}" mancante o vuoto` });
    }
  }
  for (const [field, def] of Object.entries(props)) {
    const schemaDef = def as Record<string, unknown>;
    const val       = content[field];
    if (val !== undefined && schemaDef['type'] === 'string' && typeof val !== 'string') {
      violations.push({ slotId, field, reason: `Tipo non corretto per "${field}": atteso string` });
    }
    if (val !== undefined && schemaDef['type'] === 'array' && !Array.isArray(val)) {
      violations.push({ slotId, field, reason: `Tipo non corretto per "${field}": atteso array` });
    }
  }
  return violations;
}

export const handler = async (event: ValidateDocumentInput): Promise<ValidationResult> => {
  const { slots, context, generationId } = event;
  const docType = context.schema.docType;

  console.info('[validateDocument] start', { generationId, slotCount: slots.length, docType });

  // CONFORMITY_DECL by legal definition says "certifica/dichiara/attesta la conformità" —
  // those phrases are appropriate in this document type and must not be blocked
  const activeBlacklist = docType === 'CONFORMITY_DECL'
    ? BLACKLIST.filter(p => !['certifica', 'dichiara', 'attesta'].some(w => p.includes(w)))
    : BLACKLIST;

  const citationViolations: CitationViolation[] = [];
  const schemaViolations:   SchemaViolation[]   = [];
  const blacklistMatches:   BlacklistMatch[]     = [];

  const slotsMap = new Map(
    context.generativeSlots.map(s => [s.slotId, s]),
  );

  for (const slot of slots) {
    const slotDef = slotsMap.get(slot.slotId);
    const text    = textFromContent(slot.content).toLowerCase();

    // ── Citation check ──────────────────────────────────────────────────────
    const refs = extractRefs(textFromContent(slot.content));
    for (const ref of refs) {
      const normalizedRef = ref.replace(/\s+/g, ' ').trim();
      const allowed = context.allowedRefs.some(a =>
        normalizedRef.toLowerCase().includes(a.toLowerCase()) ||
        a.toLowerCase().includes(normalizedRef.toLowerCase()),
      );
      if (!allowed) {
        citationViolations.push({
          slotId: slot.slotId,
          ref:    normalizedRef,
          reason: `Riferimento normativo "${normalizedRef}" non presente nella normativa fornita nel contesto.`,
        });
      }
    }

    // ── Schema & constraints check ─────────────────────────────────────────
    if (slotDef) {
      // Word count (tolerance +10%)
      const words = countWords(slot.content);
      if (words > slotDef.maxWords * 1.1) {
        schemaViolations.push({
          slotId: slot.slotId,
          field:  'wordCount',
          reason: `Superato il limite di ${slotDef.maxWords} parole (trovate ~${words}).`,
        });
      }
      // Output schema validation
      const schViolations = validateSlotSchema(slot.slotId, slot.content, slotDef.outputSchema);
      schemaViolations.push(...schViolations);
    }

    // ── Blacklist check ─────────────────────────────────────────────────────
    for (const phrase of activeBlacklist) {
      if (text.includes(phrase)) {
        blacklistMatches.push({ slotId: slot.slotId, phrase });
      }
    }
  }

  const report: ValidationReport = { citationViolations, schemaViolations, blacklistMatches };
  const passed = (
    citationViolations.length === 0 &&
    schemaViolations.length   === 0 &&
    blacklistMatches.length   === 0
  );

  // Build per-slot feedback for retry (only for failed slots)
  const failedSlotIds = new Set([
    ...citationViolations.map(v => v.slotId),
    ...schemaViolations.map(v => v.slotId),
    ...blacklistMatches.map(v => v.slotId),
  ]);

  const failedSlots: FailedSlotFeedback[] = [...failedSlotIds].map(slotId => {
    const citations = citationViolations.filter(v => v.slotId === slotId);
    const schemas   = schemaViolations.filter(v => v.slotId === slotId);
    const blacks    = blacklistMatches.filter(v => v.slotId === slotId);

    const parts: string[] = [];
    if (citations.length > 0) {
      parts.push(
        'RIFERIMENTI NON AMMESSI:\n' +
        citations.map(c => `- "${c.ref}": ${c.reason}`).join('\n'),
      );
    }
    if (schemas.length > 0) {
      parts.push(
        'VIOLAZIONI SCHEMA/LUNGHEZZA:\n' +
        schemas.map(s => `- ${s.field}: ${s.reason}`).join('\n'),
      );
    }
    if (blacks.length > 0) {
      parts.push(
        'FRASI VIETATE (eliminale o riformula):\n' +
        blacks.map(b => `- "${b.phrase}"`).join('\n'),
      );
    }

    const originalSlot = slots.find(s => s.slotId === slotId);
    return {
      slotId,
      originalContent: originalSlot?.content ?? {},
      feedback: parts.join('\n\n'),
    };
  });

  console.info('[validateDocument] done', {
    generationId,
    passed,
    citations: citationViolations.length,
    schema:    schemaViolations.length,
    blacklist: blacklistMatches.length,
  });

  return { passed, failedSlots, report };
};
