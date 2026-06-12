import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { AssembleDocumentInput, SlotResult, ResolvedFixedSection } from '../types';

const BUCKET = process.env.DOCUMENTS_BUCKET ?? 'actify-saas-documents';
const REGION = process.env.AWS_REGION ?? 'eu-central-1';

const s3 = new S3Client({ region: REGION });

const DOC_TYPE_TITLES: Record<string, string> = {
  DISCLOSURE_NOTICE:  'Disclosure Notice / Informativa di Trasparenza',
  MONITORING_PLAN:    'Piano di Monitoraggio',
  AI_POLICY:          'Policy AI Interna',
  TECH_DOC:           'Documentazione Tecnica',
  CONFORMITY_DECL:    'Dichiarazione di Conformità (Autovalutazione)',
};

function slotContentToMarkdown(content: Record<string, unknown>): string {
  // If content has a "text" string field, use it directly
  if (typeof content['text'] === 'string') return content['text'];
  if (typeof content['content'] === 'string') return content['content'];

  // Otherwise serialize all string values
  const parts: string[] = [];
  function extract(obj: unknown, depth = 0): void {
    if (typeof obj === 'string' && obj.trim()) {
      parts.push(obj.trim());
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        if (typeof item === 'string') parts.push(`- ${item.trim()}`);
        else extract(item, depth + 1);
      });
      return;
    }
    if (obj && typeof obj === 'object') {
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        if (key === 'title' && typeof val === 'string') {
          parts.push(`**${val}**`);
        } else {
          extract(val, depth + 1);
        }
      }
    }
  }
  extract(content);
  return parts.join('\n\n');
}

export const handler = async (event: AssembleDocumentInput): Promise<{
  markdownS3Key:   string;
  markdownContent: string;
  title:           string;
}> => {
  const { slots, context, generationId, companyId, systemId, docType } = event;

  console.info('[assembleDocument] start', { generationId, docType });

  const docTitle = `${DOC_TYPE_TITLES[docType] ?? docType} — ${context.system.tool_name}`;
  const now      = new Date().toISOString();
  const dateStr  = now.split('T')[0];

  // Build a map for quick slot lookup
  const slotMap = new Map(slots.map(s => [s.slotId, s]));

  // Merge sections in order (FIXED + GENERATIVE)
  const allSections = [
    ...context.fixedSections,
    ...context.schema.sections
      .filter(s => s.kind === 'GENERATIVE')
      .map(s => ({
        sectionId: s.sectionId,
        title:     s.title,
        order:     s.order,
        content:   slotContentToMarkdown(slotMap.get(s.slot!.slotId)?.content ?? {}),
      })),
  ].sort((a, b) => a.order - b.order);

  // Build canonical Markdown
  const sectionsMd = allSections
    .filter(sec => sec.content.trim())
    .map(sec => `## ${sec.title}\n\n${sec.content.trim()}`)
    .join('\n\n---\n\n');

  const markdownContent = [
    `# ${docTitle}`,
    ``,
    `**Azienda:** ${context.company.name}  `,
    `**Sistema AI:** ${context.system.tool_name} (${context.system.vendor ?? 'N/D'})  `,
    `**Data generazione:** ${dateStr}  `,
    `**Versione documento:** Bozza`,
    ``,
    `---`,
    ``,
    sectionsMd,
  ].join('\n');

  // Save Markdown to S3 (source of truth; PDF is derived)
  const markdownS3Key = `documents/${companyId}/${systemId}/${docType}/${generationId}_v1.md`;
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         markdownS3Key,
    Body:        markdownContent,
    ContentType: 'text/markdown; charset=utf-8',
    Metadata: {
      generation_id:  generationId,
      company_id:     companyId,
      system_id:      systemId,
      doc_type:       docType,
      schema_version: context.schema.version,
    },
  }));

  console.info('[assembleDocument] saved markdown', { markdownS3Key, chars: markdownContent.length });

  return { markdownS3Key, markdownContent, title: docTitle };
};
