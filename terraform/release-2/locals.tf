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
}
