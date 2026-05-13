// BedrockReportOutput — compact JSON schema produced by Nova Pro.
// Fields are intentionally short; the HTML template expands them into verbose PDF sections.

export type RiskLevel = "prohibited" | "high" | "limited" | "minimal";
export type ComplianceStatus =
  | "compliant"
  | "non_compliant"
  | "monitoring_needed"
  | "unknown";
export type Priority = "immediate" | "short_term" | "medium_term";
export type ToolCategory = string;

export interface ToolCatalogEntry {
  tool_name: string;
  vendor: string;
  category: ToolCategory;
  declared_purpose: string;
  risk_classification: RiskLevel;
  applicable_articles: string[];
  rationale_compact: string;
  compliance_status: ComplianceStatus;
  compliance_deadline: string | null;
  required_actions: string[];
}

export interface AIActTimeline {
  already_in_force: string[];
  aug_2025: string[];
  aug_2026: string[];
  aug_2027: string[];
}

export interface ComplianceSummary {
  compliant_count: number;
  non_compliant_count: number;
  monitoring_count: number;
  most_urgent_deadline: string | null;
  months_to_urgency: number | null;
}

export interface PriorityAction {
  priority: Priority;
  action: string;
  rationale: string;
}

export interface BedrockReportOutput {
  executive_summary: string;
  overall_risk_level: RiskLevel;
  overall_risk_score: number;
  tool_catalog: ToolCatalogEntry[];
  ai_act_timeline: AIActTimeline;
  compliance_summary: ComplianceSummary;
  priority_actions: PriorityAction[];
  key_findings_from_notes: string;
  report_footer_note: string;
}
