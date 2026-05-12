import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { checkRateLimit } from "./middleware/rateLimiter";
import { validatePayload } from "./middleware/validator";
import { analyze } from "./services/bedrockService";
import { render } from "./services/htmlTemplate";
import { htmlToPdf } from "./services/pdfService";
import { uploadReport } from "./services/s3Service";
import { formHtml } from "./services/formHtml";

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";

function log(level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>): void {
  if (level === "info" && LOG_LEVEL === "error") return;
  if (level === "warn" && LOG_LEVEL === "error") return;
  console[level](JSON.stringify({ level, msg, ...extra, ts: new Date().toISOString() }));
}

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function extractIp(event: APIGatewayProxyEventV2): string {
  return (
    event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ??
    event.requestContext.http.sourceIp ??
    "unknown"
  );
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  // ── 0. Serve form on GET / ───────────────────────────────────────────────────
  if (event.requestContext.http.method === "GET") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: formHtml,
    };
  }

  // ── 1. Rate limit ────────────────────────────────────────────────────────────
  const ip = extractIp(event);
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    log("warn", "rate_limit_exceeded", { ip });
    return json(429, {
      error: "rate_limit_exceeded",
      retry_after_seconds: rateLimit.retry_after_seconds,
    });
  }

  // ── 2. Parse + validate payload ──────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(event.body ?? "{}");
  } catch {
    return json(400, { error: "payload_invalid", details: ["body is not valid JSON"] });
  }

  const { data: payload, errors } = validatePayload(rawBody);
  if (!payload) {
    return json(400, { error: "payload_invalid", details: errors });
  }

  // Anonymous log — no PII, only aggregate metadata
  log("info", "request_received", {
    sector: payload.company.sector,
    ai_role: payload.ai_role,
    tool_count: payload.ai_tools.length,
  });

  // ── 3. Bedrock analysis ──────────────────────────────────────────────────────
  let claudeOutput;
  try {
    claudeOutput = await analyze(payload);
  } catch (err) {
    log("error", "bedrock_failed", {
      error: err instanceof Error ? err.message : String(err),
      sector: payload.company.sector,
      tool_count: payload.ai_tools.length,
    });
    return json(500, {
      error: "generation_failed",
      message: "Analisi AI momentaneamente non disponibile. Riprova tra qualche minuto.",
    });
  }

  // ── 4. HTML template ─────────────────────────────────────────────────────────
  let html: string;
  try {
    html = render(claudeOutput, payload);
  } catch (err) {
    log("error", "template_failed", { error: err instanceof Error ? err.message : String(err) });
    return json(500, { error: "generation_failed", message: "Errore nella generazione del template." });
  }

  // ── 5. PDF generation ────────────────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await htmlToPdf(html);
  } catch (err) {
    log("error", "pdf_failed", { error: err instanceof Error ? err.message : String(err) });
    return json(500, { error: "generation_failed", message: "Errore nella generazione del PDF." });
  }

  // ── 6. S3 upload + presigned URL ─────────────────────────────────────────────
  let uploadResult;
  try {
    uploadResult = await uploadReport(pdfBuffer, payload.company.name);
  } catch (err) {
    log("error", "s3_failed", { error: err instanceof Error ? err.message : String(err) });
    return json(500, { error: "generation_failed", message: "Errore nel salvataggio del report." });
  }

  log("info", "report_generated", {
    sector: payload.company.sector,
    risk_level: claudeOutput.overall_risk_level,
    s3_key: uploadResult.key,
  });

  // ── 7. Return download URL ───────────────────────────────────────────────────
  return json(200, { download_url: uploadResult.presigned_url });
}
