// Deterministic Art. 4 Report — no LLM involved, pure data rendering

interface LiteracyEvidence {
  evidence_type:  'certification' | 'internal_training';
  title:          string;
  date:           string;
  people_count:   number;
  issuer?:        string | null;
  url?:           string | null;
  topics?:        string[] | null;
  responsible?:   string | null;
  notes?:         string | null;
}

interface LiteracyProfileReport {
  profile_type: string;
  label:        string;
  headcount:    number;
  merged_with:  string | null;
  coverage_pct: number;
  evidences:    LiteracyEvidence[];
}

export interface LiteracyReportPayload {
  company_name: string;
  tool_name:    string;
  vendor:       string;
  category:     string;
  system_role:  'provider' | 'deployer';
  profiles:     LiteracyProfileReport[];
  generated_at: string;
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return iso; }
}

function statusLabel(pct: number, headcount: number): string {
  if (headcount === 0) return '⬜ Non configurato';
  if (pct >= 80)       return '✓ Conforme';
  if (pct > 0)         return '⚠ Parziale';
  return '✗ Non avviato';
}

function statusColor(pct: number, headcount: number): string {
  if (headcount === 0) return '#94a3b8';
  if (pct >= 80)       return '#16A34A';
  if (pct > 0)         return '#CA8A04';
  return '#DC2626';
}

function coverageBar(pct: number): string {
  const filled = Math.round(pct / 5); // out of 20 blocks
  return '█'.repeat(filled) + '░'.repeat(20 - filled) + ` ${pct}%`;
}

function renderEvidence(e: LiteracyEvidence, i: number): string {
  const typeLabel = e.evidence_type === 'certification' ? 'Certificazione esterna' : 'Formazione interna';
  const typeColor = e.evidence_type === 'certification' ? '#6366F1' : '#0EA5E9';
  return `
    <div class="evidence-row">
      <div class="ev-header">
        <span class="ev-num">${i + 1}</span>
        <span class="ev-type" style="color:${typeColor}">${typeLabel}</span>
      </div>
      <div class="ev-title">${e.title}</div>
      <table class="ev-table">
        <tr><td>Data</td><td>${fmtDate(e.date)}</td></tr>
        <tr><td>Persone coperte</td><td>${e.people_count}</td></tr>
        ${e.issuer ? `<tr><td>Ente erogatore</td><td>${e.issuer}</td></tr>` : ''}
        ${e.url    ? `<tr><td>Riferimento</td><td>${e.url}</td></tr>` : ''}
        ${e.topics?.length ? `<tr><td>Argomenti trattati</td><td>${e.topics.join(' · ')}</td></tr>` : ''}
        ${e.responsible ? `<tr><td>Responsabile</td><td>${e.responsible}</td></tr>` : ''}
        ${e.notes ? `<tr><td>Note</td><td><em>${e.notes}</em></td></tr>` : ''}
      </table>
    </div>`;
}

function renderProfile(p: LiteracyProfileReport, idx: number): string {
  const color    = statusColor(p.coverage_pct, p.headcount);
  const label    = statusLabel(p.coverage_pct, p.headcount);
  const isMerged = !!p.merged_with;

  return `
    <div class="profile-block${isMerged ? ' merged' : ''}">
      <div class="profile-header">
        <div>
          <span class="profile-num">${idx + 1}.</span>
          <span class="profile-name">${p.label}</span>
          ${isMerged ? `<span class="merge-badge">Unificato con profilo principale</span>` : ''}
        </div>
        <span class="profile-status" style="color:${color}">${label}</span>
      </div>
      ${isMerged ? `
        <p class="merged-note">Profilo unificato — le evidenze del profilo principale coprono anche questo ruolo. In questa organizzazione le figure di ${p.label.toLowerCase()} coincidono con quelle del profilo principale.</p>
      ` : `
        <div class="coverage-row">
          <div class="coverage-nums">
            <span class="cov-pct" style="color:${color}">${p.headcount === 0 ? '—' : p.coverage_pct + '%'}</span>
            <span class="cov-sub">${p.headcount === 0 ? 'Headcount non configurato' : `${p.headcount} persone nel ruolo`}</span>
          </div>
          ${p.headcount > 0 ? `<div class="cov-bar-wrap"><div class="cov-bar" style="width:${p.coverage_pct}%;background:${color}"></div></div>` : ''}
        </div>
        ${p.evidences.length === 0 ? `
          <p class="no-evidence">Nessuna evidenza registrata per questo profilo.</p>
        ` : p.evidences.map((e, i) => renderEvidence(e as LiteracyEvidence, i)).join('')}
      `}
    </div>`;
}

