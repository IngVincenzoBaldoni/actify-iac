import { v4 as uuidv4 } from 'uuid';
import { extractAuth } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import { runComplianceCheck } from '../services/complianceEngine';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import type { AISystem } from '../types/aiSystem';
import type { Company } from '../types/company';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

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

  const checkId = makeCheckId();
  const pk = `${auth.companyId}#${systemId}`;
  const now = new Date().toISOString();

  // Save running check record
  await dynamo.putComplianceCheck({
    pk, check_id: checkId,
    company_id:   auth.companyId,
    system_id:    systemId,
    triggered_by: auth.userId,
    status:       'running',
    created_at:   now,
  });

  // Mark system as checking
  await dynamo.updateSystem(auth.companyId, systemId, {
    compliance_status: 'checking',
    last_check_id:     checkId,
    updated_at:        now,
  });

  // Self-invoke Lambda asynchronously (Event invocation type = fire & forget)
  const asyncPayload = {
    _asyncComplianceCheck: true,
    companyId:  auth.companyId,
    systemId,
    checkId,
    pk,
  };

  await lambdaClient.send(new InvokeCommand({
    FunctionName:   process.env.LAMBDA_SELF_ARN!,
    InvocationType: 'Event',
    Payload:        Buffer.from(JSON.stringify(asyncPayload)),
  }));

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
  companyId: string;
  systemId:  string;
  checkId:   string;
  pk:        string;
}) {
  const { companyId, systemId, checkId, pk } = payload;

  try {
    const [systemRaw, companyRaw] = await Promise.all([
      dynamo.getSystem(companyId, systemId),
      dynamo.getCompany(companyId),
    ]);

    if (!systemRaw || !companyRaw) throw new Error('System or company not found');

    const result = await runComplianceCheck(systemRaw as unknown as AISystem, companyRaw as unknown as Company);

    const completedAt = new Date().toISOString();
    const finalStatus = result.compliance_gaps.some(g => g.status !== 'compliant')
      ? 'gap_found' : 'compliant';

    // Update compliance check record
    await dynamo.updateComplianceCheck(pk, checkId, {
      status:       'completed',
      result,
      completed_at: completedAt,
    });

    // Update system status + cache exposure for inventory dashboard
    await dynamo.updateSystem(companyId, systemId, {
      compliance_status: finalStatus,
      last_check_id:     checkId,
      last_check_at:     completedAt,
      last_exposure_min: result.total_exposure_estimate?.min ?? 0,
      last_exposure_max: result.total_exposure_estimate?.max ?? 0,
      updated_at:        completedAt,
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
