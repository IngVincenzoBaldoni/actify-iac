import { z } from "zod";
import type { IntakePayload } from "../types/intake";

const aiToolSchema = z.object({
  tool_name: z.string().min(1).max(200),
  vendor: z.string().min(0).max(200).default(""),
  category: z.string().min(1).max(100),
  role: z.enum(["provider", "deployer"]).optional(),
  purpose: z.string().min(1).max(1000),
  target_users: z.array(z.string().max(50)).max(5).default([]),
});

export const intakePayloadSchema = z.object({
  contact_email: z.string().email("Email non valida").max(254),
  company: z.object({
    name: z.string().min(1).max(200),
    sector: z.string().min(1).max(100),
    employees_range: z.enum(["1-10", "11-50", "51-250", "251-1000", "1000+"]),
    country: z.string().min(1).max(100),
    sede_legale: z.string().max(100).optional(),
    annual_revenue_exact: z.number().positive().nullable().optional(),
    annual_revenue_range: z.string().max(50).nullable().optional(),
  }),
  ai_tools: z.array(aiToolSchema).min(1).max(50),
  use_cases: z.array(z.string().max(500)).max(20),
  decisions: z.object({
    makes_automated_decisions: z.boolean(),
    human_oversight_level: z.string().max(50).optional(),
    decision_domains: z.array(z.string().max(100)).max(20),
    data_types: z.array(z.string().max(100)).max(20),
    affects_vulnerable_groups: z.boolean(),
  }),
  governance: z.object({
    has_dpo: z.boolean(),
    dpo_status: z.string().max(50).optional(),
    has_ai_inventory: z.boolean(),
    has_impact_assessment: z.boolean(),
    has_human_oversight: z.boolean(),
    has_incident_procedure: z.boolean(),
    has_ai_policy: z.boolean().optional(),
    has_training: z.boolean().optional(),
  }),
  ai_role: z.enum(["provider", "deployer", "both", "unknown"]),
  context_notes: z.string().max(5000),
});

export function validatePayload(body: unknown): {
  data: IntakePayload | null;
  errors: string[] | null;
} {
  const result = intakePayloadSchema.safeParse(body);
  if (result.success) {
    return { data: result.data, errors: null };
  }
  const errors = result.error.errors.map(
    (e) => `${e.path.join(".")}: ${e.message}`
  );
  return { data: null, errors };
}
