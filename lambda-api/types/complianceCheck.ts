export type Urgency = 'critical' | 'high' | 'medium' | 'low';
export type GapStatus = 'missing' | 'partial' | 'compliant';
export type AutomationType =
  | 'document_generation' | 'policy_template' | 'transparency_notice'
  | 'risk_assessment' | 'monitoring_plan' | 'conformity_declaration';

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
}

export interface ComplianceResult {
  risk_classification: 'prohibited' | 'high' | 'limited' | 'minimal';
  applicable_articles: string[];
  compliance_gaps: ComplianceGap[];
  score: {
    governance: number;
    transparency: number;
    documentation: number;
    monitoring: number;
  };
  compliance_summary: {
    compliant_count: number;
    non_compliant_count: number;
    monitoring_count: number;
    most_urgent_deadline: string | null;
    months_to_urgency: number | null;
  };
  priority_actions: Array<{
    priority: 'immediate' | 'short_term' | 'medium_term';
    action: string;
    rationale: string;
  }>;
  executive_summary: string;
}

export interface ComplianceCheck {
  pk: string;  // "company_id#system_id"
  check_id: string;  // "YYYYMMDDHHMMSS-uuid"
  company_id: string;
  system_id: string;
  triggered_by: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ComplianceResult;
  error?: string;
  created_at: string;
  completed_at?: string;
}
