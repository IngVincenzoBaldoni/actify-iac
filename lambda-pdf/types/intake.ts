// IntakePayload — contract between the assessment form and the Lambda API.
// Mirrors the buildIntakePayload() output from the Next.js frontend (7-step wizard).

export interface AITool {
  tool_name: string;
  vendor: string;
  category: "llm" | "specialized" | "proprietary" | "other";
  purpose: string;
  target_users: "employees" | "customers" | "third_parties" | "all";
}

export interface IntakePayload {
  // Step 1 — Company profile
  company: {
    name: string;
    sector: string;
    employees_range: "1-10" | "11-50" | "51-250" | "251-1000" | "1000+";
    country: string;
  };

  // Step 2 — AI tools declared
  ai_tools: AITool[];

  // Step 3 — Use cases
  use_cases: string[];

  // Step 4 — Decision-making and data
  decisions: {
    makes_automated_decisions: boolean;
    decision_domains: string[];
    data_types: string[];
    affects_vulnerable_groups: boolean;
  };

  // Step 5 — Governance
  governance: {
    has_dpo: boolean;
    has_ai_inventory: boolean;
    has_impact_assessment: boolean;
    has_human_oversight: boolean;
    has_incident_procedure: boolean;
  };

  // Step 6 — AI role + free-text context (most critical for LLM analysis)
  ai_role: "provider" | "deployer" | "both" | "unknown";
  context_notes: string;
}
