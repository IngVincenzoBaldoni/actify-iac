import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';

import { register, invite } from './routes/auth';
import { getCompany, updateCompany, setupWizard, getUsers, deleteUser } from './routes/company';
import { listSystems, createSystem, getSystem, updateSystem, deleteSystem } from './routes/systems';
import {
  triggerCheck, getLatestCheck, listChecks, executeCheckAsync,
} from './routes/complianceCheck';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

function ok(body: unknown, statusCode = 200): APIGatewayProxyResultV2 {
  return { statusCode, headers: CORS, body: typeof body === 'string' ? body : JSON.stringify(body) };
}

function err(statusCode: number, message: string): APIGatewayProxyResultV2 {
  return { statusCode, headers: CORS, body: JSON.stringify({ error: message }) };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export const handler = async (
  event: APIGatewayProxyEventV2 | APIGatewayProxyEventV2WithJWTAuthorizer | Record<string, unknown>
): Promise<APIGatewayProxyResultV2 | void> => {

  // ── Async self-invoke for compliance check ────────────────────────────────
  if ('_asyncComplianceCheck' in event && event._asyncComplianceCheck) {
    await executeCheckAsync(event as Parameters<typeof executeCheckAsync>[0]);
    return;
  }

  const ev = event as APIGatewayProxyEventV2WithJWTAuthorizer;
  const method = ev.requestContext?.http?.method ?? '';
  const rawPath = ev.requestContext?.http?.path ?? ev.rawPath ?? '';

  // Normalize path — strip trailing slash
  const path = rawPath.replace(/\/$/, '');

  try {
    // ── CORS preflight ─────────────────────────────────────────────────────
    if (method === 'OPTIONS') {
      return { statusCode: 200, headers: CORS, body: '' };
    }

    // ── Public routes ──────────────────────────────────────────────────────
    if (method === 'POST' && path === '/api/auth/register') {
      const r = await register(ev as unknown as APIGatewayProxyEventV2);
      return { ...r, headers: CORS };
    }

    // ── Auth routes (Cognito JWT required, extracted from event context) ───
    if (method === 'POST' && path === '/api/auth/invite')
      return { ...await invite(ev), headers: CORS };

    if (method === 'GET' && path === '/api/company')
      return { ...await getCompany(ev), headers: CORS };
    if (method === 'PUT' && path === '/api/company')
      return { ...await updateCompany(ev), headers: CORS };
    if (method === 'PUT' && path === '/api/company/setup')
      return { ...await setupWizard(ev), headers: CORS };
    if (method === 'GET' && path === '/api/company/users')
      return { ...await getUsers(ev), headers: CORS };
    if (method === 'DELETE' && /^\/api\/company\/users\/[^/]+$/.test(path))
      return { ...await deleteUser(ev), headers: CORS };

    if (method === 'GET' && path === '/api/systems')
      return { ...await listSystems(ev), headers: CORS };
    if (method === 'POST' && path === '/api/systems')
      return { ...await createSystem(ev), headers: CORS };

    // /api/systems/{systemId}
    const singleSystem = path.match(/^\/api\/systems\/([^/]+)$/);
    if (singleSystem) {
      if (method === 'GET')    return { ...await getSystem(ev), headers: CORS };
      if (method === 'PUT')    return { ...await updateSystem(ev), headers: CORS };
      if (method === 'DELETE') return { ...await deleteSystem(ev), headers: CORS };
    }

    // /api/systems/{systemId}/compliance-check(s)
    const checkPath = path.match(/^\/api\/systems\/([^/]+)\/(compliance-check|compliance-checks)(\/latest)?$/);
    if (checkPath) {
      const [, , resource, sub] = checkPath;
      if (method === 'POST' && resource === 'compliance-check')
        return { ...await triggerCheck(ev), headers: CORS };
      if (method === 'GET' && resource === 'compliance-checks' && sub === '/latest')
        return { ...await getLatestCheck(ev), headers: CORS };
      if (method === 'GET' && resource === 'compliance-checks' && !sub)
        return { ...await listChecks(ev), headers: CORS };
    }

    return err(404, `Route not found: ${method} ${path}`);

  } catch (e: unknown) {
    const error = e as { message?: string; statusCode?: number };
    const statusCode = error.statusCode ?? 500;
    const message = error.message ?? 'Internal server error';
    if (statusCode >= 500) console.error('[ERROR]', e);
    return err(statusCode, message);
  }
};
