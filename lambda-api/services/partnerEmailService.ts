const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const BASE_URL       = 'https://official-actify.com';
const SENDER_EMAIL   = 'noreply@official-actify.com';
const ADMIN_EMAIL    = 'officialactify@gmail.com';

// ─── Partner access request — admin notification ──────────────────────────────

export async function sendPartnerRequestNotification(params: {
  rid: string;
  approveKey: string;
  email: string;
  ragioneSociale: string;
  tipoStudio: string;
  nClienti: number;
  messaggio?: string;
}): Promise<void> {
  const { rid, approveKey, email, ragioneSociale, tipoStudio, nClienti, messaggio } = params;
  const approveUrl = `${BASE_URL}/partner-approve?rid=${rid}&key=${approveKey}`;

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#064e3b 0%,#059669 60%,#34d399 100%);padding:28px 40px;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-.5px;">Actify — Nuova richiesta partner</p>
            <p style="margin:5px 0 0;color:rgba(255,255,255,.75);font-size:13px;">Richiesta di accesso al Portal Partner</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;color:#e2e8f0;font-size:15px;line-height:1.75;">
            <p style="margin:0 0 20px;font-weight:600;color:#f8fafc;">Dettagli della richiesta:</p>
            <table cellpadding="0" cellspacing="0" style="width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;">
              <tr><td style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.06);color:#94a3b8;font-size:13px;width:40%;">Ragione Sociale</td><td style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.06);color:#f8fafc;font-weight:600;">${ragioneSociale}</td></tr>
              <tr><td style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.06);color:#94a3b8;font-size:13px;">Tipo Studio</td><td style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.06);color:#f8fafc;">${tipoStudio}</td></tr>
              <tr><td style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.06);color:#94a3b8;font-size:13px;">N° Clienti stimati</td><td style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.06);color:#f8fafc;">${nClienti}</td></tr>
              <tr><td style="padding:12px 18px;${messaggio ? 'border-bottom:1px solid rgba(255,255,255,.06);' : ''}color:#94a3b8;font-size:13px;">Email</td><td style="padding:12px 18px;${messaggio ? 'border-bottom:1px solid rgba(255,255,255,.06);' : ''}color:#34d399;">${email}</td></tr>
              ${messaggio ? `<tr><td style="padding:12px 18px;color:#94a3b8;font-size:13px;vertical-align:top;">Messaggio</td><td style="padding:12px 18px;color:#f8fafc;font-size:14px;line-height:1.6;">${messaggio}</td></tr>` : ''}
            </table>
            <p style="margin:28px 0 20px;">Clicca il pulsante per approvare la richiesta e inviare automaticamente il link di registrazione allo studio:</p>
            <table cellpadding="0" cellspacing="0"><tr><td>
              <a href="${approveUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#34d399);color:#fff;padding:15px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:-.2px;">
                Approva e invia invito →
              </a>
            </td></tr></table>
            <p style="margin:24px 0 0;font-size:12px;color:#64748b;">Oppure copia e incolla nel browser:<br/>
            <a href="${approveUrl}" style="color:#34d399;word-break:break-all;font-size:12px;">${approveUrl}</a></p>
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:18px 40px;border-top:1px solid rgba(255,255,255,.06);">
            <p style="margin:0;font-size:12px;color:#475569;">© Actify — Admin notification · official-actify.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Actify <noreply@official-actify.com>',
      to:      [ADMIN_EMAIL],
      subject: `[Actify] Nuova richiesta partner — ${ragioneSociale}`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

// ─── Partner access request — studio confirmation ─────────────────────────────

