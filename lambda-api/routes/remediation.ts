import { v4 as uuidv4 } from 'uuid';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { parseBody } from '../middleware/validator';
import { extractAuth } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import { generatePresignedUrl } from '../services/remediationService';
import { z } from 'zod';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION ?? 'eu-central-1' });

const generateSchema = z.object({ gap_id: z.string().min(1) });

// ─── POST /api/systems/:systemId/remediation/generate ─────────────────────────
export async function generateDocument(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth     = extractAuth(event);
  const systemId = event.pathParameters?.systemId;
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  const { gap_id } = parseBody(event.body, generateSchema);
  const documentId = uuidv4();
  const now        = new Date().toISOString();

  // Draft TTL: 7 days from now
  const ttl = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

  // Fetch gap from latest check to capture article + document_type for the record
  const latestCheck = await dynamo.getLatestComplianceCheck(auth.companyId, systemId);
  const gaps = (latestCheck?.result?.compliance_gaps ?? []) as Record<string, unknown>[];
  const gap  = gaps.find(g => g.gap_id === gap_id);
  if (!gap) return {
    statusCode: 404,
    body: JSON.stringify({ error: 'gap_not_found', message: 'Gap non trovato nell\'ultimo compliance check' }),
  };
  if (!gap.can_actify_automate) return {
    statusCode: 400,
    body: JSON.stringify({ error: 'not_automatable', message: 'Questo gap non è automatizzabile da Actify' }),
  };

  // Create document record in 'generating' state
  await dynamo.putDocument({
    document_id:   documentId,
    company_id:    auth.companyId,
    system_id:     systemId,
    gap_id,
    article:       gap.article as string,
    document_type: gap.automation_type as string,
    title:         `Generazione in corso…`,
    status:        'generating',
    generated_at:  now,
    generated_by:  'actify_auto',
    ttl,
    generation_context: {},
  });

  // Async self-invoke for document generation
  await lambdaClient.send(new InvokeCommand({
    FunctionName:   process.env.LAMBDA_SELF_ARN!,
    InvocationType: 'Event',
    Payload:        Buffer.from(JSON.stringify({
      _asyncDocumentGeneration: {
        document_id: documentId,
        systemId,
        gapId:       gap_id,
        companyId:   auth.companyId,
      },
    })),
  }));

  return {
    statusCode: 202,
    body: JSON.stringify({ document_id: documentId, status: 'generating' }),
  };
}

// ─── GET /api/documents/:documentId ──────────────────────────────────────────
export async function getDocument(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth       = extractAuth(event);
  const documentId = event.pathParameters?.documentId;
  if (!documentId) return { statusCode: 400, body: JSON.stringify({ error: 'documentId required' }) };

  const doc = await dynamo.getDocument(documentId);
  if (!doc || doc.company_id !== auth.companyId) {
    return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  }

  // Attach pre-signed URL for frontend preview/download (valid 1 hour)
  let preview_url: string | undefined;
  if ((doc.status === 'draft' || doc.status === 'final') && doc.s3_key) {
    preview_url = await generatePresignedUrl(doc.s3_key as string);
  }

  return { statusCode: 200, body: JSON.stringify({ ...doc, preview_url }) };
}

// ─── PUT /api/documents/:documentId/finalize ─────────────────────────────────
export async function finalizeDocument(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth       = extractAuth(event);
  const documentId = event.pathParameters?.documentId;
  if (!documentId) return { statusCode: 400, body: JSON.stringify({ error: 'documentId required' }) };

  const doc = await dynamo.getDocument(documentId);
  if (!doc || doc.company_id !== auth.companyId) {
    return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  }
  if (doc.status !== 'draft') {
    return { statusCode: 400, body: JSON.stringify({ error: 'not_draft', message: 'Solo i documenti bozza possono essere finalizzati' }) };
  }

  const now = new Date().toISOString();

  // Finalize: remove TTL (permanent), update status
  await dynamo.updateDocument(documentId, {
    status:       'final',
    finalized_at: now,
    ttl:          null,  // removes TTL → document never expires
  });

  // Update compliance_checklist on the system: article becomes 'present'
  const system = await dynamo.getSystem(auth.companyId, doc.system_id as string);
  if (system) {
    const existingChecklist = (system.compliance_checklist ?? {}) as Record<string, unknown>;
    const updatedChecklist = {
      ...existingChecklist,
      [doc.article as string]: {
        status:       'present',
        addressed_at: now.split('T')[0],
        evidence_note: `Documento Actify: "${doc.title}" (ID: ${documentId})`,
      },
    };
    await dynamo.updateSystem(auth.companyId, doc.system_id as string, {
      compliance_checklist: updatedChecklist,
      updated_at:           now,
    });
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
}

// ─── GET /api/company/documents ──────────────────────────────────────────────
export async function listCompanyDocuments(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const docs = await dynamo.listDocumentsByCompany(auth.companyId);
  return { statusCode: 200, body: JSON.stringify({ documents: docs }) };
}

// ─── GET /api/systems/:systemId/documents ────────────────────────────────────
export async function listSystemDocuments(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth     = extractAuth(event);
  const systemId = event.pathParameters?.systemId;
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  // Ownership check: verify system belongs to company
  const system = await dynamo.getSystem(auth.companyId, systemId);
  if (!system) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };

  const docs = await dynamo.listDocumentsBySystem(systemId);
  return { statusCode: 200, body: JSON.stringify({ documents: docs }) };
}

// ─── DELETE /api/documents/:documentId ───────────────────────────────────────
export async function deleteDocument(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth       = extractAuth(event);
  const documentId = event.pathParameters?.documentId;
  if (!documentId) return { statusCode: 400, body: JSON.stringify({ error: 'documentId required' }) };

  const doc = await dynamo.getDocument(documentId);
  if (!doc || doc.company_id !== auth.companyId) {
    return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  }

  await dynamo.deleteDocument(documentId);
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
}

// ─── POST /api/documents/:documentId/regenerate ──────────────────────────────
export async function regenerateDocument(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth       = extractAuth(event);
  const documentId = event.pathParameters?.documentId;
  if (!documentId) return { statusCode: 400, body: JSON.stringify({ error: 'documentId required' }) };

  const old = await dynamo.getDocument(documentId);
  if (!old || old.company_id !== auth.companyId) {
    return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  }

  const newDocumentId = uuidv4();
  const now           = new Date().toISOString();
  const ttl           = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

  await dynamo.putDocument({
    document_id:   newDocumentId,
    company_id:    auth.companyId,
    system_id:     old.system_id,
    gap_id:        old.gap_id,
    article:       old.article,
    document_type: old.document_type,
    title:         `Generazione in corso…`,
    status:        'generating',
    generated_at:  now,
    generated_by:  'actify_auto',
    ttl,
    generation_context: {},
  });

  await lambdaClient.send(new InvokeCommand({
    FunctionName:   process.env.LAMBDA_SELF_ARN!,
    InvocationType: 'Event',
    Payload:        Buffer.from(JSON.stringify({
      _asyncDocumentGeneration: {
        document_id: newDocumentId,
        systemId:    old.system_id as string,
        gapId:       old.gap_id   as string,
        companyId:   auth.companyId,
      },
    })),
  }));

  return {
    statusCode: 202,
    body: JSON.stringify({ document_id: newDocumentId, status: 'generating' }),
  };
}
