import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { parseBody } from '../middleware/validator';
import { extractAuth, requireAdmin } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const s3Client = new S3Client({ region: process.env.AWS_REGION ?? 'eu-central-1' });
const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET ?? 'actify-saas-documents';

const aiSystemSchema = z.object({
  tool_name:                z.string().min(1).max(200),
  vendor:                   z.string().max(200).default(''),
  category:                 z.enum(['hr','finance','llm','marketing','operations','legal','tech','healthcare','altro']),
  role:                     z.enum(['provider','deployer']),
  purpose:                  z.string().min(1).max(1000),
  department:               z.string().max(200).optional(),
  headcount:                z.number().int().min(1).max(1000000).optional(),
  target_users:             z.array(z.string().max(50)).max(10).default([]),
  makes_automated_decisions: z.boolean(),
  human_oversight_level:    z.enum(['always','sometimes','never','na']),
  decision_domains:         z.array(z.string().max(100)).max(20).default([]),
  affects_vulnerable_groups: z.boolean(),
  data_types:               z.array(z.string().max(100)).max(20).default([]),
  // FIX-01: previously UI-only fields, now persisted
  output_type:              z.enum(['content_generation','recommendation','scoring','automated_decision']).optional(),
  vulnerable_groups:        z.array(z.string().max(50)).max(10).optional(),
  customizations:           z.array(z.string().max(50)).max(10).optional(),
  // FIX-12: accept both legacy string values and enriched ChecklistEntry objects
  compliance_checklist: z.record(z.union([
    z.enum(['present', 'missing']),
    z.object({
      status:         z.enum(['present', 'partial', 'missing']),
      addressed_at:   z.string().optional(),
      evidence_note:  z.string().max(300).optional(),
    }),
  ])).optional(),
  // Deterministic RAG: Allegato III domains and safety component flag
  annex_iii_domains: z.array(z.enum([
    'biometric_identification','biometric_categorization','emotion_recognition',
    'critical_infrastructure',
    'education_admission','education_assessment',
    'recruitment','work_performance','work_monitoring',
    'credit_scoring','insurance_pricing','public_services_eligibility','emergency_dispatch',
    'law_enforcement_risk','criminal_investigation',
    'migration_assessment','border_control',
    'justice_administration',
  ])).optional(),
  is_safety_component: z.boolean().optional(),
});

const aiSystemUpdateSchema = aiSystemSchema.partial();

export async function listSystems(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const systems = await dynamo.getSystemsByCompany(auth.companyId);
  return { statusCode: 200, body: JSON.stringify(systems) };
}

export async function createSystem(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const body = parseBody(event.body, aiSystemSchema);
  const now = new Date().toISOString();
  const systemId = uuidv4();

  const item = {
    company_id:               auth.companyId,
    system_id:                systemId,
    ...body,
    compliance_status:        'unchecked',
    last_check_id:            null,
    last_check_at:            null,
    created_at:               now,
    updated_at:               now,
  };

  await dynamo.putSystem(item);
  return {
    statusCode: 201,
    body: JSON.stringify({
      system_id:         systemId,
      company_id:        auth.companyId,
      tool_name:         body.tool_name,
      compliance_status: 'unchecked',
      created_at:        now,
    }),
  };
}

export async function getSystem(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const systemId = event.pathParameters?.systemId;
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  const system = await dynamo.getSystem(auth.companyId, systemId);
  if (!system) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  return { statusCode: 200, body: JSON.stringify(system) };
}

export async function updateSystem(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const systemId = event.pathParameters?.systemId;
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  const body = parseBody(event.body, aiSystemUpdateSchema);
  const updates = { ...body, updated_at: new Date().toISOString() };
  await dynamo.updateSystem(auth.companyId, systemId, updates);

  // When checklist changes, compute effective exposure server-side and record a snapshot
  if (body.compliance_checklist) {
    try {
      const latestCheck = await dynamo.getLatestComplianceCheck(auth.companyId, systemId);
      if (latestCheck?.result?.compliance_gaps) {
        const gaps = latestCheck.result.compliance_gaps as Array<{
          article: string; status: string;
          estimated_sanction_min?: number; estimated_sanction_max?: number;
        }>;
        const cl = body.compliance_checklist as Record<string, { status?: string } | string>;
        let newMin = 0, newMax = 0;
        for (const g of gaps) {
          const entry = cl[g.article];
          const entryStatus = typeof entry === 'string' ? entry : entry?.status;
          if (g.status !== 'compliant' && entryStatus !== 'present') {
            newMin += g.estimated_sanction_min ?? 0;
            newMax += g.estimated_sanction_max ?? 0;
          }
        }
        await dynamo.appendSanctionSnapshot(auth.companyId, systemId, {
          at: new Date().toISOString(),
          min: newMin,
          max: newMax,
          source: 'checklist',
        });
      }
    } catch { /* don't fail the update */ }
  }

  return { statusCode: 200, body: JSON.stringify({ message: 'Sistema aggiornato.' }) };
}

export async function deleteSystem(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requireAdmin(auth);
  const systemId = event.pathParameters?.systemId;
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  // Load all documents before deleting so we can clean up S3
  const docs = await dynamo.listDocumentsBySystem(systemId);

  await Promise.all([
    dynamo.deleteSystem(auth.companyId, systemId),
    dynamo.deleteComplianceChecksForSystem(auth.companyId, systemId),
    ...docs.map(d => dynamo.deleteDocument(d.document_id as string)),
    ...docs
      .filter(d => d.s3_key)
      .map(d => s3Client.send(new DeleteObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: d.s3_key as string }))),
  ]);

  return { statusCode: 200, body: JSON.stringify({ message: 'Sistema eliminato.', deleted_documents: docs.length }) };
}
