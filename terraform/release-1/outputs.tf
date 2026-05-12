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

# ─── Amplify ──────────────────────────────────────────────────────────────────
output "amplify_default_domain" {
  description = "Amplify app default domain (only when enable_amplify = true)"
  value       = var.enable_amplify ? "https://${var.github_branch}.${aws_amplify_app.frontend[0].default_domain}" : "n/a — set enable_amplify = true"
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
