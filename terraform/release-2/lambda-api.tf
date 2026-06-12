# ─── Stub zip (first apply only) ─────────────────────────────────────────────
data "archive_file" "lambda_api_stub" {
  type        = "zip"
  output_path = "${path.module}/.terraform/lambda_api_stub.zip"

  source {
    content  = <<-JS
      exports.handler = async () => ({
        statusCode: 503,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "not_deployed", message: "Lambda stub active." })
      });
    JS
    filename = "index.js"
  }
}

# ─── Lambda Function ──────────────────────────────────────────────────────────
resource "aws_lambda_function" "saas_api" {
  function_name = local.lambda_api_name
  description   = "Actify ${local.release} — SaaS CRUD API: auth, company, systems, compliance checks"
  role          = aws_iam_role.lambda_api.arn

  filename         = data.archive_file.lambda_api_stub.output_path
  source_code_hash = data.archive_file.lambda_api_stub.output_base64sha256

  handler = "dist/handler.handler"
  runtime = "nodejs20.x"

  memory_size = 512
  timeout     = 120

  environment {
    variables = {
      COGNITO_USER_POOL_ID       = aws_cognito_user_pool.actify.id
      COGNITO_CLIENT_ID          = aws_cognito_user_pool_client.actify_app.id
      DYNAMODB_COMPANIES_TABLE   = aws_dynamodb_table.companies.name
      DYNAMODB_USERS_TABLE       = aws_dynamodb_table.company_users.name
      DYNAMODB_SYSTEMS_TABLE     = aws_dynamodb_table.ai_systems.name
      DYNAMODB_CHECKS_TABLE      = aws_dynamodb_table.compliance_checks.name
      DYNAMODB_DOCUMENTS_TABLE   = aws_dynamodb_table.documents.name
      DYNAMODB_LITERACY_TABLE    = aws_dynamodb_table.literacy.name
      DYNAMODB_PARTNERS_TABLE    = aws_dynamodb_table.partners.name
      DYNAMODB_PARTNER_PMI_TABLE = aws_dynamodb_table.partner_pmi.name
      RESEND_API_KEY             = var.resend_api_key
      DOCUMENTS_BUCKET           = aws_s3_bucket.actify_documents.bucket
      LAMBDA_PDF_ARN             = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.lambda_pdf_name}"
      BEDROCK_MODEL_ID           = "eu.amazon.nova-pro-v1:0"
      BEDROCK_REGION             = var.aws_region
      LAMBDA_SELF_ARN            = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.lambda_api_name}"
      ENV                        = var.environment

      # Document Generation Pipeline — Step Functions + new DynamoDB tables
      STEP_FUNCTIONS_ARN              = aws_sfn_state_machine.doc_generation.arn
      DYNAMODB_DOC_SCHEMAS_TABLE      = aws_dynamodb_table.doc_schemas.name
      DYNAMODB_DOC_GENERATIONS_TABLE  = aws_dynamodb_table.doc_generations.name

      # RAG — S3 Vectors knowledge base (shared with release-1)
      S3_VECTORS_BUCKET     = local.s3_vectors_bucket_name
      S3_VECTORS_INDEX      = "ai-act-it"
      S3_VECTORS_REGION     = var.aws_region
      EMBEDDING_MODEL_ID    = "amazon.titan-embed-text-v2:0"
      EMBEDDING_REGION      = var.aws_region
      TOP_K                 = "5"
      MAX_CHUNKS            = "20"
      SIMILARITY_THRESHOLD  = "0.72"
      RAG_ENABLED           = "true"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_api,
    aws_cloudwatch_log_group.lambda_api,
  ]

  tags = {
    Name    = local.lambda_api_name
    Runtime = "nodejs20.x"
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# ─── Lambda permission: API Gateway invoke ────────────────────────────────────
resource "aws_lambda_permission" "api_gateway_invoke_saas" {
  statement_id  = "AllowAPIGatewayInvokeSaaS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.saas_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${data.aws_apigatewayv2_api.main.execution_arn}/*/*"
}
