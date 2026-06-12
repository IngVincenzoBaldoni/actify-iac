import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as db from '../services/dynamo';
import { loadSchema, articleRefToVectorKeys, buildAllowedRefs } from '../services/schemaRegistry';
import { fetchArticleTexts, formatArticleTextsForPrompt, extractArticleNumbers } from '../services/s3VectorsClient';
import { PROMPT_VERSION } from '../services/bedrock';
import type {
  AssembleContextInput, GenerationContext, GenerativeSlotInput,
  ResolvedFixedSection, CompanyProfile, SystemProfile, GapSnapshot,
} from '../types';

const BUCKET  = process.env.DOCUMENTS_BUCKET ?? 'actify-saas-documents';
const REGION  = process.env.AWS_REGION ?? 'eu-central-1';
const KB_VERSION = process.env.S3_VECTORS_INDEX ?? 'ai-act-it';

const s3 = new S3Client({ region: REGION });

// ─── Template placeholder resolver ────────────────────────────────────────────
function resolveTemplate(
  template: string,
  bindings: string[],
  data: Record<string, unknown>,
): string {
  let result = template;
  for (const binding of bindings) {
    const parts = binding.split('.');
    let val: unknown = data;
    for (const p of parts) {
      val = (val as Record<string, unknown>)?.[p];
    }
    result = result.replace(new RegExp(`\\{\\{${binding}\\}\\}`, 'g'), String(val ?? ''));
  }
  return result;
}

