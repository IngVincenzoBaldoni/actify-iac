resource "aws_cloudwatch_log_group" "lambda_api" {
  name              = local.lambda_api_log_group
  retention_in_days = 30

  tags = {
    Name = local.lambda_api_log_group
  }
}
