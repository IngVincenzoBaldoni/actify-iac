import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { extractAuth } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION ?? 'eu-central-1' });

export async function listAuditTrail(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const events = await dynamo.listAuditEvents(auth.companyId);
  return { statusCode: 200, body: JSON.stringify(events) };
}

export async function exportAuditTrail(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth    = extractAuth(event);
  const company = await dynamo.getCompany(auth.companyId);
  const events  = await dynamo.listAuditEvents(auth.companyId);

  if (events.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'no_events', message: 'Nessun evento da esportare.' }) };
  }

  const now        = new Date().toISOString();
  const periodFrom = (events[events.length - 1] as Record<string, unknown>).timestamp as string ?? now;
  const periodTo   = (events[0] as Record<string, unknown>).timestamp as string ?? now;

  const payload = {
    _auditTrailPdfRequest: {
      company_name: (company as Record<string, unknown>)?.name ?? 'Azienda',
      company_id:   auth.companyId,
      events,
      generated_at: now,
      period_from:  periodFrom,
      period_to:    periodTo,
    },
  };

  const response = await lambdaClient.send(new InvokeCommand({
    FunctionName:   process.env.LAMBDA_PDF_ARN!,
    InvocationType: 'RequestResponse',
    Payload:        Buffer.from(JSON.stringify(payload)),
  }));

  const result = JSON.parse(Buffer.from(response.Payload!).toString()) as { pdfBase64?: string; error?: string };

  if (!result.pdfBase64) {
    return { statusCode: 500, body: JSON.stringify({ error: 'pdf_generation_failed' }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64: result.pdfBase64, filename: `actify-audit-trail-${auth.companyId.slice(0, 8)}-${now.slice(0, 10)}.pdf` }),
  };
}
