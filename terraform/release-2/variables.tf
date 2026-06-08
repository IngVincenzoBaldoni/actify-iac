variable "aws_region" {
  type        = string
  description = "AWS region for all resources"
  default     = "eu-central-1"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "production"

  validation {
    condition     = contains(["demo", "staging", "production"], var.environment)
    error_message = "environment must be one of: demo, staging, production."
  }
}

variable "api_gateway_id" {
  type        = string
  description = "ID of the existing API Gateway from release-1 (run: terraform -chdir=../release-1 output -raw api_gateway_id)"
}

variable "resend_api_key" {
  type        = string
  description = "Resend API key for transactional email (assessment invites)"
  sensitive   = true
  default     = ""
}

variable "cognito_ses_email" {
  type        = string
  description = "Verified SES email for Cognito user invitation/verification emails"
  default     = "noreply@actify.io"
}
