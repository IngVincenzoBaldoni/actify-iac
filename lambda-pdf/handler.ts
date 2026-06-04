import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { checkRateLimit } from "./middleware/rateLimiter";
import { validatePayload } from "./middleware/validator";
import { analyze } from "./services/bedrockService";
import { render } from "./services/htmlTemplate";
import { htmlToPdf, buildNormativeDocumentHtml } from "./services/pdfService";
import { uploadReport, writeToDatalake } from "./services/s3Service";
import { formHtml } from "./services/formHtml";
import { checkEmailAlreadyUsed, markReportGenerated } from "./services/otpService";
import { sendEmail, buildReportEmail } from "./services/resendService";

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

// ─── Direct invocation from lambda-api (normative document PDF generation) ────

interface NormativeDocumentRequest {
  _normativeDocumentRequest: {
    content:       string;
    title:         string;
    company_name:  string;
    document_type: string;
    generated_at:  string;
    article:       string;
  };
}

export async function handler(
  event: APIGatewayProxyEventV2 | NormativeDocumentRequest
): Promise<APIGatewayProxyResultV2 | { pdfBase64: string }> {

  // ── Normative document request from lambda-api ───────────────────────────────
  if ("_normativeDocumentRequest" in event && event._normativeDocumentRequest) {
    const req = event._normativeDocumentRequest;
    const html = buildNormativeDocumentHtml(req);
    const pdfBuffer = await htmlToPdf(html);
    return { pdfBase64: pdfBuffer.toString("base64") };
  }

  const httpEvent = event as APIGatewayProxyEventV2;
  const method    = httpEvent.requestContext.http.method;
  const path      = httpEvent.requestContext.http.path;

  // ── GET / — serve assessment form ────────────────────────────────────────────
  if (method === "GET") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      body: formHtml,
    };
  }

  // ── Rate limit (all POST routes) ─────────────────────────────────────────────
  const ip        = extractIp(httpEvent);
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    log("warn", "rate_limit_exceeded", { ip });
    return json(429, {
      error:               "rate_limit_exceeded",
      retry_after_seconds: rateLimit.retry_after_seconds,
    });
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(httpEvent.body ?? "{}");
  } catch {
    return json(400, { error: "payload_invalid", details: ["body is not valid JSON"] });
  }

  // ── POST /api/check-email ────────────────────────────────────────────────────
  if (method === "POST" && path === "/api/check-email") {
    return handleCheckEmail(rawBody);
  }

  // ── POST /api/report/generate ────────────────────────────────────────────────
  if (method === "POST" && path === "/api/report/generate") {
    return handleGenerate(rawBody);
  }

  return json(404, { error: "not_found" });
}

// ─── Handler: check if email already used ────────────────────────────────────

async function handleCheckEmail(rawBody: unknown): Promise<APIGatewayProxyResultV2> {
  const body  = rawBody as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "invalid_email", message: "Inserisci un indirizzo email valido." });
  }

  const used = await checkEmailAlreadyUsed(email);
  return json(200, { already_used: used });
}

// ─── Handler: generate report ─────────────────────────────────────────────────

async function handleGenerate(rawBody: unknown): Promise<APIGatewayProxyResultV2> {
  const { data: payload, errors } = validatePayload(rawBody);
  if (!payload) {
    return json(400, { error: "payload_invalid", details: errors });
  }

  // ── Duplicate gate ───────────────────────────────────────────────────────────
  const email = payload.contact_email.trim().toLowerCase();
  if (await checkEmailAlreadyUsed(email)) {
    return json(409, {
      error:   "already_used",
      message: "Hai già ricevuto un assessment gratuito con questa email. Registrati su Actify per analisi illimitate.",
    });
  }

  log("info", "report_requested", {
    sector:     payload.company.sector,
    ai_role:    payload.ai_role,
    tool_count: payload.ai_tools.length,
  });

  // ── Bedrock analysis ──────────────────────────────────────────────────────────
  let claudeOutput;
  try {
    claudeOutput = await analyze(payload);
  } catch (err) {
    log("error", "bedrock_failed", { error: err instanceof Error ? err.message : String(err) });
    return json(500, { error: "generation_failed", message: "Analisi AI momentaneamente non disponibile. Riprova tra qualche minuto." });
  }

  // ── HTML template ─────────────────────────────────────────────────────────────
  let html: string;
  try {
    html = render(claudeOutput, payload);
  } catch (err) {
    log("error", "template_failed", { error: err instanceof Error ? err.message : String(err) });
    return json(500, { error: "generation_failed", message: "Errore nella generazione del template." });
  }

  // ── PDF generation ────────────────────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await htmlToPdf(html);
  } catch (err) {
    log("error", "pdf_failed", { error: err instanceof Error ? err.message : String(err) });
    return json(500, { error: "generation_failed", message: "Errore nella generazione del PDF." });
  }

  // ── S3 upload ─────────────────────────────────────────────────────────────────
  let uploadResult;
  try {
    uploadResult = await uploadReport(pdfBuffer, payload.company.name);
  } catch (err) {
    log("error", "s3_failed", { error: err instanceof Error ? err.message : String(err) });
    return json(500, { error: "generation_failed", message: "Errore nel salvataggio del report." });
  }

  // ── Mark email as consumed (before sending — avoids race conditions) ──────────
  await markReportGenerated(email).catch(err =>
    log("warn", "mark_report_failed", { error: err instanceof Error ? err.message : String(err) })
  );

  // ── Send report via Resend ────────────────────────────────────────────────────
  try {
    await sendEmail({
      to:      email,
      subject: `Il tuo report AI Act Compliance è pronto — ${payload.company.name}`,
      html:    buildReportEmail(payload.company.name, uploadResult.presigned_url, claudeOutput.overall_risk_level),
    });
    log("info", "report_sent", {
      email_domain: email.split("@")[1],
      risk_level:   claudeOutput.overall_risk_level,
      s3_key:       uploadResult.key,
    });
  } catch (err) {
    // Non-fatal: the PDF is already generated. Log and continue.
    log("error", "report_email_failed", { error: err instanceof Error ? err.message : String(err) });
  }

  // ── Data lake (non-fatal) ─────────────────────────────────────────────────────
  writeToDatalake(payload, pdfBuffer).catch(err =>
    log("error", "datalake_write_failed", { error: err instanceof Error ? err.message : String(err) })
  );

  // Return email so the frontend success screen can display it
  return json(200, { email });
}
