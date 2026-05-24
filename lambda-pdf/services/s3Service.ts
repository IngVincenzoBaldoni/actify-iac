import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import type { IntakePayload } from "../types/intake";

const s3 = new S3Client({ region: process.env.S3_REGION ?? "eu-central-1" });

export interface UploadResult {
  presigned_url: string;
  key: string;
}

export async function uploadReport(
  pdfBuffer: Buffer,
  companyName: string
): Promise<UploadResult> {
  const bucket = process.env.S3_BUCKET!;
  const ttl = Number(process.env.PRESIGNED_URL_TTL ?? 900);

  const date = new Date().toISOString().slice(0, 10);
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);
  const key = `reports/${date}/${randomUUID()}-${slug}.pdf`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
      ContentDisposition: `attachment; filename="actify-report-${slug}.pdf"`,
    })
  );

  const presigned_url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: ttl }
  );

  return { presigned_url, key };
}

// ─── Data Lake Write ──────────────────────────────────────────────────────────
// Writes two objects to the data lake bucket on every form submission:
//   1. bronze/prospects/year=X/month=Y/day=Z/<uuid>.json  — Hive-partitioned record for Athena
//   2. company-reports/<slug>-<submissionId>/actify-report-<date>.pdf  — persistent PDF copy
//
// If DATALAKE_BUCKET is not set (local dev / missing env var) the function exits silently.
// Caller should wrap in try/catch — failure is non-fatal and must not block the user response.

export async function writeToDatalake(
  payload: IntakePayload,
  pdfBuffer: Buffer
): Promise<void> {
  const bucket = process.env.DATALAKE_BUCKET;
  if (!bucket) return; // not configured — skip

  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const submissionId = randomUUID();
  const dateStr = now.toISOString().slice(0, 10);

  const slug = payload.company.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  // 1. Upload persistent PDF copy
  const pdfKey = `company-reports/${slug}-${submissionId}/actify-report-${dateStr}.pdf`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: pdfKey,
      Body: pdfBuffer,
      ContentType: "application/pdf",
      ContentDisposition: `attachment; filename="actify-report-${slug}.pdf"`,
      Metadata: {
        "submission-id": submissionId,
        "company-name": payload.company.name.slice(0, 256),
      },
    })
  );

  // 2. Write Hive-partitioned JSON record for Glue Crawler + Athena
  // year/month/day are NOT included here — they are already encoded in the S3 path
  // (year=X/month=Y/day=Z) and Athena exposes them automatically as partition columns.
  // Including them in the JSON body too would cause HIVE_INVALID_METADATA: duplicate columns.
  const record = {
    submission_id: submissionId,
    contact_email: payload.contact_email,
    company_name: payload.company.name,
    company_sector: payload.company.sector,
    company_employees: payload.company.employees_range,
    sede_legale: payload.company.sede_legale ?? "Non specificato",
    ai_role: payload.ai_role,
    tool_count: payload.ai_tools.length,
    report_s3_key: pdfKey,
    // Full payload as JSON string — queryable with Athena json_extract()
    data: JSON.stringify(payload),
  };

  const jsonKey = `bronze/prospects/year=${year}/month=${month}/day=${day}/${submissionId}.json`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: jsonKey,
      Body: JSON.stringify(record),
      ContentType: "application/json",
    })
  );
}
