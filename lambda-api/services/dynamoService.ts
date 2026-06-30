import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient, GetCommand, PutCommand,
  UpdateCommand, DeleteCommand, QueryCommand, QueryCommandInput,
  BatchGetCommand, ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'eu-central-1' }),
  { marshallOptions: { removeUndefinedValues: true } },
);

const TABLES = {
  companies:      process.env.DYNAMODB_COMPANIES_TABLE!,
  users:          process.env.DYNAMODB_USERS_TABLE!,
  systems:        process.env.DYNAMODB_SYSTEMS_TABLE!,
  checks:         process.env.DYNAMODB_CHECKS_TABLE!,
  documents:      process.env.DYNAMODB_DOCUMENTS_TABLE!,
  literacy:       process.env.DYNAMODB_LITERACY_TABLE!,
  partners:       process.env.DYNAMODB_PARTNERS_TABLE!,
  partnerPmi:     process.env.DYNAMODB_PARTNER_PMI_TABLE!,
  audit:          process.env.DYNAMODB_AUDIT_TABLE!,
  docGenerations: process.env.DYNAMODB_DOC_GENERATIONS_TABLE!,
};

// Strip undefined values — DocumentClient removes them from PutCommand Items but NOT from
// UpdateCommand ExpressionAttributeValues, causing "attribute value :vN is not defined" errors.
function defined(updates: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
}

// ─── Company ──────────────────────────────────────────────────────────────────
export async function getCompany(companyId: string) {
  const r = await client.send(new GetCommand({ TableName: TABLES.companies, Key: { company_id: companyId } }));
  return r.Item ?? null;
}

export async function putCompany(item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: TABLES.companies, Item: item }));
}

export async function updateCompany(companyId: string, updates: Record<string, unknown>) {
  const entries = Object.entries(defined(updates));
  const expr = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));
  await client.send(new UpdateCommand({
    TableName: TABLES.companies,
    Key: { company_id: companyId },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

// ─── Company Users ────────────────────────────────────────────────────────────
export async function getCompanyUsers(companyId: string) {
  const r = await client.send(new QueryCommand({
    TableName: TABLES.users,
    KeyConditionExpression: 'company_id = :cid',
    ExpressionAttributeValues: { ':cid': companyId },
  }));
  return r.Items ?? [];
}

export async function getUserByUserId(userId: string) {
  const r = await client.send(new QueryCommand({
    TableName: TABLES.users,
    IndexName: 'user-lookup',
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }));
  return r.Items?.[0] ?? null;
}

export async function getCompanyIdByEmail(email: string): Promise<string | null> {
  const r = await client.send(new ScanCommand({
    TableName: TABLES.users,
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
    ProjectionExpression: 'company_id',
    Limit: 1,
  }));
  const item = r.Items?.[0];
  return item ? (item.company_id as string) : null;
}

export async function getCompanyUser(companyId: string, userId: string) {
  const r = await client.send(new GetCommand({
    TableName: TABLES.users,
    Key: { company_id: companyId, user_id: userId },
  }));
  return r.Item ?? null;
}

export async function putCompanyUser(item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: TABLES.users, Item: item }));
}

export async function deleteCompanyUser(companyId: string, userId: string) {
  await client.send(new DeleteCommand({
    TableName: TABLES.users,
    Key: { company_id: companyId, user_id: userId },
  }));
}

// ─── AI Systems ───────────────────────────────────────────────────────────────
export async function getSystemsByCompany(companyId: string) {
  const r = await client.send(new QueryCommand({
    TableName: TABLES.systems,
    KeyConditionExpression: 'company_id = :cid',
    ExpressionAttributeValues: { ':cid': companyId },
  }));
  return r.Items ?? [];
}

export async function getSystem(companyId: string, systemId: string) {
  const r = await client.send(new GetCommand({
    TableName: TABLES.systems,
    Key: { company_id: companyId, system_id: systemId },
  }));
  return r.Item ?? null;
}

export async function putSystem(item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: TABLES.systems, Item: item }));
}

