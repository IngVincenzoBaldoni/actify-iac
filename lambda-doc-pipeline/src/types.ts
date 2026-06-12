// ─── Document schema types ────────────────────────────────────────────────────

export type DocType =
  | 'DISCLOSURE_NOTICE'
  | 'MONITORING_PLAN'
  | 'AI_POLICY'
  | 'TECH_DOC'
  | 'CONFORMITY_DECL';

export type SectionKind = 'FIXED' | 'GENERATIVE';
export type ModelTier   = 'economy' | 'standard' | 'premium';

export interface SlotDef {
  slotId:          string;
  instruction:     string;
  maxWords:        number;
  allowedCitations: 'FROM_CONTEXT_ONLY';
  tone:            'operativo' | 'informativo';
  outputSchema:    Record<string, unknown>;
}

export interface Section {
  sectionId:  string;
  title:      string;
  order:      number;
  kind:       SectionKind;
  // FIXED
  template?:  string;
  bindings?:  string[];
  // GENERATIVE
  slot?:      SlotDef;
}

export interface ClosingActionRule {
  gapTypes:  string[];   // automation_type values this rule applies to
  actions:   string[];   // ordered list of required PMI actions
}

export interface DocSchema {
  docType:          DocType;
  version:          string;
  status:           'ACTIVE' | 'DEPRECATED';
  modelTier:        ModelTier;
  modelId?:         string;
  sections:         Section[];
  closingActions:   ClosingActionRule[];
  outputLanguage:   'it';
  createdAt:        string;
}

// ─── Generation context (assembled in step 1) ────────────────────────────────

export interface ArticleText {
  key:            string;
  articleNumber?: number;
  articleTitle?:  string;
  text:           string;
}

export interface GenerationContext {
  schema:          DocSchema;
  company:         CompanyProfile;
  system:          SystemProfile;
  gap:             GapSnapshot;
  articleTexts:    ArticleText[];
  allowedRefs:     string[];
  generativeSlots: GenerativeSlotInput[];
  fixedSections:   ResolvedFixedSection[];
  contextS3Key:    string;
  kbVersion:       string;
  modelId:         string;
  promptVersion:   string;
}

export interface CompanyProfile {
  company_id:    string;
  name:          string;
  sector:        string;
  employees_range: string;
  annual_revenue_exact?: number;
  annual_revenue_range?: string;
  size?:         string;
}

export interface SystemProfile {
  system_id:     string;
  tool_name:     string;
  vendor?:       string;
  purpose:       string;
  category:      string;
  role:          string;
  output_type?:  string;
  access_mode?:  string;
  target_users?: string[];
  data_types?:   string[];
  customizations?: string[];
  human_oversight_level?: string;
  decision_domains?: string[];
  vulnerable_groups?: string[];
}

export interface GapSnapshot {
  gap_id:          string;
  article:         string;
  requirement:     string;
  urgency:         string;
  description:     string;
  what_to_do:      string;
  automation_type: string;
  articleRef?:     string;
}

export interface GenerativeSlotInput {
  slotId:          string;
  sectionTitle:    string;
  instruction:     string;
  maxWords:        number;
  tone:            string;
  outputSchema:    Record<string, unknown>;
  articleContext:  string;
}

export interface ResolvedFixedSection {
  sectionId: string;
  title:     string;
  order:     number;
  content:   string;
}

// ─── Slot generation I/O ─────────────────────────────────────────────────────

export interface SlotResult {
  slotId:  string;
  content: Record<string, unknown>;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationReport {
  citationViolations:  CitationViolation[];
  schemaViolations:    SchemaViolation[];
  blacklistMatches:    BlacklistMatch[];
}

export interface CitationViolation {
  slotId:    string;
  ref:       string;
  reason:    string;
}

export interface SchemaViolation {
  slotId:    string;
  field:     string;
  reason:    string;
}

export interface BlacklistMatch {
  slotId:    string;
  phrase:    string;
}

export interface ValidationResult {
  passed:      boolean;
  failedSlots: FailedSlotFeedback[];
  report:      ValidationReport;
}

export interface FailedSlotFeedback {
  slotId:          string;
  originalContent: Record<string, unknown>;
  feedback:        string;
}

// ─── Doc generations table record ────────────────────────────────────────────

export type GenStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'DRAFT_READY'
  | 'REVIEW_REQUIRED'
  | 'FAILED';

export interface DocGenerationRecord {
  pk:             string;  // COMPANY#{companyId}
  sk:             string;  // GEN#{generationId}
  generationId:   string;
  companyId:      string;
  systemId:       string;
  gapId:          string;
  docType:        DocType;
  status:         GenStatus;
  schemaVersion?: string;
  kbVersion?:     string;
  modelId?:       string;
  promptVersion?: string;
  contextS3Key?:  string;
  outputS3Key?:   string;
  documentId?:    string;
  validationReport?: ValidationReport;
  attempt:        number;
  executionArn?:  string;
  idempotencyKey?: string;
  createdAt:      string;
  updatedAt:      string;
  completedAt?:   string;
  ttl?:           number;
  errorMessage?:  string;
}

// ─── Step Functions event inputs ─────────────────────────────────────────────

export interface PipelineInput {
  generationId: string;
  companyId:    string;
  systemId:     string;
  gapId:        string;
  docType:      DocType;
  attempt:      number;
}

export interface AssembleContextInput extends PipelineInput {}

export interface GenerateSlotInput {
  slot:         GenerativeSlotInput;
  context:      GenerationContext;
  generationId: string;
}

export interface GenerateSlotRetryInput {
  retryMode:       true;
  failedSlots:     FailedSlotFeedback[];
  slots:           SlotResult[];
  context:         GenerationContext;
  validationReport: ValidationReport;
  generationId:    string;
}

export interface ValidateDocumentInput {
  slots:        SlotResult[];
  context:      GenerationContext;
  generationId: string;
}

export interface AssembleDocumentInput {
  slots:        SlotResult[];
  context:      GenerationContext;
  generationId: string;
  companyId:    string;
  systemId:     string;
  docType:      DocType;
}

export interface PersistAuditInput {
  action:        'persist_draft' | 'update_status' | 'review_required';
  generationId:  string;
  companyId:     string;
  systemId?:     string;
  gapId?:        string;
  docType?:      DocType;
  context?:      GenerationContext;
  assembled?:    { markdownS3Key: string; markdownContent: string; title: string };
  pdf?:          { pdfS3Key: string };
  validation?:   ValidationResult;
  slots?:        SlotResult[];
  // for update_status action
  status?:       GenStatus;
  error?:        unknown;
}
