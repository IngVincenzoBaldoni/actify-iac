# ─── Lambda log group ────────────────────────────────────────────────────────
# Must exist before the Lambda function to ensure logs are captured from cold start.
resource "aws_cloudwatch_log_group" "lambda" {
  name              = local.lambda_log_group_name
  retention_in_days = 14

  tags = {
    Name      = local.lambda_log_group_name
    Component = "lambda"
  }
}

# ─── API Gateway access log group ────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = local.apigw_log_group_name
  retention_in_days = 14

  tags = {
    Name      = local.apigw_log_group_name
    Component = "api-gateway"
  }
}
