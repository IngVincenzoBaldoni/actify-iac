import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { v4 as uuidv4 } from 'uuid';
import { systemPrompt } from './systemPrompt';
import { complianceResultSchema, type ComplianceResultParsed } from './complianceOutputSchema';
import { computeSanctions, ComplianceResultWithSanctions } from './sanctions';
import { buildRagContext } from './ragService';
import { preClassify, MANDATORY_GAP_TEMPLATES } from './riskClassifier';
import type { AISystem } from '../types/aiSystem';
import type { Company } from '../types/company';

const bedrock   = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION ?? 'eu-central-1' });
const MODEL_ID  = process.env.BEDROCK_MODEL_ID ?? 'eu.amazon.nova-pro-v1:0';
const RAG_ENABLED = process.env.RAG_ENABLED !== 'false' && !!process.env.S3_VECTORS_BUCKET;

// ─── RAG system prompt ────────────────────────────────────────────────────────

const RAG_SYSTEM_PROMPT = `Sei il motore di analisi compliance di Actify, specializzato nel Regolamento UE 2024/1689 (EU AI Act).

Principi operativi:
- Usa il CONTESTO NORMATIVO fornito per identificare obblighi e gap di compliance
- Cita solo articoli presenti nel contesto fornito — non inventare o generalizzare
- Analizza SOLO il sistema AI indicato; non fare analisi generica sull'azienda
- La classificazione di rischio e gli articoli obbligatori sono PRE-DETERMINATI (vedi vincoli nel messaggio utente) — non modificarli
- Tutti i campi testuali in italiano. Valori enum sempre in inglese come specificato
- Rispondi ESCLUSIVAMENTE con il JSON con lo schema esatto indicato. Zero testo fuori dal JSON.`;

// ─── Output template ──────────────────────────────────────────────────────────

const OUTPUT_TEMPLATE = {
  risk_classification: "prohibited|high|limited|minimal",
  applicable_articles: ["Art. X", "Annex III cat. Y"],
  compliance_gaps: [{
    gap_id: "uuid-v4",
    article: "Art. 14",
    requirement: "Supervisione umana",
    status: "missing|partial|compliant",
    deadline: "YYYY-MM-DD o null",
    urgency: "critical|high|medium|low",
    description: "Descrizione gap in italiano (max 500 caratteri)",
    what_to_do: "Azione correttiva specifica in italiano (max 500 caratteri)",
    can_actify_automate: true,
    automation_type: "document_generation|policy_template|transparency_notice|risk_assessment|monitoring_plan|conformity_declaration — usa JSON null se can_actify_automate è false",
  }],
  score: { governance: 0, transparency: 0, documentation: 0, monitoring: 0 },
  compliance_summary: {
    compliant_count: 0, non_compliant_count: 0, monitoring_count: 0,
    most_urgent_deadline: "YYYY-MM-DD o null", months_to_urgency: 0,
  },
  priority_actions: [{
    priority: "immediate|short_term|medium_term",
    action: "Azione prioritaria in italiano",
    rationale: "Motivazione con riferimento articolo e scadenza",
  }],
  executive_summary: "Sommario esecutivo in italiano (max 500 caratteri)",
};

// ─── User message builder ─────────────────────────────────────────────────────

