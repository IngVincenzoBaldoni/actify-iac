import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { parseBody } from '../middleware/validator';
import { extractAuth, requireAdmin } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import * as cognitoSvc from '../services/cognitoService';
import { logEvent } from '../services/auditService';
import { sendCollaboratorInviteEmail } from '../services/partnerEmailService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyEventV2 } from 'aws-lambda';

const BASE_URL = 'https://official-actify.com';

const registerSchema = z.object({
  email:           z.string().email(),
  password:        z.string().min(8),
  company_name:    z.string().min(1).max(200),
  sector:          z.string().min(1),
  employees_range: z.string().min(1),
  country:         z.string().min(1),
  sede_legale:     z.string().optional(),
  referral_code:   z.string().max(20).optional(),
  pmi_id:          z.string().uuid().optional(),
  terms_version:   z.string().min(1),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role:  z.enum(['admin', 'collaborator']).default('collaborator'),
});

export async function register(event: APIGatewayProxyEventV2) {
  const body = parseBody(event.body, registerSchema);
  const companyId = uuidv4();
  const now = new Date().toISOString();

  // Create company record in DynamoDB
  await dynamo.putCompany({
    company_id:         companyId,
    name:               body.company_name,
    sector:             body.sector,
    employees_range:    body.employees_range,
    country:            body.country,
    sede_legale:        body.sede_legale ?? body.country,
    ai_role:            'unknown',
    context_notes:      '',
    governance: {
      has_dpo: false, dpo_status: 'none', has_ai_inventory: false,
      has_impact_assessment: false, has_human_oversight: false,
      has_incident_procedure: false, has_ai_policy: false, has_training: false,
    },
    subscription_tier:  'trial',
    setup_completed:    false,
    terms_version:      body.terms_version,
    terms_accepted_at:  now,
    created_at:         now,
    updated_at:         now,
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

  // Link to partner via referral code if provided
  if (body.referral_code) {
    const partner = await dynamo.scanPartnerByReferralCode(body.referral_code.toUpperCase()).catch(() => null);
    if (partner) {
      const partnerId = partner.partner_id as string;
      await Promise.all([
        dynamo.updateCompany(companyId, { referred_by: partnerId, updated_at: now }),
        dynamo.appendReferredPMI(partnerId, companyId),
      ]);
      // Link to partnerPMI record: prefer direct pmi_id, fallback to email match
      const pmiRecord = body.pmi_id
        ? await dynamo.getPartnerPMI(partnerId, body.pmi_id).catch(() => null)
        : await dynamo.getPartnerPMIByEmail(partnerId, body.email).catch(() => null);
      if (pmiRecord) {
        await dynamo.updatePartnerPMI(partnerId, pmiRecord.pmi_id as string, {
          status:               'onboarded',
          onboarded_company_id: companyId,
          onboarded_at:         now,
          updated_at:           now,
        });
      }
    }
  }

  await logEvent(companyId, 'account_created', {
    company_name:      body.company_name,
    sector:            body.sector,
    country:           body.country,
    email:             body.email,
    terms_version:     body.terms_version,
    terms_accepted_at: now,
  }, body.email);
  return {
    statusCode: 201,
    body: JSON.stringify({ company_id: companyId, user_id: userId, message: 'Account creato. Accedi con le tue credenziali.' }),
  };
}

const TEAM_LIMITS: Record<string, number> = {
  trial: 1, base: 3, premium: 10, enterprise: 100,
};

export async function invite(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requireAdmin(auth);
  const body = parseBody(event.body, inviteSchema);
  const now = new Date().toISOString();

  // Check plan limit (pending invites count toward the limit)
  const [company, existingUsers] = await Promise.all([
    dynamo.getCompany(auth.companyId),
    dynamo.getCompanyUsers(auth.companyId),
  ]);
  const tier = (company?.subscription_tier as string) ?? 'trial';
  const limit = TEAM_LIMITS[tier] ?? 1;
  if (existingUsers.length >= limit) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: `Hai raggiunto il limite di ${limit} collaboratori del team per il piano ${tier === 'base' ? 'Starter' : tier === 'premium' ? 'Professional' : tier}. Aggiorna il piano per aggiungere altri collaboratori.`,
      }),
    };
  }

  // Block invite if email already exists in Cognito (any company, any state)
  const cognitoUser = await cognitoSvc.adminGetUser(body.email);
  if (cognitoUser) {
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: `${body.email} ha già un account Actify e non può essere invitato come collaboratore.`,
      }),
    };
  }

  // Also check DynamoDB (belt-and-suspenders)
  const existingCompanyId = await dynamo.getCompanyIdByEmail(body.email);
  if (existingCompanyId) {
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: `${body.email} ha già un account Actify esistente e non può essere invitato come collaboratore.`,
      }),
    };
  }

  // Store pending invite — Cognito user is created only when the collaborator accepts
  const inviteToken = uuidv4();
  await dynamo.putCompanyUser({
    company_id: auth.companyId,
    user_id:    `INVITE_${inviteToken}`,
    email:      body.email,
    role:       body.role,
    status:     'pending',
    invited_by: auth.userId,
    joined_at:  null,
    created_at: now,
  });

  // Send branded invite email via Resend
  const companyName = (company?.name as string) ?? 'la tua azienda';
  const inviteUrl = `${BASE_URL}/accept-invite?cid=${auth.companyId}&t=${inviteToken}`;
  await sendCollaboratorInviteEmail({
    to:           body.email,
    companyName,
    inviterEmail: auth.email,
    inviteUrl,
  });

  await logEvent(auth.companyId, 'user_invited', { email: body.email, role: body.role }, auth.email);

  return {
    statusCode: 201,
    body: JSON.stringify({ message: `Invito inviato a ${body.email}` }),
  };
}

