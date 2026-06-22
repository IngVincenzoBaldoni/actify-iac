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

function statusColor(pct: number, headcount: number): string {
  if (headcount === 0) return '#94a3b8';
  if (pct >= 80)       return '#16A34A';
  if (pct > 0)         return '#CA8A04';
  return '#DC2626';
}

function statusLabel(pct: number, headcount: number): string {
  if (headcount === 0) return 'Non configurato';
  if (pct >= 80)       return 'Conforme';
  if (pct > 0)         return 'Parziale';
  return 'Non avviato';
}

function renderEvidence(e: LiteracyEvidence, i: number): string {
  const typeLabel = e.evidence_type === 'certification' ? 'CERTIFICAZIONE ESTERNA' : 'FORMAZIONE INTERNA';
  const typeColor = e.evidence_type === 'certification' ? '#6366F1' : '#0EA5E9';
  const typeBg    = e.evidence_type === 'certification' ? 'rgba(99,102,241,0.07)' : 'rgba(14,165,233,0.07)';
  return `
    <div class="ev-card">
      <div class="ev-top">
        <span class="ev-num">${i + 1}</span>
        <span class="ev-type" style="color:${typeColor};background:${typeBg}">${typeLabel}</span>
      </div>
      <div class="ev-title">${e.title}</div>
      <div class="ev-details">
        <div class="ev-detail-row"><span class="ev-key">Data</span><span>${fmtDate(e.date)}</span></div>
        <div class="ev-detail-row"><span class="ev-key">Persone coperte</span><span>${e.people_count}</span></div>
        ${e.issuer        ? `<div class="ev-detail-row"><span class="ev-key">Ente erogatore</span><span>${e.issuer}</span></div>` : ''}
        ${e.url           ? `<div class="ev-detail-row"><span class="ev-key">Riferimento</span><span style="word-break:break-all">${e.url}</span></div>` : ''}
        ${e.topics?.length ? `<div class="ev-detail-row"><span class="ev-key">Argomenti trattati</span><span>${e.topics.join(' · ')}</span></div>` : ''}
        ${e.responsible   ? `<div class="ev-detail-row"><span class="ev-key">Responsabile</span><span>${e.responsible}</span></div>` : ''}
        ${e.notes         ? `<div class="ev-detail-row"><span class="ev-key">Note</span><span><em>${e.notes}</em></span></div>` : ''}
      </div>
    </div>`;
}

function renderStandaloneProfile(p: LiteracyProfileReport, num: number): string {
  const color = statusColor(p.coverage_pct, p.headcount);
  const label = statusLabel(p.coverage_pct, p.headcount);
  const totalCovered = p.evidences.reduce((s, e) => s + e.people_count, 0);
  return `
    <div class="profile-block">
      <div class="profile-header">
        <div class="profile-header-left">
          <span class="profile-num">${num}</span>
          <span class="profile-name">${p.label}</span>
        </div>
        <span class="profile-status-badge" style="color:${color};background:${color}18;border-color:${color}33">${label}</span>
      </div>
      <div class="profile-body">
        ${p.headcount > 0 ? `
          <div class="cov-row">
            <div class="cov-left">
              <span class="cov-pct" style="color:${color}">${p.coverage_pct}%</span>
              <span class="cov-sub">${p.headcount} persone nel ruolo · ${totalCovered} formate</span>
            </div>
            <div class="cov-bar-wrap"><div class="cov-bar" style="width:${p.coverage_pct}%;background:${color}"></div></div>
          </div>
        ` : `<div class="not-configured">Headcount non ancora configurato per questo profilo.</div>`}
        ${p.evidences.length > 0
          ? `<div class="ev-list">${p.evidences.map((e, i) => renderEvidence(e, i)).join('')}</div>`
          : `<div class="no-evidence">Nessuna evidenza registrata per questo profilo.</div>`}
      </div>
    </div>`;
}