export function buildLiteracyReportHtml(payload: LiteracyReportPayload): string {
  const { company_name, tool_name, vendor, category, system_role, profiles, generated_at } = payload;

  const roleLabel  = system_role === 'provider' ? 'Provider' : 'Deployer';
  const allActive  = profiles.filter(p => !p.merged_with);
  const compliant  = allActive.filter(p => p.coverage_pct >= 80 && p.headcount > 0);
  const globalOk   = allActive.length > 0 && compliant.length === allActive.length;
  const globalColor = globalOk ? '#16A34A' : allActive.some(p => p.coverage_pct > 0) ? '#CA8A04' : '#DC2626';
  const globalLabel = globalOk ? '✓ Conforme — copertura ≥ 80% su tutti i profili' : allActive.some(p => p.coverage_pct > 0) ? '⚠ Parzialmente conforme' : '✗ Non avviato';

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #0f172a; background: #fff; }
  .page { max-width: 780px; margin: 0 auto; padding: 48px 48px 64px; }

  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #22C55E; margin-bottom: 32px; }
  .doc-brand  { font-size: 24px; font-weight: 900; color: #22C55E; letter-spacing: -0.5px; }
  .doc-meta   { text-align: right; font-size: 9pt; color: #64748b; line-height: 1.7; }

  h1 { font-size: 18pt; font-weight: 900; color: #0f172a; margin-bottom: 4px; }
  h2 { font-size: 13pt; font-weight: 800; color: #0f172a; margin: 32px 0 14px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
  h3 { font-size: 10pt; font-weight: 700; color: #334155; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .meta-row  { display: flex; padding: 10px 16px; border-bottom: 1px solid #e2e8f0; }
  .meta-row:last-child { border-bottom: none; }
  .meta-label { width: 180px; font-size: 9pt; color: #64748b; font-weight: 600; }
  .meta-val   { font-size: 9pt; color: #0f172a; flex: 1; }
  .role-badge { display: inline-block; padding: 2px 8px; background: rgba(34,197,94,0.12); color: #16A34A; border-radius: 4px; font-weight: 700; font-size: 8.5pt; }

  .global-status { margin: 20px 0 28px; padding: 14px 18px; border-radius: 8px; border-left: 5px solid; }
  .global-label  { font-weight: 800; font-size: 13pt; }
  .global-sub    { font-size: 9pt; margin-top: 4px; opacity: 0.8; }

  .profile-block { margin-bottom: 28px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .profile-block.merged { opacity: 0.65; }
  .profile-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .profile-num  { font-weight: 900; color: #64748b; margin-right: 8px; }
  .profile-name { font-weight: 700; font-size: 11pt; }
  .profile-status { font-weight: 700; font-size: 9pt; }
  .merge-badge  { display: inline-block; margin-left: 10px; padding: 2px 7px; background: #f1f5f9; color: #64748b; border-radius: 4px; font-size: 8pt; font-weight: 600; }
  .merged-note  { padding: 12px 18px; font-size: 9pt; color: #64748b; font-style: italic; }

  .coverage-row   { display: flex; align-items: center; gap: 20px; padding: 14px 18px; border-bottom: 1px solid #f1f5f9; }
  .coverage-nums  { flex-shrink: 0; }
  .cov-pct        { font-size: 22pt; font-weight: 900; display: block; }
  .cov-sub        { font-size: 8.5pt; color: #64748b; }
  .cov-bar-wrap   { flex: 1; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; }
  .cov-bar        { height: 100%; border-radius: 5px; }

  .no-evidence    { padding: 12px 18px; font-size: 9pt; color: #94a3b8; font-style: italic; }

  .evidence-row   { padding: 12px 18px; border-bottom: 1px solid #f8fafc; }
  .evidence-row:last-child { border-bottom: none; }
  .ev-header      { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .ev-num         { width: 20px; height: 20px; border-radius: 50%; background: #f1f5f9; color: #64748b; font-size: 8pt; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ev-type        { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .ev-title       { font-weight: 700; font-size: 10.5pt; margin-bottom: 8px; color: #0f172a; }
  .ev-table       { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .ev-table td    { padding: 3px 0; vertical-align: top; }
  .ev-table td:first-child { width: 160px; color: #64748b; font-weight: 600; }

  .declaration    { margin-top: 36px; padding: 18px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 9pt; color: #334155; line-height: 1.7; }
  .declaration strong { color: #0f172a; }
  .declaration .disclaimer { margin-top: 10px; color: #64748b; font-style: italic; }

  .doc-footer     { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="page">

  <div class="doc-header">
    <div>
      <div class="doc-brand">Actify</div>
      <h1>Report Conformità Art. 4 EU AI Act</h1>
    </div>
    <div class="doc-meta">
      Generato il: ${fmtDate(generated_at)}<br>
      Azienda: <strong>${company_name}</strong><br>
      Sistema AI: <strong>${tool_name}</strong>
    </div>
  </div>

  <h2>§ 1 — Sistema AI</h2>
  <div class="meta-grid">
    <div class="meta-row"><span class="meta-label">Denominazione</span><span class="meta-val">${tool_name}</span></div>
    <div class="meta-row"><span class="meta-label">Fornitore</span><span class="meta-val">${vendor || '—'}</span></div>
    <div class="meta-row"><span class="meta-label">Categoria</span><span class="meta-val">${category || '—'}</span></div>
    <div class="meta-row"><span class="meta-label">Ruolo normativo</span><span class="meta-val"><span class="role-badge">${roleLabel}</span></span></div>
    <div class="meta-row"><span class="meta-label">Riferimento normativo</span><span class="meta-val">Art. 4, Reg. (UE) 2024/1689 (EU AI Act)</span></div>
    <div class="meta-row"><span class="meta-label">Data generazione</span><span class="meta-val">${fmtDate(generated_at)}</span></div>
  </div>

  <h2>§ 2 — Stato globale Art. 4</h2>
  <div class="global-status" style="background:${globalColor}11;border-color:${globalColor}">
    <div class="global-label" style="color:${globalColor}">${globalLabel}</div>
    <div class="global-sub" style="color:${globalColor}">
      ${compliant.length} / ${allActive.length} profili con copertura ≥ 80%
    </div>
  </div>

  <h2>§ 3 — Profili e copertura</h2>
  ${profiles.map((p, i) => renderProfile(p, i)).join('')}

  <h2>§ 4 — Dichiarazione del responsabile</h2>
  <div class="declaration">
    <p>Il presente documento è generato da <strong>Actify</strong> su dichiarazione del Responsabile Compliance di
    <strong>${company_name}</strong> e attesta le misure adottate ai sensi dell'Art. 4 del Reg. (UE) 2024/1689 (EU AI Act)
    in relazione al sistema AI <strong>${tool_name}</strong> nella qualità di <strong>${roleLabel}</strong>.</p>
    <p class="disclaimer">
      Il documento non certifica la conformità all'AI Act.<br>
      Le informazioni riportate (headcount, persone formate, date, evidenze) sono fornite sotto esclusiva responsabilità
      dell'organizzazione dichiarante e non sono state verificate da Actify o da terzi.<br>
      Actify fornisce uno strumento tecnico di raccolta e organizzazione delle informazioni — non presta consulenza legale né normativa.
    </p>
  </div>

  <div class="doc-footer">
    <span>Generato da Actify · AI Act Compliance Platform</span>
    <span>${generated_at}</span>
  </div>
</div>
</body>
</html>`;
}
