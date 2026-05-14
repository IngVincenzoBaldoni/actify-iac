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
resource "aws_apigatewayv2_route" "auth_register" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "POST /api/auth/register"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

# CORS preflight — must be public (no auth), browser sends OPTIONS without credentials
resource "aws_apigatewayv2_route" "options_preflight" {
  api_id    = data.aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
}

# ─── Protected routes (Cognito Authorizer) ────────────────────────────────────
locals {
  protected_routes = {
    "POST /api/auth/invite"                                       = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/company"                                            = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "PUT /api/company"                                            = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/company/users"                                      = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "DELETE /api/company/users/{userId}"                          = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/systems"                                            = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/systems"                                           = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/systems/{systemId}"                                 = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "PUT /api/systems/{systemId}"                                 = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "DELETE /api/systems/{systemId}"                              = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "POST /api/systems/{systemId}/compliance-check"               = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/systems/{systemId}/compliance-checks"               = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "GET /api/systems/{systemId}/compliance-checks/latest"        = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
    "PUT /api/company/setup"                                      = "integrations/${aws_apigatewayv2_integration.saas_api.id}"
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
