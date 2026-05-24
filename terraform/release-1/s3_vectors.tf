# ─── S3 Vectors — AI Act Knowledge Base ──────────────────────────────────────
# The Terraform AWS provider (v5.x) does not yet have a native
# aws_s3vectors_vector_bucket resource. The bucket is created via AWS CLI
# using a null_resource local-exec provisioner.
#
# After `terraform apply`, run the ingestion pipeline:
#   cd ingestion/
#   pip install -r requirements.txt
#   python ingest_ai_act.py --pdf <path-to-AI-Act-IT.pdf> \
#                           --bucket <output below> \
#                           --region eu-central-1

resource "null_resource" "s3_vectors_bucket" {
  triggers = {
    bucket_name = local.s3_vectors_bucket_name
    region      = var.aws_region
  }

  # Creates the vector bucket on first apply; subsequent applies are no-ops
  # because `create-vector-bucket` returns ConflictException if it already exists.
  provisioner "local-exec" {
    command = <<-EOT
      aws s3vectors create-vector-bucket \
        --vector-bucket-name "${local.s3_vectors_bucket_name}" \
        --region "${var.aws_region}" \
        2>&1 | grep -v "ConflictException" || true
    EOT
  }
}

output "s3_vectors_bucket_name" {
  description = "S3 Vectors bucket for the AI Act knowledge base (RAG). Run ingestion/ingest_ai_act.py against this bucket."
  value       = local.s3_vectors_bucket_name
}

output "s3_vectors_index_name" {
  description = "S3 Vectors index name (created by ingest_ai_act.py)"
  value       = "ai-act-it"
}
