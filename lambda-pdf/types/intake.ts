// IntakePayload — contract between the assessment form and the Lambda API.

export interface AITool {
  tool_name: string;
  vendor: string;
  category: string;                                            // freeform (HR, Finance, llm, etc.)
  role?: "provider" | "deployer";                             // whether PMI is provider or deployer
  purpose: string;
  target_users: string[];                                     // ["employees","customers","third_parties"]
}

export interface IntakePayload {
  // Step 1 — Company profile
  company: {
    name: string;
    sector: string;
    employees_range: "1-10" | "11-50" | "51-250" | "251-1000" | "1000+";
    country: string;
    sede_legale?: string;
  };

  // Step 2 — AI tools (provider + deployer combined)
  ai_tools: AITool[];

  // Legacy — kept for backward compat, sent as empty array
  use_cases: string[];

  // Step 3 — Decision-making and data
  decisions: {
    makes_automated_decisions: boolean;
    human_oversight_level?: string;                          // "always" | "sometimes" | "never" | "na"
    decision_domains: string[];
    data_types: string[];
    affects_vulnerable_groups: boolean;
  };

  // Step 4 — AI Readiness (renamed from Governance)
  governance: {
    has_dpo: boolean;
    dpo_status?: string;                                     // "inhouse" | "service" | "none"
    has_ai_inventory: boolean;
    has_impact_assessment: boolean;
    has_human_oversight: boolean;
    has_incident_procedure: boolean;
    has_ai_policy?: boolean;
    has_training?: boolean;
  };

  // Step 2 — AI role derived from checkboxes
  ai_role: "provider" | "deployer" | "both" | "unknown";

  // Step 5 — Free-text context
  context_notes: string;
}
