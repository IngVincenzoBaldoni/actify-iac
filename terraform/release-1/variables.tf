variable "aws_region" {
  type        = string
  description = "AWS region for all resources"
  default     = "eu-central-1"
}

variable "resend_api_key" {
  type        = string
  description = "Resend API key for transactional email (OTP + report delivery). Get it at resend.com."
  sensitive   = true
  default     = ""   # set in terraform.tfvars — never commit the real key
}

variable "environment" {
  type        = string
  description = "Deployment environment (demo | staging | production)"
  default     = "demo"

  validation {
    condition     = contains(["demo", "staging", "production"], var.environment)
    error_message = "environment must be one of: demo, staging, production."
  }
}

