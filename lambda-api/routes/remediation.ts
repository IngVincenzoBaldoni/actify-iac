import { v4 as uuidv4 } from 'uuid';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { parseBody } from '../middleware/validator';
import { extractAuth } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import { generatePresignedUrl, getGapType, uploadProofToS3 } from '../services/remediationService';
import type { Company } from '../types/company';
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

// ─── PUT /api/documents/:documentId/finalize  (= Segna come READY) ───────────
// Sets status to 'final', removes TTL. Does NOT touch compliance_checklist —
// the PMI must explicitly close the gap via POST /gaps/{id}/close.
export async function finalizeDocument(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth       = extractAuth(event);
  const documentId = event.pathParameters?.documentId;
  if (!documentId) return { statusCode: 400, body: JSON.stringify({ error: 'documentId required' }) };

  const doc = await dynamo.getDocument(documentId);
  if (!doc || doc.company_id !== auth.companyId) {
    return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  }
  if (doc.status !== 'draft') {
    return { statusCode: 400, body: JSON.stringify({ error: 'not_draft', message: 'Solo i documenti bozza possono essere segnati come READY' }) };
  }

  const now = new Date().toISOString();
  await dynamo.updateDocument(documentId, { status: 'final', finalized_at: now, ttl: null });

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
}

// ─── POST /api/documents/:documentId/reupload  (ricarica versione modificata) ─
// Accepts a base64-encoded PDF, uploads to S3, keeps status as 'draft'.
export async function reuploadDocument(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth       = extractAuth(event);
  const documentId = event.pathParameters?.documentId;
  if (!documentId) return { statusCode: 400, body: JSON.stringify({ error: 'documentId required' }) };

  const doc = await dynamo.getDocument(documentId);
  if (!doc || doc.company_id !== auth.companyId) {
    return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  }

  const body = JSON.parse(event.body ?? '{}') as { content_base64: string; filename?: string };
  if (!body.content_base64) return { statusCode: 400, body: JSON.stringify({ error: 'content_base64 required' }) };

  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-central-1' });
  const BUCKET = process.env.DOCUMENTS_BUCKET ?? 'actify-saas-documents';

  const s3Key = (doc.s3_key as string) ?? `documents/${doc.company_id}/${doc.system_id}/${doc.document_type}/${documentId}_v1.pdf`;
  const buffer = Buffer.from(body.content_base64, 'base64');

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         s3Key,
    Body:        buffer,
    ContentType: 'application/pdf',
  }));

  // Keep TTL alive: extend by 7 days on re-upload
  const ttl = Math.floor(Date.now() / 1000) + 7 * 86400;
  await dynamo.updateDocument(documentId, { s3_key: s3Key, ttl, uploaded_at: new Date().toISOString() });

  return { statusCode: 200, body: JSON.stringify({ success: true, s3_key: s3Key }) };
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

// ─── POST /api/systems/:systemId/gaps/:gapId/close ────────────────────────────
// Closes a gap fully: either via self-declaration or by uploading a proof file.
// For HYBRID gaps this completes the action step after the document was generated.

const closeGapSchema = z.object({
  evidence_note:  z.string().max(500).optional(),
  proof_base64:   z.string().optional(),       // base64-encoded file (max ~4 MB)
  proof_filename: z.string().max(200).optional(),
});

