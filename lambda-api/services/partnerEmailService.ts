const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const BASE_URL       = 'https://official-actify.com';
const SENDER_EMAIL   = 'noreply@official-actify.com';

// ─── Referral invite email ────────────────────────────────────────────────────

export interface ReferralEmailParams {
  to: string;
  companyName?: string;
  referralCode: string;
  pmiId?: string;
  partnerRagioneSociale: string;
  partnerEmail: string;
  partnerSenderName?: string;
  customMessage?: string;
}

export async function sendReferralInviteEmail(params: ReferralEmailParams): Promise<void> {
  const {
    to, companyName, referralCode, pmiId,
    partnerRagioneSociale, partnerEmail,
    partnerSenderName, customMessage,
  } = params;

  const referralUrl  = pmiId
    ? `${BASE_URL}/register?type=pmi&ref=${referralCode}&pmi=${pmiId}`
    : `${BASE_URL}/register?type=pmi&ref=${referralCode}`;
  const senderName   = partnerSenderName ?? partnerRagioneSociale;
  const addressee    = companyName ? `il team di <strong>${companyName}</strong>` : 'voi';
  const discountNote = '<strong>20% di sconto</strong> sul prezzo mensile';

  const bodyHtml = customMessage
    ? `<p>${customMessage.replace(/\n/g, '<br/>')}</p>
       <p><a href="${referralUrl}" style="display:inline-block;background:#6C47FF;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Iscriviti ad Actify con il 20% di sconto →</a></p>
       <p style="font-size:13px;color:#888;">Oppure copia e incolla: <a href="${referralUrl}">${referralUrl}</a></p>`
    : `<p>Gentile ${addressee},</p>
       <p>Lo studio <strong>${partnerRagioneSociale}</strong> ti invita a iscriverti a <strong>Actify</strong>, la piattaforma italiana per la conformità all'<strong>EU AI Act</strong> (Reg. UE 2024/1689).</p>
       <p>Actify ti permette di:</p>
       <ul style="padding-left:20px;line-height:2.2;">
         <li>Censire tutti i sistemi AI in uso nella tua azienda</li>
         <li>Classificarli per profilo di rischio (con AI generativa Bedrock + RAG)</li>
         <li>Identificare i gap di compliance e le sanzioni applicabili</li>
         <li>Generare automaticamente la documentazione obbligatoria (policy, registri, valutazioni)</li>
       </ul>
       <p>Iscrivendoti tramite il link del tuo consulente hai diritto a un ${discountNote} per i primi 12 mesi.</p>
       <p><a href="${referralUrl}" style="display:inline-block;background:#6C47FF;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Iscriviti ad Actify con il 20% di sconto →</a></p>
       <p style="font-size:13px;color:#888;">Oppure copia e incolla nel browser:<br/><a href="${referralUrl}">${referralUrl}</a></p>
       <p>Il codice referral <strong>${referralCode}</strong> sarà applicato automaticamente alla registrazione.</p>`;

  const html = buildReferralEmailHtml(bodyHtml, partnerRagioneSociale);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:     `${senderName} — AI Compliance <${SENDER_EMAIL}>`,
      to:       [to],
      reply_to: partnerEmail,
      subject:  `${partnerRagioneSociale} ti invita su Actify — 20% di sconto con il codice ${referralCode}`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
}

