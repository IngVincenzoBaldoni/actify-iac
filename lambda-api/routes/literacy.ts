import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { parseBody } from '../middleware/validator';
import { extractAuth } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import { logEvent } from '../services/auditService';
import { suggestCertifications } from '../services/literacySuggestService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION ?? 'eu-central-1' });

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileType = 'operational_users' | 'supervisors' | 'dev_team' | 'qa_team' | 'commercial_team';
type SystemRole  = 'provider' | 'deployer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function profileRecordId(systemId: string, pt: string): string { return `PROFILE#${systemId}#${pt}`; }
function evidenceRecordId(profileId: string, evidenceId: string): string { return `EVIDENCE#${profileId}#${evidenceId}`; }
function suggestKeyId(systemId: string, pt: string): string { return `SUGGEST#${systemId}#${pt}`; }

function getProfilesForRole(role: SystemRole): ProfileType[] {
  if (role === 'deployer') return ['operational_users', 'supervisors'];
  if (role === 'provider') return ['dev_team', 'qa_team', 'commercial_team'];
  return [];
}

const PROFILE_LABELS: Record<string, string> = {
  operational_users: 'Utenti operativi',
  supervisors:       'Supervisori',
  dev_team:          'Team di sviluppo',
  qa_team:           'Team QA / Testing',
  commercial_team:   'Team Commerciale',
};

const PROFILE_DESCRIPTIONS: Record<string, string> = {
  operational_users: "Chi usa il sistema AI nel lavoro quotidiano — Art. 4 richiede literacy adeguata all'uso specifico e ai rischi connessi.",
  supervisors:       "Chi controlla o valida l'output del sistema AI — Art. 4 richiede literacy sulla supervisione umana e sul rischio residuo.",
  dev_team:          'Developer e data scientist che sviluppano o mantengono il sistema — Art. 4 richiede literacy tecnica e normativa approfondita.',
  qa_team:           'Team di testing e monitoraggio — Art. 4 richiede literacy su valutazione rischi, bias e qualità dei dati.',
  commercial_team:   'Chi vende o supporta il sistema presso i clienti — Art. 4 richiede literacy sulle implicazioni normative verso i deployer.',
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  headcount:   z.number().int().min(0).max(1000000).optional(),
  merged_with: z.string().nullable().optional(),
});

const evidenceSchema = z.discriminatedUnion('evidence_type', [
  z.object({
    evidence_type: z.literal('certification'),
    title:         z.string().min(1).max(300),
    date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    people_count:  z.number().int().min(1),
    issuer:        z.string().max(200).optional(),
    url:           z.string().url().max(2000).optional(),
    notes:         z.string().max(500).optional(),
  }),
  z.object({
    evidence_type: z.literal('internal_training'),
    title:         z.string().min(1).max(300),
    date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    people_count:  z.number().int().min(1),
    topics:        z.array(z.string().min(1).max(200)).min(1).max(20),
    responsible:   z.string().max(200).optional(),
    notes:         z.string().max(500).optional(),
  }),
]);

// ─── Coverage helpers ─────────────────────────────────────────────────────────

function calcCoverage(headcount: number, evidences: Record<string, unknown>[]): number {
  if (headcount === 0) return 0;
  const covered = evidences.reduce((sum, e) => sum + ((e.people_count as number) ?? 0), 0);
  return Math.min(Math.round((covered / headcount) * 100), 100);
}

function literacyStatus(
  profiles: Array<{ headcount: number; coverage_pct: number; merged_with: string | null }>
): 'not_started' | 'in_progress' | 'compliant' {
  const active = profiles.filter(p => !p.merged_with);
  if (active.length === 0 || active.every(p => p.headcount === 0)) return 'not_started';
  if (active.every(p => p.coverage_pct >= 80)) return 'compliant';
  return 'in_progress';
}

// ─── GET /api/literacy ── list systems with literacy status ───────────────────

