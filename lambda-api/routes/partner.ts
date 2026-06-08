import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { parseBody } from '../middleware/validator';
import { extractAuth, requirePartner } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import * as cognitoSvc from '../services/cognitoService';
import { sendAssessmentEmail, sendReferralInviteEmail, sendOnboardingInviteEmail } from '../services/partnerEmailService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyEventV2 } from 'aws-lambda';

// ─── Partner Registration (public) ───────────────────────────────────────────

const requestSchema = z.object({
  email:           z.string().email(),
  password:        z.string().min(8),
  ragione_sociale: z.string().min(1).max(200),
  tipo_studio:     z.string().min(1),
  n_clienti:       z.number().int().min(1),
});

export async function registerPartner(event: APIGatewayProxyEventV2) {
  const body = parseBody(event.body, requestSchema);
  const partnerId = uuidv4();
  const now = new Date().toISOString();

  let userId: string;
  try {
    const cognitoResult = await cognitoSvc.adminCreateUser({
      email:     body.email,
      password:  body.password,
      companyId: partnerId,
      role:      'partner',
      suppressEmail: true,
    });
    await cognitoSvc.adminSetPermanentPassword(body.email, body.password);
    userId = cognitoResult.User?.Attributes?.find(a => a.Name === 'sub')?.Value ?? body.email;
  } catch (err: unknown) {
    const cogErr = err as { name?: string };
    if (cogErr.name === 'UsernameExistsException') {
      return { statusCode: 409, body: JSON.stringify({ error: 'email_exists', message: 'Email già registrata.' }) };
    }
    throw err;
  }

  const referralCode = partnerId.replace(/-/g, '').substring(0, 8).toUpperCase();

  await dynamo.putPartner({
    partner_id:       partnerId,
    email:            body.email,
    ragione_sociale:  body.ragione_sociale,
    tipo_studio:      body.tipo_studio,
    n_clienti:        body.n_clienti,
    status:           'approved',
    user_id:          userId,
    referral_code:    referralCode,
    referred_pmi_ids: [],
    created_at:       now,
    updated_at:       now,
  });

  return {
    statusCode: 201,
    body: JSON.stringify({ partner_id: partnerId, message: 'Account partner creato. Accedi con le tue credenziali.' }),
  };
}

// ─── GET /api/partner/me ──────────────────────────────────────────────────────

export async function getPartnerMe(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);
  const partner = await dynamo.getPartner(auth.companyId);
  if (!partner) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  return { statusCode: 200, body: JSON.stringify(partner) };
}

// ─── PUT /api/partner/me ──────────────────────────────────────────────────────

const updatePartnerSchema = z.object({
  ragione_sociale: z.string().min(1).max(200).optional(),
  sender_name:     z.string().max(100).optional(),
  reply_to:        z.string().email().optional(),
  primary_color:   z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logo_url:        z.string().url().optional(),
});

export async function updatePartnerMe(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);
  const body = parseBody(event.body, updatePartnerSchema);
  const now = new Date().toISOString();

  await dynamo.updatePartner(auth.companyId, { ...body, updated_at: now });
  return { statusCode: 200, body: JSON.stringify({ message: 'Impostazioni aggiornate.' }) };
}

// ─── GET /api/partner/pmi ─────────────────────────────────────────────────────

export async function listPMI(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);
  const items = await dynamo.listPartnerPMI(auth.companyId);

  // Enrich onboarded PMIs with company data
  const onboardedIds = (items as Record<string, unknown>[])
    .filter(p => p.status === 'onboarded' && p.onboarded_company_id)
    .map(p => p.onboarded_company_id as string);

  let companyMap: Record<string, Record<string, unknown>> = {};
  if (onboardedIds.length > 0) {
    const companies = await dynamo.getCompaniesBatch(onboardedIds).catch(() => []);
    companyMap = Object.fromEntries(
      (companies as Record<string, unknown>[]).map(c => [c.company_id as string, c])
    );
  }

  const enriched = (items as Record<string, unknown>[]).map(p => {
    if (p.status !== 'onboarded' || !p.onboarded_company_id) return p;
    const co = companyMap[p.onboarded_company_id as string];
    if (!co) return p;
    return {
      ...p,
      onboarded_company: {
        sector:               co.sector,
        employees_range:      co.employees_range,
        country:              co.country,
        subscription_tier:    co.subscription_tier,
        annual_revenue_range: co.annual_revenue_range,
        annual_revenue_exact: co.annual_revenue_exact,
      },
    };
  });

  return { statusCode: 200, body: JSON.stringify(enriched) };
}

// ─── POST /api/partner/pmi ────────────────────────────────────────────────────

