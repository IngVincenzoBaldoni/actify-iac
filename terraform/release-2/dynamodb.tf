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
