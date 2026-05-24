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
export type PhaseRelevanceStatus = "relevant" | "monitor" | "not_applicable";

export interface ToolCatalogEntry {
  tool_name: string;
  vendor: string;
  category: ToolCategory;
  declared_purpose: string;
  risk_classification: RiskLevel;
  applicable_articles: string[];
  // RAG v2: specific normative chunks that drove this classification
  legal_basis?: string[];
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

export interface PhaseRelevance {
  already_in_force: PhaseRelevanceStatus;
  aug_2025: PhaseRelevanceStatus;
  aug_2026: PhaseRelevanceStatus;
  aug_2027: PhaseRelevanceStatus;
}

export interface ComplianceSummary {
  compliant_count: number;
  non_compliant_count: number;
  monitoring_count: number;
  most_urgent_deadline: string | null;
  months_to_urgency: number | null;
}

export interface ScoreBreakdown {
  governance: number;
  transparency: number;
  documentation: number;
  monitoring: number;
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
  phase_relevance: PhaseRelevance;
  compliance_summary: ComplianceSummary;
  compliance_gaps: string[];
  score_breakdown: ScoreBreakdown;
  priority_actions: PriorityAction[];
  recommended_documents: string[];
  key_findings_from_notes: string;
  report_footer_note: string;
  // RAG v2: chunk IDs used to assemble the normative context (for debug/audit)
  context_chunks_used?: string[];
}
