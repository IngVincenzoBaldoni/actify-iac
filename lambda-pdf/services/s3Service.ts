import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

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
