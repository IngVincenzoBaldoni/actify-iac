data "aws_caller_identity" "current" {}

# ─── Trust policy ─────────────────────────────────────────────────────────────
data "aws_iam_policy_document" "api_assume_role" {
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

# ─── Permission policy ────────────────────────────────────────────────────────
data "aws_iam_policy_document" "api_permissions" {

  # CloudWatch Logs
  statement {
    sid    = "AllowCloudWatchLogs"
    effect = "Allow"
    actions = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.lambda_api.arn}:*"]
  }

  # DynamoDB — full CRUD on all actify-saas tables (core + documents)
  statement {
    sid    = "AllowDynamoDBCRUD"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
    ]
    resources = [
      aws_dynamodb_table.companies.arn,
      aws_dynamodb_table.company_users.arn,
      "${aws_dynamodb_table.company_users.arn}/index/*",
      aws_dynamodb_table.ai_systems.arn,
      aws_dynamodb_table.compliance_checks.arn,
      aws_dynamodb_table.documents.arn,
      "${aws_dynamodb_table.documents.arn}/index/*",
      aws_dynamodb_table.literacy.arn,
      aws_dynamodb_table.partners.arn,
      aws_dynamodb_table.partner_pmi.arn,
      "${aws_dynamodb_table.partner_pmi.arn}/index/*",
    ]
  }

  # S3 — Document Vault (read/write generated PDFs + presigned URL generation)
  statement {
    sid    = "AllowS3DocumentVault"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.actify_documents.arn}/documents/*"]
  }

  # Cognito — user management for this User Pool only
  statement {
    sid    = "AllowCognitoUserManagement"
    effect = "Allow"
    actions = [
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminDeleteUser",
      "cognito-idp:AdminUpdateUserAttributes",
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminSetUserPassword",
    ]
    resources = [aws_cognito_user_pool.actify.arn]
  }

  # Bedrock — Nova Pro (LLM) + Titan Embed V2 (RAG embeddings)
  statement {
    sid    = "AllowBedrockInvoke"
    effect = "Allow"
    actions = ["bedrock:InvokeModel"]
    resources = [
      "arn:aws:bedrock:eu-central-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:eu-west-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:eu-west-3::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:eu-north-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:us-west-2::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:inference-profile/eu.amazon.nova-pro-v1:0",
      # Titan Text Embeddings V2 — for RAG query vectorisation
      "arn:aws:bedrock:eu-central-1::foundation-model/amazon.titan-embed-text-v2:0",
      "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0",
    ]
  }

  # S3 Vectors — read-only access to the AI Act knowledge base (RAG)
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

  # Lambda self-invoke (async compliance check) + invoke pdf-generator (document generation)
  statement {
    sid    = "AllowLambdaInvoke"
    effect = "Allow"
    actions = ["lambda:InvokeFunction"]
    resources = [
      "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.lambda_api_name}",
      "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.lambda_pdf_name}",
    ]
  }
}

# ─── IAM Role ─────────────────────────────────────────────────────────────────
resource "aws_iam_role" "lambda_api" {
  name               = local.iam_api_role_name
  assume_role_policy = data.aws_iam_policy_document.api_assume_role.json
  tags = { Name = local.iam_api_role_name }
}

resource "aws_iam_policy" "lambda_api" {
  name        = local.iam_api_policy_name
  description = "Least-privilege policy for ${local.lambda_api_name}: DynamoDB + Cognito + Bedrock + self-invoke"
  policy      = data.aws_iam_policy_document.api_permissions.json
  tags = { Name = local.iam_api_policy_name }
}

resource "aws_iam_role_policy_attachment" "lambda_api" {
  role       = aws_iam_role.lambda_api.name
  policy_arn = aws_iam_policy.lambda_api.arn
}