// ─── Public: validate invite token (pre-fill email on accept page) ─────────────

export async function validateInvite(event: APIGatewayProxyEventV2) {
  const params = (event.queryStringParameters ?? {}) as Record<string, string>;
  const companyId = params.cid;
  const token     = params.t;
  if (!companyId || !token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Parametri mancanti.' }) };
  }

  const pending = await dynamo.getCompanyUser(companyId, `INVITE_${token}`);
  if (!pending || pending.status !== 'pending') {
    return { statusCode: 404, body: JSON.stringify({ error: 'Invito non trovato o già utilizzato.' }) };
  }

  const createdAt = new Date(pending.created_at as string).getTime();
  if (Date.now() - createdAt > 7 * 24 * 60 * 60 * 1000) {
    return { statusCode: 410, body: JSON.stringify({ error: 'Il link è scaduto. Chiedi un nuovo invito all\'amministratore.' }) };
  }

  const company = await dynamo.getCompany(companyId);
  return {
    statusCode: 200,
    body: JSON.stringify({
      email:        pending.email,
      company_name: (company?.name as string) ?? '',
      role:         pending.role,
    }),
  };
}

// ─── Public: accept invite — create Cognito user with chosen password ──────────

const acceptInviteSchema = z.object({
  company_id: z.string().uuid(),
  token:      z.string().uuid(),
  password:   z.string().min(8),
});

export async function acceptInvite(event: APIGatewayProxyEventV2) {
  const body = parseBody(event.body, acceptInviteSchema);
  const now  = new Date().toISOString();

  const pending = await dynamo.getCompanyUser(body.company_id, `INVITE_${body.token}`);
  if (!pending || pending.status !== 'pending') {
    return { statusCode: 404, body: JSON.stringify({ error: 'Invito non trovato o già utilizzato.' }) };
  }

  const createdAt = new Date(pending.created_at as string).getTime();
  if (Date.now() - createdAt > 7 * 24 * 60 * 60 * 1000) {
    return { statusCode: 410, body: JSON.stringify({ error: 'Il link è scaduto. Chiedi un nuovo invito all\'amministratore.' }) };
  }

  const email = pending.email as string;
  const role  = (pending.role as string) ?? 'collaborator';

  // Pre-check: if user already exists in Cognito (any state), block immediately
  const existingCognitoUser = await cognitoSvc.adminGetUser(email);
  if (existingCognitoUser) {
    await dynamo.deleteCompanyUser(body.company_id, `INVITE_${body.token}`).catch(() => {});
    return {
      statusCode: 409,
      body: JSON.stringify({ error: 'Questo indirizzo email è già registrato su Actify. Il link di invito non è più valido.' }),
    };
  }

  let userId: string;
  try {
    const result = await cognitoSvc.adminCreateUser({
      email,
      companyId:     body.company_id,
      role:          role as 'admin' | 'collaborator' | 'partner',
      suppressEmail: true,
    });

    // Sanity check: verify the created user has the expected company_id
    // (guards against Cognito SUPPRESS edge case returning an existing user)
    const returnedCompanyId = result.User?.Attributes?.find(a => a.Name === 'custom:company_id')?.Value;
    if (returnedCompanyId !== body.company_id) {
      await dynamo.deleteCompanyUser(body.company_id, `INVITE_${body.token}`).catch(() => {});
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'Questo indirizzo email appartiene già a un altro account Actify.' }),
      };
    }

    await cognitoSvc.adminSetPermanentPassword(email, body.password);
    userId = result.User?.Attributes?.find(a => a.Name === 'sub')?.Value ?? email;
  } catch (err: unknown) {
    const cogErr = err as { name?: string; message?: string };
    if (cogErr.name === 'UsernameExistsException') {
      await dynamo.deleteCompanyUser(body.company_id, `INVITE_${body.token}`).catch(() => {});
      return { statusCode: 409, body: JSON.stringify({ error: 'Questo indirizzo email è già registrato su Actify.' }) };
    }
    if (cogErr.name === 'InvalidPasswordException') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Password non valida. Usa almeno 8 caratteri con maiuscole, minuscole e numeri.' }) };
    }
    throw err;
  }

  // Create real user record and remove the pending invite in parallel
  await Promise.all([
    dynamo.putCompanyUser({
      company_id: body.company_id,
      user_id:    userId,
      email,
      role,
      status:     'active',
      invited_by: pending.invited_by,
      joined_at:  now,
      created_at: pending.created_at,
    }),
    dynamo.deleteCompanyUser(body.company_id, `INVITE_${body.token}`),
  ]);

  await logEvent(body.company_id, 'user_invited', { email, action: 'accepted' }, email);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Account creato. Accedi con le tue credenziali.' }),
  };
}
