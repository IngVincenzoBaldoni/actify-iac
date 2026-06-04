data "aws_caller_identity" "current" {}

# ─── Trust policy: Lambda service ────────────────────────────────────────────
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    sid    = "AllowLambdaAssumeRole"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

# ─── Permission policy: least privilege ──────────────────────────────────────
data "aws_iam_policy_document" "lambda_permissions" {

  # CloudWatch Logs — write only to the dedicated log group
  statement {
    sid    = "AllowCloudWatchLogs"
    effect = "Allow"

    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]

    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }

  # S3 — write generated PDFs under reports/ prefix (temp bucket for presigned URLs)
  statement {
    sid     = "AllowS3PutReport"
    effect  = "Allow"
    actions = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.reports_temp.arn}/reports/*"]
  }

  # S3 — GetObject needed to sign presigned GET URLs with SigV4
  statement {
    sid     = "AllowS3GetObjectForPresign"
    effect  = "Allow"
    actions = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.reports_temp.arn}/reports/*"]
  }

  # S3 — write to data lake: prospect JSON records + PDF copies
  statement {
    sid    = "AllowS3DatalakeWrite"
    effect = "Allow"
    actions = ["s3:PutObject"]
    resources = [
      "${aws_s3_bucket.datalake.arn}/bronze/prospects/*",
      "${aws_s3_bucket.datalake.arn}/company-reports/*",
    ]
  }

  # DynamoDB — read/write free assessment OTP records
  # (Resend email is sent via HTTPS REST API call — no AWS resource needed for it)
  statement {
    sid    = "AllowDynamoAssessments"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
    ]

    resources = [aws_dynamodb_table.free_assessments.arn]
  }

  # Bedrock — invoke Nova Pro (LLM) + Titan Embeddings V2 (RAG)
  # Covers: direct invocation in eu-central-1 + EU cross-region inference profile
  # (eu.amazon.nova-pro-v1:0 routes across eu-central-1, eu-west-1, eu-west-3)
  statement {
    sid    = "AllowBedrockNovaProInvoke"
    effect = "Allow"

    actions = [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream",
    ]

    resources = [
      # Nova Pro — LLM for assessment generation
      "arn:aws:bedrock:eu-central-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:eu-west-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:eu-west-3::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:eu-north-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:us-west-2::foundation-model/amazon.nova-pro-v1:0",
      # EU cross-region inference profile (account-scoped, system-defined by AWS)
      "arn:aws:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:inference-profile/eu.amazon.nova-pro-v1:0",
      # Titan Text Embeddings V2 — used by RAG for query embedding
      "arn:aws:bedrock:eu-central-1::foundation-model/amazon.titan-embed-text-v2:0",
      "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0",
    ]
  }

  # S3 Vectors — query and read vectors for RAG retrieval
  # ARN pattern: arn:aws:s3vectors:<region>:<account>:bucket/<bucket-name>/index/<index>
  statement {
    sid    = "AllowS3VectorsRAGRead"
    effect = "Allow"

    actions = [
      "s3vectors:QueryVectors",
      "s3vectors:GetVectors",
      "s3vectors:ListVectors",
    ]

    resources = [
      "arn:aws:s3vectors:${var.aws_region}:${data.aws_caller_identity.current.account_id}:bucket/${local.s3_vectors_bucket_name}",
      "arn:aws:s3vectors:${var.aws_region}:${data.aws_caller_identity.current.account_id}:bucket/${local.s3_vectors_bucket_name}/*",
    ]
  }
}

# ─── IAM Role ─────────────────────────────────────────────────────────────────
resource "aws_iam_role" "lambda_execution" {
  name               = local.iam_role_name
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = local.iam_role_name
  }
}

# ─── IAM Policy ──────────────────────────────────────────────────────────────
resource "aws_iam_policy" "lambda" {
  name        = local.iam_policy_name
  description = "Least-privilege policy for ${local.lambda_name}: S3 write+presign, Bedrock Nova Pro, CloudWatch Logs"
  policy      = data.aws_iam_policy_document.lambda_permissions.json

  tags = {
    Name = local.iam_policy_name
  }
}

resource "aws_iam_role_policy_attachment" "lambda" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = aws_iam_policy.lambda.arn
}
