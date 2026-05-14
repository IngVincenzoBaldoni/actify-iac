# ─── Cognito ──────────────────────────────────────────────────────────────────
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID — set as NEXT_PUBLIC_COGNITO_USER_POOL_ID"
  value       = aws_cognito_user_pool.actify.id
}

output "cognito_client_id" {
  description = "Cognito App Client ID — set as NEXT_PUBLIC_COGNITO_CLIENT_ID"
  value       = aws_cognito_user_pool_client.actify_app.id
}

output "cognito_issuer" {
  description = "Cognito JWT Issuer URL (for authorizer config)"
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.actify.id}"
}

# ─── DynamoDB ─────────────────────────────────────────────────────────────────
output "dynamodb_companies_table" {
  value = aws_dynamodb_table.companies.name
}

output "dynamodb_users_table" {
  value = aws_dynamodb_table.company_users.name
}

output "dynamodb_systems_table" {
  value = aws_dynamodb_table.ai_systems.name
}

output "dynamodb_checks_table" {
  value = aws_dynamodb_table.compliance_checks.name
}

# ─── Lambda ───────────────────────────────────────────────────────────────────
output "lambda_api_name" {
  value = aws_lambda_function.saas_api.function_name
}

output "lambda_api_arn" {
  value = aws_lambda_function.saas_api.arn
}

# ─── Post-deploy commands ─────────────────────────────────────────────────────
output "cmd_deploy_lambda_api" {
  description = "Run after `cd lambda-api && npm run build` to deploy Lambda code"
  value = join(" ", [
    "aws lambda update-function-code",
    "--function-name", aws_lambda_function.saas_api.function_name,
    "--zip-file fileb://lambda-api/dist/function.zip",
    "--region", var.aws_region,
  ])
}

output "cmd_tail_logs" {
  value = join(" ", [
    "aws logs tail", aws_cloudwatch_log_group.lambda_api.name,
    "--follow --region", var.aws_region,
  ])
}
