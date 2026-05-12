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

  # S3 — write generated PDFs under reports/ prefix
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

  # Bedrock — invoke Nova Pro
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
      # Foundation model in EU and US regions (cross-region inference may route there)
      "arn:aws:bedrock:eu-central-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:eu-west-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:eu-west-3::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:eu-north-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:us-west-2::foundation-model/amazon.nova-pro-v1:0",
      # EU cross-region inference profile (account-scoped, system-defined by AWS)
      "arn:aws:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:inference-profile/eu.amazon.nova-pro-v1:0",
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
