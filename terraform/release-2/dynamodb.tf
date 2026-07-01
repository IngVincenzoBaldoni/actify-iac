# ─── companies ────────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "companies" {
  name         = local.table_companies
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "company_id"

  attribute {
    name = "company_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = local.table_companies
  }
}

# ─── company-users ────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "company_users" {
  name         = local.table_company_users
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "company_id"
  range_key    = "user_id"

  attribute {
    name = "company_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  # GSI: dado user_id → company_id (lookup inverso)
  global_secondary_index {
    name            = "user-lookup"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = local.table_company_users
  }
}

# ─── ai-systems ───────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "ai_systems" {
  name         = local.table_ai_systems
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "company_id"
  range_key    = "system_id"

  attribute {
    name = "company_id"
    type = "S"
  }

  attribute {
    name = "system_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = local.table_ai_systems
  }
}

# ─── documents ───────────────────────────────────────────────────────────────
# PK: document_id (uuid-v4)
# GSI company-index: company_id + generated_at → Document Vault per azienda
# GSI system-index:  system_id  + generated_at → documenti per singolo tool
resource "aws_dynamodb_table" "documents" {
  name         = local.table_documents
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "document_id"

  attribute {
    name = "document_id"
    type = "S"
  }

  attribute {
    name = "company_id"
    type = "S"
  }

  attribute {
    name = "system_id"
    type = "S"
  }

  attribute {
    name = "generated_at"
    type = "S"
  }

  global_secondary_index {
    name            = "company-index"
    hash_key        = "company_id"
    range_key       = "generated_at"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "system-index"
    hash_key        = "system_id"
    range_key       = "generated_at"
    projection_type = "ALL"
  }

  # TTL attribute — used for draft documents (7 days), final docs have no TTL
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = local.table_documents
  }
}

# ─── literacy ─────────────────────────────────────────────────────────────────
# Single-table design: PK = company_id, SK = record_id
# record_id format: DEPT#<uuid> for departments, CERT#<dept_id>#<cert_id> for certifications
resource "aws_dynamodb_table" "literacy" {
  name         = local.table_literacy
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "company_id"
  range_key    = "record_id"

  attribute {
    name = "company_id"
    type = "S"
  }

  attribute {
    name = "record_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = local.table_literacy
  }
}

# ─── partners ─────────────────────────────────────────────────────────────────
# PK: partner_id (UUID) — studio/consulente account
resource "aws_dynamodb_table" "partners" {
  name         = local.table_partners
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "partner_id"

  attribute {
    name = "partner_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = local.table_partners
  }
}

# ─── partner-pmi ──────────────────────────────────────────────────────────────
# PK: partner_id, SK: pmi_id
# GSI token-index: form_token → lookup by assessment token (public form)
resource "aws_dynamodb_table" "partner_pmi" {
  name         = local.table_partner_pmi
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "partner_id"
  range_key    = "pmi_id"

  attribute {
    name = "partner_id"
    type = "S"
  }

  attribute {
    name = "pmi_id"
    type = "S"
  }

  attribute {
    name = "form_token"
    type = "S"
  }

  global_secondary_index {
    name            = "token-index"
    hash_key        = "form_token"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = local.table_partner_pmi
  }
}

# ─── audit ────────────────────────────────────────────────────────────────────
# PK: company_id, SK: event_id = "<ISO_timestamp>#<uuid>" (cronologico nativo)
# IMPORTANT: table may already exist — run `terraform import aws_dynamodb_table.audit actify-saas-audit` before apply
resource "aws_dynamodb_table" "audit" {
  name         = local.table_audit
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "company_id"
  range_key    = "event_id"

  attribute {
    name = "company_id"
    type = "S"
  }

  attribute {
    name = "event_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = local.table_audit
  }
}

# ─── compliance-checks ────────────────────────────────────────────────────────
# PK: "company_id#system_id", SK: "YYYYMMDDHHMMSS-uuid" (cronologico nativo)
resource "aws_dynamodb_table" "compliance_checks" {
  name         = local.table_compliance_checks
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "check_id"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "check_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = local.table_compliance_checks
  }
}