export const handler = async (event: AssembleContextInput): Promise<GenerationContext> => {
  const { generationId, companyId, systemId, gapId, docType } = event;

  console.info('[assembleContext] start', { generationId, docType });

  // Update status to RUNNING
  await db.markDocGenerationStatus(companyId, generationId, 'RUNNING');

  // 1. Load schema
  const schema = await loadSchema(docType);
  const modelId = schema.modelId ?? (
    schema.modelTier === 'economy'
      ? process.env.BEDROCK_MODEL_ECONOMY ?? 'eu.amazon.nova-lite-v1:0'
      : process.env.BEDROCK_MODEL_STANDARD ?? 'eu.amazon.nova-pro-v1:0'
  );

  // 2. Load company + system
  const [companyRaw, systemRaw] = await Promise.all([
    db.getCompany(companyId),
    db.getSystem(companyId, systemId),
  ]);

  if (!companyRaw) throw new Error(`CONTEXT_MISS: company ${companyId} not found`);
  if (!systemRaw)  throw new Error(`CONTEXT_MISS: system ${systemId} not found`);

  const company: CompanyProfile = {
    company_id:            companyRaw.company_id as string,
    name:                  companyRaw.name as string,
    sector:                companyRaw.sector as string,
    employees_range:       companyRaw.employees_range as string,
    annual_revenue_exact:  companyRaw.annual_revenue_exact as number | undefined,
    annual_revenue_range:  companyRaw.annual_revenue_range as string | undefined,
    size:                  companyRaw.size as string | undefined,
  };

  const system: SystemProfile = {
    system_id:    systemRaw.system_id as string,
    tool_name:    systemRaw.tool_name as string,
    vendor:       systemRaw.vendor as string | undefined,
    purpose:      systemRaw.purpose as string,
    category:     systemRaw.category as string,
    role:         systemRaw.role as string,
    output_type:  systemRaw.output_type as string | undefined,
    access_mode:  systemRaw.access_mode as string | undefined,
    target_users:        systemRaw.target_users as string[] | undefined,
    data_types:          systemRaw.data_types as string[] | undefined,
    customizations:      systemRaw.customizations as string[] | undefined,
    human_oversight_level: systemRaw.human_oversight_level as string | undefined,
    decision_domains:    systemRaw.decision_domains as string[] | undefined,
    vulnerable_groups:   systemRaw.vulnerable_groups as string[] | undefined,
  };

  // 3. Find gap from latest compliance check
  const latestCheck = await db.getLatestComplianceCheck(companyId, systemId);
  if (!latestCheck?.result?.compliance_gaps) {
    throw new Error(`KB_MISS: no compliance check found for system ${systemId}`);
  }
  const gapRaw = (latestCheck.result.compliance_gaps as Record<string, unknown>[])
    .find(g => g.gap_id === gapId);
  if (!gapRaw) throw new Error(`KB_MISS: gap ${gapId} not found in latest check`);

  const gap: GapSnapshot = {
    gap_id:         gapRaw.gap_id as string,
    article:        gapRaw.article as string,
    requirement:    gapRaw.requirement as string,
    urgency:        gapRaw.urgency as string,
    description:    gapRaw.description as string,
    what_to_do:     gapRaw.what_to_do as string,
    automation_type: gapRaw.automation_type as string,
    articleRef:     gapRaw.article as string,
  };

  // 4. Fetch article texts from S3 Vectors (key-based)
  const vectorKeys = articleRefToVectorKeys(gap.article);
  const articleTexts = await fetchArticleTexts(vectorKeys);

  if (articleTexts.length === 0) {
    throw new Error(`KB_MISS: no article texts found for keys: ${vectorKeys.join(', ')}`);
  }

  const articleNums = extractArticleNumbers(articleTexts);
  const allowedRefs = buildAllowedRefs(articleNums, true);
  const articleContext = formatArticleTextsForPrompt(articleTexts);

  // 5. Build context data for template resolution
  const templateData = {
    company: { name: company.name, sector: company.sector },
    system:  { name: system.tool_name, vendor: system.vendor ?? 'N/D', purpose: system.purpose, role: system.role },
    gap:     { article: gap.article, requirement: gap.requirement, description: gap.description },
  };

  // 6. Resolve FIXED sections
  const fixedSections: ResolvedFixedSection[] = [];
  for (const sec of schema.sections.filter(s => s.kind === 'FIXED')) {
    let content = '';

    if (sec.sectionId === 'normative_references') {
      // Always from gap analysis data — never from LLM
      content = `**Riferimenti normativi applicabili:**\n${articleNums.map(n => `- Articolo ${n}, Regolamento UE 2024/1689 (AI Act)`).join('\n')}`;
    } else if (sec.sectionId === 'required_actions') {
      // Deterministic closing actions from schema's closingActionRules
      const rules = schema.closingActions.filter(r =>
        r.gapTypes.includes(gap.automation_type) || r.gapTypes.includes('*'),
      );
      const actions = rules.flatMap(r => r.actions);
      content = actions.length > 0
        ? `**Azioni richieste per rendere efficace questo documento:**\n${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
        : '**Azioni richieste:** Consultare il responsabile compliance per la definizione delle azioni specifiche.';
    } else if (sec.sectionId === 'disclaimer') {
      content = 'Il presente documento è una guida operativa generata automaticamente dalla piattaforma Actify. Non costituisce parere legale e non certifica la conformità al Regolamento UE 2024/1689. L\'azienda rimane responsabile dell\'adozione effettiva delle misure descritte e della verifica della loro adeguatezza al contesto specifico. Si raccomanda la revisione da parte di un consulente legale o di compliance prima dell\'uso ufficiale.';
    } else if (sec.template) {
      content = resolveTemplate(sec.template, sec.bindings ?? [], templateData);
    }

    fixedSections.push({ sectionId: sec.sectionId, title: sec.title, order: sec.order, content });
  }

  // 7. Build generative slot inputs
  const generativeSlots: GenerativeSlotInput[] = schema.sections
    .filter(s => s.kind === 'GENERATIVE' && s.slot)
    .map(s => ({
      slotId:         s.slot!.slotId,
      sectionTitle:   s.title,
      instruction:    s.slot!.instruction,
      maxWords:       s.slot!.maxWords,
      tone:           s.slot!.tone,
      outputSchema:   s.slot!.outputSchema,
      articleContext,
    }));

  // 8. Persist context snapshot to S3 for provenance
  const contextS3Key = `contexts/${generationId}.json`;
  const ctx: GenerationContext = {
    schema, company, system, gap, articleTexts,
    allowedRefs, generativeSlots, fixedSections,
    contextS3Key,
    kbVersion:     KB_VERSION,
    modelId,
    promptVersion: PROMPT_VERSION,
  };

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         contextS3Key,
    Body:        JSON.stringify(ctx),
    ContentType: 'application/json',
    Metadata:    { generation_id: generationId, company_id: companyId },
  }));

  // Update doc_generations with schema/kb provenance
  await db.updateDocGeneration(companyId, generationId, {
    schemaVersion: schema.version,
    kbVersion:     KB_VERSION,
    modelId,
    promptVersion: PROMPT_VERSION,
    contextS3Key,
  });

  console.info('[assembleContext] done', { generationId, slots: generativeSlots.length });
  return ctx;
};