function buildUserMessage(
  system:          AISystem,
  company:         Company,
  constraints:     string,
  ragContext?:     string,
): string {
  const contextBlock = ragContext
    ? `\n\nCONTESTO NORMATIVO AI ACT (usa questi testi per identificare obblighi e gap):\n${ragContext}\n\n---`
    : '';

  return `Esegui un compliance check AI Act sul seguente sistema AI specifico.${contextBlock}

${constraints}

CONTESTO AZIENDA:
- Nome: ${company.name}
- Settore: ${company.sector}
- Dipendenti: ${company.employees_range}
- Ruolo AI Act aziendale: ${company.ai_role}
- DPO presente: ${company.governance.has_dpo} (tipo: ${company.governance.dpo_status})
- Inventory AI formalizzato: ${company.governance.has_ai_inventory}
- Valutazione impatto condotta: ${company.governance.has_impact_assessment}
- Policy AI interna: ${company.governance.has_ai_policy}
- Formazione personale: ${company.governance.has_training}

SISTEMA AI DA ANALIZZARE:
${JSON.stringify({
  nome: system.tool_name,
  vendor: system.vendor,
  categoria: system.category,
  ruolo_azienda: system.role,
  scopo: system.purpose,
  utenti_target: system.target_users,
  decisioni_automatizzate: system.makes_automated_decisions,
  supervisione_umana: system.human_oversight_level,
  ambiti_decisione: system.decision_domains,
  soggetti_vulnerabili: system.affects_vulnerable_groups,
  tipologie_dati: system.data_types,
}, null, 2)}

ISTRUZIONI:
- Analizza SOLO questo sistema AI, non fare analisi generica sull'azienda
- La classificazione e gli articoli obbligatori sopra sono VINCOLI NORMATIVI — non modificarli
- Identifica gap AGGIUNTIVI rispetto agli articoli obbligatori già indicati
- Deadline principale AI Act: 2026-08-02
- Per ogni gap valuta se Actify può automatizzare la risoluzione
- Rispondi ESCLUSIVAMENTE con il JSON con lo schema esatto qui sotto. Zero testo fuori dal JSON.

${JSON.stringify(OUTPUT_TEMPLATE, null, 2)}`;
}

// ─── Constraint block injected into the prompt ───────────────────────────────

function buildConstraintBlock(
  system:  AISystem,
  company: Company,
): { text: string; riskLevel: string; mandatoryArticles: string[] } {
  const pc = preClassify(system, company);

  if (pc.mandatory_articles.length === 0) {
    return {
      text:             '',
      riskLevel:        pc.risk_level,
      mandatoryArticles: [],
    };
  }

  const annexLine = pc.annex_ref
    ? `  → Allegato ${pc.annex_ref}\n`
    : '';

  const text =
    `VINCOLI NORMATIVI PRE-DETERMINATI (NON MODIFICABILI):\n` +
    `▸ Classificazione rischio: ${pc.risk_level.toUpperCase()}\n` +
    `  Motivo: ${pc.rationale}\n` +
    annexLine +
    `▸ Il campo "risk_classification" nel JSON deve essere esattamente "${pc.risk_level}"\n` +
    `▸ Articoli OBBLIGATORI — devono apparire in compliance_gaps con status missing o partial:\n` +
    pc.mandatory_articles.map(a => `  - ${a}`).join('\n');

  return { text, riskLevel: pc.risk_level, mandatoryArticles: pc.mandatory_articles };
}

// ─── Post-processing: merge mandatory gaps into LLM output ───────────────────

function inferGapStatus(
  article:     string,
  governance:  Company['governance'],
): 'missing' | 'partial' {
  switch (article) {
    case 'Art. 9':  return governance.has_impact_assessment ? 'partial' : 'missing';
    case 'Art. 14': return governance.has_human_oversight   ? 'partial' : 'missing';
    case 'Art. 17': return governance.has_ai_inventory      ? 'partial' : 'missing';
    case 'Art. 18': return governance.has_ai_inventory      ? 'partial' : 'missing';
    case 'Art. 20': return governance.has_incident_procedure ? 'partial' : 'missing';
    case 'Art. 26': return governance.has_ai_policy         ? 'partial' : 'missing';
    case 'Art. 50': return governance.has_training          ? 'partial' : 'missing';
    default:        return 'missing';
  }
}

