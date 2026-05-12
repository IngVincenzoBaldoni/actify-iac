variable "aws_region" {
  type        = string
  description = "AWS region for all resources"
  default     = "eu-central-1"
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

variable "enable_amplify" {
  type        = bool
  description = "Provision the Amplify frontend app. Requires github_oauth_token and github_repository."
  default     = false
}

variable "github_oauth_token" {
  type        = string
  description = "GitHub OAuth token (repo scope) for Amplify CI/CD. Required when enable_amplify = true."
  sensitive   = true
  default     = ""
}

variable "github_repository" {
  type        = string
  description = "GitHub repository URL for Amplify (e.g. https://github.com/org/actify-frontend)"
  default     = ""
}

variable "github_branch" {
  type        = string
  description = "Branch to track for Amplify auto-deploy"
  default     = "main"
}
