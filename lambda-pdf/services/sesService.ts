import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// TODO: verify official-actify.com domain in Amazon SES console (eu-central-1)
// before deploying to production. Until verified, SES operates in sandbox mode
// and can only send to verified addresses.
const SENDER = process.env.SES_SENDER_EMAIL ?? "noreply@official-actify.com";
const REGION  = process.env.SES_REGION ?? process.env.AWS_REGION ?? "eu-central-1";

const ses = new SESClient({ region: REGION });

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const masked =
    local.length <= 2
      ? local[0] + "***"
      : local[0] + "***" + local[local.length - 1];
  return `${masked}@${domain}`;
}

export async function sendReportEmail(
  toEmail: string,
  companyName: string,
  presignedUrl: string,
  expiryHours = 24
): Promise<void> {
  const html = buildHtmlEmail(companyName, presignedUrl, expiryHours);
  const text = `Il tuo report AI Act Compliance per ${companyName} è pronto.\n\nScaricalo qui (link valido ${expiryHours} ore):\n${presignedUrl}\n\n— Team Actify`;

  await ses.send(
    new SendEmailCommand({
      Source: SENDER,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: {
          Data: `Il tuo Report AI Act Compliance — ${companyName}`,
          Charset: "UTF-8",
        },
        Body: {
          Html: { Data: html, Charset: "UTF-8" },
          Text: { Data: text, Charset: "UTF-8" },
        },
      },
    })
  );
}

function buildHtmlEmail(companyName: string, downloadUrl: string, expiryHours: number): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#0F172A,#1E293B);padding:32px 40px;text-align:center;">
          <div style="font-size:13px;color:#94A3B8;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">AI Act Compliance Platform</div>
          <div style="font-size:28px;font-weight:800;color:#fff;margin-bottom:4px;">Il tuo Report è Pronto</div>
          <div style="width:40px;height:3px;background:#22C55E;border-radius:2px;margin:0 auto;"></div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 40px;">
          <p style="font-size:16px;color:#111827;margin:0 0 12px;font-weight:600;">Ciao 👋</p>
          <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 20px;">
            Il report di compliance AI Act per <strong>${esc(companyName)}</strong> è stato generato con successo.
            Clicca il pulsante qui sotto per scaricarlo.
          </p>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr>
              <td align="center" style="background:#22C55E;border-radius:8px;">
                <a href="${downloadUrl}" target="_blank"
                   style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:0.3px;">
                  ↓ Scarica Report PDF
                </a>
              </td>
            </tr>
          </table>

          <!-- Expiry notice -->
          <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:6px;padding:12px 16px;font-size:12px;color:#92400E;margin-bottom:24px;">
            ⚠️ <strong>Link valido per ${expiryHours} ore.</strong>
            Se il link è scaduto, esegui di nuovo l'assessment gratuito su actify.io.
          </div>

          <!-- What's inside -->
          <div style="border-top:1px solid #E5E7EB;padding-top:20px;">
            <p style="font-size:13px;font-weight:700;color:#111827;margin:0 0 12px;">Il report include:</p>
            ${[
              "Classificazione del rischio AI Act per ogni sistema dichiarato",
              "Stima dell'esposizione a potenziali sanzioni Art. 99 (Reg. UE 2024/1689)",
              "Gap di compliance e articoli applicabili",
              "Piano d'azione prioritario con scadenze",
              "Timeline obblighi AI Act personalizzata",
            ]
              .map(
                (item) =>
                  `<div style="display:flex;align-items:center;gap:10px;font-size:13px;color:#374151;margin-bottom:8px;">
                     <span style="color:#22C55E;font-weight:700;font-size:15px;">✓</span>${esc(item)}
                   </div>`
              )
              .join("")}
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#F8FAFC;border-top:1px solid #E5E7EB;padding:20px 40px;text-align:center;">
          <p style="font-size:11px;color:#9CA3AF;margin:0 0 4px;">
            Actify — AI Act Compliance Platform &mdash; <a href="https://actify.io" style="color:#22C55E;text-decoration:none;">actify.io</a>
          </p>
          <p style="font-size:10px;color:#CBD5E1;margin:0;">
            Questo report è generato automaticamente e non costituisce parere legale. Reg. UE 2024/1689.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
