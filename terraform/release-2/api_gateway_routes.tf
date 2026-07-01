# ─── Reference existing API Gateway from release-1 ───────────────────────────
data "aws_apigatewayv2_api" "main" {
  api_id = var.api_gateway_id
}

# ─── Lambda integration for actify-saas-api ──────────────────────────────────
resource "aws_apigatewayv2_integration" "saas_api" {
  api_id                 = data.aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.saas_api.invoke_arn
  payload_format_version = "2.0"
}

# ─── Cognito JWT Authorizer ───────────────────────────────────────────────────
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = data.aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "actify-cognito-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.actify_app.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.actify.id}"
  }
}

# ─── Public routes (no auth) ──────────────────────────────────────────────────

# CORS preflight — must be public (no auth), browser sends OPTIONS without credentials
resource "aws_apigatewayv2_route" "options_preflight" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

resource "aws_apigatewayv2_route" "auth_register" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "POST /api/auth/register"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

resource "aws_apigatewayv2_route" "auth_invite_validate" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "GET /api/auth/invite/validate"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

resource "aws_apigatewayv2_route" "auth_invite_accept" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "POST /api/auth/invite/accept"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

resource "aws_apigatewayv2_route" "assessment_get" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "GET /api/assessment/{token}"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

resource "aws_apigatewayv2_route" "assessment_submit" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "POST /api/assessment/{token}/submit"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

# Partner public flow (request → approve → registration)
resource "aws_apigatewayv2_route" "partner_request_access" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "POST /api/partner/request-access"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

resource "aws_apigatewayv2_route" "partner_approve_request" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "POST /api/partner/approve-request"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

resource "aws_apigatewayv2_route" "partner_registration_info" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "GET /api/partner/registration-info"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

resource "aws_apigatewayv2_route" "partner_complete_registration" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "POST /api/partner/complete-registration"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

# Stripe webhook — public, signature-verified internally
resource "aws_apigatewayv2_route" "stripe_webhook" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "POST /api/stripe/webhook"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

# ─── Protected routes (Cognito JWT Authorizer) ────────────────────────────────
locals {
  protected_routes = {
    # ── Auth ────────────────────────────────────────────────────────────────────
    "POST /api/auth/invite"                                       = "integrations/${aws_apigatewayv2_integration.saas_api.id}"

    # ── Company ─────────────────────────────────────────────────────────────────
    "GET /api/company"                                            = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "PUT /api/company"                                            = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "PUT /api/company/setup"                                      = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/company/users"                                      = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "DELETE /api/company/users/{userId}"                          = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/company/documents"                                  = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/company/document-generations"                       = "integrations/${aws_apigatewayv2_integration.saas_api.id}"

    # ── AI Systems ───────────────────────────────────────────────────────────────
    "GET /api/systems"                                            = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/systems"                                           = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/systems/{systemId}"                                 = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "PUT /api/systems/{systemId}"                                 = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "DELETE /api/systems/{systemId}"                              = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/systems/{systemId}/compliance-check"               = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/systems/{systemId}/compliance-checks"               = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/systems/{systemId}/compliance-checks/latest"        = "integrations/${aws_apigatewayv2_integration.saas_api.id}"

    # ── Document Vault ───────────────────────────────────────────────────────────
    "POST /api/systems/{systemId}/documents"                      = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/systems/{systemId}/document-generations"            = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/document-generations/{generationId}"                = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/systems/{systemId}/remediation/generate"           = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/systems/{systemId}/gaps/{gapId}/close"             = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/systems/{systemId}/documents"                       = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/documents/{documentId}"                             = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "DELETE /api/documents/{documentId}"                          = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "PUT /api/documents/{documentId}/finalize"                    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/documents/{documentId}/regenerate"                 = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/documents/{documentId}/reupload"                   = "integrations/${aws_apigatewayv2_integration.saas_api.id}"

    # ── AI Literacy Tracker ──────────────────────────────────────────────────────
    "GET /api/literacy"                                                           = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/literacy/suggestions/{systemId}/{profileType}"                      = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/literacy/{systemId}/profiles"                                       = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "PATCH /api/literacy/{systemId}/profiles/{profileId}"                         = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/literacy/{systemId}/profiles/{profileId}/evidence"                 = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "DELETE /api/literacy/{systemId}/profiles/{profileId}/evidence/{evidenceId}"  = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/literacy/{systemId}/report"                                         = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/literacy/report/consolidated"                                      = "integrations/${aws_apigatewayv2_integration.saas_api.id}"

    # ── Audit Trail ──────────────────────────────────────────────────────────────
    "GET /api/audit-trail"                                        = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/audit-trail/export"                                = "integrations/${aws_apigatewayv2_integration.saas_api.id}"

    # ── Billing ──────────────────────────────────────────────────────────────────
    "POST /api/billing/checkout"                                  = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/billing/portal"                                    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/billing/change-plan"                               = "integrations/${aws_apigatewayv2_integration.saas_api.id}"

    # ── Partner ──────────────────────────────────────────────────────────────────
    "GET /api/partner/me"                                         = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "PUT /api/partner/me"                                         = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/partner/send-referral"                             = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/partner/pmi"                                        = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/partner/pmi"                                       = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/partner/pmi/import-csv"                            = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/partner/pmi/{pmiId}"                                = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "DELETE /api/partner/pmi/{pmiId}"                             = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/partner/pmi/{pmiId}/status"                        = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/partner/pmi/{pmiId}/send-assessment"               = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/partner/pmi/{pmiId}/send-onboarding"               = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/partner/pmi/{pmiId}/pdf"                           = "integrations/${aws_apigatewayv2_integration.saas_api.id}"

    # ── Partner Inventory ─────────────────────────────────────────────────────────
    "GET /api/partner/inventory"                                                     = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/partner/inventory/{pmiId}"                                             = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/partner/inventory/{pmiId}/systems/{systemId}"                          = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "PUT /api/partner/inventory/{pmiId}/systems/{systemId}"                          = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/partner/inventory/{pmiId}/systems/{systemId}/compliance-check"        = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/partner/inventory/{pmiId}/systems/{systemId}/compliance-checks/latest" = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
  }
}

resource "aws_apigatewayv2_route" "protected" {
  for_each = local.protected_routes

  api_id             = data.aws_apigatewayv2_api.main.id
  route_key          = each.key
  target             = each.value
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