export async function updateSystem(companyId: string, systemId: string, updates: Record<string, unknown>) {
  const entries = Object.entries(defined(updates));
  const expr = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));
  await client.send(new UpdateCommand({
    TableName: TABLES.systems,
    Key: { company_id: companyId, system_id: systemId },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export async function deleteSystem(companyId: string, systemId: string) {
  await client.send(new DeleteCommand({
    TableName: TABLES.systems,
    Key: { company_id: companyId, system_id: systemId },
  }));
}

export async function appendSanctionSnapshot(
  companyId: string,
  systemId: string,
  snapshot: { at: string; min: number; max: number; source: string; articles_in_gap?: Record<string, { min: number; max: number }> },
) {
  await client.send(new UpdateCommand({
    TableName: TABLES.systems,
    Key: { company_id: companyId, system_id: systemId },
    UpdateExpression: 'SET sanction_timeline = list_append(if_not_exists(sanction_timeline, :empty), :snap)',
    ExpressionAttributeValues: { ':empty': [], ':snap': [snapshot] },
  }));
}

// ─── Compliance Checks ────────────────────────────────────────────────────────
export async function putComplianceCheck(item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: TABLES.checks, Item: item }));
}

export async function getComplianceChecks(companyId: string, systemId: string, limit = 10) {
  const params: QueryCommandInput = {
    TableName: TABLES.checks,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': `${companyId}#${systemId}` },
    ScanIndexForward: false,
    Limit: limit,
  };
  const r = await client.send(new QueryCommand(params));
  return r.Items ?? [];
}

export async function getLatestComplianceCheck(companyId: string, systemId: string) {
  const items = await getComplianceChecks(companyId, systemId, 1);
  return items[0] ?? null;
}

export async function deleteComplianceChecksForSystem(companyId: string, systemId: string) {
  const pk = `${companyId}#${systemId}`;
  let lastKey: Record<string, unknown> | undefined;
  do {
    const r = await client.send(new QueryCommand({
      TableName: TABLES.checks,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': pk },
      ProjectionExpression: 'pk, check_id',
      ExclusiveStartKey: lastKey,
    }));
    for (const item of r.Items ?? []) {
      await client.send(new DeleteCommand({
        TableName: TABLES.checks,
        Key: { pk: item.pk, check_id: item.check_id },
      }));
    }
    lastKey = r.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function putDocument(item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: TABLES.documents, Item: item }));
}

export async function getDocument(documentId: string) {
  const r = await client.send(new GetCommand({
    TableName: TABLES.documents,
    Key: { document_id: documentId },
  }));
  return r.Item ?? null;
}

export async function updateDocument(documentId: string, updates: Record<string, unknown>) {
  const entries = Object.entries(updates);
  const expr = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));
  await client.send(new UpdateCommand({
    TableName: TABLES.documents,
    Key: { document_id: documentId },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export async function deleteDocument(documentId: string) {
  await client.send(new DeleteCommand({
    TableName: TABLES.documents,
    Key: { document_id: documentId },
  }));
}

export async function listDocumentsBySystem(systemId: string, limit = 50) {
  const r = await client.send(new QueryCommand({
    TableName: TABLES.documents,
    IndexName: 'system-index',
    KeyConditionExpression: 'system_id = :sid',
    ExpressionAttributeValues: { ':sid': systemId },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return r.Items ?? [];
}

export async function listDocumentsByCompany(companyId: string, limit = 100) {
  const r = await client.send(new QueryCommand({
    TableName: TABLES.documents,
    IndexName: 'company-index',
    KeyConditionExpression: 'company_id = :cid',
    ExpressionAttributeValues: { ':cid': companyId },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return r.Items ?? [];
}

// ─── AI Literacy ──────────────────────────────────────────────────────────────

export async function listLiteracyRecords(companyId: string) {
  const r = await client.send(new QueryCommand({
    TableName: TABLES.literacy,
    KeyConditionExpression: 'company_id = :cid',
    ExpressionAttributeValues: { ':cid': companyId },
  }));
  return r.Items ?? [];
}

export async function putLiteracyRecord(item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: TABLES.literacy, Item: item }));
}

export async function deleteLiteracyRecord(companyId: string, recordId: string) {
  await client.send(new DeleteCommand({
    TableName: TABLES.literacy,
    Key: { company_id: companyId, record_id: recordId },
  }));
}

export async function getLiteracyRecord(companyId: string, recordId: string) {
  const r = await client.send(new GetCommand({
    TableName: TABLES.literacy,
    Key: { company_id: companyId, record_id: recordId },
  }));
  return r.Item ?? null;
}

export async function updateLiteracyRecord(companyId: string, recordId: string, updates: Record<string, unknown>) {
  const entries = Object.entries(defined(updates));
  if (entries.length === 0) return;
  const expr   = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const names  = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));
  await client.send(new UpdateCommand({
    TableName:                 TABLES.literacy,
    Key:                       { company_id: companyId, record_id: recordId },
    UpdateExpression:          expr,
    ExpressionAttributeNames:  names,
    ExpressionAttributeValues: values,
  }));
}

// ─── Partners ─────────────────────────────────────────────────────────────────

export async function getPartner(partnerId: string) {
  const r = await client.send(new GetCommand({ TableName: TABLES.partners, Key: { partner_id: partnerId } }));
  return r.Item ?? null;
}

export async function putPartner(item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: TABLES.partners, Item: item }));
}

export async function updatePartner(partnerId: string, updates: Record<string, unknown>) {
  const entries = Object.entries(defined(updates));
  const expr = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));
  await client.send(new UpdateCommand({
    TableName: TABLES.partners,
    Key: { partner_id: partnerId },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

// ─── Partner PMI ──────────────────────────────────────────────────────────────

export async function listPartnerPMI(partnerId: string) {
  const r = await client.send(new QueryCommand({
    TableName: TABLES.partnerPmi,
    KeyConditionExpression: 'partner_id = :pid',
    ExpressionAttributeValues: { ':pid': partnerId },
  }));
  return r.Items ?? [];
}

export async function getPartnerPMI(partnerId: string, pmiId: string) {
  const r = await client.send(new GetCommand({
    TableName: TABLES.partnerPmi,
    Key: { partner_id: partnerId, pmi_id: pmiId },
  }));
  return r.Item ?? null;
}

export async function getPartnerPMIByEmail(partnerId: string, email: string) {
  // No Limit here: DynamoDB applies Limit BEFORE FilterExpression, which would
  // cause misses when the first item in the partition doesn't match the email.
  const r = await client.send(new QueryCommand({
    TableName: TABLES.partnerPmi,
    KeyConditionExpression: 'partner_id = :pid',
    FilterExpression: 'contact_email = :email',
    ExpressionAttributeValues: { ':pid': partnerId, ':email': email },
  }));
  return r.Items?.[0] ?? null;
}

export async function getPartnerPMIByToken(formToken: string) {
  const r = await client.send(new QueryCommand({
    TableName: TABLES.partnerPmi,
    IndexName: 'token-index',
    KeyConditionExpression: 'form_token = :tok',
    ExpressionAttributeValues: { ':tok': formToken },
    Limit: 1,
  }));
  return r.Items?.[0] ?? null;
}

export async function putPartnerPMI(item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: TABLES.partnerPmi, Item: item }));
}