const addPMISchema = z.object({
  company_name:  z.string().min(1).max(200),
  contact_email: z.string().email(),
});

export async function addPMI(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);
  const body = parseBody(event.body, addPMISchema);
  const pmiId = uuidv4();
  const formToken = uuidv4();
  const now = new Date().toISOString();

  const item = {
    partner_id:    auth.companyId,
    pmi_id:        pmiId,
    company_name:  body.company_name,
    contact_email: body.contact_email,
    status:        'todo',
    form_token:    formToken,
    systems:       [],
    created_at:    now,
    updated_at:    now,
  };
  await dynamo.putPartnerPMI(item);
  return { statusCode: 201, body: JSON.stringify(item) };
}

// ─── POST /api/partner/pmi/import-csv ────────────────────────────────────────

const importCSVSchema = z.object({
  rows: z.array(z.object({
    company_name:  z.string().min(1).max(200),
    contact_email: z.string().email(),
  })).min(1).max(200),
});

export async function importPMICSV(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);
  const body = parseBody(event.body, importCSVSchema);
  const now = new Date().toISOString();
  const created = [];

  for (const row of body.rows) {
    const pmiId = uuidv4();
    const formToken = uuidv4();
    const item = {
      partner_id:    auth.companyId,
      pmi_id:        pmiId,
      company_name:  row.company_name,
      contact_email: row.contact_email,
      status:        'todo',
      form_token:    formToken,
      systems:       [],
      created_at:    now,
      updated_at:    now,
    };
    await dynamo.putPartnerPMI(item);
    created.push(item);
  }

  return { statusCode: 201, body: JSON.stringify({ created: created.length, items: created }) };
}

// ─── GET /api/partner/pmi/{pmiId} ────────────────────────────────────────────

export async function getPMI(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);
  const pmiId = event.pathParameters?.pmiId ?? event.requestContext.http.path.split('/').pop()!;
  const item = await dynamo.getPartnerPMI(auth.companyId, pmiId);
  if (!item) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  return { statusCode: 200, body: JSON.stringify(item) };
}

// ─── PATCH /api/partner/pmi/{pmiId}/status ───────────────────────────────────

const updateStatusSchema = z.object({
  status: z.enum(['todo', 'pending', 'completato', 'onboarding', 'onboarded']),
});

export async function updatePMIStatus(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth  = extractAuth(event);
  requirePartner(auth);
  const pmiId = event.pathParameters?.pmiId ?? event.requestContext.http.path.split('/').slice(-2)[0];
  const body  = parseBody(event.body, updateStatusSchema);
  const item  = await dynamo.getPartnerPMI(auth.companyId, pmiId);
  if (!item) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { status: body.status, updated_at: now };

  // When manually marking as onboarded, try to resolve the linked company_id by email
  if (body.status === 'onboarded' && !item.onboarded_company_id) {
    const contactEmail = item.contact_email as string | undefined;
    if (contactEmail) {
      const linkedCompanyId = await dynamo.getCompanyIdByEmail(contactEmail).catch(() => null);
      if (linkedCompanyId) {
        updates.onboarded_company_id = linkedCompanyId;
        updates.onboarded_at = now;
      }
    }
  }

  await dynamo.updatePartnerPMI(auth.companyId, pmiId, updates);
  return { statusCode: 200, body: JSON.stringify({ message: 'Status aggiornato.', status: body.status, onboarded_company_id: updates.onboarded_company_id ?? null }) };
}

// ─── DELETE /api/partner/pmi/{pmiId} ─────────────────────────────────────────

export async function deletePMI(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);
  const pmiId = event.pathParameters?.pmiId ?? event.requestContext.http.path.split('/').pop()!;
  const item = await dynamo.getPartnerPMI(auth.companyId, pmiId);
  if (!item) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  await dynamo.deletePartnerPMI(auth.companyId, pmiId);
  return { statusCode: 200, body: JSON.stringify({ message: 'PMI rimossa.' }) };
}

// ─── POST /api/partner/send-referral ─────────────────────────────────────────

const sendReferralSchema = z.object({
  contact_email:  z.string().email(),
  company_name:   z.string().max(200).optional(),
  custom_message: z.string().max(2000).optional(),
});

