export type AutomationType =
  | 'monitoring_plan'
  | 'transparency_notice'
  | 'risk_assessment'
  | 'policy_template'
  | 'document_generation'
  | 'conformity_declaration';

export type DocumentStatus = 'generating' | 'draft' | 'final' | 'error';

export interface ActifyDocument {
  // Primary key
  document_id: string;

  // GSI keys — needed for list-by-company and list-by-system queries
  company_id: string;
  system_id:  string;

  // Source gap
  gap_id:  string;
  article: string;

  // Metadata
  document_type: AutomationType;
  title:         string;
  status:        DocumentStatus;
  error_message?: string;

  // S3 storage (set when status becomes 'draft')
  s3_key?:    string;
  s3_bucket?: string;

  // Audit
  generated_at:  string;  // ISO datetime
  finalized_at?: string;
  generated_by:  'actify_auto';

  // TTL for draft expiry (epoch seconds, 7 days from creation)
  // Removed (set to undefined) when document is finalized
  ttl?: number;

  // Snapshot of input data at generation time — used for regeneration
  generation_context: {
    system_snapshot:  object;
    company_snapshot: object;
    gap_snapshot:     object;
  };
}
