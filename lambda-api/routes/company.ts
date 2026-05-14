import { z } from 'zod';
import { parseBody } from '../middleware/validator';
import { extractAuth, requireAdmin } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import * as cognitoSvc from '../services/cognitoService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const REVENUE_RANGES = ['under_500k', '500k_2m', '2m_10m', '10m_50m', '50m_250m', 'over_250m'] as const;

const companyUpdateSchema = z.object({
  name:                 z.string().min(1).max(200).optional(),
  sector:               z.string().optional(),
  employees_range:      z.string().optional(),
  country:              z.string().optional(),
  sede_legale:          z.string().optional(),
  ai_role:              z.enum(['provider', 'deployer', 'both', 'unknown']).optional(),
  annual_revenue_range: z.enum(REVENUE_RANGES).optional(),
  context_notes:        z.string().max(5000).optional(),
  governance: z.object({
    has_dpo:                z.boolean(),
    dpo_status:             z.enum(['inhouse', 'service', 'none']),
    has_ai_inventory:       z.boolean(),
    has_impact_assessment:  z.boolean(),
    has_human_oversight:    z.boolean(),
    has_incident_procedure: z.boolean(),
    has_ai_policy:          z.boolean(),
    has_training:           z.boolean(),
  }).optional(),
  setup_completed: z.boolean().optional(),
});

const setupSchema = z.object({
  ai_role:         z.enum(['provider', 'deployer', 'both', 'unknown']),
  context_notes:   z.string().max(5000).optional(),
  governance: z.object({
    has_dpo:                z.boolean(),
    dpo_status:             z.enum(['inhouse', 'service', 'none']),
    has_ai_inventory:       z.boolean(),
    has_impact_assessment:  z.boolean(),
    has_human_oversight:    z.boolean(),
    has_incident_procedure: z.boolean(),
    has_ai_policy:          z.boolean(),
    has_training:           z.boolean(),
  }),
});

export async function getCompany(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const company = await dynamo.getCompany(auth.companyId);
  if (!company) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  return { statusCode: 200, body: JSON.stringify(company) };
}

export async function updateCompany(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requireAdmin(auth);
  const body = parseBody(event.body, companyUpdateSchema);
  const updates = { ...body, updated_at: new Date().toISOString() };
  await dynamo.updateCompany(auth.companyId, updates);
  return { statusCode: 200, body: JSON.stringify({ message: 'Profilo aggiornato.' }) };
}

export async function setupWizard(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const body = parseBody(event.body, setupSchema);
  await dynamo.updateCompany(auth.companyId, {
    ai_role:         body.ai_role,
    context_notes:   body.context_notes ?? '',
    governance:      body.governance,
    setup_completed: true,
    updated_at:      new Date().toISOString(),
  });
  return { statusCode: 200, body: JSON.stringify({ message: 'Setup completato.' }) };
}

export async function getUsers(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requireAdmin(auth);
  const users = await dynamo.getCompanyUsers(auth.companyId);
  return { statusCode: 200, body: JSON.stringify(users) };
}

export async function deleteUser(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requireAdmin(auth);
  const targetUserId = event.pathParameters?.userId;
  if (!targetUserId) return { statusCode: 400, body: JSON.stringify({ error: 'userId required' }) };
  if (targetUserId === auth.userId) return { statusCode: 400, body: JSON.stringify({ error: 'Cannot remove yourself' }) };

  const userRecord = await dynamo.getUserByUserId(targetUserId);
  if (userRecord) {
    await dynamo.deleteCompanyUser(auth.companyId, targetUserId);
    try { await cognitoSvc.adminDeleteUser(userRecord.email as string); } catch { /* ignore if already deleted */ }
  }

  return { statusCode: 200, body: JSON.stringify({ message: 'Utente rimosso.' }) };
}
