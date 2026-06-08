import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { parseBody } from '../middleware/validator';
import { extractAuth } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import { logEvent } from '../services/auditService';
import { suggestCertifications } from '../services/literacySuggestService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

// ─── Schema ───────────────────────────────────────────────────────────────────

const addDeptSchema = z.object({
  name:       z.string().min(1).max(200),
  headcount:  z.number().int().min(1).max(1000000),
  system_ids: z.array(z.string().uuid()).min(1).max(50),
});

const addCertSchema = z.object({
  certification_name: z.string().min(1).max(300),
  issued_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  url:                z.string().url().max(2000).optional(),
  people_count:       z.number().int().min(1).max(1000000).optional(),
  notes:              z.string().max(500).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deptRecordId(deptId: string)             { return `DEPT#${deptId}`; }
function certRecordId(deptId: string, certId: string) { return `CERT#${deptId}#${certId}`; }

function isDeptRecord(item: Record<string, unknown>) {
  return (item.record_id as string).startsWith('DEPT#');
}
function isCertRecord(deptId: string, item: Record<string, unknown>) {
  return (item.record_id as string).startsWith(`CERT#${deptId}#`);
}

// ─── GET /api/literacy ── list all departments (from AI systems + manually added) ──

export async function listDepartments(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);

  // Load manual dept records + all AI systems (to extract dept data)
  const [records, systems] = await Promise.all([
    dynamo.listLiteracyRecords(auth.companyId),
    dynamo.getSystemsByCompany(auth.companyId),
  ]);

  // Manual departments stored in the literacy table
  const manualDepts = records.filter(isDeptRecord);

  // Auto-derive departments from AI systems that have a `department` field
  const systemDeptsMap = new Map<string, {
    name: string; headcount: number; systems: { system_id: string; tool_name: string; purpose: string }[];
  }>();
  for (const sys of systems as Array<Record<string, unknown>>) {
    if (!sys.department) continue;
    const deptName = sys.department as string;
    if (!systemDeptsMap.has(deptName)) {
      systemDeptsMap.set(deptName, { name: deptName, headcount: (sys.headcount as number) ?? 0, systems: [] });
    }
    const entry = systemDeptsMap.get(deptName)!;
    if ((sys.headcount as number) > entry.headcount) entry.headcount = sys.headcount as number;
    entry.systems.push({
      system_id: sys.system_id as string,
      tool_name: sys.tool_name as string,
      purpose:   sys.purpose as string,
    });
  }

  // Build unified dept list, preferring manual records (they have dept_id, cert counts, etc.)
  const certsByDept = new Map<string, number>();
  for (const r of records) {
    if (!(r.record_id as string).startsWith('CERT#')) continue;
    const deptId = (r.record_id as string).split('#')[1];
    certsByDept.set(deptId, (certsByDept.get(deptId) ?? 0) + 1);
  }

  const depts: Record<string, unknown>[] = manualDepts.map(d => ({
    dept_id:     d.dept_id,
    name:        d.name,
    headcount:   d.headcount,
    system_ids:  d.system_ids,
    source:      'manual',
    cert_count:  certsByDept.get(d.dept_id as string) ?? 0,
    created_at:  d.created_at,
  }));

  // Add auto-derived from systems, skip if there's already a manual dept with same name
  const existingNames = new Set(depts.map(d => (d.name as string).toLowerCase()));
  for (const [, sd] of systemDeptsMap) {
    if (existingNames.has(sd.name.toLowerCase())) continue;
    depts.push({
      dept_id:    `sys-${sd.name.toLowerCase().replace(/\s+/g, '-')}`,
      name:       sd.name,
      headcount:  sd.headcount,
      system_ids: sd.systems.map(s => s.system_id),
      systems:    sd.systems,
      source:     'inventory',
      cert_count: 0,
    });
  }

  return { statusCode: 200, body: JSON.stringify({ departments: depts, systems }) };
}

// ─── POST /api/literacy/departments ── create manual department ───────────────

export async function createDepartment(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  const body = parseBody(event.body, addDeptSchema);
  const now  = new Date().toISOString();
  const deptId = uuidv4();

  await dynamo.putLiteracyRecord({
    company_id:  auth.companyId,
    record_id:   deptRecordId(deptId),
    dept_id:     deptId,
    name:        body.name,
    headcount:   body.headcount,
    system_ids:  body.system_ids,
    created_at:  now,
  });

  await logEvent(auth.companyId, 'literacy_dept_created', { dept_id: deptId, name: body.name, headcount: body.headcount }, auth.email);
  return { statusCode: 201, body: JSON.stringify({ dept_id: deptId }) };
}

// ─── DELETE /api/literacy/departments/:deptId ─────────────────────────────────

export async function deleteDepartment(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth   = extractAuth(event);
  const deptId = event.pathParameters?.deptId;
  if (!deptId) return { statusCode: 400, body: JSON.stringify({ error: 'deptId required' }) };

  await dynamo.deleteLiteracyRecord(auth.companyId, deptRecordId(deptId));
  await logEvent(auth.companyId, 'literacy_dept_deleted', { dept_id: deptId }, auth.email);
  return { statusCode: 200, body: JSON.stringify({ message: 'Dipartimento eliminato.' }) };
}

// ─── POST /api/literacy/departments/:deptId/suggest ── Bedrock cert suggestions

export async function suggestCerts(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth   = extractAuth(event);
  const deptId = event.pathParameters?.deptId;
  if (!deptId) return { statusCode: 400, body: JSON.stringify({ error: 'deptId required' }) };

  // Load dept record (check both manual and auto-derived)
  const [records, systems, companyRaw] = await Promise.all([
    dynamo.listLiteracyRecords(auth.companyId),
    dynamo.getSystemsByCompany(auth.companyId),
    dynamo.getCompany(auth.companyId),
  ]);

  const company = companyRaw as Record<string, unknown> | null;
  if (!company) return { statusCode: 404, body: JSON.stringify({ error: 'company_not_found' }) };

  // Find dept
  let deptName    = deptId;
  let headcount   = 1;
  let toolName    = '';
  let toolPurpose = '';

  const manualRecord = records.find(r => r.dept_id === deptId);
  if (manualRecord) {
    deptName  = manualRecord.name as string;
    headcount = manualRecord.headcount as number;
    const sysIds = manualRecord.system_ids as string[];
    const linkedSys = (systems as Array<Record<string, unknown>>).find(s => sysIds.includes(s.system_id as string));
    if (linkedSys) { toolName = linkedSys.tool_name as string; toolPurpose = linkedSys.purpose as string; }
  } else {
    // auto-derived: deptId = `sys-<name>`
    const linkedSys = (systems as Array<Record<string, unknown>>).find(
      s => s.department && `sys-${(s.department as string).toLowerCase().replace(/\s+/g, '-')}` === deptId
    );
    if (linkedSys) {
      deptName    = linkedSys.department as string;
      headcount   = (linkedSys.headcount as number) ?? 1;
      toolName    = linkedSys.tool_name as string;
      toolPurpose = linkedSys.purpose as string;
    }
  }

  const suggestions = await suggestCertifications({
    dept_name:      deptName,
    headcount,
    tool_name:      toolName || 'Strumento AI',
    tool_purpose:   toolPurpose || 'Uso aziendale',
    company_name:   company.name as string ?? '',
    company_sector: company.sector as string ?? '',
  });

  return { statusCode: 200, body: JSON.stringify({ suggestions }) };
}

// ─── POST /api/literacy/departments/:deptId/certifications ── record a cert ───

export async function addCertification(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth   = extractAuth(event);
  const deptId = event.pathParameters?.deptId;
  if (!deptId) return { statusCode: 400, body: JSON.stringify({ error: 'deptId required' }) };

  const body   = parseBody(event.body, addCertSchema);
  const now    = new Date().toISOString();
  const certId = uuidv4();

  await dynamo.putLiteracyRecord({
    company_id:         auth.companyId,
    record_id:          certRecordId(deptId, certId),
    cert_id:            certId,
    dept_id:            deptId,
    certification_name: body.certification_name,
    issued_date:        body.issued_date,
    url:                body.url ?? null,
    people_count:       body.people_count ?? null,
    notes:              body.notes ?? null,
    created_at:         now,
  });

  await logEvent(auth.companyId, 'literacy_cert_added', {
    cert_id: certId, dept_id: deptId,
    certification_name: body.certification_name,
    issued_date: body.issued_date,
    people_count: body.people_count,
  }, auth.email);
  return { statusCode: 201, body: JSON.stringify({ cert_id: certId }) };
}

// ─── GET /api/literacy/departments/:deptId/certifications ── list certs ───────

export async function listCertifications(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth   = extractAuth(event);
  const deptId = event.pathParameters?.deptId;
  if (!deptId) return { statusCode: 400, body: JSON.stringify({ error: 'deptId required' }) };

  const records = await dynamo.listLiteracyRecords(auth.companyId);
  const certs   = records.filter(r => isCertRecord(deptId, r));

  return { statusCode: 200, body: JSON.stringify({ certifications: certs }) };
}

// ─── DELETE /api/literacy/certifications/:certId ── delete a cert ─────────────

export async function deleteCertification(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth   = extractAuth(event);
  const deptId = event.pathParameters?.deptId;
  const certId = event.pathParameters?.certId;
  if (!deptId || !certId) return { statusCode: 400, body: JSON.stringify({ error: 'deptId and certId required' }) };

  await dynamo.deleteLiteracyRecord(auth.companyId, certRecordId(deptId, certId));
  return { statusCode: 200, body: JSON.stringify({ message: 'Certificazione eliminata.' }) };
}
