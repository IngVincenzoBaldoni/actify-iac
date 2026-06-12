import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient, GetCommand, PutCommand,
  UpdateCommand, QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { DocSchema, DocGenerationRecord, GenStatus, ValidationReport } from '../types';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'eu-central-1' }),
  { marshallOptions: { removeUndefinedValues: true } },
);

const T = {
  companies:      process.env.DYNAMODB_COMPANIES_TABLE!,
  systems:        process.env.DYNAMODB_SYSTEMS_TABLE!,
  checks:         process.env.DYNAMODB_CHECKS_TABLE!,
  documents:      process.env.DYNAMODB_DOCUMENTS_TABLE!,
  docSchemas:     process.env.DYNAMODB_DOC_SCHEMAS_TABLE!,
  docGenerations: process.env.DYNAMODB_DOC_GENERATIONS_TABLE!,
  audit:          process.env.DYNAMODB_AUDIT_TABLE!,
};

function defined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function buildUpdate(updates: Record<string, unknown>) {
  const entries = Object.entries(defined(updates));
  const expr    = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const names   = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const values  = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));
  return { expr, names, values };
}

// ─── Company ──────────────────────────────────────────────────────────────────
export async function getCompany(companyId: string) {
  const r = await client.send(new GetCommand({
    TableName: T.companies, Key: { company_id: companyId },
  }));
  return r.Item ?? null;
}

// ─── System ───────────────────────────────────────────────────────────────────
export async function getSystem(companyId: string, systemId: string) {
  const r = await client.send(new GetCommand({
    TableName: T.systems, Key: { company_id: companyId, system_id: systemId },
  }));
  return r.Item ?? null;
}

// ─── Compliance checks ────────────────────────────────────────────────────────
export async function getLatestComplianceCheck(companyId: string, systemId: string) {
  const r = await client.send(new QueryCommand({
    TableName: T.checks,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': `${companyId}#${systemId}` },
    ScanIndexForward: false,
    Limit: 1,
  }));
  return r.Items?.[0] ?? null;
}

// ─── Documents (final artifact records) ──────────────────────────────────────
export async function putDocument(item: Record<string, unknown>) {
  await client.send(new PutCommand({ TableName: T.documents, Item: item }));
}

// ─── Doc Schemas ─────────────────────────────────────────────────────────────
export async function getActiveSchema(docType: string): Promise<DocSchema | null> {
  const r = await client.send(new QueryCommand({
    TableName: T.docSchemas,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    FilterExpression: '#st = :active',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':pk':     `SCHEMA#${docType}`,
      ':prefix': 'VERSION#',
      ':active': 'ACTIVE',
    },
    ScanIndexForward: false,
    Limit: 1,
  }));
  return (r.Items?.[0] as DocSchema | undefined) ?? null;
}

// ─── Doc Generations ─────────────────────────────────────────────────────────
export async function putDocGeneration(record: DocGenerationRecord) {
  await client.send(new PutCommand({ TableName: T.docGenerations, Item: record }));
}

export async function getDocGeneration(companyId: string, generationId: string) {
  const r = await client.send(new GetCommand({
    TableName: T.docGenerations,
    Key: { pk: `COMPANY#${companyId}`, sk: `GEN#${generationId}` },
  }));
  return r.Item as DocGenerationRecord | undefined;
}

export async function updateDocGeneration(
  companyId: string,
  generationId: string,
  updates: Partial<DocGenerationRecord>,
) {
  const { expr, names, values } = buildUpdate({
    ...updates as Record<string, unknown>,
    updatedAt: new Date().toISOString(),
  });
  await client.send(new UpdateCommand({
    TableName: T.docGenerations,
    Key: { pk: `COMPANY#${companyId}`, sk: `GEN#${generationId}` },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export async function listDocGenerationsBySystem(systemId: string, limit = 20) {
  const r = await client.send(new QueryCommand({
    TableName: T.docGenerations,
    IndexName: 'system-gen-index',
    KeyConditionExpression: 'system_id = :sid',
    ExpressionAttributeValues: { ':sid': systemId },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (r.Items ?? []) as DocGenerationRecord[];
}

export async function markDocGenerationStatus(
  companyId: string,
  generationId: string,
  status: GenStatus,
  extra: Record<string, unknown> = {},
) {
  await updateDocGeneration(companyId, generationId, {
    status,
    ...extra as Partial<DocGenerationRecord>,
  });
}

// ─── Audit Trail ─────────────────────────────────────────────────────────────
export async function putAuditEvent(event: {
  company_id:  string;
  event_id:    string;
  event_type:  string;
  event_label: string;
  details:     Record<string, unknown>;
  timestamp:   string;
}) {
  await client.send(new PutCommand({ TableName: T.audit, Item: event }));
}
