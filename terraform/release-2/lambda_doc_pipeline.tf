# ─── Stub zip (first apply only — same pattern as lambda-api) ─────────────────
data "archive_file" "doc_pipeline_stub" {
  type        = "zip"
  output_path = "${path.module}/.terraform/doc_pipeline_stub.zip"

  source {
    content  = <<-JS
      exports.handler = async () => ({ statusCode: 503, body: JSON.stringify({ error: "not_deployed" }) });
    JS
    filename = "index.js"
  }
}

locals {
  doc_stub_zip  = data.archive_file.doc_pipeline_stub.output_path
  doc_stub_hash = data.archive_file.doc_pipeline_stub.output_base64sha256

  doc_pipeline_env = {
    DOCUMENTS_BUCKET         = aws_s3_bucket.actify_documents.bucket
    S3_VECTORS_BUCKET        = local.s3_vectors_bucket_name
    S3_VECTORS_INDEX         = "ai-act-it"
    S3_VECTORS_REGION        = var.aws_region
    DYNAMODB_COMPANIES_TABLE     = aws_dynamodb_table.companies.name
    DYNAMODB_SYSTEMS_TABLE       = aws_dynamodb_table.ai_systems.name
    DYNAMODB_CHECKS_TABLE        = aws_dynamodb_table.compliance_checks.name
    DYNAMODB_DOCUMENTS_TABLE     = aws_dynamodb_table.documents.name
    DYNAMODB_DOC_SCHEMAS_TABLE   = aws_dynamodb_table.doc_schemas.name
    DYNAMODB_DOC_GENERATIONS_TABLE = aws_dynamodb_table.doc_generations.name
    DYNAMODB_AUDIT_TABLE         = "${local.project}-audit-trail"
    BEDROCK_MODEL_STANDARD       = "eu.amazon.nova-pro-v1:0"
    BEDROCK_MODEL_ECONOMY        = "eu.amazon.nova-lite-v1:0"
    BEDROCK_REGION               = var.aws_region
    LAMBDA_PDF_ARN               = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.lambda_pdf_name}"
    ENV                          = var.environment
  }
}

# ─── 1. assemble-context ──────────────────────────────────────────────────────
resource "aws_lambda_function" "doc_assemble_ctx" {
  function_name    = local.lambda_doc_assemble_ctx_name
  description      = "Doc pipeline step 1: load schema, company, system, gap, article texts from S3 Vectors"
  role             = aws_iam_role.doc_pipeline.arn
  filename         = local.doc_stub_zip
  source_code_hash = local.doc_stub_hash
  handler          = "src/handlers/assembleContext.handler"
  runtime          = "nodejs20.x"
  memory_size      = 256
  timeout          = 30

  environment { variables = local.doc_pipeline_env }

  depends_on = [aws_iam_role_policy_attachment.doc_pipeline, aws_cloudwatch_log_group.doc_assemble_ctx]
  tags       = merge(local.common_tags, { Name = local.lambda_doc_assemble_ctx_name })
  lifecycle  { ignore_changes = [filename, source_code_hash] }
}

# ─── 2. generate-slot ────────────────────────────────────────────────────────
resource "aws_lambda_function" "doc_generate_slot" {
  function_name    = local.lambda_doc_generate_slot_name
  description      = "Doc pipeline step 2 (Map): generate one GENERATIVE slot via Bedrock Converse API"
  role             = aws_iam_role.doc_pipeline.arn
  filename         = local.doc_stub_zip
  source_code_hash = local.doc_stub_hash
  handler          = "src/handlers/generateSlot.handler"
  runtime          = "nodejs20.x"
  memory_size      = 256
  timeout          = 60

  environment { variables = local.doc_pipeline_env }

  depends_on = [aws_iam_role_policy_attachment.doc_pipeline, aws_cloudwatch_log_group.doc_generate_slot]
  tags       = merge(local.common_tags, { Name = local.lambda_doc_generate_slot_name })
  lifecycle  { ignore_changes = [filename, source_code_hash] }
}

# ─── 3. validate-document ────────────────────────────────────────────────────
resource "aws_lambda_function" "doc_validate" {
  function_name    = local.lambda_doc_validate_name
  description      = "Doc pipeline step 3: citation check + schema check (deterministic Validation Gate)"
  role             = aws_iam_role.doc_pipeline.arn
  filename         = local.doc_stub_zip
  source_code_hash = local.doc_stub_hash
  handler          = "src/handlers/validateDocument.handler"
  runtime          = "nodejs20.x"
  memory_size      = 256
  timeout          = 15

  environment { variables = local.doc_pipeline_env }

  depends_on = [aws_iam_role_policy_attachment.doc_pipeline, aws_cloudwatch_log_group.doc_validate]
  tags       = merge(local.common_tags, { Name = local.lambda_doc_validate_name })
  lifecycle  { ignore_changes = [filename, source_code_hash] }
}

# ─── 4. assemble-document ────────────────────────────────────────────────────
resource "aws_lambda_function" "doc_assemble" {
  function_name    = local.lambda_doc_assemble_name
  description      = "Doc pipeline step 5: merge FIXED sections + GENERATIVE slots → canonical Markdown → S3"
  role             = aws_iam_role.doc_pipeline.arn
  filename         = local.doc_stub_zip
  source_code_hash = local.doc_stub_hash
  handler          = "src/handlers/assembleDocument.handler"
  runtime          = "nodejs20.x"
  memory_size      = 256
  timeout          = 15

  environment { variables = local.doc_pipeline_env }

  depends_on = [aws_iam_role_policy_attachment.doc_pipeline, aws_cloudwatch_log_group.doc_assemble]
  tags       = merge(local.common_tags, { Name = local.lambda_doc_assemble_name })
  lifecycle  { ignore_changes = [filename, source_code_hash] }
}

# ─── 5. persist-audit ────────────────────────────────────────────────────────
resource "aws_lambda_function" "doc_persist" {
  function_name    = local.lambda_doc_persist_name
  description      = "Doc pipeline step 7: persist document record, update doc_generations, write audit trail"
  role             = aws_iam_role.doc_pipeline.arn
  filename         = local.doc_stub_zip
  source_code_hash = local.doc_stub_hash
  handler          = "src/handlers/persistAudit.handler"
  runtime          = "nodejs20.x"
  memory_size      = 256
  timeout          = 15

  environment { variables = local.doc_pipeline_env }

  depends_on = [aws_iam_role_policy_attachment.doc_pipeline, aws_cloudwatch_log_group.doc_persist]
  tags       = merge(local.common_tags, { Name = local.lambda_doc_persist_name })
  lifecycle  { ignore_changes = [filename, source_code_hash] }
}
