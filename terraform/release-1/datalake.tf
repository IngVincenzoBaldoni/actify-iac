# ─── Data Lake — Bronze Layer ─────────────────────────────────────────────────
# S3 bucket + Glue Data Catalog + Crawler + Athena workgroup.
# The Lambda writes to this bucket on every form submission (non-fatal path).
# The Glue Crawler runs daily and updates the Glue table so Athena queries stay fresh.
#
# S3 layout:
#   bronze/prospects/year=YYYY/month=MM/day=DD/<uuid>.json  ← Hive-partitioned records
#   company-reports/<slug>-<uuid>/actify-report-<date>.pdf  ← persistent PDF copies
#   athena-results/                                          ← Athena query output (30d TTL)

# ─── S3 Bucket ────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "datalake" {
  bucket = local.datalake_bucket_name

  tags = merge(local.common_tags, {
    Name    = local.datalake_bucket_name
    Purpose = "prospects-datalake-bronze"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "datalake" {
  bucket = aws_s3_bucket.datalake.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "datalake" {
  bucket = aws_s3_bucket.datalake.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Athena query results lifecycle — auto-delete after 30 days
resource "aws_s3_bucket_lifecycle_configuration" "datalake" {
  bucket = aws_s3_bucket.datalake.id

  rule {
    id     = "expire-athena-results"
    status = "Enabled"

    filter {
      prefix = "athena-results/"
    }

    expiration {
      days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# ─── Glue Database ────────────────────────────────────────────────────────────
resource "aws_glue_catalog_database" "actify" {
  name        = local.glue_database_name
  description = "Actify data lake — Bronze layer: prospect form submissions and reports"

  tags = local.common_tags
}

# ─── Glue Crawler IAM Role ────────────────────────────────────────────────────
data "aws_iam_policy_document" "glue_assume_role" {
  statement {
    sid    = "AllowGlueAssumeRole"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["glue.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "glue_crawler_permissions" {
  # Read prospects from data lake
  statement {
    sid    = "AllowS3ReadProspects"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]

    resources = [
      aws_s3_bucket.datalake.arn,
      "${aws_s3_bucket.datalake.arn}/bronze/*",
    ]
  }

  # Write crawler logs to Glue-managed CloudWatch prefix
  statement {
    sid    = "AllowCloudWatchGlueLogs"
    effect = "Allow"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]

    resources = ["arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws-glue/*"]
  }

  # Full Glue catalog access needed for crawler to create/update tables and partitions
  statement {
    sid    = "AllowGlueCatalog"
    effect = "Allow"

    actions = [
      "glue:GetDatabase",
      "glue:GetDatabases",
      "glue:CreateTable",
      "glue:UpdateTable",
      "glue:GetTable",
      "glue:GetTables",
      "glue:CreatePartition",
      "glue:UpdatePartition",
      "glue:GetPartition",
      "glue:GetPartitions",
      "glue:BatchCreatePartition",
      "glue:BatchGetPartition",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role" "glue_crawler" {
  name               = local.glue_role_name
  assume_role_policy = data.aws_iam_policy_document.glue_assume_role.json

  tags = merge(local.common_tags, {
    Name = local.glue_role_name
  })
}

resource "aws_iam_policy" "glue_crawler" {
  name        = local.glue_policy_name
  description = "Least-privilege policy for Actify Glue crawler: S3 read prospects, CloudWatch Logs, Glue catalog"
  policy      = data.aws_iam_policy_document.glue_crawler_permissions.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "glue_crawler" {
  role       = aws_iam_role.glue_crawler.name
  policy_arn = aws_iam_policy.glue_crawler.arn
}

# ─── Glue Crawler ─────────────────────────────────────────────────────────────
resource "aws_glue_crawler" "prospects" {
  name          = local.glue_crawler_name
  database_name = aws_glue_catalog_database.actify.name
  role          = aws_iam_role.glue_crawler.arn
  description   = "Crawls Bronze prospects path to update Glue Data Catalog and Athena table schema"

  s3_target {
    path = "s3://${aws_s3_bucket.datalake.bucket}/bronze/prospects"
  }

  # Enable Hive-compatible partition detection (year=X/month=Y/day=Z)
  configuration = jsonencode({
    Version = 1.0
    Grouping = {
      TableGroupingPolicy = "CombineCompatibleSchemas"
    }
    CrawlerOutput = {
      Partitions = { AddOrUpdateBehavior = "InheritFromTable" }
      Tables     = { AddOrUpdateBehavior = "MergeNewColumns" }
    }
    CreatePartitionIndex = true
  })

  # Daily at 02:00 AM UTC — after overnight submissions accumulate
  schedule = "cron(0 2 * * ? *)"

  tags = merge(local.common_tags, {
    Name = local.glue_crawler_name
  })

  depends_on = [
    aws_glue_catalog_database.actify,
    aws_iam_role_policy_attachment.glue_crawler,
  ]
}

# ─── Athena Workgroup ─────────────────────────────────────────────────────────
resource "aws_athena_workgroup" "actify" {
  name        = local.athena_workgroup_name
  description = "Actify analytics — query prospect submissions and report metadata"

  configuration {
    enforce_workgroup_configuration    = true
    publish_cloudwatch_metrics_enabled = false

    result_configuration {
      output_location = "s3://${aws_s3_bucket.datalake.bucket}/athena-results/"

      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }
  }

  tags = merge(local.common_tags, {
    Name = local.athena_workgroup_name
  })
}