export async function listSystemsLiteracy(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);

  const [systems, records] = await Promise.all([
    dynamo.getSystemsByCompany(auth.companyId),
    dynamo.listLiteracyRecords(auth.companyId),
  ]);

  // Build per-system profile summary from PROFILE# records
  const profilesBySys = new Map<string, Array<{ headcount: number; coverage_pct: number; merged_with: string | null }>>();

  for (const rec of records) {
    const rid = rec.record_id as string;
    if (!rid.startsWith('PROFILE#')) continue;
    const parts = rid.split('#');
    const systemId = parts[1];
    if (!systemId) continue;

    const headcount  = (rec.headcount as number) ?? 0;
    const mergedWith = (rec.merged_with as string | null) ?? null;
    const profileId  = rec.profile_id as string;
    const evidences  = records.filter(r => (r.record_id as string).startsWith(`EVIDENCE#${profileId}#`));
    const coverage   = calcCoverage(headcount, evidences as Record<string, unknown>[]);

    if (!profilesBySys.has(systemId)) profilesBySys.set(systemId, []);
    profilesBySys.get(systemId)!.push({ headcount, coverage_pct: coverage, merged_with: mergedWith });
  }

  const result = (systems as Array<Record<string, unknown>>).map(sys => {
    const systemId = sys.system_id as string;
    const profiles = profilesBySys.get(systemId) ?? [];
    const active   = profiles.filter(p => !p.merged_with);
    const status   = literacyStatus(profiles);

    return {
      system_id:        systemId,
      tool_name:        sys.tool_name,
      vendor:           sys.vendor,
      system_role:      (sys.system_role as SystemRole) ?? 'deployer',
      category:         sys.category,
      literacy_status:  status,
      profiles_total:   active.length,
      profiles_covered: active.filter(p => p.coverage_pct >= 80).length,
      evidence_count:   records.filter(r => (r.record_id as string).startsWith('EVIDENCE#') &&
        profiles.some(p => (r.record_id as string).includes((p as unknown as Record<string, unknown>).profile_id as string ?? ''))).length,
    };
  });

  return { statusCode: 200, body: JSON.stringify({ systems: result }) };
}

// ─── GET /api/literacy/{systemId}/profiles ── lazy init ──────────────────────

export async function getSystemProfiles(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth     = extractAuth(event);
  const systemId = event.pathParameters?.systemId;
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  const [records, system] = await Promise.all([
    dynamo.listLiteracyRecords(auth.companyId),
    dynamo.getSystem(auth.companyId, systemId),
  ]);

  if (!system) return { statusCode: 404, body: JSON.stringify({ error: 'system_not_found' }) };

  const sys  = system as Record<string, unknown>;
  const role = (sys.system_role as SystemRole) ?? 'deployer';
  const pts  = getProfilesForRole(role);
  const now  = new Date().toISOString();

  const existingProfiles = records.filter(r => (r.record_id as string).startsWith(`PROFILE#${systemId}#`));

  if (existingProfiles.length === 0) {
    await Promise.all(pts.map(pt => dynamo.putLiteracyRecord({
      company_id:   auth.companyId,
      record_id:    profileRecordId(systemId, pt),
      profile_id:   uuidv4(),
      system_id:    systemId,
      system_name:  sys.tool_name as string,
      system_role:  role,
      profile_type: pt,
      headcount:    0,
      merged_with:  null,
      created_at:   now,
      updated_at:   now,
    })));
    // Reload after lazy init
    const fresh = await dynamo.listLiteracyRecords(auth.companyId);
    records.splice(0, records.length, ...fresh);
  }

  const profiles = pts.map(pt => {
    const rec = records.find(r => (r.record_id as string) === profileRecordId(systemId, pt));
    if (!rec) return null;
    const evidences = records
      .filter(r => (r.record_id as string).startsWith(`EVIDENCE#${rec.profile_id as string}#`))
      .sort((a, b) => ((b.date as string) > (a.date as string) ? 1 : -1));
    const hc = (rec.headcount as number) ?? 0;
    return {
      ...rec,
      label:        PROFILE_LABELS[pt],
      description:  PROFILE_DESCRIPTIONS[pt],
      headcount:    hc,
      merged_with:  (rec.merged_with as string | null) ?? null,
      coverage_pct: calcCoverage(hc, evidences as Record<string, unknown>[]),
      evidences,
    };
  }).filter((p): p is NonNullable<typeof p> => Boolean(p));

  const allStatus = literacyStatus(profiles.map(p => ({
    headcount:    p.headcount,
    coverage_pct: p.coverage_pct,
    merged_with:  p.merged_with,
  })));

  return { statusCode: 200, body: JSON.stringify({ system: sys, profiles, literacy_status: allStatus }) };
}

