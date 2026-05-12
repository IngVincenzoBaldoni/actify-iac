import { z } from "zod";
import type { BedrockReportOutput } from "../types/reportOutput";

const riskLevelSchema = z.enum(["prohibited", "high", "limited", "minimal"]);
const complianceStatusSchema = z.enum([
  "compliant",
  "non_compliant",
  "monitoring_needed",
  "unknown",
]);
const prioritySchema = z.enum(["immediate", "short_term", "medium_term"]);
const toolCategorySchema = z.enum(["llm", "specialized", "proprietary"]);

export const reportOutputSchema = z.object({
  executive_summary: z.string().min(1),
  overall_risk_level: riskLevelSchema,
  overall_risk_score: z.number().min(0).max(30),

  tool_catalog: z
    .array(
      z.object({
        tool_name: z.string().min(1),
        vendor: z.string().min(1),
        category: toolCategorySchema,
        declared_purpose: z.string().min(1),
        risk_classification: riskLevelSchema,
        applicable_articles: z.array(z.string()),
        rationale_compact: z.string().min(1),
        compliance_status: complianceStatusSchema,
        compliance_deadline: z.string().nullable(),
        required_actions: z.array(z.string()),
      })
    )
    .min(1),

  ai_act_timeline: z.object({
    already_in_force: z.array(z.string()),
    aug_2025: z.array(z.string()),
    aug_2026: z.array(z.string()),
    aug_2027: z.array(z.string()),
  }),

  compliance_summary: z.object({
    compliant_count: z.number().int().min(0),
    non_compliant_count: z.number().int().min(0),
    monitoring_count: z.number().int().min(0),
    most_urgent_deadline: z.string().nullable(),
    months_to_urgency: z.number().nullable(),
  }),

  priority_actions: z
    .array(
      z.object({
        priority: prioritySchema,
        action: z.string().min(1),
        rationale: z.string().min(1),
      })
    )
    .min(1),

  key_findings_from_notes: z.string(),
  report_footer_note: z.string().min(1),
}) satisfies z.ZodType<BedrockReportOutput>;

export type ReportOutputSchema = z.infer<typeof reportOutputSchema>;

// Template sent to Bedrock in the user message so the model knows the exact expected structure.
export const OUTPUT_SCHEMA_TEMPLATE = {
  executive_summary: "<max 60 parole — sintesi ad alto livello>",
  overall_risk_level: "prohibited | high | limited | minimal",
  overall_risk_score: "<number 0-30>",
  tool_catalog: [
    {
      tool_name: "<nome>",
      vendor: "<vendor | 'Proprietario' | 'Non specificato'>",
      category: "llm | specialized | proprietary",
      declared_purpose: "<max 10 parole>",
      risk_classification: "prohibited | high | limited | minimal",
      applicable_articles: ["Art. X", "Annex III cat. Y(z)"],
      rationale_compact: "<max 20 parole — causa specifica del rischio>",
      compliance_status: "compliant | non_compliant | monitoring_needed | unknown",
      compliance_deadline: "YYYY-MM-DD | null",
      required_actions: ["<azione breve 1>", "<azione breve 2>"],
    },
  ],
  ai_act_timeline: {
    already_in_force: ["<obbligo già attivo — max 10 parole>"],
    aug_2025: ["<obbligo — max 10 parole>"],
    aug_2026: ["<obbligo — max 10 parole>"],
    aug_2027: ["<obbligo — max 10 parole>"],
  },
  compliance_summary: {
    compliant_count: "<n>",
    non_compliant_count: "<n>",
    monitoring_count: "<n>",
    most_urgent_deadline: "YYYY-MM-DD | null",
    months_to_urgency: "<n> | null",
  },
  priority_actions: [
    {
      priority: "immediate | short_term | medium_term",
      action: "<max 15 parole>",
      rationale: "<max 15 parole>",
    },
  ],
  key_findings_from_notes: "<max 50 parole — osservazioni critiche dalle note libere>",
  report_footer_note: "<max 30 parole — CTA verso SaaS Actify>",
};