function renderUnifiedProfile(primary: LiteracyProfileReport, secondary: LiteracyProfileReport, num: number): string {
  const allEvidences = [...primary.evidences, ...secondary.evidences];
  const totalCovered = allEvidences.reduce((s, e) => s + e.people_count, 0);
  const headcount    = primary.headcount;
  const coveragePct  = headcount > 0 ? Math.min(100, Math.round((totalCovered / headcount) * 100)) : 0;
  const color        = statusColor(coveragePct, headcount);
  const label        = statusLabel(coveragePct, headcount);

  return `
    <div class="profile-block profile-unified">
      <div class="profile-header">
        <div class="profile-header-left">
          <span class="profile-num">${num}</span>
          <span class="profile-name">${primary.label} + ${secondary.label}</span>
          <span class="unified-badge">Profilo unificato · PMI piccola</span>
        </div>
        <span class="profile-status-badge" style="color:${color};background:${color}18;border-color:${color}33">${label}</span>
      </div>
      <div class="profile-unified-note">
        In questa organizzazione i ruoli di <strong>${primary.label}</strong> e <strong>${secondary.label}</strong> coincidono nelle stesse persone.
        Le evidenze registrate coprono entrambi i profili ai fini del calcolo Art. 4.
      </div>
      <div class="profile-body">
        ${headcount > 0 ? `
          <div class="cov-row">
            <div class="cov-left">
              <span class="cov-pct" style="color:${color}">${coveragePct}%</span>
              <span class="cov-sub">${headcount} persone nel ruolo · ${totalCovered} formate (evidenze combinate)</span>
            </div>
            <div class="cov-bar-wrap"><div class="cov-bar" style="width:${coveragePct}%;background:${color}"></div></div>
          </div>
        ` : `<div class="not-configured">Headcount non ancora configurato.</div>`}
        ${allEvidences.length > 0
          ? `<div class="ev-list">${allEvidences.map((e, i) => renderEvidence(e, i)).join('')}</div>`
          : `<div class="no-evidence">Nessuna evidenza registrata.</div>`}
      </div>
    </div>`;
}

// ─── Consolidated (multi-system) report ──────────────────────────────────────

export interface ConsolidatedSystemPayload {
  system_id:          string;
  tool_name:          string;
  vendor:             string;
  category:           string;
  system_role:        'provider' | 'deployer';
  risk_classification: 'prohibited' | 'high' | 'limited' | 'minimal';
  profiles:           LiteracyProfileReport[];
}

const RISK_META: Record<string, { label: string; color: string }> = {
  prohibited: { label: 'Vietato',          color: '#F87171' },
  high:       { label: 'Alto Rischio',     color: '#FB923C' },
  limited:    { label: 'Rischio Limitato', color: '#FCD34D' },
  minimal:    { label: 'Rischio Minimo',   color: '#4ADE80' },
};

export interface ConsolidatedLiteracyReportPayload {
  company_name: string;
  generated_at: string;
  systems:      ConsolidatedSystemPayload[];
}

function buildSystemBlocks(profiles: LiteracyProfileReport[]): Array<
  { type: 'unified'; primary: LiteracyProfileReport; secondary: LiteracyProfileReport }
  | { type: 'standalone'; profile: LiteracyProfileReport }
> {
  type Block =
    | { type: 'unified'; primary: LiteracyProfileReport; secondary: LiteracyProfileReport }
    | { type: 'standalone'; profile: LiteracyProfileReport };
  const blocks: Block[] = [];
  const usedTypes = new Set<string>();
  for (const p of profiles) {
    if (usedTypes.has(p.profile_type)) continue;
    if (p.merged_with !== null) continue;
    const secondary = profiles.find(s => s.merged_with === p.profile_type);
    if (secondary) {
      blocks.push({ type: 'unified', primary: p, secondary });
      usedTypes.add(p.profile_type);
      usedTypes.add(secondary.profile_type);
    } else {
      blocks.push({ type: 'standalone', profile: p });
      usedTypes.add(p.profile_type);
    }
  }
  return blocks;
}

function systemOverallStatus(profiles: LiteracyProfileReport[]): { color: string; label: string; icon: string } {
  const blocks = buildSystemBlocks(profiles);
  const activePcts = blocks.map(b => {
    if (b.type === 'unified') {
      const allEv = [...b.primary.evidences, ...b.secondary.evidences];
      const total = allEv.reduce((s, e) => s + e.people_count, 0);
      const hc = b.primary.headcount;
      return { hc, pct: hc > 0 ? Math.min(100, Math.round((total / hc) * 100)) : 0 };
    }
    return { hc: b.profile.headcount, pct: b.profile.coverage_pct };
  });
  const configured = activePcts.filter(p => p.hc > 0);
  const compliant  = configured.filter(p => p.pct >= 80);
  if (configured.length > 0 && compliant.length === configured.length)
    return { color: '#16A34A', label: 'Conforme', icon: '✓' };
  if (configured.some(p => p.pct > 0))
    return { color: '#CA8A04', label: 'Parziale', icon: '⚠' };
  return { color: '#DC2626', label: 'Non avviato', icon: '✗' };
}