// ─── PATCH /api/literacy/{systemId}/profiles/{profileId} ─────────────────────

export async function updateProfile(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth      = extractAuth(event);
  const systemId  = event.pathParameters?.systemId;
  const profileId = event.pathParameters?.profileId;
  if (!systemId || !profileId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId and profileId required' }) };

  const body    = parseBody(event.body, updateProfileSchema);
  const now     = new Date().toISOString();
  const records = await dynamo.listLiteracyRecords(auth.companyId);

  const profileRec = records.find(r =>
    (r.record_id as string).startsWith(`PROFILE#${systemId}#`) && r.profile_id === profileId
  );
  if (!profileRec) return { statusCode: 404, body: JSON.stringify({ error: 'profile_not_found' }) };

  const updates: Record<string, unknown> = { updated_at: now };
  if (body.headcount   !== undefined) updates.headcount   = body.headcount;
  if (body.merged_with !== undefined) updates.merged_with = body.merged_with;

  await dynamo.updateLiteracyRecord(auth.companyId, profileRec.record_id as string, updates);
  await logEvent(auth.companyId, 'literacy_profile_updated', { profile_id: profileId, system_id: systemId, ...updates }, auth.email);

  return { statusCode: 200, body: JSON.stringify({ message: 'Profilo aggiornato.' }) };
}

// ─── POST /api/literacy/{systemId}/profiles/{profileId}/evidence ──────────────

export async function addEvidence(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth      = extractAuth(event);
  const systemId  = event.pathParameters?.systemId;
  const profileId = event.pathParameters?.profileId;
  if (!systemId || !profileId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId and profileId required' }) };

  const body       = parseBody(event.body, evidenceSchema);
  const now        = new Date().toISOString();
  const evidenceId = uuidv4();

  const record: Record<string, unknown> = {
    company_id:   auth.companyId,
    record_id:    evidenceRecordId(profileId, evidenceId),
    evidence_id:  evidenceId,
    profile_id:   profileId,
    system_id:    systemId,
    evidence_type: body.evidence_type,
    title:        body.title,
    date:         body.date,
    people_count: body.people_count,
    notes:        body.notes ?? null,
    created_at:   now,
  };

  if (body.evidence_type === 'certification') {
    record.issuer = body.issuer ?? null;
    record.url    = body.url    ?? null;
  } else {
    record.topics      = body.topics;
    record.responsible = body.responsible ?? null;
  }

  await dynamo.putLiteracyRecord(record);
  await logEvent(auth.companyId, 'literacy_evidence_added', {
    evidence_id: evidenceId, profile_id: profileId, system_id: systemId,
    evidence_type: body.evidence_type, title: body.title, people_count: body.people_count,
  }, auth.email);

  return { statusCode: 201, body: JSON.stringify({ evidence_id: evidenceId }) };
}

// ─── DELETE /api/literacy/{systemId}/profiles/{profileId}/evidence/{evidenceId} ─

export async function deleteEvidence(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth       = extractAuth(event);
  const profileId  = event.pathParameters?.profileId;
  const evidenceId = event.pathParameters?.evidenceId;
  if (!profileId || !evidenceId) return { statusCode: 400, body: JSON.stringify({ error: 'profileId and evidenceId required' }) };

  await dynamo.deleteLiteracyRecord(auth.companyId, evidenceRecordId(profileId, evidenceId));
  return { statusCode: 200, body: JSON.stringify({ message: 'Evidenza eliminata.' }) };
}

// ─── GET /api/literacy/suggestions/{systemId}/{profileType} ──────────────────

export async function getSuggestions(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth        = extractAuth(event);
  const systemId    = event.pathParameters?.systemId;
  const profileType = event.pathParameters?.profileType;
  if (!systemId || !profileType) return { statusCode: 400, body: JSON.stringify({ error: 'systemId and profileType required' }) };

  const cached = await dynamo.getLiteracyRecord(auth.companyId, suggestKeyId(systemId, profileType));
  if (cached) return { statusCode: 200, body: JSON.stringify({ suggestions: cached.suggestions, cached: true }) };

  const [system, company] = await Promise.all([
    dynamo.getSystem(auth.companyId, systemId),
    dynamo.getCompany(auth.companyId),
  ]);
  if (!system || !company) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };

  const sys = system as Record<string, unknown>;
  const co  = company as Record<string, unknown>;

  const suggestions = await suggestCertifications({
    system_id:      systemId,
    system_role:    (sys.system_role as 'provider' | 'deployer') ?? 'deployer',
    profile_type:   profileType,
    category:       (sys.category as string) ?? '',
    tool_name:      (sys.tool_name as string) ?? '',
    tool_purpose:   (sys.purpose as string) ?? '',
    company_name:   (co.name as string) ?? '',
    company_sector: (co.sector as string) ?? '',
  });

  await dynamo.putLiteracyRecord({
    company_id:   auth.companyId,
    record_id:    suggestKeyId(systemId, profileType),
    system_id:    systemId,
    profile_type: profileType,
    suggestions,
    created_at:   new Date().toISOString(),
  });

  return { statusCode: 200, body: JSON.stringify({ suggestions }) };
}

// ─── GET /api/literacy/{systemId}/report ─────────────────────────────────────

export async function generateArt4Report(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth     = extractAuth(event);
  const systemId = event.pathParameters?.systemId;
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  const [records, system, company] = await Promise.all([
    dynamo.listLiteracyRecords(auth.companyId),
    dynamo.getSystem(auth.companyId, systemId),
    dynamo.getCompany(auth.companyId),
  ]);
  if (!system || !company) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };

  const sys  = system as Record<string, unknown>;
  const co   = company as Record<string, unknown>;
  const role = (sys.system_role as SystemRole) ?? 'deployer';
  const pts  = getProfilesForRole(role);

  const profiles = pts.map(pt => {
    const rec = records.find(r => (r.record_id as string) === profileRecordId(systemId, pt));
    if (!rec) return null;
    const evidences  = records.filter(r => (r.record_id as string).startsWith(`EVIDENCE#${rec.profile_id as string}#`));
    const headcount  = (rec.headcount as number) ?? 0;
    return {
      profile_type: pt,
      label:        PROFILE_LABELS[pt],
      headcount,
      merged_with:  (rec.merged_with as string | null) ?? null,
      coverage_pct: calcCoverage(headcount, evidences as Record<string, unknown>[]),
      evidences,
    };
  }).filter(Boolean);

  const payload = {
    _literacyReportRequest: {
      company_name: (co.name as string) ?? 'Azienda',
      tool_name:    (sys.tool_name as string) ?? 'Sistema AI',
      vendor:       (sys.vendor as string) ?? '',
      category:     (sys.category as string) ?? '',
      system_role:  role,
      profiles,
      generated_at: new Date().toISOString(),
    },
  };

  const response = await lambdaClient.send(new InvokeCommand({
    FunctionName:   process.env.LAMBDA_PDF_ARN!,
    InvocationType: 'RequestResponse',
    Payload:        Buffer.from(JSON.stringify(payload)),
  }));

  const result = JSON.parse(Buffer.from(response.Payload!).toString()) as { pdfBase64?: string };
  if (!result.pdfBase64) return { statusCode: 500, body: JSON.stringify({ error: 'pdf_generation_failed' }) };

  await logEvent(auth.companyId, 'literacy_report_generated', { system_id: systemId }, auth.email);

  const toolSlug = ((sys.tool_name as string) ?? systemId).replace(/\s+/g, '-').toLowerCase().slice(0, 30);
  const filename = `actify-art4-${toolSlug}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return { statusCode: 200, body: JSON.stringify({ pdfBase64: result.pdfBase64, filename }) };
}
