// Resend email service — uses the Resend REST API directly (no npm package needed).
// Node 20 has native fetch, so this works without any extra dependency.

const RESEND_API_URL = "https://api.resend.com/emails";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL     = process.env.FROM_EMAIL ?? "noreply@official-actify.com";
const FROM_NAME      = "Actify";

interface SendParams {
  to:      string;
  subject: string;
  html:    string;
}

export async function sendEmail({ to, subject, html }: SendParams): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("resendService: RESEND_API_KEY not set — email not sent");
    return;
  }

  const res = await fetch(RESEND_API_URL, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to:      [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

// ─── Report delivery email template ──────────────────────────────────────────

export function buildReportEmail(
  companyName:  string,
  downloadUrl:  string,
  riskLevel:    string,
): string {
  const riskLabelMap: Record<string, string> = {
    prohibited: "VIETATO",
    high:       "ALTO RISCHIO",
    limited:    "RISCHIO LIMITATO",
    minimal:    "RISCHIO MINIMO",
  };
  const riskColorMap: Record<string, string> = {
    prohibited: "#DC2626",
    high:       "#EA580C",
    limited:    "#CA8A04",
    minimal:    "#16A34A",
  };
  const riskLabel = riskLabelMap[riskLevel] ?? riskLevel.toUpperCase();
  const riskColor = riskColorMap[riskLevel] ?? "#6B7280";

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0FDF4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0F172A,#1E293B);padding:32px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#22C55E;letter-spacing:-0.5px;">Actify</div>
            <div style="font-size:12px;color:#94A3B8;margin-top:4px;text-transform:uppercase;letter-spacing:2px;">AI Act Compliance Report</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 16px;">
            <h2 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">Il tuo report è pronto!</h2>
            <p style="font-size:15px;color:#374151;margin:0 0 24px;line-height:1.6;">
              Ciao, abbiamo completato l'analisi di compliance AI Act per <strong>${companyName}</strong>.
            </p>
            <!-- Risk badge -->
            <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-left:5px solid ${riskColor};border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin-bottom:6px;">Livello di Rischio Complessivo</div>
              <div style="font-size:18px;font-weight:800;color:${riskColor};">${riskLabel}</div>
            </div>
            <!-- Download button -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${downloadUrl}"
                 style="display:inline-block;background:#22C55E;color:#fff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">
                Scarica il Report PDF →
              </a>
              <div style="font-size:12px;color:#9CA3AF;margin-top:10px;">Il link è valido per 24 ore</div>
            </div>
            <!-- Upsell -->
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
              <div style="font-size:14px;font-weight:700;color:#065F46;margin-bottom:8px;">Vuoi gestire la compliance in modo continuo?</div>
              <p style="font-size:13px;color:#374151;margin:0 0 12px;line-height:1.6;">
                Con Actify puoi censire tutti i tuoi tool AI, generare automaticamente i documenti richiesti dall'AI Act e monitorare le scadenze nel tempo.
              </p>
              <a href="https://official-actify.com/register"
                 style="display:inline-block;background:#0F172A;color:#22C55E;font-size:13px;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;">
                Crea il tuo account gratuito →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 40px;text-align:center;">
            <p style="font-size:11px;color:#9CA3AF;margin:0;line-height:1.8;">
              Actify — EU AI Act Compliance Platform · official-actify.com<br>
              Hai ricevuto questa email perché hai richiesto un assessment gratuito su official-actify.com.<br>
              Questo report è generato automaticamente e non costituisce parere legale.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
