import { v4 as uuidv4 } from 'uuid';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { z } from 'zod';
import { extractAuth } from '../middleware/auth';
import { parseBody } from '../middleware/validator';
import * as dynamo from '../services/dynamoService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const sfnClient = new SFNClient({ region: process.env.AWS_REGION ?? 'eu-central-1' });

const STEP_FUNCTIONS_ARN = process.env.STEP_FUNCTIONS_ARN!;

// Mapping from gap automation_type → docType (server-side — client cannot override)
const AUTOMATION_TO_DOCTYPE: Record<string, string> = {
  transparency_notice:    'DISCLOSURE_NOTICE',
  monitoring_plan:        'MONITORING_PLAN',
  policy_template:        'AI_POLICY',
  document_generation:    'TECH_DOC',
  conformity_declaration: 'CONFORMITY_DECL',
};

const generateDocVaultSchema = z.object({
  gap_id:   z.string().min(1),
  doc_type: z.string().optional(),
});

// ─── POST /api/systems/:systemId/documents ────────────────────────────────────
// New Step Functions-backed generation. Returns { generationId } 202.
export async function startDocGeneration(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth     = extractAuth(event);
  const systemId = event.pathParameters?.systemId;
  console.log('[startDocGeneration]', { companyId: auth.companyId, systemId, body: event.body });
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  const idempotencyKey = event.headers?.['idempotency-key'] ?? event.headers?.['Idempotency-Key'];

  const body = parseBody(event.body, generateDocVaultSchema);

  // Check quota: max 3 concurrent active generations per company
  const activeGens = await dynamo.listDocGenerationsByCompany(auth.companyId);
  const running = activeGens.filter((g: Record<string, unknown>) =>
    g.status === 'QUEUED' || g.status === 'RUNNING',
  );
  if (running.length >= 3) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'quota_exceeded', message: 'Massimo 3 generazioni concorrenti per azienda' }),
    };
  }

  // Idempotency: return existing generation if same key is in progress
  if (idempotencyKey) {
    const existing = activeGens.find((g: Record<string, unknown>) =>
      g.idempotencyKey === idempotencyKey,
    );
    if (existing) {
      return {
        statusCode: 202,
        body: JSON.stringify({ generationId: existing.generationId, status: existing.status }),
      };
    }
  }

  // Validate gap + system ownership
  const system = await dynamo.getSystem(auth.companyId, systemId);
  if (!system) return { statusCode: 404, body: JSON.stringify({ error: 'system_not_found' }) };

  const latestCheck = await dynamo.getLatestComplianceCheck(auth.companyId, systemId);
  const gaps = (latestCheck?.result?.compliance_gaps ?? []) as Record<string, unknown>[];
  const gap  = gaps.find(g => g.gap_id === body.gap_id);

  if (!gap) return {
    statusCode: 404,
    body: JSON.stringify({ error: 'gap_not_found', message: 'Gap non trovato nell\'ultimo compliance check' }),
  };

  if (!gap.can_actify_automate) return {
    statusCode: 400,
    body: JSON.stringify({ error: 'not_automatable', message: 'Questo gap non è automatizzabile da Actify' }),
  };

  // Determine docType (server-side mapping, client hint accepted only if it matches)
  const serverDocType = AUTOMATION_TO_DOCTYPE[gap.automation_type as string];
  if (!serverDocType) return {
    statusCode: 400,
    body: JSON.stringify({ error: 'unsupported_doc_type', message: `automation_type ${gap.automation_type} non supportato dalla pipeline` }),
  };
  const docType = serverDocType;

  const generationId = uuidv4();
  const now          = new Date().toISOString();
  const ttl          = Math.floor(Date.now() / 1000) + 30 * 86400; // 30d TTL for non-completed

  // Create doc_generations record (QUEUED)
  await dynamo.putDocGeneration({
    pk:             `COMPANY#${auth.companyId}`,
    sk:             `GEN#${generationId}`,
    generationId,
    companyId:      auth.companyId,
    systemId,
    gapId:          body.gap_id,
    docType,
    status:         'QUEUED',
    attempt:        0,
    createdAt:      now,
    updatedAt:      now,
    system_id:      systemId, // GSI hash key
    ...(idempotencyKey ? { idempotencyKey } : {}),
    ttl,
  });

  // Start Step Functions execution
  const input = JSON.stringify({
    generationId,
    companyId:  auth.companyId,
    systemId,
    gapId:      body.gap_id,
    docType,
    attempt:    0,
  });

  const execution = await sfnClient.send(new StartExecutionCommand({
    stateMachineArn: STEP_FUNCTIONS_ARN,
    name:            generationId,
    input,
  }));

  // Store execution ARN for debugging
  await dynamo.updateDocGeneration(auth.companyId, generationId, {
    executionArn: execution.executionArn,
  });

  return {
    statusCode: 202,
    body: JSON.stringify({ generationId, status: 'QUEUED' }),
  };
}

// ─── GET /api/document-generations/:generationId ─────────────────────────────
// Polling endpoint — frontend polls until status is DRAFT_READY | REVIEW_REQUIRED | FAILED
export async function getDocGenerationStatus(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth         = extractAuth(event);
  const generationId = event.pathParameters?.generationId;
  if (!generationId) return { statusCode: 400, body: JSON.stringify({ error: 'generationId required' }) };

  const gen = await dynamo.getDocGeneration(auth.companyId, generationId);
  if (!gen || (gen as Record<string, unknown>).companyId !== auth.companyId) {
    return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  }

  return { statusCode: 200, body: JSON.stringify(gen) };
}

// ─── GET /api/systems/:systemId/document-generations ─────────────────────────
// List all doc generations for a system (for frontend history)
export async function listSystemDocGenerations(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth     = extractAuth(event);
  const systemId = event.pathParameters?.systemId;
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  const system = await dynamo.getSystem(auth.companyId, systemId);
  if (!system) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };

  const gens = await dynamo.listDocGenerationsBySystem(systemId);
  return { statusCode: 200, body: JSON.stringify({ generations: gens }) };
}

// ─── GET /api/company/document-generations ───────────────────────────────────
// All generations for the authenticated company (for Document Vault page)
export async function listCompanyDocGenerations(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const gens = await dynamo.listDocGenerationsByCompany(auth.companyId);
  return { statusCode: 200, body: JSON.stringify({ generations: gens }) };
}
