# ─── HTTP API ─────────────────────────────────────────────────────────────────
# HTTP API (not REST API): simpler, cheaper, lower latency.
# CORS configured here at the API level; API GW handles OPTIONS preflight automatically.
resource "aws_apigatewayv2_api" "main" {
  name          = local.api_name
  protocol_type = "HTTP"
  description   = "Actify ${local.release} — public PDF report generation endpoint"

  cors_configuration {
    allow_origins = ["*"]                      # Restrict to actify.io in production
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 3600
  }

  tags = {
    Name = local.api_name
  }
}

# ─── Default stage ────────────────────────────────────────────────────────────
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    detailed_metrics_enabled = true
    throttling_burst_limit   = 10  # max concurrent requests in burst
    throttling_rate_limit    = 2   # steady-state req/sec
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn

    format = jsonencode({
      requestId        = "$context.requestId"
      ip               = "$context.identity.sourceIp"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      routeKey         = "$context.routeKey"
      status           = "$context.status"
      responseLength   = "$context.responseLength"
      latencyMs        = "$context.responseLatency"
      integrationError = "$context.integrationErrorMessage"
    })
  }

  tags = {
    Name = "${local.api_name}-default"
  }
}

# ─── Lambda integration ───────────────────────────────────────────────────────
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.pdf_generator.invoke_arn
  payload_format_version = "2.0"
}

# ─── Route: GET / — serve assessment form ────────────────────────────────────
resource "aws_apigatewayv2_route" "form" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# ─── Route: POST /api/report/generate ────────────────────────────────────────
resource "aws_apigatewayv2_route" "generate_report" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/report/generate"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# ─── Route: POST /api/check-email ────────────────────────────────────────────
resource "aws_apigatewayv2_route" "check_email" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/check-email"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
