import { z } from 'zod';

export const complianceGapSchema = z.object({
  gap_id: z.string(),
  article: z.string(),
  requirement: z.string(),
  status: z.enum(['missing', 'partial', 'compliant']),
  deadline: z.string().nullable(),
  urgency: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string().max(600),
  what_to_do: z.string().max(600),
  can_actify_automate: z.boolean(),
  automation_type: z.preprocess(
    v => (v === 'null' || v === undefined) ? null : v,
    z.enum([
      'document_generation', 'policy_template', 'transparency_notice',
      'risk_assessment', 'monitoring_plan', 'conformity_declaration',
    ]).nullable(),
  ),
});

export const complianceResultSchema = z.object({
  risk_classification: z.enum(['prohibited', 'high', 'limited', 'minimal']),
  applicable_articles: z.array(z.string()),
  compliance_gaps: z.array(complianceGapSchema),
  score: z.object({
    governance:     z.number().int().min(0).max(10),
    transparency:   z.number().int().min(0).max(10),
    documentation:  z.number().int().min(0).max(10),
    monitoring:     z.number().int().min(0).max(10),
  }),
  compliance_summary: z.object({
    compliant_count:        z.number().int(),
    non_compliant_count:    z.number().int(),
    monitoring_count:       z.number().int(),
    most_urgent_deadline:   z.string().nullable(),
    months_to_urgency:      z.number().nullable(),
  }),
  priority_actions: z.array(z.object({
    priority:  z.enum(['immediate', 'short_term', 'medium_term']),
    action:    z.string().max(250),
    rationale: z.string().max(250),
  })),
  executive_summary: z.string().max(600),
});

export type ComplianceResultParsed = z.infer<typeof complianceResultSchema>;
