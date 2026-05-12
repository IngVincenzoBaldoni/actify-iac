import { z } from "zod";
import type { IntakePayload } from "../types/intake";

const aiToolSchema = z.object({
  tool_name: z.string().min(1).max(200),
  vendor: z.string().min(1).max(200),
  category: z.enum(["llm", "specialized", "proprietary", "other"]),
  purpose: z.string().min(1).max(500),
  target_users: z.enum(["employees", "customers", "third_parties", "all"]),
});

export const intakePayloadSchema = z.object({
  company: z.object({
    name: z.string().min(1).max(200),
    sector: z.string().min(1).max(100),
    employees_range: z.enum(["1-10", "11-50", "51-250", "251-1000", "1000+"]),
    country: z.string().min(1).max(100),
  }),
  ai_tools: z.array(aiToolSchema).min(1).max(50),
  use_cases: z.array(z.string().max(500)).max(20),
  decisions: z.object({
    makes_automated_decisions: z.boolean(),
    decision_domains: z.array(z.string().max(100)).max(20),
    data_types: z.array(z.string().max(100)).max(20),
    affects_vulnerable_groups: z.boolean(),
  }),
  governance: z.object({
    has_dpo: z.boolean(),
    has_ai_inventory: z.boolean(),
    has_impact_assessment: z.boolean(),
    has_human_oversight: z.boolean(),
    has_incident_procedure: z.boolean(),
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
