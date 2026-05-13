# ─── API Gateway ──────────────────────────────────────────────────────────────
output "api_endpoint" {
  description = "API Gateway base URL — set as NEXT_PUBLIC_API_URL in Amplify"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "api_report_generate_url" {
  description = "Full URL for POST /api/report/generate"
  value       = "${aws_apigatewayv2_api.main.api_endpoint}/api/report/generate"
}

# ─── Lambda ───────────────────────────────────────────────────────────────────
output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.pdf_generator.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.pdf_generator.arn
}

output "lambda_iam_role_arn" {
  description = "IAM execution role ARN attached to Lambda"
  value       = aws_iam_role.lambda_execution.arn
}

# ─── S3 ───────────────────────────────────────────────────────────────────────
output "s3_bucket_name" {
  description = "S3 bucket name for temporary PDF reports"
  value       = aws_s3_bucket.reports_temp.bucket
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.reports_temp.arn
}

# ─── CloudWatch ───────────────────────────────────────────────────────────────
output "cloudwatch_log_group_lambda" {
  description = "CloudWatch log group for Lambda (tail with: aws logs tail ...)"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "cloudwatch_log_group_apigw" {
  description = "CloudWatch log group for API Gateway access logs"
  value       = aws_cloudwatch_log_group.api_gateway.name
}

# ─── Frontend (S3 + CloudFront) ───────────────────────────────────────────────
output "frontend_url" {
  description = "CloudFront URL for the static frontend"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_s3_bucket" {
  description = "S3 bucket name for frontend static files"
  value       = aws_s3_bucket.frontend.bucket
}

output "frontend_cloudfront_distribution_id" {
  description = "CloudFront distribution ID (needed for cache invalidation in GitHub Actions)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "frontend_deploy_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC deploy — set as AWS_DEPLOY_ROLE_ARN secret"
  value       = aws_iam_role.github_actions_deploy.arn
}

# ─── Data Lake ────────────────────────────────────────────────────────────────
output "datalake_bucket_name" {
  description = "S3 data lake bucket — prospect records + PDF copies"
  value       = aws_s3_bucket.datalake.bucket
}

output "glue_database_name" {
  description = "Glue Data Catalog database for Athena queries"
  value       = aws_glue_catalog_database.actify.name
}

output "glue_crawler_name" {
  description = "Glue Crawler name (runs daily; trigger manually after first submissions)"
  value       = aws_glue_crawler.prospects.name
}

output "athena_workgroup_name" {
  description = "Athena workgroup for prospect analytics"
  value       = aws_athena_workgroup.actify.name
}

output "cmd_run_crawler" {
  description = "Trigger Glue Crawler manually (run after first form submissions)"
  value = join(" ", [
    "aws glue start-crawler",
    "--name", aws_glue_crawler.prospects.name,
    "--region", var.aws_region,
  ])
}

output "cmd_athena_all_prospects" {
  description = "Athena query — list all prospects ordered by date"
  value = join("", [
    "aws athena start-query-execution",
    " --query-string \"SELECT submission_id, company_name, company_sector, company_employees, sede_legale, ai_role, tool_count, report_s3_key, year, month, day FROM ${aws_glue_catalog_database.actify.name}.prospects ORDER BY year DESC, month DESC, day DESC\"",
    " --work-group ${aws_athena_workgroup.actify.name}",
    " --region ${var.aws_region}",
  ])
}

output "cmd_athena_count_by_month" {
  description = "Athena query — prospect count per month"
  value = join("", [
    "aws athena start-query-execution",
    " --query-string \"SELECT year, month, COUNT(*) AS submissions FROM ${aws_glue_catalog_database.actify.name}.prospects GROUP BY year, month ORDER BY year DESC, month DESC\"",
    " --work-group ${aws_athena_workgroup.actify.name}",
    " --region ${var.aws_region}",
  ])
}

# ─── Post-deploy commands ─────────────────────────────────────────────────────
output "cmd_deploy_lambda" {
  description = "Run this after `cd lambda-pdf && npm run build` to deploy Lambda code"
  value = join(" ", [
    "aws lambda update-function-code",
    "--function-name", aws_lambda_function.pdf_generator.function_name,
    "--zip-file fileb://lambda-pdf/dist/function.zip",
    "--region", var.aws_region,
  ])
}

output "cmd_tail_logs" {
  description = "Tail Lambda logs in real time"
  value = join(" ", [
    "aws logs tail", aws_cloudwatch_log_group.lambda.name,
    "--follow --region", var.aws_region,
  ])
}

output "cmd_test_endpoint" {
  description = "Quick smoke test with curl"
  value = join(" ", [
    "curl -s -X POST",
    "${aws_apigatewayv2_api.main.api_endpoint}/api/report/generate",
    "-H 'Content-Type: application/json'",
    "-d '{}'",
  ])
}