export async function sendReferralEmail(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);

  const [body_parsed, partner] = await Promise.all([
    Promise.resolve(parseBody(event.body, sendReferralSchema)),
    dynamo.getPartner(auth.companyId),
  ]);
  if (!partner) return { statusCode: 404, body: JSON.stringify({ error: 'partner_not_found' }) };

  const referralCode = (partner.referral_code as string) ?? auth.companyId.replace(/-/g, '').substring(0, 8).toUpperCase();

  // Auto-resolve pmi_id so the registration URL always carries it — even when partner
  // sends a "cold referral" email to a contact already in their pipeline.
  const pmiRecord = await dynamo.getPartnerPMIByEmail(auth.companyId, body_parsed.contact_email).catch(() => null);
  const pmiId = pmiRecord ? (pmiRecord.pmi_id as string) : undefined;

  await sendReferralInviteEmail({
    to:                    body_parsed.contact_email,
    companyName:           body_parsed.company_name,
    referralCode,
    pmiId,
    partnerRagioneSociale: partner.ragione_sociale as string,
    partnerEmail:          (partner.reply_to ?? partner.email) as string,
    partnerSenderName:     partner.sender_name as string | undefined,
    customMessage:         body_parsed.custom_message,
  });

  return { statusCode: 200, body: JSON.stringify({ message: 'Invito referral inviato.', sent_at: new Date().toISOString() }) };
}

// ─── POST /api/partner/pmi/{pmiId}/send-assessment ───────────────────────────

const sendAssessmentSchema = z.object({
  email_body: z.string().max(4000).optional(),
});

export async function sendAssessment(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);

  const pathParts = event.requestContext.http.path.split('/');
  const pmiId = pathParts[pathParts.indexOf('pmi') + 1];

  const [pmi, partner] = await Promise.all([
    dynamo.getPartnerPMI(auth.companyId, pmiId),
    dynamo.getPartner(auth.companyId),
  ]);

  if (!pmi || !partner) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };

  const body = parseBody(event.body, sendAssessmentSchema);

  await sendAssessmentEmail({
    to:                    pmi.contact_email as string,
    companyName:           pmi.company_name as string,
    formToken:             pmi.form_token as string,
    partnerRagioneSociale: partner.ragione_sociale as string,
    partnerEmail:          (partner.reply_to ?? partner.email) as string,
    partnerSenderName:     partner.sender_name as string | undefined,
    partnerLogoUrl:        partner.logo_url as string | undefined,
    emailBody:             body.email_body,
  });

  const now = new Date().toISOString();
  await dynamo.updatePartnerPMI(auth.companyId, pmiId, { status: 'pending', sent_at: now, updated_at: now });

  return { statusCode: 200, body: JSON.stringify({ message: 'Email inviata.', sent_at: now }) };
}

// ─── POST /api/partner/pmi/{pmiId}/pdf ───────────────────────────────────────
// Returns structured report data — frontend renders and prints

export async function generatePMIPdf(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);

  const pathParts = event.requestContext.http.path.split('/');
  const pmiId = pathParts[pathParts.indexOf('pmi') + 1];

  const [pmi, partner] = await Promise.all([
    dynamo.getPartnerPMI(auth.companyId, pmiId),
    dynamo.getPartner(auth.companyId),
  ]);

  if (!pmi || !partner) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };
  if (!pmi.systems || (pmi.systems as unknown[]).length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'no_systems', message: 'Nessuno strumento AI censito per questa PMI.' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      report: {
        pmi_id:       pmi.pmi_id,
        company_name: pmi.company_name,
        systems:      pmi.systems,
        completed_at: pmi.completed_at,
        partner: {
          ragione_sociale: partner.ragione_sociale,
          logo_url:        partner.logo_url ?? null,
          primary_color:   partner.primary_color ?? '#6C47FF',
        },
      },
    }),
  };
}

// ─── POST /api/partner/pmi/{pmiId}/send-onboarding ───────────────────────────

export async function sendOnboardingEmail(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);

  const pathParts = event.requestContext.http.path.split('/');
  const pmiId = pathParts[pathParts.indexOf('pmi') + 1];

  const [pmi, partner] = await Promise.all([
    dynamo.getPartnerPMI(auth.companyId, pmiId),
    dynamo.getPartner(auth.companyId),
  ]);
  if (!pmi || !partner) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };

  const allowedStatuses = ['completato', 'onboarding'];
  if (!allowedStatuses.includes(pmi.status as string)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'assessment_not_completed', message: 'La PMI deve prima completare il free assessment.' }) };
  }

  const referralCode = (partner.referral_code as string)
    ?? auth.companyId.replace(/-/g, '').substring(0, 8).toUpperCase();

  await sendOnboardingInviteEmail({
    to:                    pmi.contact_email as string,
    companyName:           pmi.company_name as string,
    systems:               (pmi.systems as { name?: string; tool_name?: string; purpose?: string }[]) ?? [],
    referralCode,
    pmiId,
    partnerRagioneSociale: partner.ragione_sociale as string,
    partnerEmail:          (partner.reply_to ?? partner.email) as string,
    partnerSenderName:     partner.sender_name as string | undefined,
  });

  const now = new Date().toISOString();
  await dynamo.updatePartnerPMI(auth.companyId, pmiId, {
    status:              'onboarding',
    onboarding_sent_at:  now,
    updated_at:          now,
  });

  return { statusCode: 200, body: JSON.stringify({ message: 'Email onboarding inviata.', sent_at: now }) };
}

