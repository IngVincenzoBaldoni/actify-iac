import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { extractAuth } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import { logEvent } from '../services/auditService';
import { runComplianceCheck } from '../services/complianceEngine';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import type { AISystem } from '../types/aiSystem';
import type { Company } from '../types/company';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

// ─── Profile hash ─────────────────────────────────────────────────────────────
// Only fields that drive which articles apply and how the LLM analyzes them.
// tool_name/vendor/timestamps are intentionally excluded.
function computeProfileHash(system: Record<string, unknown>): string {
  const sig = {
    category:                  system.category,
    role:                      system.role,
    purpose:                   system.purpose,
    output_type:               system.output_type ?? null,
    target_users:              [...((system.target_users as string[]) ?? [])].sort(),
    vulnerable_groups:         [...((system.vulnerable_groups as string[]) ?? [])].sort(),
    customizations:            [...((system.customizations as string[]) ?? [])].sort(),
    makes_automated_decisions: system.makes_automated_decisions,
    human_oversight_level:     system.human_oversight_level,
    decision_domains:          [...((system.decision_domains as string[]) ?? [])].sort(),
    affects_vulnerable_groups: system.affects_vulnerable_groups,
    data_types:                [...((system.data_types as string[]) ?? [])].sort(),
    is_safety_component:       system.is_safety_component,
    annex_iii_domains:         [...((system.annex_iii_domains as string[]) ?? [])].sort(),
  };
  return createHash('sha256').update(JSON.stringify(sig)).digest('hex').slice(0, 16);
}

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION ?? 'eu-central-1' });

function makeCheckId(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  return `${ts}-${uuidv4()}`;
}

// ─── Trigger (async, responds 202 immediately) ────────────────────────────────
export async function triggerCheck(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const systemId = event.pathParameters?.systemId;
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  const system = await dynamo.getSystem(auth.companyId, systemId);
  if (!system) return { statusCode: 404, body: JSON.stringify({ error: 'system_not_found' }) };

  const profileHash = computeProfileHash(system);

  // ── Cache check: same profile → return existing completed result ──────────
  const latest = await dynamo.getLatestComplianceCheck(auth.companyId, systemId);
  if (latest?.status === 'completed' && latest.profile_hash === profileHash) {
    return {
      statusCode: 202,
      body: JSON.stringify({
        check_id:  latest.check_id,
        status:    'running',
        cache_hit: true,
        message:   'Profilo invariato — risultato precedente disponibile.',
        poll_url:  `/api/systems/${systemId}/compliance-checks/latest`,
      }),
    };
  }

  const checkId = makeCheckId();
  const pk = `${auth.companyId}#${systemId}`;
  const now = new Date().toISOString();

  await dynamo.putComplianceCheck({
    pk, check_id: checkId,
    company_id:   auth.companyId,
    system_id:    systemId,
    triggered_by: auth.userId,
    status:       'running',
    created_at:   now,
    profile_hash: profileHash,
  });

  await dynamo.updateSystem(auth.companyId, systemId, {
    compliance_status: 'checking',
    last_check_id:     checkId,
    updated_at:        now,
  });

  const asyncPayload = {
    _asyncComplianceCheck: true,
    companyId:    auth.companyId,
    systemId,
    checkId,
    pk,
    profile_hash: profileHash,
  };

  await lambdaClient.send(new InvokeCommand({
    FunctionName:   process.env.LAMBDA_SELF_ARN!,
    InvocationType: 'Event',
    Payload:        Buffer.from(JSON.stringify(asyncPayload)),
  }));

  await logEvent(auth.companyId, 'compliance_check_started', {
    system_id:   systemId,
    system_name: (system as Record<string, unknown>).tool_name,
    check_id:    checkId,
  }, auth.email);

  return {
    statusCode: 202,
    body: JSON.stringify({
      check_id:  checkId,
      status:    'running',
      message:   'Compliance check avviato. Risultato disponibile in ~30 secondi.',
      poll_url:  `/api/systems/${systemId}/compliance-checks/latest`,
    }),
  };
}

