# ─── S3 — Document Vault ─────────────────────────────────────────────────────
# Stores generated compliance documents (PDFs). Draft documents expire after
# 7 days via DynamoDB TTL + S3 lifecycle rule. Final documents never expire.

resource "aws_s3_bucket" "actify_documents" {
  bucket = local.s3_documents_bucket_name

  tags = {
    Name = local.s3_documents_bucket_name
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents_sse" {
  bucket = aws_s3_bucket.actify_documents.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "documents_versioning" {
  bucket = aws_s3_bucket.actify_documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "documents_lifecycle" {
  bucket = aws_s3_bucket.actify_documents.id

  rule {
    id     = "expire-drafts"
    status = "Enabled"
    filter {
      prefix = "documents/"
    }
    # S3-side cleanup for drafts not finalized within 10 days
    # (DynamoDB TTL removes the record at 7 days; S3 cleanup is a safety net)
    expiration {
      days = 10
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "documents_cors" {
  bucket = aws_s3_bucket.actify_documents.id

  cors_rule {
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_public_access_block" "documents_public_access" {
  bucket                  = aws_s3_bucket.actify_documents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
