# ─── Cognito User Pool ────────────────────────────────────────────────────────
resource "aws_cognito_user_pool" "actify" {
  name = local.cognito_user_pool_name

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # Auto-verify email on sign-up
  auto_verified_attributes = ["email"]

  # Username = email
  username_attributes = ["email"]

  username_configuration {
    case_sensitive = false
  }

  # Email verification message
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Verifica il tuo account Actify"
    email_message        = "Il tuo codice di verifica è {####}"
  }

  # Custom attributes
  schema {
    name                     = "company_id"
    attribute_data_type      = "String"
    mutable                  = false
    required                 = false
    string_attribute_constraints {
      min_length = "36"
      max_length = "36"
    }
  }

  schema {
    name                     = "role"
    attribute_data_type      = "String"
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = "4"
      max_length = "10"
    }
  }

  tags = {
    Name = local.cognito_user_pool_name
  }
}

# ─── App Client (SPA — no secret) ────────────────────────────────────────────
resource "aws_cognito_user_pool_client" "actify_app" {
  name         = local.cognito_client_name
  user_pool_id = aws_cognito_user_pool.actify.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  # Token validity
  access_token_validity  = 60  # minutes
  id_token_validity      = 60  # minutes
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Write attributes (Lambda AdminCreateUser sets these)
  write_attributes = [
    "email",
    "custom:company_id",
    "custom:role",
  ]

  read_attributes = [
    "email",
    "email_verified",
    "custom:company_id",
    "custom:role",
  ]
}
