# ─── Stub zip ────────────────────────────────────────────────────────────────
# Used only on the first `terraform apply` to provision the function.
# After building the Lambda code, update with the command in `outputs.tf`.
#
# NOTE: lifecycle.ignore_changes = [filename, source_code_hash] prevents
# subsequent Terraform runs from reverting to this stub.
data "archive_file" "lambda_stub" {
  type        = "zip"
  output_path = "${path.module}/.terraform/lambda_stub.zip"

  source {
    content  = <<-JS
      exports.handler = async () => ({
        statusCode: 503,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "not_deployed",
          message: "Lambda stub active. Build and deploy the application code."
        })
      });
    JS
    filename = "index.js"
  }
}

# ─── Lambda Function ──────────────────────────────────────────────────────────
resource "aws_lambda_function" "pdf_generator" {
  function_name = local.lambda_name
  description   = "Actify ${local.release} — receives form payload, calls Bedrock Nova Pro, generates PDF, uploads to S3"
  role          = aws_iam_role.lambda_execution.arn

  filename         = data.archive_file.lambda_stub.output_path
  source_code_hash = data.archive_file.lambda_stub.output_base64sha256

  # Entry point: <file>.<exported function>
  # Expected built path: dist/handler.js → exports.handler
  handler = "dist/handler.handler"
  runtime = "nodejs20.x"

  memory_size = 1024  # Puppeteer/headless Chromium requires ≥512 MB
  timeout     = 30    # Max 29s for API GW, extra 1s safety margin for S3 upload

  environment {
    variables = {
      BEDROCK_MODEL_ID    = "eu.amazon.nova-pro-v1:0"
      BEDROCK_REGION      = var.aws_region
      BEDROCK_MAX_TOKENS  = "5120"
      BEDROCK_TEMPERATURE = "0"
      S3_BUCKET           = aws_s3_bucket.reports_temp.bucket
      S3_REGION           = var.aws_region
      PRESIGNED_URL_TTL   = "900"
      RATE_LIMIT_MAX      = "5"
      RATE_LIMIT_WINDOW   = "900"
      ENV                 = var.environment
      LOG_LEVEL           = "info"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda,
    aws_cloudwatch_log_group.lambda,
  ]

  tags = {
    Name    = local.lambda_name
    Runtime = "nodejs20.x"
  }

  lifecycle {
    # Code is managed outside Terraform (aws lambda update-function-code).
    # Prevent Terraform from reverting to the stub on subsequent applies.
    ignore_changes = [
      filename,
      source_code_hash,
    ]
  }
}

# ─── Lambda permission: allow API Gateway to invoke ───────────────────────────
resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pdf_generator.function_name
  principal     = "apigateway.amazonaws.com"
  # Restrict to this specific API Gateway only
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