export async function sendPartnerRequestConfirmation(params: {
  to: string;
  ragioneSociale: string;
}): Promise<void> {
  const { to, ragioneSociale } = params;

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#064e3b 0%,#059669 60%,#34d399 100%);padding:28px 40px;">
            <p style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-.5px;">Actify</p>
            <p style="margin:5px 0 0;color:rgba(255,255,255,.75);font-size:13px;">EU AI Act Compliance Platform</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;color:#e2e8f0;font-size:15px;line-height:1.75;">
            <p style="margin:0 0 16px;">Grazie per il tuo interesse ad <strong style="color:#34d399;">Actify</strong>!</p>
            <p style="margin:0 0 20px;">Abbiamo ricevuto la richiesta di accesso al <strong>Partner Portal</strong> di <strong>${ragioneSociale}</strong>. Il nostro team la esaminerà e riceverai una risposta via email entro <strong>1–2 giorni lavorativi</strong>.</p>
            <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">Se hai domande nel frattempo, puoi rispondere a questa email o scrivere a <a href="mailto:officialactify@gmail.com" style="color:#34d399;text-decoration:none;">officialactify@gmail.com</a>.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:18px 40px;border-top:1px solid rgba(255,255,255,.06);">
            <p style="margin:0;font-size:12px;color:#475569;">© Actify — AI Act Compliance Platform · official-actify.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Actify <noreply@official-actify.com>',
      to:      [to],
      subject: 'Actify — Abbiamo ricevuto la tua richiesta Partner',
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

// ─── Partner registration link (after admin approval) ─────────────────────────

export async function sendPartnerRegistrationLink(params: {
  to: string;
  ragioneSociale: string;
  registrationUrl: string;
}): Promise<void> {
  const { to, ragioneSociale, registrationUrl } = params;

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#064e3b 0%,#059669 60%,#34d399 100%);padding:28px 40px;">
            <p style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-.5px;">Actify</p>
            <p style="margin:5px 0 0;color:rgba(255,255,255,.75);font-size:13px;">EU AI Act Compliance Platform</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;color:#e2e8f0;font-size:15px;line-height:1.75;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#f8fafc;">Ottima notizia!</p>
            <p style="margin:0 0 20px;">La richiesta di accesso al <strong>Partner Portal</strong> di <strong style="color:#34d399;">${ragioneSociale}</strong> è stata approvata. Puoi ora completare la registrazione e accedere ad Actify.</p>
            <p style="margin:0 0 24px;">Clicca il pulsante qui sotto per scegliere la tua password e attivare l'account:</p>
            <table cellpadding="0" cellspacing="0"><tr><td>
              <a href="${registrationUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#34d399);color:#fff;padding:15px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:-.2px;">
                Completa la registrazione →
              </a>
            </td></tr></table>
            <p style="margin:28px 0 0;font-size:12px;color:#64748b;">Il link è valido per 7 giorni. Se non riesci ad aprirlo, copia e incolla nel browser:<br/>
            <a href="${registrationUrl}" style="color:#34d399;word-break:break-all;font-size:12px;">${registrationUrl}</a></p>
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:18px 40px;border-top:1px solid rgba(255,255,255,.06);">
            <p style="margin:0;font-size:12px;color:#475569;">© Actify — AI Act Compliance Platform · official-actify.com<br/>Questo link è personale e non va condiviso.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Actify <noreply@official-actify.com>',
      to:      [to],
      subject: 'Actify — Il tuo link di registrazione Partner è pronto',
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

// ─── Collaborator invite email ────────────────────────────────────────────────

// ─── Collaborator invite email ────────────────────────────────────────────────

export async function sendCollaboratorInviteEmail(params: {
  to: string;
  companyName: string;
  inviterEmail: string;
  inviteUrl: string;
}): Promise<void> {
  const { to, companyName, inviterEmail, inviteUrl } = params;

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#064e3b 0%,#059669 60%,#34d399 100%);padding:32px 40px;">
            <p style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-.5px;">Actify</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,.75);font-size:13px;">EU AI Act Compliance Platform</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;color:#e2e8f0;font-size:15px;line-height:1.75;">
            <p style="margin:0 0 20px;">Sei stato invitato a collaborare su <strong style="color:#34d399;">Actify</strong> per gestire la compliance EU AI Act di <strong>${companyName}</strong>.</p>
            <p style="margin:0 0 28px;color:#94a3b8;font-size:14px;">Invito inviato da <a href="mailto:${inviterEmail}" style="color:#34d399;text-decoration:none;">${inviterEmail}</a></p>
            <p style="margin:0 0 24px;">Clicca il pulsante qui sotto per creare il tuo account e scegliere la tua password:</p>
            <table cellpadding="0" cellspacing="0"><tr><td>
              <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#34d399);color:#fff;padding:15px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:-.2px;">
                Accetta l'invito →
              </a>
            </td></tr></table>
            <p style="margin:28px 0 0;font-size:12px;color:#64748b;">Il link è valido per 7 giorni. Se non ti aspettavi questo invito, puoi ignorare questa email.<br/>
            Oppure copia e incolla nel browser: <a href="${inviteUrl}" style="color:#34d399;word-break:break-all;">${inviteUrl}</a></p>
          </td>
        </tr>
        <tr>
          <td style="background:#0f172a;padding:20px 40px;border-top:1px solid rgba(255,255,255,.06);">
            <p style="margin:0;font-size:12px;color:#475569;">© Actify — AI Act Compliance Platform · official-actify.com<br/>Questo invito è strettamente personale e non va condiviso.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:     'Actify <noreply@official-actify.com>',
      to:       [to],
      reply_to: inviterEmail,
      subject:  `Sei invitato a collaborare su Actify — ${companyName}`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
}

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
