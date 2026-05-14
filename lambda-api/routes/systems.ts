import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { parseBody } from '../middleware/validator';
import { extractAuth, requireAdmin } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const aiSystemSchema = z.object({
  tool_name:                z.string().min(1).max(200),
  vendor:                   z.string().max(200).default(''),
  category:                 z.enum(['hr','finance','llm','marketing','operations','legal','tech','healthcare','altro']),
  role:                     z.enum(['provider','deployer']),
  purpose:                  z.string().min(1).max(1000),
  target_users:             z.array(z.string().max(50)).max(10).default([]),
  makes_automated_decisions: z.boolean(),
  human_oversight_level:    z.enum(['always','sometimes','never','na']),
  decision_domains:         z.array(z.string().max(100)).max(20).default([]),
  affects_vulnerable_groups: z.boolean(),
  data_types:               z.array(z.string().max(100)).max(20).default([]),
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
  return { statusCode: 200, body: JSON.stringify({ message: 'Sistema aggiornato.' }) };
}

export async function deleteSystem(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requireAdmin(auth);
  const systemId = event.pathParameters?.systemId;
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  await Promise.all([
    dynamo.deleteSystem(auth.companyId, systemId),
    dynamo.deleteComplianceChecksForSystem(auth.companyId, systemId),
  ]);
  return { statusCode: 200, body: JSON.stringify({ message: 'Sistema eliminato.' }) };
}