// ─── GET /api/assessment/{token} (public) ─────────────────────────────────────

export async function getAssessmentForm(event: APIGatewayProxyEventV2) {
  const token = event.pathParameters?.token
    ?? event.requestContext.http.path.split('/').slice(-1)[0];

  if (!token) return { statusCode: 400, body: JSON.stringify({ error: 'missing_token' }) };

  const pmi = await dynamo.getPartnerPMIByToken(token);
  if (!pmi) return { statusCode: 404, body: JSON.stringify({ error: 'invalid_token' }) };

  const partner = await dynamo.getPartner(pmi.partner_id as string);
  if (!partner) return { statusCode: 404, body: JSON.stringify({ error: 'partner_not_found' }) };

  const referralCode = (partner.referral_code as string)
    ?? (partner.partner_id as string).replace(/-/g, '').substring(0, 8).toUpperCase();

  return {
    statusCode: 200,
    body: JSON.stringify({
      pmi_id:        pmi.pmi_id,
      company_name:  pmi.company_name,
      status:        pmi.status,
      referral_code: referralCode,
      partner: {
        ragione_sociale: partner.ragione_sociale,
        logo_url:        partner.logo_url ?? null,
        primary_color:   partner.primary_color ?? '#6C47FF',
        sender_name:     partner.sender_name ?? partner.ragione_sociale,
      },
    }),
  };
}

// ─── POST /api/assessment/{token}/submit (public) ────────────────────────────

const systemInputSchema = z.object({
  name:                      z.string().min(1).max(200),
  purpose:                   z.string().min(1).max(2000),
  department:                z.string().max(200).optional(),
  headcount:                 z.number().int().min(1).optional(),
  role:                      z.enum(['deployer', 'provider']).optional(),
  vendor:                    z.string().max(200).optional(),
  category:                  z.string().max(100).optional(),
  is_llm:                    z.boolean().optional(),
  llm_preset:                z.string().max(100).optional(),
  output_type:               z.string().max(100).optional(),
  access_mode:               z.string().max(100).optional(),
  customizations:            z.array(z.string()).optional(),
  target_users:              z.array(z.string()).optional(),
  vulnerable_groups:         z.array(z.string()).optional(),
  users_aware_of_ai:         z.boolean().optional(),
  makes_automated_decisions: z.boolean().optional(),
  human_oversight_level:     z.string().max(50).optional(),
  decision_domains:          z.array(z.string()).optional(),
  affects_vulnerable_groups: z.boolean().optional(),
  data_types:                z.array(z.string()).optional(),
  annex_iii_domains:         z.array(z.string()).optional(),
  is_safety_component:       z.boolean().optional(),
});

const companyProfileSchema = z.object({
  sector:               z.string().max(100).optional(),
  employees_range:      z.string().max(20).optional(),
  annual_revenue_range: z.string().max(50).optional(),
  annual_revenue_exact: z.number().positive().optional(),
}).optional();

const submitSchema = z.object({
  systems:         z.array(systemInputSchema).min(1).max(50),
  company_profile: companyProfileSchema,
});

export async function submitAssessmentForm(event: APIGatewayProxyEventV2) {
  const token = event.pathParameters?.token
    ?? event.requestContext.http.path.split('/').slice(-2)[0];

  if (!token) return { statusCode: 400, body: JSON.stringify({ error: 'missing_token' }) };

  const pmi = await dynamo.getPartnerPMIByToken(token);
  if (!pmi) return { statusCode: 404, body: JSON.stringify({ error: 'invalid_token' }) };

  if (pmi.status === 'completato') {
    return { statusCode: 409, body: JSON.stringify({ error: 'already_submitted', message: 'Questo questionario è già stato compilato.' }) };
  }

  const body = parseBody(event.body, submitSchema);
  const now = new Date().toISOString();

  const systems = body.systems.map(s => ({
    system_id:    uuidv4(),
    submitted_at: now,
    ...s,
  }));

  await dynamo.updatePartnerPMI(pmi.partner_id as string, pmi.pmi_id as string, {
    systems,
    ...(body.company_profile ? { company_profile: body.company_profile } : {}),
    status:       'completato',
    completed_at: now,
    updated_at:   now,
  });

  return { statusCode: 200, body: JSON.stringify({ message: 'Questionario inviato con successo. Grazie!', systems_count: systems.length }) };
}