export async function updatePartnerPMI(partnerId: string, pmiId: string, updates: Record<string, unknown>) {
  const entries = Object.entries(defined(updates));
  const expr = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));
  await client.send(new UpdateCommand({
    TableName: TABLES.partnerPmi,
    Key: { partner_id: partnerId, pmi_id: pmiId },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export async function deletePartnerPMI(partnerId: string, pmiId: string) {
  await client.send(new DeleteCommand({
    TableName: TABLES.partnerPmi,
    Key: { partner_id: partnerId, pmi_id: pmiId },
  }));
}

export async function scanPartnerByReferralCode(code: string) {
  const r = await client.send(new ScanCommand({
    TableName: TABLES.partners,
    FilterExpression: 'referral_code = :code',
    ExpressionAttributeValues: { ':code': code },
    Limit: 10,
  }));
  return r.Items?.[0] ?? null;
}

export async function appendReferredPMI(partnerId: string, companyId: string) {
  await client.send(new UpdateCommand({
    TableName: TABLES.partners,
    Key: { partner_id: partnerId },
    UpdateExpression: 'SET referred_pmi_ids = list_append(if_not_exists(referred_pmi_ids, :empty), :new)',
    ExpressionAttributeValues: { ':empty': [], ':new': [companyId] },
  }));
}

export async function getCompaniesBatch(companyIds: string[]): Promise<Record<string, unknown>[]> {
  if (companyIds.length === 0) return [];
  const results: Record<string, unknown>[] = [];
  for (let i = 0; i < companyIds.length; i += 100) {
    const chunk = companyIds.slice(i, i + 100);
    const r = await client.send(new BatchGetCommand({
      RequestItems: {
        [TABLES.companies]: { Keys: chunk.map(id => ({ company_id: id })) },
      },
    }));
    results.push(...((r.Responses?.[TABLES.companies] ?? []) as Record<string, unknown>[]));
  }
  return results;
}

// ─── Partner PMI → virtual company / system (for compliance engine) ───────────

export async function ensurePartnerPMICompany(pmiId: string, companyName: string) {
  const existing = await getCompany(pmiId);
  if (existing) return;
  const now = new Date().toISOString();
  await putCompany({
    company_id:      pmiId,
    name:            companyName,
    sector:          'altro',
    size:            'sme',
    country:         'IT',
    employees_range: '11-50',
    setup_completed: true,
    is_partner_pmi:  true,
    governance: {
      has_dpo:               false,
      dpo_status:            'none',
      has_ai_inventory:      false,
      has_impact_assessment: false,
      has_ai_policy:         false,
      has_training:          false,
      has_incident_procedure: false,
      has_human_oversight:   false,
    },
    created_at:      now,
    updated_at:      now,
  });
}

export async function syncPartnerPMISystem(pmiId: string, raw: Record<string, unknown>) {
  const systemId = raw.system_id as string;
  const now      = new Date().toISOString();
  const fields   = {
    tool_name:                 raw.name ?? raw.tool_name ?? 'Sistema AI',
    purpose:                   raw.purpose ?? '',
    vendor:                    raw.vendor,
    category:                  raw.category ?? 'altro',
    role:                      raw.role ?? 'deployer',
    department:                raw.department,
    headcount:                 raw.headcount,
    output_type:               raw.output_type,
    access_mode:               raw.access_mode,
    customizations:            raw.customizations,
    target_users:              raw.target_users,
    vulnerable_groups:         raw.vulnerable_groups,
    users_aware_of_ai:         raw.users_aware_of_ai,
    makes_automated_decisions: raw.makes_automated_decisions,
    human_oversight_level:     raw.human_oversight_level,
    decision_domains:          raw.decision_domains,
    affects_vulnerable_groups: raw.affects_vulnerable_groups,
    data_types:                raw.data_types,
    annex_iii_domains:         raw.annex_iii_domains,
    is_safety_component:       raw.is_safety_component,
  };

  const existing = await getSystem(pmiId, systemId);
  if (existing) {
    await updateSystem(pmiId, systemId, { ...fields, updated_at: now });
    return;
  }

  await putSystem({
    company_id:           pmiId,
    system_id:            systemId,
    compliance_status:    'unchecked',
    compliance_checklist: {},
    created_at:           raw.submitted_at ?? now,
    updated_at:           now,
    ...fields,
  });
}

// ─── Compliance Checks ────────────────────────────────────────────────────────

export async function updateComplianceCheck(
  pk: string, checkId: string, updates: Record<string, unknown>
) {
  const entries = Object.entries(defined(updates));
  const expr = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));
  await client.send(new UpdateCommand({
    TableName: TABLES.checks,
    Key: { pk, check_id: checkId },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

// ─── Doc Generations ─────────────────────────────────────────────────────────

export async function putDocGeneration(item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: TABLES.docGenerations, Item: item }));
}

export async function getDocGeneration(companyId: string, generationId: string) {
  const r = await client.send(new GetCommand({
    TableName: TABLES.docGenerations,
    Key: { pk: `COMPANY#${companyId}`, sk: `GEN#${generationId}` },
  }));
  return r.Item ?? null;
}

export async function updateDocGeneration(companyId: string, generationId: string, updates: Record<string, unknown>) {
  const entries = Object.entries(defined(updates));
  const expr = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));
  await client.send(new UpdateCommand({
    TableName: TABLES.docGenerations,
    Key: { pk: `COMPANY#${companyId}`, sk: `GEN#${generationId}` },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export async function listDocGenerationsBySystem(systemId: string, limit = 20) {
  const r = await client.send(new QueryCommand({
    TableName: TABLES.docGenerations,
    IndexName: 'system-gen-index',
    KeyConditionExpression: 'system_id = :sid',
    ExpressionAttributeValues: { ':sid': systemId },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return r.Items ?? [];
}

export async function listDocGenerationsByCompany(companyId: string, limit = 100) {
  const r = await client.send(new QueryCommand({
    TableName: TABLES.docGenerations,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': `COMPANY#${companyId}` },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return r.Items ?? [];
}

// ─── Audit Trail ──────────────────────────────────────────────────────────────
export async function putAuditEvent(item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: TABLES.audit, Item: item }));
}

export async function listAuditEvents(
  companyId: string,
  opts: { limit?: number; fromDate?: string; toDate?: string } = {},
) {
  const { limit = 500, fromDate, toDate } = opts;
  const hasRange = fromDate && toDate;

  const r = await client.send(new QueryCommand({
    TableName: TABLES.audit,
    KeyConditionExpression: hasRange
      ? 'company_id = :cid AND event_id BETWEEN :from AND :to'
      : 'company_id = :cid',
    ExpressionAttributeValues: {
      ':cid': companyId,
      ...(hasRange ? {
        ':from': fromDate,
        ':to':   toDate + '~',  // ~ (ASCII 126) sorts after uuid hex chars
      } : {}),
    },
    ScanIndexForward: false,
    ...(hasRange ? {} : { Limit: limit }),
  }));
  return r.Items ?? [];
}
