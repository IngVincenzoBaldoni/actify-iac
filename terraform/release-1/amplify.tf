# ─── AWS Amplify (optional) ───────────────────────────────────────────────────
# Set enable_amplify = true in terraform.tfvars with github_oauth_token
# and github_repository to provision the frontend hosting.
#
# The build spec is read from amplify.yml in the repository root — see SDD §3.5.
# NEXT_PUBLIC_API_URL is injected automatically from the API Gateway endpoint.

resource "aws_amplify_app" "frontend" {
  count = var.enable_amplify ? 1 : 0

  name        = local.amplify_app_name
  repository  = var.github_repository
  oauth_token = var.github_oauth_token
  platform    = "WEB_COMPUTE" # Required for Next.js SSR (App Router)

  environment_variables = {
    NEXT_PUBLIC_API_URL = aws_apigatewayv2_api.main.api_endpoint
  }

  auto_branch_creation_config {
    enable_auto_build           = false
    enable_pull_request_preview = false
  }

  tags = {
    Name = local.amplify_app_name
  }
}

resource "aws_amplify_branch" "main" {
  count = var.enable_amplify ? 1 : 0

  app_id      = aws_amplify_app.frontend[0].id
  branch_name = var.github_branch

  enable_auto_build = true
  framework         = "Next.js - SSR"
  stage             = var.environment == "production" ? "PRODUCTION" : "DEVELOPMENT"

  environment_variables = {
    NEXT_PUBLIC_API_URL = aws_apigatewayv2_api.main.api_endpoint
  }

  tags = {
    Name = "${local.amplify_app_name}-${var.github_branch}"
  }
}
