interface AuditEvent {
  event_id:    string;
  event_type:  string;
  event_label: string;
  details:     Record<string, unknown>;
  actor_email: string | null;
  timestamp:   string;
}

interface SystemRow {
  system_id:         string;
  tool_name:         string;
  role:              string;
  compliance_status: string;
  last_check_at:     string | null;
  last_exposure_max?: number;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

function fmtLong(iso: string): string {
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Europe/Rome',
    }) + ' CET';
  } catch { return iso; }
}

function fmtShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return iso; }
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('it-IT', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Rome',
    });
  } catch { return iso; }
}

function fmtEur(n: number): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n}`;
}

// ─── Category map ─────────────────────────────────────────────────────────────

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

// ─── Collapse retry loops ────────────────────────────────────────────────────
// Multiple consecutive failed checks for the same system_id are collapsed:
// - if followed by a successful check → annotate success with attempt count
// - if no subsequent success → single generic "Elaborazione ripetuta" event

function collapseRetries(events: AuditEvent[]): AuditEvent[] {
  const chrono = [...events].reverse(); // work oldest-first
  const out: AuditEvent[] = [];
  let i = 0;

  while (i < chrono.length) {
    const ev = chrono[i];

    if (ev.event_type === 'compliance_check_failed') {
      const sysId = String(ev.details?.system_id ?? '');
      const cluster: AuditEvent[] = [ev];
      let j = i + 1;

      while (
        j < chrono.length &&
        chrono[j].event_type === 'compliance_check_failed' &&
        String(chrono[j].details?.system_id ?? '') === sysId
      ) {
        cluster.push(chrono[j]);
        j++;
      }

      const nextIsSuccess =
        j < chrono.length &&
        chrono[j].event_type === 'compliance_check_completed' &&
        String(chrono[j].details?.system_id ?? '') === sysId;

      if (nextIsSuccess) {
        // Absorb failures into success event as a note
        const success: AuditEvent = {
          ...chrono[j],
          details: {
            ...chrono[j].details,
            ...(cluster.length > 0 ? { elaborazioni_precedenti: cluster.length } : {}),
          },
        };
        out.push(success);
        i = j + 1;
      } else {
        // Standalone cluster → single sanitised event
        out.push({
          ...cluster[cluster.length - 1],
          event_label: 'Elaborazione compliance ripetuta',
          details: {
            system_id:   sysId,
            system_name: String(cluster[0].details?.system_name ?? cluster[0].details?.system_id ?? sysId),
            tentativi:   cluster.length,
          },
        });
        i = j;
      }
    } else {
      out.push(ev);
      i++;
    }
  }

  return out.reverse(); // back to newest-first
}

// ─── Sanitise technical details from failed events ────────────────────────────

const TECH_KEYS = new Set(['code', 'maximum', 'minimum', 'inclusive', 'path', 'message', 'stack', 'issues', 'expected', 'received']);

function sanitiseDetails(eventType: string, details: Record<string, unknown>): Record<string, unknown> {
  if (eventType === 'compliance_check_failed') {
    // Strip all Zod/technical error fields
    return {
      ...(details.system_id   ? { system_id:   details.system_id   } : {}),
      ...(details.system_name ? { system_name: details.system_name } : {}),
      ...(details.check_id    ? { check_id:    details.check_id    } : {}),
    };
  }
  // For other events: strip any key that looks like a Zod validation artifact
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) {
    if (!TECH_KEYS.has(k) && v !== null && v !== undefined && v !== '') {
      clean[k] = v;
    }
  }
  return clean;
}

// ─── Render detail string for a row ──────────────────────────────────────────

const SKIP_IN_ROW = new Set(['system_id', 'check_id', '_asyncComplianceCheck']);

function renderDetail(eventType: string, details: Record<string, unknown>): string {
  const clean = sanitiseDetails(eventType, details);
  const parts: string[] = [];

  // System name first if present
  if (clean.system_name)   parts.push(`<strong>${escHtml(String(clean.system_name))}</strong>`);
  if (clean.tool_name)     parts.push(`<strong>${escHtml(String(clean.tool_name))}</strong>`);
  if (clean.risk_level)    parts.push(`Rischio: ${escHtml(String(clean.risk_level))}`);
  if (clean.status === 'gap_found')  parts.push('<span class="chip chip-warn">Gap rilevati</span>');
  if (clean.status === 'compliant')  parts.push('<span class="chip chip-ok">Conforme</span>');
  if (clean.gaps_count !== undefined) parts.push(`Gap rilevati: <strong>${clean.gaps_count}</strong>`);
  if (clean.articles_with_gaps) {
    const arts = Array.isArray(clean.articles_with_gaps) ? clean.articles_with_gaps : [];
    if (arts.length > 0) {
      parts.push(`Articoli con gap: ${arts.map((a: unknown) => `<span class="chip chip-art">${escHtml(String(a))}</span>`).join(' ')}`);
    }
  }
  if (clean.exposure_max)  parts.push(`Esposizione max: <strong>${fmtEur(Number(clean.exposure_max))}</strong>`);
  if (clean.elaborazioni_precedenti) parts.push(`(dopo ${clean.elaborazioni_precedenti} tent. precedenti)`);
  if (clean.tentativi)     parts.push(`Tentativi: ${clean.tentativi}`);
  if (clean.deleted_documents !== undefined) parts.push(`Documenti eliminati: ${clean.deleted_documents}`);

  // Remaining keys not already shown
  const shown = new Set(['system_name','tool_name','risk_level','status','gaps_count','articles_with_gaps','exposure_max','elaborazioni_precedenti','tentativi','deleted_documents','company_name','name']);
  for (const [k, v] of Object.entries(clean)) {
    if (!shown.has(k) && !SKIP_IN_ROW.has(k)) {
      parts.push(`${escHtml(k)}: ${escHtml(String(v))}`);
    }
  }

  return parts.join(' · ');
}

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Actor label ──────────────────────────────────────────────────────────────

function actorLabel(email: string | null, eventType: string): string {
  if (email) return escHtml(email);
  const auto = ['compliance_check_started','compliance_check_completed','compliance_check_failed','document_generated'];
  return auto.includes(eventType) ? 'Sistema (automatico)' : 'N/D';
}

// ─── Status display ───────────────────────────────────────────────────────────

function statusLabel(s: string): string {
  const map: Record<string,string> = {
    compliant:  '<span class="status-ok">Conforme</span>',
    gap_found:  '<span class="status-warn">Gap rilevati</span>',
    checking:   '<span class="status-info">In verifica</span>',
    unchecked:  '<span class="status-muted">Non verificato</span>',
  };
  return map[s] ?? `<span class="status-muted">${escHtml(s)}</span>`;
}

// ─── Table rows ───────────────────────────────────────────────────────────────

function eventRows(events: AuditEvent[]): string {
  return events.map((e, i) => {
    const cat    = CATEGORY[e.event_type] ?? 'Altro';
    const detail = renderDetail(e.event_type, e.details ?? {});
    const actor  = actorLabel(e.actor_email, e.event_type);

    return `
      <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="td-num">${events.length - i}</td>
        <td class="td-ts">
          <div class="ts-date">${fmtShort(e.timestamp)}</div>
          <div class="ts-time">${fmtTime(e.timestamp)}</div>
        </td>
        <td class="td-cat"><span class="cat-badge cat-${cat.toLowerCase().replace(/\s/g,'-')}">${cat}</span></td>
        <td class="td-label">
          <div class="ev-label">${escHtml(e.event_label)}</div>
          ${detail ? `<div class="ev-detail">${detail}</div>` : ''}
        </td>
        <td class="td-actor">${actor}</td>
        <td class="td-id">${escHtml(e.event_id.split('#')[1]?.slice(0,8) ?? '—')}</td>
      </tr>`;
  }).join('');
}

function systemSummaryRows(systems: SystemRow[], events: AuditEvent[]): string {
  if (!systems || systems.length === 0) return '<tr><td colspan="6" style="color:#94a3b8;text-align:center">Nessun sistema AI censito</td></tr>';

  return systems.map(s => {
    // Derive risk level from the most recent completed check in events
    const lastCompleted = events.find(e =>
      e.event_type === 'compliance_check_completed' &&
      String((e.details ?? {})['system_id'] ?? '') === s.system_id
    );
    const risk = lastCompleted ? String((lastCompleted.details ?? {})['risk_level'] ?? '—') : '—';
    const lastCheck = s.last_check_at ? fmtShort(s.last_check_at) : '—';

    return `<tr>
      <td style="font-weight:700">${escHtml(s.tool_name ?? s.system_id)}</td>
      <td>${escHtml(s.role ?? '—')}</td>
      <td>${escHtml(risk)}</td>
      <td>${lastCheck}</td>
      <td>${statusLabel(s.compliance_status ?? 'unchecked')}</td>
      <td style="font-family:monospace;font-weight:700">${fmtEur(s.last_exposure_max ?? 0)}</td>
    </tr>`;
  }).join('');
}

// ─── Main builder ────────────────────────────────────────────────────────────

export function buildAuditTrailPdfHtml(opts: {
  company_name:   string;
  company_id:     string;
  events:         AuditEvent[];
  systems?:       SystemRow[];
  generated_at:   string;
  period_from:    string;
  period_to:      string;
  events_hash?:   string;
  filter_system?: string;
}): string {
  const { company_name, company_id, generated_at, period_from, period_to, events_hash } = opts;
  const systems = opts.systems ?? [];

  // Collapse retry loops then compute stats on processed events
  const events = collapseRetries(opts.events as AuditEvent[]);

  const byCategory = events.reduce<Record<string,number>>((acc, e) => {
    const cat = CATEGORY[e.event_type] ?? 'Altro';
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  const summaryRows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `<tr><td>${cat}</td><td><strong>${count}</strong></td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"/>
<title>Audit Trail — ${escHtml(company_name)}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:10px; color:#1e293b; background:#fff; }

  /* Header */
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding:26px 32px 18px; border-bottom:3px solid #6C47FF; }
  .header h1 { font-size:20px; font-weight:800; color:#6C47FF; letter-spacing:-0.5px; }
  .header .subtitle { font-size:11px; color:#64748b; margin-top:2px; }
  .hright { text-align:right; }
  .badge { display:inline-block; background:#6C47FF; color:#fff; font-size:9px; font-weight:700; padding:3px 10px; border-radius:4px; letter-spacing:.08em; text-transform:uppercase; }
  .gen-date { font-size:9px; color:#64748b; margin-top:4px; }

  /* Company block */
  .company-block { display:flex; gap:20px; padding:12px 32px; background:#f8fafc; border-bottom:1px solid #e2e8f0; }
  .company-block .field label { font-size:8px; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; display:block; margin-bottom:2px; }
  .company-block .field value { font-size:11px; font-weight:700; color:#1e293b; }

  /* Legal intro */
  .intro { margin:18px 32px 14px; padding:16px 20px; border:1px solid #e2e8f0; border-radius:6px; background:#fcfcfd; }
  .intro-title { font-size:11px; font-weight:800; color:#1e293b; text-transform:uppercase; letter-spacing:.08em; border-bottom:2px solid #6C47FF; padding-bottom:6px; margin-bottom:11px; }
  .intro p { font-size:9px; color:#374151; line-height:1.75; margin-bottom:8px; }
  .intro p:last-child { margin-bottom:0; }
  .intro strong { color:#1e293b; }

  /* Section titles */
  .section-title { font-size:10px; font-weight:800; color:#334155; text-transform:uppercase; letter-spacing:.08em; padding:14px 32px 8px; border-top:1px solid #e2e8f0; }

  /* System summary table */
  .sys-table { margin:0 32px 14px; border-collapse:collapse; width:calc(100% - 64px); }
  .sys-table th { background:#1e293b; color:#fff; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; padding:6px 8px; text-align:left; }
  .sys-table td { padding:6px 8px; font-size:9px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
  .sys-table tr:nth-child(even) td { background:#fafafa; }
  .status-ok   { color:#15803d; font-weight:700; }
  .status-warn { color:#b45309; font-weight:700; }
  .status-info { color:#1d4ed8; font-weight:700; }
  .status-muted{ color:#94a3b8; }

  /* Category summary */
  .summary-table { margin:0 32px 10px; border-collapse:collapse; width:calc(100% - 64px); }
  .summary-table td { padding:5px 10px; font-size:9.5px; border:1px solid #e2e8f0; }
  .summary-table tr:first-child td { background:#f8fafc; font-weight:700; font-size:8.5px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }
  .summary-total { margin:0 32px; padding:6px 10px; background:#6C47FF; color:#fff; font-size:10px; font-weight:700; display:flex; justify-content:space-between; border-radius:0 0 4px 4px; }

  /* Events table */
  .events-table { width:calc(100% - 64px); margin:14px 32px 0; border-collapse:collapse; }
  .events-table th { background:#1e293b; color:#fff; font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; padding:7px 8px; text-align:left; }
  .td-num  { width:26px; text-align:center; font-size:9px; color:#94a3b8; font-weight:700; }
  .td-ts   { width:80px; }
  .ts-date { font-size:9px; font-weight:600; color:#334155; }
  .ts-time { font-size:8.5px; color:#64748b; font-family:monospace; }
  .td-cat  { width:68px; }
  .td-actor{ width:130px; font-size:8.5px; color:#64748b; overflow-wrap:break-word; word-break:break-word; }
  .td-id   { width:60px; font-size:8px; color:#94a3b8; font-family:monospace; }
  .ev-label{ font-size:9.5px; font-weight:700; color:#1e293b; }
  .ev-detail{ font-size:8.5px; color:#64748b; margin-top:2px; }
  td { padding:6px 8px; vertical-align:top; border-bottom:1px solid #f1f5f9; }
  .row-even { background:#fff; }
  .row-odd  { background:#fafafa; }

  /* Category badges */
  .cat-badge { display:inline-block; font-size:8px; font-weight:700; padding:2px 6px; border-radius:3px; white-space:nowrap; }
  .cat-account       { background:#ede9fe; color:#5b21b6; }
  .cat-ai-inventory  { background:#dbeafe; color:#1d4ed8; }
  .cat-compliance    { background:#dcfce7; color:#15803d; }
  .cat-documenti     { background:#fef9c3; color:#854d0e; }
  .cat-ai-literacy   { background:#e0f2fe; color:#0369a1; }
  .cat-utenti        { background:#fce7f3; color:#be185d; }
  .cat-altro         { background:#f1f5f9; color:#475569; }

  /* Inline chips */
  .chip { display:inline-block; font-size:7.5px; font-weight:700; padding:1px 5px; border-radius:3px; }
  .chip-ok   { background:#dcfce7; color:#15803d; }
  .chip-warn { background:#fef3c7; color:#92400e; }
  .chip-art  { background:#f1f5f9; color:#334155; }

  /* Footer */
  .footer { margin:20px 32px 0; padding:12px 0; border-top:1px solid #e2e8f0; font-size:8.5px; color:#94a3b8; }
  .footer-top { display:flex; justify-content:space-between; margin-bottom:6px; }
  .footer-hash { font-family:monospace; font-size:7.5px; color:#cbd5e1; word-break:break-all; }
  .footer strong { color:#475569; }
  .page-break { page-break-before:always; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div>
    <h1>Actify — Audit Trail Immutabile</h1>
    <div class="subtitle">Registro ufficiale delle attività di compliance AI Act</div>
  </div>
  <div class="hright">
    <div class="badge">🔒 Documento Ufficiale</div>
    <div class="gen-date">Generato il ${fmtLong(generated_at)}</div>
  </div>
</div>

<!-- COMPANY INFO -->
<div class="company-block">
  <div class="field"><label>Organizzazione</label><value>${escHtml(company_name)}</value></div>
  <div class="field"><label>ID Azienda</label><value style="font-size:9px;font-family:monospace">${escHtml(company_id)}</value></div>
  <div class="field"><label>Periodo</label><value>${fmtShort(period_from)} – ${fmtShort(period_to)}</value></div>
  <div class="field"><label>Totale eventi</label><value>${events.length}</value></div>
</div>

<!-- LEGAL INTRO -->
<div class="intro">
  <div class="intro-title">Nota Introduttiva e Valore Giuridico del Documento</div>
  <p>
    Il presente documento costituisce il <strong>Registro Immutabile delle Attività di Compliance</strong> dell'organizzazione
    <strong>${escHtml(company_name)}</strong>, generato dalla piattaforma Actify in ottemperanza alle disposizioni del
    <strong>Regolamento (UE) 2024/1689 del Parlamento Europeo e del Consiglio</strong> relativo all'intelligenza artificiale
    (di seguito «AI Act»). Il registro raccoglie in forma strutturata e verificabile la totalità delle azioni rilevanti
    ai fini della conformità normativa compiute dall'organizzazione nel periodo compreso tra il
    <strong>${fmtShort(period_from)}</strong> e il <strong>${fmtShort(period_to)}</strong>.
  </p>
  <p>
    Ciascun evento registrato è associato a un <strong>timestamp certificato</strong> espresso nel fuso orario CET
    e a un identificativo univoco non modificabile (<em>event_id</em>), che ne garantisce l'integrità e l'ordine
    cronologico. L'insieme degli eventi è sottoposto a una funzione di hashing crittografico
    (algoritmo <strong>SHA-256</strong>), il cui valore è riportato in calce al documento: qualsiasi
    alterazione successiva alla generazione renderebbe il digest non corrispondente, invalidando il documento.
    Il presente registro è pertanto da considerarsi <strong>prova documentale di terzo livello</strong> ai sensi
    dei principi generali del diritto amministrativo europeo in materia di onere della prova.
  </p>
  <p>
    In sede di ispezione da parte dell'<strong>Autorità Nazionale competente per l'IA</strong> ovvero in caso di
    contestazione formale avviata dalle autorità di vigilanza di mercato, il presente documento è idoneo ad
    attestare che l'organizzazione ha adottato le misure tecnico-organizzative previste dalla normativa,
    ha condotto le valutazioni di conformità nei termini stabiliti e ha implementato i provvedimenti
    correttivi richiesti, con indicazione puntuale delle date e degli operatori responsabili.
    La <strong>diligenza dimostrata</strong> e la <strong>buona fede dell'organizzazione</strong> costituiscono,
    ai sensi dell'Art. 99 AI Act, fattori attenuanti di rilievo nell'applicazione delle sanzioni amministrative
    pecuniarie, potendo determinare la differenza sostanziale tra l'irrogazione della sanzione massima
    (fino a <strong>35 milioni di euro</strong> o il <strong>7% del fatturato mondiale annuo</strong>) e quella minima prevista.
  </p>
  <p>
    Il documento è generato automaticamente dalla piattaforma Actify e non richiede apposizione di firma
    elettronica qualificata per acquisire valore probatorio, in quanto la sua autenticità è garantita dalla
    catena crittografica di integrità sopra descritta. Si raccomanda di conservarne copia in formato immodificabile
    per un periodo non inferiore a <strong>dieci anni</strong> dalla data di generazione, in conformità agli obblighi
    di documentazione previsti dall'Art. 12 e dall'Art. 17 del medesimo Regolamento.
  </p>
</div>

<!-- SYSTEM SUMMARY TABLE -->
${systems.length > 0 ? `
<div class="section-title">Panoramica sistemi AI censiti</div>
<table class="sys-table">
  <thead>
    <tr>
      <th>Sistema AI</th>
      <th>Ruolo</th>
      <th>Risk Level</th>
      <th>Ultimo check</th>
      <th>Stato compliance</th>
      <th>Esposizione max</th>
    </tr>
  </thead>
  <tbody>${systemSummaryRows(systems as SystemRow[], events)}</tbody>
</table>
` : ''}

<!-- CATEGORY SUMMARY -->
<div class="section-title">Riepilogo per categoria</div>
<table class="summary-table">
  <tr><td>Categoria</td><td>Numero eventi</td></tr>
  ${summaryRows}
</table>
<div class="summary-total">
  <span>Totale eventi nel periodo</span>
  <span>${events.length}</span>
</div>

<!-- EVENTS TABLE -->
<div class="section-title" style="margin-top:18px">Registro completo degli eventi</div>
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
  <div class="footer-top">
    <div><strong>Actify</strong> — Piattaforma AI Act Compliance | official-actify.com</div>
    <div>Documento generato automaticamente — non richiede firma</div>
    <div>Reg. UE 2024/1689 (AI Act) · Art. 99</div>
  </div>
  ${events_hash ? `<div class="footer-hash">SHA-256 (eventi): ${escHtml(events_hash)}</div>` : ''}
</div>

</body>
</html>`;
}
