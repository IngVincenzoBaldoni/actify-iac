export type AISystemCategory =
  | 'hr' | 'finance' | 'llm' | 'marketing' | 'operations'
  | 'legal' | 'tech' | 'healthcare' | 'altro';

export type HumanOversightLevel = 'always' | 'sometimes' | 'never' | 'na';

export type ComplianceStatus = 'unchecked' | 'checking' | 'gap_found' | 'compliant';

export interface AISystem {
  company_id: string;
  system_id: string;
  tool_name: string;
  vendor: string;
  category: AISystemCategory;
  role: 'provider' | 'deployer';
  purpose: string;
  target_users: string[];
  makes_automated_decisions: boolean;
  human_oversight_level: HumanOversightLevel;
  decision_domains: string[];
  affects_vulnerable_groups: boolean;
  data_types: string[];
  compliance_status: ComplianceStatus;
  last_check_id: string | null;
  last_check_at: string | null;
  last_exposure_min?: number;
  last_exposure_max?: number;
  created_at: string;
  updated_at: string;
}

export interface AISystemInput {
  tool_name: string;
  vendor: string;
  category: AISystemCategory;
  role: 'provider' | 'deployer';
  purpose: string;
  target_users: string[];
  makes_automated_decisions: boolean;
  human_oversight_level: HumanOversightLevel;
  decision_domains: string[];
  affects_vulnerable_groups: boolean;
  data_types: string[];
}