function buildReferralEmailHtml(bodyHtml: string, studio: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6C47FF,#4F35CC);padding:32px 40px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Actify</p>
            <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px;">Compliance EU AI Act — Invito di ${studio}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;color:#1a1a2e;font-size:15px;line-height:1.7;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:24px 40px;border-top:1px solid #eee;">
            <p style="margin:0;font-size:12px;color:#888;">Questo invito è stato inviato da ${studio} tramite Actify. Lo sconto del 20% è valido per i primi 12 mesi e si applica solo alla prima registrazione con questo codice referral.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Onboarding email (after free assessment) ────────────────────────────────

export interface OnboardingEmailParams {
  to: string;
  companyName: string;
  systems: { name?: string; tool_name?: string; purpose?: string }[];
  referralCode: string;
  pmiId: string;
  partnerRagioneSociale: string;
  partnerEmail: string;
  partnerSenderName?: string;
}

export async function sendOnboardingInviteEmail(params: OnboardingEmailParams): Promise<void> {
  const {
    to, companyName, systems, referralCode, pmiId,
    partnerRagioneSociale, partnerEmail, partnerSenderName,
  } = params;

  const senderName   = partnerSenderName ?? partnerRagioneSociale;
  const referralUrl  = `${BASE_URL}/register?type=pmi&ref=${referralCode}&pmi=${pmiId}`;
  const systemCount  = systems.length;
  const firstSystem  = systems[0]?.name ?? systems[0]?.tool_name ?? 'il vostro tool AI';
  const systemsList  = systems.slice(0, 3).map(s => `<li>${s.name ?? s.tool_name ?? 'Sistema AI'}</li>`).join('');

  const bodyHtml = `
<p>Caro team di <strong>${companyName}</strong>,</p>
<p>Congratulazioni! Avete completato il <strong>Free AI Act Assessment</strong> di ${firstSystem} ${systemCount > 1 ? `(e altri ${systemCount - 1} strumento${systemCount - 1 > 1 ? 'i' : ''} AI)` : ''} tramite lo studio <strong>${partnerRagioneSociale}</strong>.</p>
${systemCount > 0 ? `<p>Strumenti AI valutati:</p><ul style="padding-left:20px;line-height:2;">${systemsList}</ul>` : ''}
<p>Il vostro consulente <strong>${partnerRagioneSociale}</strong> vi invita a fare il passo successivo: <strong>gestire la compliance completa</strong> di tutti i vostri sistemi AI su <strong>Actify</strong>, la piattaforma italiana per l'adeguamento all'EU AI Act.</p>
<p>Con Actify potrete:</p>
<ul style="padding-left:20px;line-height:2.2;">
  <li>Censire e classificare tutti i vostri tool AI per profilo di rischio</li>
  <li>Ricevere un'analisi di compliance approfondita con i gap normativi specifici</li>
  <li>Generare automaticamente la documentazione obbligatoria (policy, registri, valutazioni d'impatto)</li>
  <li>Monitorare le scadenze e le sanzioni applicabili (Art. 99 AI Act, fino al 3% del fatturato globale)</li>
</ul>
<p style="background:rgba(108,71,255,.06);border-left:3px solid #6C47FF;padding:12px 16px;border-radius:4px;"><strong>Offerta esclusiva tramite ${partnerRagioneSociale}:</strong><br/>Iscrivendovi tramite il link del vostro consulente, avete accesso ad Actify con il <strong>20% di sconto</strong> per i primi 12 mesi.</p>
<p><a href="${referralUrl}" style="display:inline-block;background:#6C47FF;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Iscriviti ad Actify con il 20% di sconto →</a></p>
<p style="font-size:13px;color:#888;">Oppure copia e incolla nel browser:<br/><a href="${referralUrl}">${referralUrl}</a></p>
<p style="font-size:12px;color:#aaa;">Codice referral: <strong>${referralCode}</strong> — applicato automaticamente alla registrazione.</p>`;

  const html = buildReferralEmailHtml(bodyHtml, partnerRagioneSociale);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:     `${senderName} — AI Compliance <${SENDER_EMAIL}>`,
      to:       [to],
      reply_to: partnerEmail,
      subject:  `${companyName} — Il tuo prossimo passo su EU AI Act: iscriviti ad Actify con il 20% di sconto`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
}

// ─── Assessment email ─────────────────────────────────────────────────────────

export interface AssessmentEmailParams {
  to: string;
  companyName: string;
  formToken: string;
  partnerRagioneSociale: string;
  partnerEmail: string;
  partnerSenderName?: string;
  partnerLogoUrl?: string;
  emailBody?: string;
}

export async function sendAssessmentEmail(params: AssessmentEmailParams): Promise<void> {
  const {
    to, companyName, formToken,
    partnerRagioneSociale, partnerEmail,
    partnerSenderName, emailBody,
  } = params;

  const formUrl = `${BASE_URL}?token=${formToken}`;
  const senderName = partnerSenderName ?? partnerRagioneSociale;

  const body = emailBody
    ? emailBody.replace(/\{formUrl\}/g, formUrl).replace(/\{companyName\}/g, companyName)
    : defaultEmailBody(companyName, formUrl, partnerRagioneSociale);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${senderName} — AI Compliance <${SENDER_EMAIL}>`,
      to: [to],
      reply_to: partnerEmail,
      subject: `${partnerRagioneSociale} — Verifica la tua conformità EU AI Act: assessment gratuito per ${companyName}`,
      html: buildEmailHtml(body, formUrl, partnerRagioneSociale),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
}

function defaultEmailBody(companyName: string, formUrl: string, studio: string): string {
  return `
<p>Gentile team di <strong>${companyName}</strong>,</p>
<p>Il <strong>Regolamento UE sull'Intelligenza Artificiale</strong> (AI Act — Reg. UE 2024/1689) è entrato in vigore ed è già applicabile per le categorie di rischio più elevate. Le scadenze per la piena conformità si avvicinano rapidamente, con <strong>sanzioni fino al 3% del fatturato globale</strong> (Art. 99) per le imprese non adempienti.</p>
<p>Come vostro consulente di riferimento, vi proponiamo un primo strumento gratuito per capire subito dove siete: <strong>Actify Free Assessment</strong>.</p>
<p>In soli <strong>5 minuti</strong>, potrete:</p>
<ul style="padding-left:20px;line-height:2.2;">
  <li>Registrare uno strumento AI in uso nella vostra organizzazione</li>
  <li>Scoprire il suo profilo di rischio secondo l'AI Act</li>
  <li>Ricevere un'anteprima dei potenziali gap normativi e delle sanzioni applicabili</li>
</ul>
<p style="background:rgba(34,197,94,.06);border-left:3px solid #22C55E;padding:12px 16px;border-radius:4px;"><strong>Gratuito, nessuna registrazione richiesta, risultati immediati.</strong></p>
<p><a href="${formUrl}" style="display:inline-block;background:#6C47FF;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Avvia l'Assessment Gratuito →</a></p>
<p style="font-size:13px;color:#888;">Oppure copia e incolla nel browser:<br/><a href="${formUrl}">${formUrl}</a></p>
<p>Per qualsiasi domanda, rispondete a questa email o contattate direttamente lo studio <strong>${studio}</strong>.</p>`;
}

function buildEmailHtml(bodyHtml: string, formUrl: string, studio: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#6C47FF;padding:32px 40px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${studio}</p>
            <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px;">AI Compliance Assessment</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;color:#1a1a2e;font-size:15px;line-height:1.7;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:24px 40px;border-top:1px solid #eee;">
            <p style="margin:0;font-size:12px;color:#888;">Questo invito è stato inviato da ${studio} tramite la piattaforma Actify. Il link del questionario è personale e non va condiviso.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
