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
  # RAG v2: embedding (1s) + vector retrieval (1-3s) + LLM (10-20s) + PDF (5-10s) → 60s
  # API GW HTTP APIs support up to 29s; Lambda itself supports up to 900s.
  # The API Gateway timeout is separate — Lambda timeout is a safety net only.
  timeout     = 60

  environment {
    variables = {
      # LLM (assessment generation)
      BEDROCK_MODEL_ID    = "eu.amazon.nova-pro-v1:0"
      BEDROCK_REGION      = var.aws_region
      BEDROCK_MAX_TOKENS  = "5120"
      BEDROCK_TEMPERATURE = "0"

      # S3 (PDF reports + presigned URLs)
      S3_BUCKET         = aws_s3_bucket.reports_temp.bucket
      S3_REGION         = var.aws_region
      PRESIGNED_URL_TTL = "900"     # 15 min — direct browser download
      DATALAKE_BUCKET   = aws_s3_bucket.datalake.bucket

      # RAG (S3 Vectors knowledge base)
      S3_VECTORS_BUCKET     = local.s3_vectors_bucket_name
      S3_VECTORS_INDEX      = "ai-act-it"
      S3_VECTORS_REGION     = var.aws_region
      EMBEDDING_MODEL_ID    = "amazon.titan-embed-text-v2:0"
      EMBEDDING_REGION      = var.aws_region
      TOP_K                 = "5"
      MAX_CHUNKS            = "20"
      SIMILARITY_THRESHOLD  = "0.72"
      RAG_ENABLED           = "true"

      # Rate limiting + ops
      RATE_LIMIT_MAX  = "5"
      RATE_LIMIT_WINDOW = "900"
      ENV             = var.environment
      LOG_LEVEL       = "info"
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