export async function closeGap(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth     = extractAuth(event);
  const rawPath  = event.requestContext?.http?.path ?? (event as unknown as Record<string, unknown>).rawPath as string ?? '';
  const closeMatch = rawPath.match(/\/api\/systems\/([^/]+)\/gaps\/([^/]+)\/close/);
  const systemId = closeMatch?.[1] ?? event.pathParameters?.systemId;
  const gapId    = closeMatch?.[2] ?? event.pathParameters?.gapId;
  if (!systemId || !gapId) return { statusCode: 400, body: JSON.stringify({ error: 'missing params' }) };

  const body = parseBody(event.body, closeGapSchema);
  const now  = new Date().toISOString();

  // Find the gap in the latest compliance check
  const [latestCheck, system, company] = await Promise.all([
    dynamo.getLatestComplianceCheck(auth.companyId, systemId),
    dynamo.getSystem(auth.companyId, systemId),
    dynamo.getCompany(auth.companyId),
  ]);

  if (!system) return { statusCode: 404, body: JSON.stringify({ error: 'system_not_found' }) };
  const gaps = (latestCheck?.result?.compliance_gaps ?? []) as Record<string, unknown>[];
  const gap  = gaps.find(g => g.gap_id === gapId);
  if (!gap)  return { statusCode: 404, body: JSON.stringify({ error: 'gap_not_found' }) };

  const article       = gap.article as string;
  const automationType = gap.automation_type as string | null;

  // Upload proof to S3 if provided
  let proofS3Key: string | undefined;
  if (body.proof_base64 && body.proof_filename) {
    proofS3Key = await uploadProofToS3({
      companyId: auth.companyId,
      systemId,
      gapId,
      base64:   body.proof_base64,
      filename: body.proof_filename,
    });
  }

  // Build evidence note
  const proofNote = proofS3Key
    ? `Prova caricata: ${body.proof_filename} — ${body.evidence_note ?? ''}`
    : body.evidence_note ?? `Auto-dichiarato conforme il ${now.split('T')[0]}`;

  // Update compliance_checklist to mark article as 'present' (full sanction reduction)
  const existingChecklist = (system.compliance_checklist ?? {}) as Record<string, unknown>;
  const updatedChecklist: Record<string, unknown> = {
    ...existingChecklist,
    [article]: {
      status:       'present',
      addressed_at: now.split('T')[0],
      evidence_note: proofNote,
      ...(proofS3Key ? { proof_s3_key: proofS3Key } : {}),
      source: proofS3Key ? 'proof_upload' : 'self_declared',
    },
  };

  // Mark gap compliant in compliance check (reuses markGapCompliant logic)
  if (latestCheck?.result && latestCheck.status === 'completed') {
    const { computeSanctions } = await import('../services/sanctions');
    const result = latestCheck.result as Record<string, unknown>;
    const updatedGaps = (result.compliance_gaps as Record<string, unknown>[]).map(g =>
      g.gap_id === gapId
        ? { ...g, status: 'compliant', estimated_sanction_min: 0, estimated_sanction_max: 0, tier_info: undefined }
        : g,
    );
    // Also apply other checklist overrides
    const finalGaps = updatedGaps.map(g => {
      const entry = (updatedChecklist[g.article as string] as Record<string, unknown> | undefined);
      if (entry?.status === 'present') {
        return { ...g, status: 'compliant', estimated_sanction_min: 0, estimated_sanction_max: 0, tier_info: undefined };
      }
      return g;
    });
    const recomputed = computeSanctions({ ...result as Parameters<typeof computeSanctions>[0], compliance_gaps: finalGaps as Parameters<typeof computeSanctions>[0]['compliance_gaps'] }, company as unknown as Company);
    const pk = `${auth.companyId}#${systemId}`;
    await dynamo.updateComplianceCheck(pk, latestCheck.check_id as string, {
      result: {
        ...recomputed,
        compliance_summary: {
          ...(recomputed.compliance_summary ?? {}),
          compliant_count:     finalGaps.filter(g => g.status === 'compliant').length,
          non_compliant_count: finalGaps.filter(g => g.status !== 'compliant' && g.status !== 'partial').length,
          monitoring_count:    finalGaps.filter(g => g.status === 'partial').length,
        },
      },
    });
    const totalMin = recomputed.total_exposure_estimate?.min ?? 0;
    const totalMax = recomputed.total_exposure_estimate?.max ?? 0;
    const allCompliant = finalGaps.every(g => g.status === 'compliant');
    await dynamo.updateSystem(auth.companyId, systemId, {
      compliance_status:       allCompliant ? 'compliant' : 'gap_found',
      last_exposure_min:       totalMin,
      last_exposure_max:       totalMax,
      last_article_sanctions:  JSON.stringify(recomputed.article_sanctions ?? {}),
      compliance_checklist:    updatedChecklist,
      updated_at:              now,
    });
    // Append timeline snapshot so the fines chart reflects the resolved gap
    const remediatedArticlesInGap: Record<string, { min: number; max: number }> = {};
    for (const [art, val] of Object.entries(recomputed.article_sanctions ?? {} as Record<string, { min: number; max: number }>)) {
      const entry = updatedChecklist[art] as { status?: string } | string | undefined;
      const st = typeof entry === 'string' ? entry : entry?.status;
      if (st !== 'present' && (val as { max: number }).max > 0) {
        remediatedArticlesInGap[art] = val as { min: number; max: number };
      }
    }
    await dynamo.appendSanctionSnapshot(auth.companyId, systemId, {
      at: now,
      min: totalMin,
      max: totalMax,
      source: 'checklist',
      articles_in_gap: remediatedArticlesInGap,
    });
  } else {
    // No compliance check yet: just update the checklist
    await dynamo.updateSystem(auth.companyId, systemId, {
      compliance_checklist: updatedChecklist,
      updated_at:           now,
    });
  }

  const gapType = getGapType(automationType);
  return {
    statusCode: 200,
    body: JSON.stringify({
      success:   true,
      gap_type:  gapType,
      source:    proofS3Key ? 'proof_upload' : 'self_declared',
      article,
    }),
  };
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
