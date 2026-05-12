locals {
  project = "actify-saas"
  release = "release-1"

  common_tags = {
    Project     = "actify"
    Product     = "actify-saas"
    Environment = var.environment
    Release     = local.release
    ManagedBy   = "terraform"
    Repository  = "actify-iac"
  }

  # ─── Resource names ─────────────────────────────────────────────────────────
  # Convention: actify-saas-<component>
  s3_bucket_name        = "${local.project}-reports-temp"
  lambda_name           = "${local.project}-pdf-generator"
  lambda_log_group_name = "/aws/lambda/${local.project}-pdf-generator"
  apigw_log_group_name  = "/aws/apigateway/${local.project}-api"
  iam_role_name         = "${local.project}-lambda-role"
  iam_policy_name       = "${local.project}-lambda-policy"
  api_name              = "${local.project}-api"
  amplify_app_name      = "${local.project}-frontend"
}
