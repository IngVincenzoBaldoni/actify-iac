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
