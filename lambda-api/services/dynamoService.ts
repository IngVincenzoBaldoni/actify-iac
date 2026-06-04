import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient, GetCommand, PutCommand,
  UpdateCommand, DeleteCommand, QueryCommand, QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'eu-central-1' }),
  { marshallOptions: { removeUndefinedValues: true } },
);

const TABLES = {
  companies: process.env.DYNAMODB_COMPANIES_TABLE!,
  users:     process.env.DYNAMODB_USERS_TABLE!,
  systems:   process.env.DYNAMODB_SYSTEMS_TABLE!,
  checks:    process.env.DYNAMODB_CHECKS_TABLE!,
  documents: process.env.DYNAMODB_DOCUMENTS_TABLE!,
  literacy:  process.env.DYNAMODB_LITERACY_TABLE!,
};

// ─── Company ──────────────────────────────────────────────────────────────────
export async function getCompany(companyId: string) {
  const r = await client.send(new GetCommand({ TableName: TABLES.companies, Key: { company_id: companyId } }));
  return r.Item ?? null;
}

export async function putCompany(item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: TABLES.companies, Item: item }));
}

export async function updateCompany(companyId: string, updates: Record<string, unknown>) {
  const entries = Object.entries(updates);
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
  const entries = Object.entries(updates);
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
  snapshot: { at: string; min: number; max: number; source: string },
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

// ─── Compliance Checks ────────────────────────────────────────────────────────

export async function updateComplianceCheck(
  pk: string, checkId: string, updates: Record<string, unknown>
) {
  const entries = Object.entries(updates);
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