export function buildConsolidatedLiteracyReportHtml(payload: ConsolidatedLiteracyReportPayload): string {
  const { company_name, generated_at, systems } = payload;
  const totalSystems = systems.length;

  const summaryRows = systems.map((sys, i) => {
    const st = systemOverallStatus(sys.profiles);
    const roleColor = sys.system_role === 'provider' ? '#6366F1' : '#0EA5E9';
    const roleLabel = sys.system_role === 'provider' ? 'Provider' : 'Deployer';
    const risk = RISK_META[sys.risk_classification] ?? RISK_META.minimal;
    const blocks = buildSystemBlocks(sys.profiles);
    const profilesConfigured = blocks.filter(b =>
      b.type === 'unified' ? b.primary.headcount > 0 : b.profile.headcount > 0
    ).length;
    return `
      <tr>
        <td style="text-align:center;font-weight:700;color:#64748b">${i + 1}</td>
        <td><strong>${sys.tool_name}</strong>${sys.vendor ? `<br><span style="font-size:8.5pt;color:#94a3b8">${sys.vendor}</span>` : ''}</td>
        <td><span class="role-chip" style="background:${roleColor}15;color:${roleColor}">${roleLabel}</span></td>
        <td style="text-align:center">
          <span style="font-weight:700;color:${risk.color}">${risk.label}</span>
        </td>
        <td style="text-align:center">${profilesConfigured} / ${blocks.length}</td>
        <td style="text-align:center">
          <span style="font-weight:700;color:${st.color}">${st.icon} ${st.label}</span>
        </td>
      </tr>`;
  }).join('');

  const systemSections = systems.map((sys, si) => {
    const st = systemOverallStatus(sys.profiles);
    const roleColor = sys.system_role === 'provider' ? '#6366F1' : '#0EA5E9';
    const roleLabel = sys.system_role === 'provider' ? 'Provider' : 'Deployer';
    const risk = RISK_META[sys.risk_classification] ?? RISK_META.minimal;
    const blocks = buildSystemBlocks(sys.profiles);

    const profilesHtml = blocks.map((b, bi) =>
      b.type === 'unified'
        ? renderUnifiedProfile(b.primary, b.secondary, bi + 1)
        : renderStandaloneProfile(b.profile, bi + 1)
    ).join('');

    return `
      <div class="sys-section">
        <div class="sys-section-header">
          <div class="sys-section-title-row">
            <span class="sys-section-num">${si + 1}</span>
            <div>
              <span class="sys-section-name">${sys.tool_name}</span>
              ${sys.vendor ? `<span class="sys-section-vendor">${sys.vendor}</span>` : ''}
              ${sys.category ? `<span class="sys-section-vendor">· ${sys.category}</span>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
            <span class="role-chip" style="background:${roleColor}15;color:${roleColor};font-size:9pt">${roleLabel}</span>
            <span style="font-size:8.5pt;font-weight:700;padding:3px 9px;border-radius:5px;border:1px solid ${risk.color}44;color:${risk.color};background:${risk.color}18">${risk.label}</span>
            <span class="profile-status-badge" style="color:${st.color};background:${st.color}18;border-color:${st.color}33">${st.icon} ${st.label}</span>
          </div>
        </div>
        <div class="sys-section-body">
          ${profilesHtml}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #0f172a; background: #fff; -webkit-print-color-adjust: exact; }
  .page { max-width: 800px; margin: 0 auto; padding: 0 0 64px; }

  .cover { padding: 48px 56px 40px; border-bottom: 4px solid #22C55E; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-start; }
  .cover-brand { font-size: 28px; font-weight: 900; color: #22C55E; letter-spacing: -0.5px; margin-bottom: 4px; }
  .cover-title { font-size: 22pt; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; line-height: 1.15; }
  .cover-subtitle { font-size: 11pt; color: #64748b; margin-top: 6px; }
  .cover-badge { display: inline-block; margin-top: 12px; padding: 4px 14px; border-radius: 20px; background: #16A34A18; color: #16A34A; font-size: 9.5pt; font-weight: 800; border: 1px solid #16A34A33; }
  .cover-right { text-align: right; }
  .cover-meta-row { font-size: 9.5pt; color: #64748b; margin-bottom: 4px; line-height: 1.6; }
  .cover-meta-row strong { color: #0f172a; }

  .content { padding: 0 56px; }
  .intro-section { margin-bottom: 36px; }
  .intro-section p { font-size: 10pt; color: #334155; line-height: 1.8; text-align: justify; }
  .intro-section p + p { margin-top: 12px; }
  .section { margin-bottom: 36px; }
  .section-title { font-size: 10pt; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.08em; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 18px; }

  .summary-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 9.5pt; }
  .summary-table th { background: #f8fafc; font-weight: 800; color: #475569; padding: 10px 14px; border-bottom: 2px solid #e2e8f0; text-align: left; }
  .summary-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .summary-table tr:last-child td { border-bottom: none; }

  .role-chip { display: inline-block; padding: 2px 10px; border-radius: 5px; font-weight: 700; font-size: 9pt; }

  .sys-section { margin-bottom: 40px; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
  .sys-section-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 22px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; gap: 16px; }
  .sys-section-title-row { display: flex; align-items: center; gap: 12px; }
  .sys-section-num { width: 28px; height: 28px; border-radius: 50%; background: #22C55E1a; color: #16A34A; font-size: 11pt; font-weight: 900; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1.5px solid #16A34A33; }
  .sys-section-name { font-weight: 900; font-size: 13pt; color: #0f172a; }
  .sys-section-vendor { font-size: 9pt; color: #94a3b8; margin-left: 8px; }
  .sys-section-body { padding: 20px 22px; }

  .profile-block { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 18px; }
  .profile-block.profile-unified { border-color: rgba(99,102,241,.3); }
  .profile-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .profile-block.profile-unified .profile-header { background: rgba(99,102,241,.04); border-bottom-color: rgba(99,102,241,.15); }
  .profile-header-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .profile-num { width: 22px; height: 22px; border-radius: 50%; background: #e2e8f0; color: #475569; font-size: 8.5pt; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .profile-name { font-weight: 800; font-size: 11pt; color: #0f172a; }
  .unified-badge { font-size: 8pt; font-weight: 700; padding: 2px 8px; background: rgba(99,102,241,.1); color: #6366F1; border-radius: 4px; border: 1px solid rgba(99,102,241,.2); }
  .profile-status-badge { font-size: 8.5pt; font-weight: 700; padding: 3px 10px; border-radius: 5px; border: 1px solid; white-space: nowrap; flex-shrink: 0; }
  .profile-unified-note { padding: 10px 18px; font-size: 9pt; color: #475569; background: rgba(99,102,241,.03); border-bottom: 1px solid rgba(99,102,241,.1); line-height: 1.6; }
  .profile-body { padding: 14px 18px; }
  .cov-row { display: flex; align-items: center; gap: 20px; margin-bottom: 14px; }
  .cov-left { flex-shrink: 0; min-width: 130px; }
  .cov-pct { font-size: 26pt; font-weight: 900; display: block; line-height: 1; }
  .cov-sub { font-size: 8.5pt; color: #64748b; display: block; margin-top: 3px; }
  .cov-bar-wrap { flex: 1; height: 9px; background: #e2e8f0; border-radius: 5px; overflow: hidden; }
  .cov-bar { height: 100%; border-radius: 5px; }
  .not-configured { font-size: 9pt; color: #94a3b8; font-style: italic; margin-bottom: 12px; }
  .no-evidence { font-size: 9pt; color: #94a3b8; font-style: italic; padding: 6px 0; }

  .ev-list { display: flex; flex-direction: column; gap: 8px; }
  .ev-card { border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; }
  .ev-top { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .ev-num { width: 20px; height: 20px; border-radius: 50%; background: #e2e8f0; color: #475569; font-size: 7.5pt; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ev-type { font-size: 7pt; font-weight: 800; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 4px; }
  .ev-title { font-weight: 800; font-size: 10.5pt; padding: 9px 12px 5px; color: #0f172a; }
  .ev-details { padding: 0 12px 10px; }
  .ev-detail-row { display: flex; gap: 14px; padding: 3px 0; font-size: 8.5pt; border-bottom: 1px solid #f1f5f9; }
  .ev-detail-row:last-child { border-bottom: none; }
  .ev-key { width: 140px; flex-shrink: 0; color: #64748b; font-weight: 600; }

  .declaration { padding: 18px 22px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
  .declaration p { font-size: 9.5pt; color: #334155; line-height: 1.75; }
  .declaration .disclaimer { margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0; color: #64748b; font-style: italic; font-size: 9pt; line-height: 1.7; }

  .doc-footer { margin-top: 40px; padding: 0 56px; }
  .doc-footer-inner { padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="page">

  <!-- COVER -->
  <div class="cover">
    <div>
      <div class="cover-brand">Actify</div>
      <div class="cover-title">Attestazione Consolidata<br>Art. 4 — AI Literacy</div>
      <div class="cover-subtitle">Reg. (UE) 2024/1689 — EU AI Act</div>
      <span class="cover-badge">✓ Tutti i ${totalSystems} sistemi AI conformi</span>
    </div>
    <div class="cover-right">
      <div class="cover-meta-row">Data: <strong>${fmtDate(generated_at)}</strong></div>
      <div class="cover-meta-row">Azienda: <strong>${company_name}</strong></div>
      <div class="cover-meta-row">Sistemi AI censiti: <strong>${totalSystems}</strong></div>
      <div class="cover-meta-row">Stato globale: <strong style="color:#16A34A">Conforme Art. 4</strong></div>
    </div>
  </div>

  <div class="content">

    <!-- INTRO -->
    <div class="section">
      <div class="intro-section">
        <p>
          Il presente documento costituisce un'attestazione formale consolidata delle misure adottate
          dall'organizzazione <strong>${company_name}</strong> in adempimento all'obbligo di <strong>AI literacy</strong>
          previsto dall'<strong>Art. 4 del Regolamento (UE) 2024/1689</strong> (di seguito "AI Act").
          L'attestato ha carattere consolidato in quanto documenta, in un unico atto formale, la conformità
          di tutti i sistemi AI censiti nell'inventario aziendale alla data di generazione del presente documento.
        </p>
        <p>
          Per ciascun sistema AI incluso nel presente attestato, è verificato che almeno l'80% delle persone
          in ogni profilo di ruolo attivato risulta coperta da evidenze documentate — certificazioni rilasciate
          da enti terzi o sessioni di formazione interna formalmente registrate sulla piattaforma Actify.
          Il documento costituisce prova ispettiva da conservare agli atti e da esibire in sede di audit o
          ispezione da parte delle autorità nazionali competenti ai sensi dell'AI Act.
        </p>
      </div>
    </div>

    <!-- § 1 — QUADRO RIEPILOGATIVO -->
    <div class="section">
      <div class="section-title">§ 1 — Quadro riepilogativo dei sistemi AI</div>
      <table class="summary-table">
        <thead>
          <tr>
            <th style="width:36px;text-align:center">#</th>
            <th>Sistema AI</th>
            <th style="width:90px">Ruolo normativo</th>
            <th style="width:120px;text-align:center">Livello di rischio</th>
            <th style="width:100px;text-align:center">Profili config.</th>
            <th style="width:95px;text-align:center">Stato Art. 4</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRows}
        </tbody>
      </table>
    </div>

    <!-- § 2 onward — PER-SYSTEM DETAIL -->
    <div class="section">
      <div class="section-title">§ 2 — Dettaglio per sistema AI</div>
      ${systemSections}
    </div>

    <!-- § 3 — DICHIARAZIONE -->
    <div class="section">
      <div class="section-title">§ 3 — Dichiarazione del responsabile</div>
      <div class="declaration">
        <p>
          Il presente documento è generato da <strong>Actify</strong> su dichiarazione del Responsabile Compliance di
          <strong>${company_name}</strong> e attesta le misure di formazione e sensibilizzazione adottate ai sensi
          dell'Art. 4 del Reg. (UE) 2024/1689 (EU AI Act) in relazione a tutti i <strong>${totalSystems} sistemi AI</strong>
          censiti nell'inventario aziendale alla data del ${fmtDate(generated_at)}.
        </p>
        <div class="disclaimer">
          Il documento non certifica la conformità all'AI Act e non ha valore legale autonomo.<br>
          Le informazioni riportate — headcount, persone formate, date ed evidenze — sono fornite sotto esclusiva
          responsabilità dell'organizzazione dichiarante e non sono state verificate da Actify né da soggetti terzi.<br>
          Actify è uno strumento tecnico di raccolta e organizzazione delle informazioni: non presta consulenza legale né normativa.
        </div>
      </div>
    </div>

  </div><!-- /content -->

  <div class="doc-footer">
    <div class="doc-footer-inner">
      <span>Generato da Actify · AI Act Compliance Platform · ${company_name}</span>
      <span>${generated_at}</span>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ─── Single-system report ─────────────────────────────────────────────────────

export function buildLiteracyReportHtml(payload: LiteracyReportPayload): string {
  const { company_name, tool_name, vendor, category, system_role, profiles, generated_at } = payload;

  const roleLabel  = system_role === 'provider' ? 'Provider' : 'Deployer';
  const roleColor  = system_role === 'provider' ? '#6366F1' : '#0EA5E9';

  // Build rendering blocks: unified pairs → one block; standalone → individual blocks
  type Block = { type: 'unified'; primary: LiteracyProfileReport; secondary: LiteracyProfileReport } | { type: 'standalone'; profile: LiteracyProfileReport };
  const blocks: Block[] = [];
  const usedTypes = new Set<string>();

  for (const p of profiles) {
    if (usedTypes.has(p.profile_type)) continue;
    if (p.merged_with !== null) {
      // secondary: skip, it will be rendered with its primary
      continue;
    }
    const secondary = profiles.find(s => s.merged_with === p.profile_type);
    if (secondary) {
      blocks.push({ type: 'unified', primary: p, secondary });
      usedTypes.add(p.profile_type);
      usedTypes.add(secondary.profile_type);
    } else {
      blocks.push({ type: 'standalone', profile: p });
      usedTypes.add(p.profile_type);
    }
  }

  // Global status calculation based on active (non-secondary) profiles
  const activeProfiles = blocks.map(b => {
    if (b.type === 'unified') {
      const allEv = [...b.primary.evidences, ...b.secondary.evidences];
      const total = allEv.reduce((s, e) => s + e.people_count, 0);
      const hc = b.primary.headcount;
      const pct = hc > 0 ? Math.min(100, Math.round((total / hc) * 100)) : 0;
      return { headcount: hc, coverage_pct: pct };
    }
    return { headcount: b.profile.headcount, coverage_pct: b.profile.coverage_pct };
  });

  const configured = activeProfiles.filter(p => p.headcount > 0);
  const compliant  = configured.filter(p => p.coverage_pct >= 80);
  const globalOk   = configured.length > 0 && compliant.length === configured.length;
  const globalPartial = !globalOk && configured.some(p => p.coverage_pct > 0);
  const globalColor   = globalOk ? '#16A34A' : globalPartial ? '#CA8A04' : '#DC2626';
  const globalLabel   = globalOk ? 'Conforme — copertura ≥ 80% su tutti i profili attivi'
                      : globalPartial ? 'Parzialmente conforme — completare le evidenze mancanti'
                      : 'Non avviato — nessuna evidenza registrata';
  const globalIcon    = globalOk ? '✓' : globalPartial ? '⚠' : '✗';

  const profilesHtml = blocks.map((b, i) =>
    b.type === 'unified'
      ? renderUnifiedProfile(b.primary, b.secondary, i + 1)
      : renderStandaloneProfile(b.profile, i + 1)
  ).join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #0f172a; background: #fff; -webkit-print-color-adjust: exact; }
  .page { max-width: 800px; margin: 0 auto; padding: 0 0 64px; }

  /* ── COVER ── */
  .cover { padding: 48px 56px 40px; border-bottom: 4px solid #22C55E; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-start; }
  .cover-left {}
  .cover-brand { font-size: 28px; font-weight: 900; color: #22C55E; letter-spacing: -0.5px; margin-bottom: 4px; }
  .cover-title { font-size: 22pt; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; line-height: 1.15; }
  .cover-subtitle { font-size: 11pt; color: #64748b; margin-top: 6px; }
  .cover-right { text-align: right; }
  .cover-meta-row { font-size: 9.5pt; color: #64748b; margin-bottom: 4px; line-height: 1.6; }
  .cover-meta-row strong { color: #0f172a; }

  .content { padding: 0 56px; }

  /* ── INTRO ── */
  .intro-section { margin-bottom: 36px; }
  .intro-section p { font-size: 10pt; color: #334155; line-height: 1.8; text-align: justify; }
  .intro-section p + p { margin-top: 12px; }

  /* ── SECTIONS ── */
  .section { margin-bottom: 36px; }
  .section-title { font-size: 10pt; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.08em; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 18px; }

  /* ── SYSTEM TABLE ── */
  .sys-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .sys-table tr { border-bottom: 1px solid #e2e8f0; }
  .sys-table tr:last-child { border-bottom: none; }
  .sys-table td { padding: 10px 16px; font-size: 9.5pt; vertical-align: top; }
  .sys-table td:first-child { width: 180px; font-weight: 700; color: #64748b; background: #f8fafc; }
  .role-chip { display: inline-block; padding: 2px 10px; border-radius: 5px; font-weight: 700; font-size: 9pt; }
  .norm-ref { font-size: 9pt; color: #334155; }

  /* ── GLOBAL STATUS ── */
  .global-banner { border-radius: 10px; border-left: 6px solid; padding: 18px 22px; margin-bottom: 0; }
  .global-icon-label { display: flex; align-items: center; gap: 10px; }
  .global-icon { font-size: 20pt; font-weight: 900; }
  .global-text .global-label { font-size: 13pt; font-weight: 900; }
  .global-text .global-sub { font-size: 9pt; margin-top: 3px; opacity: 0.85; }

  /* ── PROFILE BLOCKS ── */
  .profile-block { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
  .profile-block.profile-unified { border-color: rgba(99,102,241,.3); }
  .profile-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .profile-block.profile-unified .profile-header { background: rgba(99,102,241,.04); border-bottom-color: rgba(99,102,241,.15); }
  .profile-header-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .profile-num { width: 24px; height: 24px; border-radius: 50%; background: #e2e8f0; color: #475569; font-size: 9pt; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .profile-name { font-weight: 800; font-size: 11.5pt; color: #0f172a; }
  .unified-badge { font-size: 8pt; font-weight: 700; padding: 2px 8px; background: rgba(99,102,241,.1); color: #6366F1; border-radius: 4px; border: 1px solid rgba(99,102,241,.2); }
  .profile-status-badge { font-size: 8.5pt; font-weight: 700; padding: 3px 10px; border-radius: 5px; border: 1px solid; white-space: nowrap; flex-shrink: 0; }

  .profile-unified-note { padding: 12px 20px; font-size: 9pt; color: #475569; background: rgba(99,102,241,.03); border-bottom: 1px solid rgba(99,102,241,.1); line-height: 1.6; }

  .profile-body { padding: 16px 20px; }
  .cov-row { display: flex; align-items: center; gap: 20px; margin-bottom: 16px; }
  .cov-left { flex-shrink: 0; min-width: 140px; }
  .cov-pct { font-size: 28pt; font-weight: 900; display: block; line-height: 1; }
  .cov-sub { font-size: 8.5pt; color: #64748b; display: block; margin-top: 3px; }
  .cov-bar-wrap { flex: 1; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; }
  .cov-bar { height: 100%; border-radius: 5px; }
  .not-configured { font-size: 9pt; color: #94a3b8; font-style: italic; margin-bottom: 14px; }
  .no-evidence { font-size: 9pt; color: #94a3b8; font-style: italic; padding: 8px 0; }

  /* ── EVIDENCE CARDS ── */
  .ev-list { display: flex; flex-direction: column; gap: 10px; }
  .ev-card { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .ev-top { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .ev-num { width: 22px; height: 22px; border-radius: 50%; background: #e2e8f0; color: #475569; font-size: 8pt; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ev-type { font-size: 7.5pt; font-weight: 800; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 4px; }
  .ev-title { font-weight: 800; font-size: 11pt; padding: 10px 14px 6px; color: #0f172a; }
  .ev-details { padding: 0 14px 12px; }
  .ev-detail-row { display: flex; gap: 16px; padding: 3px 0; font-size: 9pt; border-bottom: 1px solid #f1f5f9; }
  .ev-detail-row:last-child { border-bottom: none; }
  .ev-key { width: 150px; flex-shrink: 0; color: #64748b; font-weight: 600; }

  /* ── DECLARATION ── */
  .declaration { padding: 20px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
  .declaration p { font-size: 9.5pt; color: #334155; line-height: 1.75; }
  .declaration .disclaimer { margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0; color: #64748b; font-style: italic; font-size: 9pt; line-height: 1.7; }

  /* ── FOOTER ── */
  .doc-footer { margin-top: 40px; padding: 0 56px; }
  .doc-footer-inner { padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="page">

  <!-- COVER -->
  <div class="cover">
    <div class="cover-left">
      <div class="cover-brand">Actify</div>
      <div class="cover-title">Attestazione di Conformità<br>Art. 4 — AI Literacy</div>
      <div class="cover-subtitle">Reg. (UE) 2024/1689 — EU AI Act</div>
    </div>
    <div class="cover-right">
      <div class="cover-meta-row">Data: <strong>${fmtDate(generated_at)}</strong></div>
      <div class="cover-meta-row">Azienda: <strong>${company_name}</strong></div>
      <div class="cover-meta-row">Sistema AI: <strong>${tool_name}</strong></div>
      <div class="cover-meta-row">Ruolo: <strong>${roleLabel}</strong></div>
    </div>
  </div>

  <div class="content">

    <!-- INTRO -->
    <div class="section">
      <div class="intro-section">
        <p>
          Il presente documento costituisce un'attestazione formale delle misure adottate dall'organizzazione
          <strong>${company_name}</strong> in adempimento all'obbligo di <strong>AI literacy</strong> previsto dall'<strong>Art. 4
          del Regolamento (UE) 2024/1689</strong> (di seguito "AI Act"). Tale disposizione impone ai fornitori e ai deployer
          di sistemi AI di garantire che il personale coinvolto nell'utilizzo, nella supervisione e nello sviluppo dei sistemi AI
          possegga un livello di competenze adeguato al proprio ruolo operativo e al livello di rischio del sistema impiegato.
        </p>
        <p>
          Il livello di conformità documentato nel presente report è determinato sulla base delle evidenze formative registrate —
          certificazioni rilasciate da enti terzi e sessioni di formazione interna — in rapporto al numero di persone presenti
          nei profili di ruolo attivati per il sistema <strong>${tool_name}</strong>. Il sistema è classificato <strong>conforme</strong>
          all'Art. 4 quando almeno l'80% delle persone in ciascun profilo attivo risulta coperta da evidenze documentate.
          Il presente attestato costituisce prova ispettiva da conservare agli atti e da esibire in sede di audit o ispezione
          da parte delle autorità nazionali competenti ai sensi dell'AI Act.
        </p>
      </div>
    </div>

    <!-- § 1 — SISTEMA AI -->
    <div class="section">
      <div class="section-title">§ 1 — Sistema AI</div>
      <table class="sys-table">
        <tr>
          <td>Denominazione</td>
          <td><strong>${tool_name}</strong></td>
        </tr>
        <tr>
          <td>Fornitore</td>
          <td>${vendor || '—'}</td>
        </tr>
        <tr>
          <td>Categoria</td>
          <td>${category || '—'}</td>
        </tr>
        <tr>
          <td>Ruolo normativo</td>
          <td><span class="role-chip" style="background:${roleColor}15;color:${roleColor}">${roleLabel}</span></td>
        </tr>
        <tr>
          <td>Riferimento normativo</td>
          <td class="norm-ref">Art. 4, Reg. (UE) 2024/1689 (EU AI Act)</td>
        </tr>
        <tr>
          <td>Data generazione</td>
          <td>${fmtDate(generated_at)}</td>
        </tr>
        <tr>
          <td>Organizzazione dichiarante</td>
          <td><strong>${company_name}</strong></td>
        </tr>
      </table>
    </div>

    <!-- § 2 — STATO GLOBALE -->
    <div class="section">
      <div class="section-title">§ 2 — Stato di conformità Art. 4</div>
      <div class="global-banner" style="background:${globalColor}0d;border-color:${globalColor}">
        <div class="global-icon-label">
          <span class="global-icon" style="color:${globalColor}">${globalIcon}</span>
          <div class="global-text">
            <div class="global-label" style="color:${globalColor}">${globalLabel}</div>
            <div class="global-sub" style="color:${globalColor}">
              ${compliant.length} / ${configured.length > 0 ? configured.length : blocks.length} profili attivi con copertura ≥ 80%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- § 3 — PROFILI -->
    <div class="section">
      <div class="section-title">§ 3 — Profili e copertura delle evidenze</div>
      ${profilesHtml}
    </div>

    <!-- § 4 — DICHIARAZIONE -->
    <div class="section">
      <div class="section-title">§ 4 — Dichiarazione del responsabile</div>
      <div class="declaration">
        <p>
          Il presente documento è generato da <strong>Actify</strong> su dichiarazione del Responsabile Compliance di
          <strong>${company_name}</strong> e attesta le misure di formazione e sensibilizzazione adottate ai sensi
          dell'Art. 4 del Reg. (UE) 2024/1689 (EU AI Act) in relazione al sistema AI <strong>${tool_name}</strong>
          nella qualità di <strong>${roleLabel}</strong>.
        </p>
        <div class="disclaimer">
          Il documento non certifica la conformità all'AI Act e non ha valore legale autonomo.<br>
          Le informazioni riportate — headcount, persone formate, date ed evidenze — sono fornite sotto esclusiva
          responsabilità dell'organizzazione dichiarante e non sono state verificate da Actify né da soggetti terzi.<br>
          Actify è uno strumento tecnico di raccolta e organizzazione delle informazioni: non presta consulenza legale né normativa.
        </div>
      </div>
    </div>

  </div><!-- /content -->

  <div class="doc-footer">
    <div class="doc-footer-inner">
      <span>Generato da Actify · AI Act Compliance Platform · ${company_name}</span>
      <span>${generated_at}</span>
    </div>
  </div>

</div>
</body>
</html>`;
}
