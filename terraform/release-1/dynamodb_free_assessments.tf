# ─── Free Assessment OTP Gate ─────────────────────────────────────────────────
# Stores OTP codes and rate-limit state for the public free assessment form.
# PK = email. TTL attribute auto-expires records after 7 days.
resource "aws_dynamodb_table" "free_assessments" {
  name         = local.dynamo_assessments_table
  billing_mode = "PAY_PER_REQUEST"   # on-demand — form traffic is unpredictable

  hash_key = "email"

  attribute {
    name = "email"
    type = "S"
  }

  # DynamoDB TTL — auto-deletes records where `ttl` epoch < now
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = false   # not needed for ephemeral OTP data
  }

  tags = merge(local.common_tags, {
    Name = local.dynamo_assessments_table
  })
}
