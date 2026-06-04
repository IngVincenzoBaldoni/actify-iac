locals {
  project = "actify-saas"
  release = "release-2"

  common_tags = {
    Project     = "actify"
    Product     = "actify-saas"
    Environment = var.environment
    Release     = local.release
    ManagedBy   = "terraform"
    Repository  = "actify-iac"
  }

  # ─── Resource names ─────────────────────────────────────────────────────────
  cognito_user_pool_name   = "${local.project}-users"
  cognito_client_name      = "${local.project}-app-client"
  lambda_api_name          = "${local.project}-api"
  lambda_api_log_group     = "/aws/lambda/${local.project}-api"
  iam_api_role_name        = "${local.project}-api-role"
  iam_api_policy_name      = "${local.project}-api-policy"

  # ─── Shared resources (created by release-1) ────────────────────────────────
  s3_vectors_bucket_name = "actify-saas-ai-act-knowledge-base"

  # ─── DynamoDB table names ────────────────────────────────────────────────────
  table_companies          = "${local.project}-companies"
  table_company_users      = "${local.project}-company-users"
  table_ai_systems         = "${local.project}-ai-systems"
  table_compliance_checks  = "${local.project}-compliance-checks"
  table_documents          = "${local.project}-documents"
  table_literacy           = "${local.project}-literacy"

  # ─── S3 — Document Vault ────────────────────────────────────────────────────
  s3_documents_bucket_name = "${local.project}-documents"

  # ─── Lambda PDF Generator (release-1 resource, referenced by release-2) ────
  lambda_pdf_name          = "${local.project}-pdf-generator"
}
