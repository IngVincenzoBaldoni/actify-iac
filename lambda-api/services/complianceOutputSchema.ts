import { z } from 'zod';

export const complianceGapSchema = z.object({
  gap_id: z.string(),
  article: z.string(),
  requirement: z.string(),
  status: z.enum(['missing', 'partial', 'compliant']),
  deadline: z.string().nullable(),
  urgency: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string().transform(s => s.slice(0, 600)),
  what_to_do: z.string().transform(s => s.slice(0, 600)),
  can_actify_automate: z.boolean(),
  automation_type: z.preprocess(
    v => {
      if (v === 'null' || v === undefined || v === null) return null;
      const valid = new Set([
        'document_generation', 'policy_template', 'transparency_notice',
        'risk_assessment', 'monitoring_plan', 'conformity_declaration',
        'training_plan', 'training_program',
      ]);
      return valid.has(v as string) ? v : null;
    },
    z.enum([
      'document_generation', 'policy_template', 'transparency_notice',
      'risk_assessment', 'monitoring_plan', 'conformity_declaration',
      'training_plan', 'training_program',
    ]).nullable(),
  ),
  // FIX-03: source attribution — chunk IDs that support this gap
  source_chunks: z.array(z.string()).optional(),
  // FIX-03: set by verifyGrounding() post-LLM — true if no retrieved chunk supports this gap
  ungrounded: z.boolean().optional(),
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
    action:    z.string().transform(s => s.slice(0, 250)),
    rationale: z.string().transform(s => s.slice(0, 250)),
  })),
  executive_summary: z.string().transform(s => s.slice(0, 600)),
});

export type ComplianceResultParsed = z.infer<typeof complianceResultSchema>;
