import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { systemPrompt } from './systemPrompt';
import { complianceResultSchema } from './complianceOutputSchema';
import { computeSanctions, ComplianceResultWithSanctions } from './sanctions';
import type { AISystem } from '../types/aiSystem';
import type { Company } from '../types/company';

const bedrock = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION ?? 'eu-central-1' });
const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? 'eu.amazon.nova-pro-v1:0';

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
    automation_type: "document_generation|policy_template|transparency_notice|risk_assessment|monitoring_plan|conformity_declaration — usa JSON null (non la stringa 'null') se can_actify_automate è false",
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

function buildUserMessage(system: AISystem, company: Company): string {
  return `Esegui un compliance check AI Act sul seguente sistema AI specifico.

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
- Identifica ogni gap di compliance rispetto all'AI Act con scadenze temporali precise (2026-08-02 è la deadline principale)
- Per ogni gap valuta se Actify può automatizzare la risoluzione e con quale tipo di deliverable
- Sii conservativo: in caso di dubbio tra livelli di rischio, scegli il più alto
- Tutti i campi testuali devono essere in italiano
- Rispondi ESCLUSIVAMENTE con il JSON con lo schema esatto qui sotto. Zero testo fuori dal JSON.

${JSON.stringify(OUTPUT_TEMPLATE, null, 2)}`;
}

export async function runComplianceCheck(
  system: AISystem,
  company: Company,
): Promise<ComplianceResultWithSanctions> {
  const response = await bedrock.send(new ConverseCommand({
    modelId: MODEL_ID,
    system: [{ text: systemPrompt }],
    messages: [{ role: 'user', content: [{ text: buildUserMessage(system, company) }] }],
    inferenceConfig: {
      maxTokens: 5120,
      temperature: 0,
    },
  }));

  const firstContent = response.output?.message?.content?.[0];
  const rawText = firstContent && 'text' in firstContent ? (firstContent.text as string) : undefined;
  if (!rawText) throw new Error('Bedrock returned no text output');

  // Strip markdown code fences if present
  let jsonText = rawText.trim();
  jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  const parsed = JSON.parse(jsonText);
  const validated = complianceResultSchema.parse(parsed);
  return computeSanctions(validated, company);
}
