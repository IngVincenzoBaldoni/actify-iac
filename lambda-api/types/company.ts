export interface Company {
  company_id: string;
  name: string;
  sector: string;
  employees_range: string;
  country: string;
  sede_legale?: string;
  ai_role: 'provider' | 'deployer' | 'both' | 'unknown';
  context_notes?: string;
  governance: {
    has_dpo: boolean;
    dpo_status: 'inhouse' | 'service' | 'none';
    has_ai_inventory: boolean;
    has_impact_assessment: boolean;
    has_human_oversight: boolean;
    has_incident_procedure: boolean;
    has_ai_policy: boolean;
    has_training: boolean;
  };
  annual_revenue_range?: 'under_500k' | '500k_2m' | '2m_10m' | '10m_50m' | '50m_250m' | 'over_250m';
  subscription_tier: 'trial' | 'starter' | 'pro' | 'enterprise';
  setup_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyUser {
  company_id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'active';
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
}
