# ─── doc_schemas ──────────────────────────────────────────────────────────────
# PK: SCHEMA#{docType}   SK: VERSION#{semver}
# Stores versioned document templates: sections (FIXED/GENERATIVE), slots,
# closing action rules, model tier. Immutable per version — modify = new version.
resource "aws_dynamodb_table" "doc_schemas" {
  name         = local.table_doc_schemas
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name = local.table_doc_schemas
  })
}

# ─── doc_generations ──────────────────────────────────────────────────────────
# PK: COMPANY#{companyId}   SK: GEN#{generationId}
# Tracks async document generation jobs: QUEUED → RUNNING → DRAFT_READY | REVIEW_REQUIRED | FAILED
# GSI: system-gen-index — list generations by system_id (for polling from system detail)
resource "aws_dynamodb_table" "doc_generations" {
  name         = local.table_doc_generations
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "system_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name            = "system-gen-index"
    hash_key        = "system_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # TTL: auto-delete FAILED/abandoned generations after 30 days
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

  tags = merge(local.common_tags, {
    Name = local.table_doc_generations
  })
}
