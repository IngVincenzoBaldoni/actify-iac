import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { parseBody } from '../middleware/validator';
import { extractAuth, requireAdmin } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import * as cognitoSvc from '../services/cognitoService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyEventV2 } from 'aws-lambda';

const registerSchema = z.object({
  email:          z.string().email(),
  password:       z.string().min(8),
  company_name:   z.string().min(1).max(200),
  sector:         z.string().min(1),
  employees_range: z.string().min(1),
  country:        z.string().min(1),
  sede_legale:    z.string().optional(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role:  z.enum(['admin', 'member']).default('member'),
});

export async function register(event: APIGatewayProxyEventV2) {
  const body = parseBody(event.body, registerSchema);
  const companyId = uuidv4();
  const now = new Date().toISOString();

  // Create company record in DynamoDB
  await dynamo.putCompany({
    company_id:       companyId,
    name:             body.company_name,
    sector:           body.sector,
    employees_range:  body.employees_range,
    country:          body.country,
    sede_legale:      body.sede_legale ?? body.country,
    ai_role:          'unknown',
    context_notes:    '',
    governance: {
      has_dpo: false, dpo_status: 'none', has_ai_inventory: false,
      has_impact_assessment: false, has_human_oversight: false,
      has_incident_procedure: false, has_ai_policy: false, has_training: false,
    },
    subscription_tier: 'trial',
    setup_completed:   false,
    created_at:        now,
    updated_at:        now,
  });

  // Create Cognito user (admin role, permanent password)
  let userId: string;
  try {
    const cognitoResult = await cognitoSvc.adminCreateUser({
      email:     body.email,
      password:  body.password,
      companyId: companyId,
      role:      'admin',
      suppressEmail: true,
    });
    // Set permanent password immediately so user can log in without change
    await cognitoSvc.adminSetPermanentPassword(body.email, body.password);
    userId = cognitoResult.User?.Attributes?.find(a => a.Name === 'sub')?.Value ?? body.email;
  } catch (err: unknown) {
    // Rollback company record
    await dynamo.updateCompany(companyId, { deleted: true });
    const cogErr = err as { name?: string };
    if (cogErr.name === 'UsernameExistsException') {
      return { statusCode: 409, body: JSON.stringify({ error: 'email_exists', message: 'Email già registrata.' }) };
    }
    throw err;
  }

  // Create company-user mapping
  await dynamo.putCompanyUser({
    company_id: companyId,
    user_id:    userId,
    email:      body.email,
    role:       'admin',
    status:     'active',
    invited_by: null,
    joined_at:  now,
    created_at: now,
  });

  return {
    statusCode: 201,
    body: JSON.stringify({ company_id: companyId, user_id: userId, message: 'Account creato. Accedi con le tue credenziali.' }),
  };
}

export async function invite(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requireAdmin(auth);
  const body = parseBody(event.body, inviteSchema);
  const now = new Date().toISOString();

  const result = await cognitoSvc.adminCreateUser({
    email:     body.email,
    companyId: auth.companyId,
    role:      body.role ?? 'member',
  });

  const userId = result.User?.Attributes?.find(a => a.Name === 'sub')?.Value ?? body.email;

  await dynamo.putCompanyUser({
    company_id: auth.companyId,
    user_id:    userId,
    email:      body.email,
    role:       body.role,
    status:     'pending',
    invited_by: auth.userId,
    joined_at:  null,
    created_at: now,
  });

  return {
    statusCode: 201,
    body: JSON.stringify({ message: `Invito inviato a ${body.email}` }),
  };
}
