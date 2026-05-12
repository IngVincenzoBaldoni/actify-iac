resource "aws_s3_bucket" "reports_temp" {
  bucket = local.s3_bucket_name

  tags = {
    Name    = local.s3_bucket_name
    Purpose = "temporary-pdf-reports"
  }
}

# ─── Encryption (AES-256) ────────────────────────────────────────────────────
resource "aws_s3_bucket_server_side_encryption_configuration" "reports_temp" {
  bucket = aws_s3_bucket.reports_temp.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# ─── Block all public access ─────────────────────────────────────────────────
# Presigned URLs bypass this block — they authenticate via SigV4 signature.
resource "aws_s3_bucket_public_access_block" "reports_temp" {
  bucket = aws_s3_bucket.reports_temp.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── Lifecycle: delete PDFs after 1 day ──────────────────────────────────────
# AWS minimum expiration is 1 day. Presigned URL TTL (15 min) expires long before.
resource "aws_s3_bucket_lifecycle_configuration" "reports_temp" {
  bucket = aws_s3_bucket.reports_temp.id

  rule {
    id     = "expire-reports-after-1-day"
    status = "Enabled"

    filter {
      prefix = "reports/"
    }

    expiration {
      days = 1
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
