export type AISystemCategory =
  | 'hr' | 'finance' | 'llm' | 'marketing' | 'operations'
  | 'legal' | 'tech' | 'healthcare' | 'altro';

export type HumanOversightLevel = 'always' | 'sometimes' | 'never' | 'na';

export type ComplianceStatus = 'unchecked' | 'checking' | 'gap_found' | 'compliant';

export type OutputType = 'content_generation' | 'recommendation' | 'scoring' | 'automated_decision';

// FIX-12: enriched checklist entry (backward-compatible with legacy string values)
export interface ChecklistEntry {
  status: 'present' | 'partial' | 'missing';
  addressed_at?: string;   // ISO date set automatically when status = 'present'
  evidence_note?: string;  // max 300 chars — link to doc, action description
}

export function normalizeChecklistEntry(
  v: ChecklistEntry | 'present' | 'missing' | undefined,
): ChecklistEntry {
  if (!v) return { status: 'missing' };
  if (typeof v === 'string') return { status: v };
  return v;
}

export interface AISystem {
  company_id: string;
  system_id: string;
  tool_name: string;
  vendor: string;
  category: AISystemCategory;
  role: 'provider' | 'deployer';
  purpose: string;
  department?: string;
  headcount?: number;
  target_users: string[];
  makes_automated_decisions: boolean;
  human_oversight_level: HumanOversightLevel;
  decision_domains: string[];
  affects_vulnerable_groups: boolean;
  data_types: string[];
  // FIX-01: fields previously UI-only, now persisted
  output_type?: OutputType;
  vulnerable_groups?: string[];
  customizations?: string[];
  // FIX-12: supports both legacy string values and enriched ChecklistEntry
  compliance_checklist?: Record<string, ChecklistEntry | 'present' | 'missing'>;
  // Deterministic RAG: Allegato III domains and safety component flag
  annex_iii_domains?: string[];
  is_safety_component?: boolean;
  compliance_status: ComplianceStatus;
  last_check_id: string | null;
  last_check_at: string | null;
  last_exposure_min?: number;
  last_exposure_max?: number;
  last_article_sanctions?: string;
  created_at: string;
  updated_at: string;
}

export interface AISystemInput {
  tool_name: string;
  vendor: string;
  category: AISystemCategory;
  role: 'provider' | 'deployer';
  purpose: string;
  department?: string;
  headcount?: number;
  target_users: string[];
  makes_automated_decisions: boolean;
  human_oversight_level: HumanOversightLevel;
  decision_domains: string[];
  affects_vulnerable_groups: boolean;
  data_types: string[];
  output_type?: OutputType;
  vulnerable_groups?: string[];
  customizations?: string[];
  compliance_checklist?: Record<string, ChecklistEntry | 'present' | 'missing'>;
  annex_iii_domains?: string[];
  is_safety_component?: boolean;
}
