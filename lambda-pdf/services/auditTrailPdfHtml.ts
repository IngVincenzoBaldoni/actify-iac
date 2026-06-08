interface AuditEvent {
  event_id:    string;
  event_type:  string;
  event_label: string;
  details:     Record<string, unknown>;
  actor_email: string | null;
  timestamp:   string;
}

function formatDateLong(iso: string): string {
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Europe/Rome',
    }) + ' CET';
  } catch { return iso; }
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

const CATEGORY: Record<string, string> = {
  account_created:            'Account',
  setup_completed:            'Account',
  company_updated:            'Account',
  system_created:             'AI Inventory',
  system_updated:             'AI Inventory',
  system_deleted:             'AI Inventory',
  compliance_check_started:   'Compliance',
  compliance_check_completed: 'Compliance',
  compliance_check_failed:    'Compliance',
  document_generated:         'Documenti',
  document_finalized:         'Documenti',
  document_deleted:           'Documenti',
  literacy_dept_created:      'AI Literacy',
  literacy_dept_deleted:      'AI Literacy',
  literacy_cert_added:        'AI Literacy',
  literacy_cert_deleted:      'AI Literacy',
  user_invited:               'Utenti',
  user_deleted:               'Utenti',
};

function eventRows(events: AuditEvent[]): string {
  return events.map((e, i) => {
    const cat = CATEGORY[e.event_type] ?? 'Altro';
    const detailStr = Object.entries(e.details ?? {})
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(' · ');

    return `
      <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="td-num">${events.length - i}</td>
        <td class="td-ts">
          <div class="ts-date">${formatDateShort(e.timestamp)}</div>
          <div class="ts-time">${new Date(e.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Rome' })}</div>
        </td>
        <td class="td-cat"><span class="cat-badge cat-${cat.toLowerCase().replace(/\s/g, '-')}">${cat}</span></td>
        <td class="td-label">
          <div class="ev-label">${e.event_label}</div>
          ${detailStr ? `<div class="ev-detail">${detailStr}</div>` : ''}
        </td>
        <td class="td-actor">${e.actor_email ?? '—'}</td>
        <td class="td-id">${e.event_id.split('#')[1]?.slice(0, 8) ?? '—'}</td>
      </tr>`;
  }).join('');
}