// ─── Async execution (called from self-invoke) ────────────────────────────────
export async function executeCheckAsync(payload: {
  companyId:    string;
  systemId:     string;
  checkId:      string;
  pk:           string;
  profile_hash?: string;
}) {
  const { companyId, systemId, checkId, pk, profile_hash } = payload;

  try {
    const [systemRaw, companyRaw] = await Promise.all([
      dynamo.getSystem(companyId, systemId),
      dynamo.getCompany(companyId),
    ]);

    if (!systemRaw || !companyRaw) throw new Error('System or company not found');

    const typedSystem = systemRaw as unknown as AISystem;
    const result = await runComplianceCheck(
      typedSystem,
      companyRaw as unknown as Company,
      typedSystem.compliance_checklist,
    );

    const completedAt = new Date().toISOString();
    const finalStatus = result.compliance_gaps.some(g => g.status !== 'compliant')
      ? 'gap_found' : 'compliant';

    // Update compliance check record (persist profile_hash for future cache lookups)
    await dynamo.updateComplianceCheck(pk, checkId, {
      status:       'completed',
      result,
      completed_at: completedAt,
      ...(profile_hash ? { profile_hash } : {}),
    });

    // Update system status + cache exposure for inventory dashboard
    await dynamo.updateSystem(companyId, systemId, {
      compliance_status:       finalStatus,
      last_check_id:           checkId,
      last_check_at:           completedAt,
      last_exposure_min:       result.total_exposure_estimate?.min ?? 0,
      last_exposure_max:       result.total_exposure_estimate?.max ?? 0,
      last_article_sanctions:  JSON.stringify(result.article_sanctions ?? {}),
      updated_at:              completedAt,
    });

    const existingChecklist = (typedSystem.compliance_checklist ?? {}) as Record<string, { status?: string } | string>;
    const articlesInGap: Record<string, { min: number; max: number }> = {};
    for (const [art, val] of Object.entries(result.article_sanctions ?? {} as Record<string, { min: number; max: number }>)) {
      const entry = existingChecklist[art];
      const st = typeof entry === 'string' ? entry : entry?.status;
      if (st !== 'present') articlesInGap[art] = val as { min: number; max: number };
    }
    await dynamo.appendSanctionSnapshot(companyId, systemId, {
      at: completedAt,
      min: result.total_exposure_estimate?.min ?? 0,
      max: result.total_exposure_estimate?.max ?? 0,
      source: 'check',
      articles_in_gap: articlesInGap,
    });

    await logEvent(companyId, 'compliance_check_completed', {
      system_id:    systemId,
      system_name:  (systemRaw as Record<string, unknown>).tool_name,
      check_id:     checkId,
      risk_level:   result.risk_classification as unknown as string,
      status:       finalStatus,
      gaps_count:   result.compliance_gaps.filter((g: { status: string }) => g.status !== 'compliant').length,
      exposure_min: result.total_exposure_estimate?.min ?? 0,
      exposure_max: result.total_exposure_estimate?.max ?? 0,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[COMPLIANCE ERROR]', JSON.stringify({
      companyId, systemId, checkId,
      error: errorMsg,
      stack: err instanceof Error ? err.stack : undefined,
    }));
    await dynamo.updateComplianceCheck(pk, checkId, {
      status: 'failed',
      error:  errorMsg,
      completed_at: new Date().toISOString(),
    });
    await dynamo.updateSystem(companyId, systemId, {
      compliance_status: 'unchecked',
      updated_at:        new Date().toISOString(),
    });
    await logEvent(companyId, 'compliance_check_failed', {
      system_id: systemId,
      check_id:  checkId,
      error:     errorMsg,
    });
  }
}

// ─── Get latest check ─────────────────────────────────────────────────────────
export async function getLatestCheck(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const systemId = event.pathParameters?.systemId;
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  const check = await dynamo.getLatestComplianceCheck(auth.companyId, systemId);
  if (!check) return { statusCode: 404, body: JSON.stringify({ error: 'no_checks_found' }) };
  return { statusCode: 200, body: JSON.stringify(check) };
}

// ─── Get check history ────────────────────────────────────────────────────────
export async function listChecks(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const systemId = event.pathParameters?.systemId;
  if (!systemId) return { statusCode: 400, body: JSON.stringify({ error: 'systemId required' }) };

  const checks = await dynamo.getComplianceChecks(auth.companyId, systemId, 20);
  return { statusCode: 200, body: JSON.stringify(checks) };
}
