/**
 * Seed script — populates doc_schemas DynamoDB table with all initial schemas.
 * Run: AWS_REGION=eu-central-1 DYNAMODB_DOC_SCHEMAS_TABLE=actify-saas-doc-schemas \
 *       npx ts-node src/seeds/seedRunner.ts
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ALL_SCHEMAS } from './docSchemas';
import type { DocSchema } from '../types';

const TABLE  = process.env.DYNAMODB_DOC_SCHEMAS_TABLE ?? 'actify-saas-doc-schemas';
const REGION = process.env.AWS_REGION ?? 'eu-central-1';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);

async function seed() {
  console.log(`Seeding ${ALL_SCHEMAS.length} schemas into ${TABLE} (${REGION})...\n`);

  for (const schema of ALL_SCHEMAS) {
    const item = {
      ...schema,
      pk: `SCHEMA#${schema.docType}`,
      sk: `VERSION#${schema.version}`,
    };
    await client.send(new PutCommand({ TableName: TABLE, Item: item }));
    console.log(`✅  ${schema.docType} v${schema.version} (${schema.sections.length} sections, ${schema.sections.filter(s => s.kind === 'GENERATIVE').length} generative slots)`);
  }

  console.log('\nSeeding complete.');
}

seed().catch(err => { console.error('Seeding failed:', err); process.exit(1); });
