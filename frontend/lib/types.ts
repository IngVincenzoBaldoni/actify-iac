// FIX-12: enriched checklist entry (backward-compatible with legacy 'present'|'missing' strings)
export interface ChecklistEntry {
  status: 'present' | 'partial' | 'missing';
  addressed_at?: string;   // ISO date, set automatically when status → 'present'
  evidence_note?: string;  // max 300 chars
}

export function normalizeEntry(v: ChecklistEntry | 'present' | 'missing' | undefined): ChecklistEntry {
  if (!v) return { status: 'missing' };
  if (typeof v === 'string') return { status: v as 'present' | 'missing' };
  return v;
}

export type Urgency = 'critical' | 'high' | 'medium' | 'low';
export type GapStatus = 'missing' | 'partial' | 'compliant';
export type AutomationType =
  | 'document_generation' | 'policy_template' | 'transparency_notice'
  | 'risk_assessment' | 'monitoring_plan' | 'conformity_declaration';

export interface GapTierInfo {
  tier_label: string;
  tier_cap: number;
  tier_pct: number;
  theoretical_pct_amount: number;
  theoretical_max: number;
}

export interface ComplianceGap {
  gap_id: string;
  article: string;
  requirement: string;
  status: GapStatus;
  deadline: string | null;
  urgency: Urgency;
  description: string;
  what_to_do: string;
  can_actify_automate: boolean;
  automation_type: AutomationType | null;
  estimated_sanction_min?: number;
  estimated_sanction_max?: number;
  tier_info?: GapTierInfo;
  source_chunks?: string[];   // FIX-03
  ungrounded?: boolean;        // FIX-03
}

export interface SanctionMethodology {
  is_sme: boolean;
  sme_reduction: number;
  min_factor: number;
  turnover_source_label: string;
}

export interface TotalExposure {
  min: number;
  max: number;
  currency: 'EUR';
  disclaimer: string;
  turnover_used: number;
  turnover_source: 'exact' | 'declared' | 'estimated';
  methodology?: SanctionMethodology;
}

// FIX-06: RAG quality metadata stored on the compliance result
export interface RagMetadata {
  rag_used: boolean;
  rag_chunk_count: number;
  rag_fallback_reason?: string;
  rule_engine_reasoning?: string[];
}

export interface ComplianceResult {
  risk_classification: 'prohibited' | 'high' | 'limited' | 'minimal';
  applicable_articles: string[];
  compliance_gaps: ComplianceGap[];
  score: { governance: number; transparency: number; documentation: number; monitoring: number };
  compliance_summary: {
    compliant_count: number;
    non_compliant_count: number;
    monitoring_count: number;
    most_urgent_deadline: string | null;
    months_to_urgency: number | null;
  };
  priority_actions: Array<{ priority: string; action: string; rationale: string }>;
  executive_summary: string;
  total_exposure_estimate?: TotalExposure;
  rag_metadata?: RagMetadata;  // FIX-06
}

// ─── Document Vault ───────────────────────────────────────────────────────────

export type DocumentStatus = 'generating' | 'draft' | 'final' | 'error';

export interface ActifyDocument {
  document_id:    string;
  company_id:     string;
  system_id:      string;
  gap_id:         string;
  article:        string;
  document_type:  string;
  title:          string;
  status:         DocumentStatus;
  error_message?: string;
  s3_key?:        string;
  preview_url?:   string;  // pre-signed URL, added by GET /api/documents/:id
  generated_at:   string;
  finalized_at?:  string;
  generated_by:   'actify_auto';
}

// ─── AI Literacy Tracker ──────────────────────────────────────────────────────

export interface LiteracyDepartment {
  dept_id:    string;
  name:       string;
  headcount:  number;
  system_ids: string[];
  systems?:   Array<{ system_id: string; tool_name: string; purpose: string }>;
  source:     'manual' | 'inventory';
  cert_count: number;
  created_at?: string;
}

export interface LiteracyCertification {
  cert_id:            string;
  dept_id:            string;
  certification_name: string;
  issued_date:        string;
  url?:               string | null;
  people_count?:      number | null;
  notes?:             string | null;
  created_at:         string;
}

export interface CertSuggestion {
  name:        string;
  provider:    string;
  description: string;
  url:         string;
  level:       'beginner' | 'intermediate' | 'advanced';
  format:      string;
}

export interface ComplianceCheck {
  pk: string;
  check_id: string;
  company_id: string;
  system_id: string;
  triggered_by: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ComplianceResult;
  error?: string;
  created_at: string;
  completed_at?: string;
}
