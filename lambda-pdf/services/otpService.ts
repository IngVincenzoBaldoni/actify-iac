import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE  = process.env.DYNAMO_ASSESSMENTS_TABLE ?? "actify-saas-free-assessments";
const REGION = process.env.DYNAMO_REGION ?? process.env.S3_REGION ?? "eu-central-1";

const raw = new DynamoDBClient({ region: REGION });
const db  = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true },
});

const RECORD_TTL_DAYS = 7;

// ─── Check if email has already received a free report ───────────────────────

export async function checkEmailAlreadyUsed(email: string): Promise<boolean> {
  const res = await db.send(new GetCommand({ TableName: TABLE, Key: { email } }));
  const record = res.Item;
  return !!(record && record.report_generated);
}

// ─── Mark report as generated for this email ─────────────────────────────────

export async function markReportGenerated(email: string, companyName?: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = now + RECORD_TTL_DAYS * 86400;

  await db.send(new PutCommand({
    TableName: TABLE,
    Item: {
      email,
      company_name:        companyName ?? "",
      report_generated:    true,
      report_generated_at: new Date().toISOString(),
      created_at:          new Date().toISOString(),
      ttl,
    },
    ConditionExpression: "attribute_not_exists(email) OR report_generated <> :t",
    ExpressionAttributeValues: { ":t": true },
  })).catch(async (err) => {
    if (err.name === "ConditionalCheckFailedException") return;
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { email },
      UpdateExpression: "SET report_generated = :t, report_generated_at = :now",
      ExpressionAttributeValues: { ":t": true, ":now": new Date().toISOString() },
    }));
  });
}