export function buildAuditTrailPdfHtml(opts: {
  company_name: string;
  company_id:   string;
  events:       AuditEvent[];
  generated_at: string;
  period_from:  string;
  period_to:    string;
}): string {
  const { company_name, company_id, events, generated_at, period_from, period_to } = opts;

  const byCategory = events.reduce<Record<string, number>>((acc, e) => {
    const cat = CATEGORY[e.event_type] ?? 'Altro';
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  const summaryRows = Object.entries(byCategory)
    .map(([cat, count]) => `<tr><td>${cat}</td><td><strong>${count}</strong></td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Audit Trail — ${company_name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; color: #1e293b; background: #fff; }

  /* ── Header ── */
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 28px 32px 20px; border-bottom: 3px solid #6C47FF; }
  .header-left h1 { font-size: 20px; font-weight: 800; color: #6C47FF; letter-spacing: -0.5px; }
  .header-left .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
  .header-right { text-align: right; }
  .header-right .badge { display: inline-block; background: #6C47FF; color: #fff; font-size: 9px; font-weight: 700; padding: 3px 10px; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase; }
  .header-right .gen-date { font-size: 9px; color: #64748b; margin-top: 4px; }

  /* ── Company block ── */
  .company-block { display: flex; gap: 24px; padding: 14px 32px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .company-block .field { flex: 1; }
  .company-block .field label { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 2px; }
  .company-block .field value { font-size: 11px; font-weight: 700; color: #1e293b; }

  /* ── Legal disclaimer ── */
  .disclaimer { margin: 16px 32px; padding: 12px 16px; background: #f0f4ff; border-left: 4px solid #6C47FF; border-radius: 4px; }
  .disclaimer h3 { font-size: 10px; font-weight: 800; color: #3730a3; margin-bottom: 4px; }
  .disclaimer p { font-size: 9px; color: #374151; line-height: 1.6; }

  /* ── Summary ── */
  .section-title { font-size: 10px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.08em; padding: 14px 32px 8px; border-top: 1px solid #e2e8f0; }
  .summary-table { margin: 0 32px 16px; border-collapse: collapse; width: calc(100% - 64px); }
  .summary-table td { padding: 5px 10px; font-size: 9.5px; border: 1px solid #e2e8f0; }
  .summary-table tr:first-child td { background: #f8fafc; font-weight: 700; font-size: 8.5px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .summary-total { margin: 0 32px 0; padding: 6px 10px; background: #6C47FF; color: #fff; font-size: 10px; font-weight: 700; display: flex; justify-content: space-between; border-radius: 0 0 4px 4px; }

  /* ── Events table ── */
  .events-table { width: calc(100% - 64px); margin: 16px 32px 0; border-collapse: collapse; }
  .events-table th { background: #1e293b; color: #fff; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; padding: 7px 8px; text-align: left; }
  .td-num { width: 28px; text-align: center; font-size: 9px; color: #94a3b8; font-weight: 700; }
  .td-ts { width: 80px; }
  .ts-date { font-size: 9px; font-weight: 600; color: #334155; }
  .ts-time { font-size: 8.5px; color: #64748b; font-family: monospace; }
  .td-cat { width: 68px; }
  .td-label { }
  .td-actor { width: 110px; font-size: 8.5px; color: #64748b; word-break: break-all; }
  .td-id { width: 62px; font-size: 8px; color: #94a3b8; font-family: monospace; }
  .ev-label { font-size: 9.5px; font-weight: 700; color: #1e293b; }
  .ev-detail { font-size: 8.5px; color: #64748b; margin-top: 2px; white-space: pre-wrap; }
  td { padding: 6px 8px; vertical-align: top; border-bottom: 1px solid #f1f5f9; }
  .row-even { background: #fff; }
  .row-odd { background: #fafafa; }

  /* ── Category badges ── */
  .cat-badge { display: inline-block; font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 3px; white-space: nowrap; }
  .cat-account { background: #ede9fe; color: #5b21b6; }
  .cat-ai-inventory { background: #dbeafe; color: #1d4ed8; }
  .cat-compliance { background: #dcfce7; color: #15803d; }
  .cat-documenti { background: #fef9c3; color: #854d0e; }
  .cat-ai-literacy { background: #e0f2fe; color: #0369a1; }
  .cat-utenti { background: #fce7f3; color: #be185d; }
  .cat-altro { background: #f1f5f9; color: #475569; }

  /* ── Footer ── */
  .footer { margin: 24px 32px 0; padding: 12px 0; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8.5px; color: #94a3b8; }
  .footer strong { color: #475569; }

  /* ── Page break ── */
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-left">
    <h1>Actify — Audit Trail Immutabile</h1>
    <div class="subtitle">Registro ufficiale delle attività aziendali su piattaforma Actify</div>
  </div>
  <div class="header-right">
    <div class="badge">🔒 Documento Ufficiale</div>
    <div class="gen-date">Generato il ${formatDateLong(generated_at)}</div>
  </div>
</div>

<!-- COMPANY INFO -->
<div class="company-block">
  <div class="field"><label>Azienda</label><value>${company_name}</value></div>
  <div class="field"><label>ID Azienda</label><value style="font-size:9px;font-family:monospace">${company_id}</value></div>
  <div class="field"><label>Periodo</label><value>${formatDateShort(period_from)} – ${formatDateShort(period_to)}</value></div>
  <div class="field"><label>Totale eventi</label><value>${events.length}</value></div>
</div>

<!-- LEGAL DISCLAIMER -->
<div class="disclaimer">
  <h3>⚖️ Valore Legale del Presente Documento</h3>
  <p>
    Il presente registro costituisce prova documentale dell'attività di compliance svolta dall'organizzazione in ottemperanza al
    Regolamento UE 2024/1689 (AI Act). Ogni evento è identificato da un timestamp certificato e un ID univoco non modificabile.
    In caso di ispezione da parte dell'Autorità Nazionale competente o in sede di contestazione formale, questo documento dimostra
    la <strong>diligenza</strong> e la <strong>buona fede</strong> dell'organizzazione nell'adempimento degli obblighi normativi —
    elementi che, ai sensi dell'art. 99 AI Act, possono ridurre significativamente l'entità delle sanzioni applicabili.
  </p>
</div>

<!-- SUMMARY -->
<div class="section-title">Riepilogo per categoria</div>
<table class="summary-table">
  <tr><td>Categoria</td><td>Numero eventi</td></tr>
  ${summaryRows}
</table>
<div class="summary-total">
  <span>Totale eventi registrati</span>
  <span>${events.length}</span>
</div>

<!-- EVENTS TABLE -->
<div class="section-title" style="margin-top:20px">Registro completo degli eventi</div>
<table class="events-table">
  <thead>
    <tr>
      <th class="td-num">#</th>
      <th class="td-ts">Data / Ora (CET)</th>
      <th class="td-cat">Categoria</th>
      <th>Evento</th>
      <th class="td-actor">Utente</th>
      <th class="td-id">Event ID</th>
    </tr>
  </thead>
  <tbody>
    ${eventRows(events)}
  </tbody>
</table>

<!-- FOOTER -->
<div class="footer">
  <div><strong>Actify</strong> — Piattaforma AI Act Compliance | official-actify.com</div>
  <div>Documento generato automaticamente — non richiede firma</div>
  <div>Reg. UE 2024/1689 (AI Act) · Art. 99</div>
</div>

</body>
</html>`;
}
