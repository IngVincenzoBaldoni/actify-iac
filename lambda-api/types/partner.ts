export interface Partner {
  partner_id: string;
  email: string;
  ragione_sociale: string;
  tipo_studio: string;
  n_clienti: number;
  status: 'pending' | 'approved';
  // White-label settings
  logo_url?: string;
  primary_color?: string;
  sender_name?: string;
  reply_to?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerPMI {
  partner_id: string;
  pmi_id: string;
  company_name: string;
  contact_email: string;
  status: 'todo' | 'pending' | 'completato';
  form_token: string;
  systems?: PMISystem[];
  sent_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PMISystem {
  system_id: string;
  name: string;
  purpose: string;
  department?: string;
  headcount?: number;
  risk_level?: string;
  submitted_at: string;
}
