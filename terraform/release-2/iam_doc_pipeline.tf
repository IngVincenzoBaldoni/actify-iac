# ─── IAM role shared by all 5 doc-pipeline Lambda functions ──────────────────
resource "aws_iam_role" "doc_pipeline" {
  name = local.iam_doc_pipeline_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_policy" "doc_pipeline" {
  name        = local.iam_doc_pipeline_policy_name
  description = "Actify doc-pipeline Lambda permissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudWatch Logs
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.project}-doc-*:*"
      },
      # DynamoDB — all actify tables needed by pipeline steps
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
        ]
        Resource = [
          aws_dynamodb_table.companies.arn,
          aws_dynamodb_table.ai_systems.arn,
          aws_dynamodb_table.compliance_checks.arn,
          "${aws_dynamodb_table.compliance_checks.arn}/index/*",
          aws_dynamodb_table.documents.arn,
          "${aws_dynamodb_table.documents.arn}/index/*",
          aws_dynamodb_table.doc_schemas.arn,
          aws_dynamodb_table.doc_generations.arn,
          "${aws_dynamodb_table.doc_generations.arn}/index/*",
        ]
      },
      # Audit Trail table (shared with lambda-api)
      {
        Effect = "Allow"
        Action = ["dynamodb:PutItem", "dynamodb:Query"]
        Resource = "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${local.project}-audit-trail"
      },
      # S3 Documents bucket — read/write
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = "${aws_s3_bucket.actify_documents.arn}/*"
      },
      # S3 Vectors — key-based article retrieval
      {
        Effect   = "Allow"
        Action   = ["s3vectors:GetVectors"]
        Resource = "arn:aws:s3vectors:${var.aws_region}:${data.aws_caller_identity.current.account_id}:bucket/${local.s3_vectors_bucket_name}/index/ai-act-it"
      },
      # Bedrock — Converse API (Nova Pro for slots, Nova Lite for economy tier)
      {
        Effect = "Allow"
        Action = ["bedrock:InvokeModel"]
        Resource = [
          "arn:aws:bedrock:${var.aws_region}::foundation-model/eu.amazon.nova-pro-v1:0",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/eu.amazon.nova-lite-v1:0",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.nova-pro-v1:0",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.nova-lite-v1:0",
        ]
      },
      # Lambda invoke — PDF generator
      {
        Effect   = "Allow"
        Action   = ["lambda:InvokeFunction"]
        Resource = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.lambda_pdf_name}"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "doc_pipeline" {
  role       = aws_iam_role.doc_pipeline.name
  policy_arn = aws_iam_policy.doc_pipeline.arn
}

# CloudWatch log groups for each pipeline Lambda
resource "aws_cloudwatch_log_group" "doc_assemble_ctx" {
  name              = "/aws/lambda/${local.lambda_doc_assemble_ctx_name}"
  retention_in_days = 14
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "doc_generate_slot" {
  name              = "/aws/lambda/${local.lambda_doc_generate_slot_name}"
  retention_in_days = 14
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "doc_validate" {
  name              = "/aws/lambda/${local.lambda_doc_validate_name}"
  retention_in_days = 14
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "doc_assemble" {
  name              = "/aws/lambda/${local.lambda_doc_assemble_name}"
  retention_in_days = 14
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "doc_persist" {
  name              = "/aws/lambda/${local.lambda_doc_persist_name}"
  retention_in_days = 14
  tags              = local.common_tags
}

# ─── IAM role for Step Functions ─────────────────────────────────────────────
resource "aws_iam_role" "sfn_doc_pipeline" {
  name = local.iam_sfn_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "states.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_policy" "sfn_doc_pipeline" {
  name        = local.iam_sfn_policy_name
  description = "Actify Step Functions — doc generation workflow permissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Invoke all pipeline Lambdas (sync)
      {
        Effect = "Allow"
        Action = ["lambda:InvokeFunction"]
        Resource = [
          aws_lambda_function.doc_assemble_ctx.arn,
          aws_lambda_function.doc_generate_slot.arn,
          aws_lambda_function.doc_validate.arn,
          aws_lambda_function.doc_assemble.arn,
          aws_lambda_function.doc_persist.arn,
          # PDF generator (release-1 Lambda)
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.lambda_pdf_name}",
        ]
      },
      # CloudWatch Logs for execution history
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogDelivery",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
          "logs:PutLogEvents",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
          "logs:DescribeLogGroups",
        ]
        Resource = "*"
      },
      # X-Ray tracing
      {
        Effect   = "Allow"
        Action   = ["xray:PutTraceSegments", "xray:PutTelemetryRecords", "xray:GetSamplingRules", "xray:GetSamplingTargets"]
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "sfn_doc_pipeline" {
  role       = aws_iam_role.sfn_doc_pipeline.name
  policy_arn = aws_iam_policy.sfn_doc_pipeline.arn
}