function ensureMandatoryGaps(
  validated:          ComplianceResultParsed,
  mandatoryArticles:  string[],
  riskLevel:          string,
  governance:         Company['governance'],
): ComplianceResultParsed {
  if (mandatoryArticles.length === 0) return validated;

  // Normalise existing gap articles for dedup check
  const existingNorm = new Set(
    validated.compliance_gaps.map(g => g.article.replace(/\s+/g, ' ').trim().toLowerCase())
  );

  const missing = mandatoryArticles.filter(
    a => !existingNorm.has(a.toLowerCase())
  );

  if (missing.length === 0) return validated;

  const syntheticGaps = missing
    .map(article => {
      const tmpl = MANDATORY_GAP_TEMPLATES[article];
      if (!tmpl) return null;
      const status = inferGapStatus(article, governance);
      return {
        gap_id:              uuidv4(),
        article:             tmpl.article,
        requirement:         tmpl.requirement,
        status,
        deadline:            '2026-08-02',
        urgency:             'critical' as const,
        description:         tmpl.description,
        what_to_do:          tmpl.what_to_do,
        can_actify_automate: tmpl.can_actify_automate,
        automation_type:     tmpl.automation_type as typeof validated.compliance_gaps[number]['automation_type'],
      };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  // Ensure applicable_articles also includes mandatory ones
  const existingApplicable = new Set(validated.applicable_articles.map(a => a.toLowerCase()));
  const additionalApplicable = mandatoryArticles.filter(
    a => !existingApplicable.has(a.toLowerCase())
  );

  // Recompute summary counts
  const allGaps = [...validated.compliance_gaps, ...syntheticGaps];
  const nonCompliant = allGaps.filter(g => g.status !== 'compliant').length;
  const compliant    = allGaps.filter(g => g.status === 'compliant').length;
  const monitoring   = allGaps.filter(g => g.status === 'partial').length;

  return {
    ...validated,
    risk_classification: riskLevel as ComplianceResultParsed['risk_classification'],
    applicable_articles: [
      ...validated.applicable_articles,
      ...additionalApplicable,
    ],
    compliance_gaps: allGaps,
    compliance_summary: {
      ...validated.compliance_summary,
      non_compliant_count: nonCompliant,
      compliant_count:     compliant,
      monitoring_count:    monitoring,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runComplianceCheck(
  system:  AISystem,
  company: Company,
): Promise<ComplianceResultWithSanctions & { context_chunks_used?: string[] }> {

  // Phase 1 — Deterministic pre-classification
  const { text: constraintBlock, riskLevel, mandatoryArticles } =
    buildConstraintBlock(system, company);

  // Phase 2 — RAG context retrieval
  let activeSystemPrompt = systemPrompt;
  let ragContextText: string | undefined;
  let chunksUsed: string[] = [];

  if (RAG_ENABLED) {
    try {
      const rag      = await buildRagContext(system, company);
      ragContextText = rag.contextText;
      chunksUsed     = rag.chunksUsed;
      activeSystemPrompt = RAG_SYSTEM_PROMPT;
    } catch {
      // RAG failed — fall back to static system prompt silently
    }
  }

  // Phase 3 — LLM call
  const response = await bedrock.send(new ConverseCommand({
    modelId:  MODEL_ID,
    system:   [{ text: activeSystemPrompt }],
    messages: [{ role: 'user', content: [{ text: buildUserMessage(system, company, constraintBlock, ragContextText) }] }],
    inferenceConfig: { maxTokens: 5120, temperature: 0 },
  }));

  const firstContent = response.output?.message?.content?.[0];
  const rawText = firstContent && 'text' in firstContent ? (firstContent.text as string) : undefined;
  if (!rawText) throw new Error('Bedrock returned no text output');

  let jsonText = rawText.trim();
  jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  // Phase 4 — Parse + post-process
  const parsed    = JSON.parse(jsonText);
  let   validated = complianceResultSchema.parse(parsed);

  // Override risk_classification and merge any missing mandatory gaps
  validated.risk_classification =
    riskLevel as ComplianceResultParsed['risk_classification'];

  validated = ensureMandatoryGaps(validated, mandatoryArticles, riskLevel, company.governance);

  // Phase 5 — Deterministic sanction calculation
  const result = computeSanctions(validated, company);

  return {
    ...result,
    ...(chunksUsed.length > 0 ? { context_chunks_used: chunksUsed } : {}),
  };
}
