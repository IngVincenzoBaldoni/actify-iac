import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { extractAuth } from '../middleware/auth';
import { logEvent } from '../services/auditService';
import * as dynamo from '../services/dynamoService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-central-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET ?? 'actify-saas-documents';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION ?? 'eu-central-1' });

export async function listAuditTrail(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const q    = event.queryStringParameters ?? {};
  const fromDate = q.from ? q.from + 'T00:00:00.000Z' : undefined;
  const toDate   = q.to   ? q.to   + 'T23:59:59.999Z' : undefined;

  const events = await dynamo.listAuditEvents(auth.companyId, { fromDate, toDate });
  return { statusCode: 200, body: JSON.stringify(events) };
}

export async function exportAuditTrail(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);

  // Accept filters from request body
  let from: string | undefined;
  let to:   string | undefined;
  let filterSystemNames: string[] = [];
  try {
    const b = event.body ? JSON.parse(event.body) : {};
    from = b.from;   // "YYYY-MM-DD"
    to   = b.to;     // "YYYY-MM-DD"
    // Accept array (new) or single string (legacy)
    if (Array.isArray(b.systemNames))       filterSystemNames = b.systemNames.filter(Boolean);
    else if (typeof b.systemName === 'string' && b.systemName) filterSystemNames = [b.systemName];
  } catch { /* no body */ }

  const fromDate = from ? from + 'T00:00:00.000Z' : undefined;
  const toDate   = to   ? to   + 'T23:59:59.999Z' : undefined;

  const [company, allEvents, systems] = await Promise.all([
    dynamo.getCompany(auth.companyId),
    dynamo.listAuditEvents(auth.companyId, { fromDate, toDate }),
    dynamo.getSystemsByCompany(auth.companyId),
  ]);

  let events = allEvents as Record<string, unknown>[];

  // Apply system filter if requested (match by display name across all system_ids)
  if (filterSystemNames.length > 0) {
    const nameSet = new Set(filterSystemNames);
    events = events.filter(e => {
      const d = (e.details ?? {}) as Record<string, unknown>;
      const name = String(d.system_name ?? d.tool_name ?? '');
      return nameSet.has(name);
    });
  }

  if (events.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'no_events', message: 'Nessun evento da esportare per il periodo selezionato.' }) };
  }

  const now        = new Date().toISOString();
  const periodFrom = (events[events.length - 1].timestamp as string) ?? now;
  const periodTo   = (events[0].timestamp as string) ?? now;

  // Document hash: SHA-256 of the canonical events JSON
  const eventsHash = createHash('sha256')
    .update(JSON.stringify(events))
    .digest('hex');

  const payload = {
    _auditTrailPdfRequest: {
      company_name:  (company as Record<string, unknown>)?.name ?? 'Azienda',
      company_id:    auth.companyId,
      events,
      systems:       systems ?? [],
      generated_at:  now,
      period_from:   periodFrom,
      period_to:     periodTo,
      events_hash:   eventsHash,
      filter_system: filterSystemNames.length > 0 ? filterSystemNames.join(', ') : undefined,
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

  const documentId = uuidv4();
  const suffix     = from && to ? `${from}_${to}` : now.slice(0, 10);
  const title      = `Audit Trail — ${(company as Record<string, unknown>)?.name ?? 'Azienda'} (${suffix})`;
  const s3Key      = `documents/${auth.companyId}/audit-trail/${documentId}_v1.pdf`;

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         s3Key,
    Body:        Buffer.from(result.pdfBase64, 'base64'),
    ContentType: 'application/pdf',
  }));

  await dynamo.putDocument({
    document_id:   documentId,
    company_id:    auth.companyId,
    system_id:     'audit_trail',
    document_type: 'audit_trail_report',
    title,
    status:        'final',
    s3_key:        s3Key,
    generated_at:  now,
    generated_by:  auth.email ?? 'actify',
    ttl:           null,
  });

  await logEvent(auth.companyId, 'document_generated', { document_id: documentId, document_type: 'audit_trail_report', title }, auth.email);

  return {
    statusCode: 200,
    body: JSON.stringify({ document_id: documentId, title }),
  };
}
