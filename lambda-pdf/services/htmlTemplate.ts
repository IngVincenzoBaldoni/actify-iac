import type {
  BedrockReportOutput,
  ToolCatalogEntry,
  PriorityAction,
  PhaseRelevance,
} from "../types/reportOutput";
import type { IntakePayload } from "../types/intake";
import { logoSvg, markSvg } from "./branding";
import { computeSanctionsReport, formatEur } from "./sanctionsService";

// ─── Lookup helpers ───────────────────────────────────────────────────────────

function riskLabel(level: string): string {
  return ({ prohibited: "VIETATO", high: "ALTO RISCHIO", limited: "RISCHIO LIMITATO", minimal: "RISCHIO MINIMO" } as Record<string, string>)[level] ?? level.toUpperCase();
}
function riskColor(level: string): string {
  return ({ prohibited: "#B91C1C", high: "#C2410C", limited: "#B45309", minimal: "#15803D" } as Record<string, string>)[level] ?? "#4B5563";
}
function riskBg(level: string): string {
  return ({ prohibited: "#FEF2F2", high: "#FFF7ED", limited: "#FEFCE8", minimal: "#F0FDF4" } as Record<string, string>)[level] ?? "#F9FAFB";
}
function statusLabel(s: string): string {
  return ({ compliant: "Conforme", non_compliant: "Non conforme", monitoring_needed: "Monitoraggio", unknown: "Da verificare" } as Record<string, string>)[s] ?? s;
}
function statusColor(s: string): string {
  return ({ compliant: "#15803D", non_compliant: "#B91C1C", monitoring_needed: "#B45309", unknown: "#6B7280" } as Record<string, string>)[s] ?? "#6B7280";
}
function priorityLabel(p: string): string {
  return ({ immediate: "URGENTE", short_term: "BREVE TERMINE", medium_term: "MEDIO TERMINE" } as Record<string, string>)[p] ?? p.toUpperCase();
}
function priorityColor(p: string): string {
  return ({ immediate: "#B91C1C", short_term: "#C2410C", medium_term: "#B45309" } as Record<string, string>)[p] ?? "#4B5563";
}
function phaseRelevanceLabel(s: string): string {
  return ({ relevant: "● Rilevante", monitor: "◐ Da monitorare", not_applicable: "○ Non applicabile" } as Record<string, string>)[s] ?? s;
}
function phaseRelevanceColor(s: string): string {
  return ({ relevant: "#15803D", monitor: "#D97706", not_applicable: "#9CA3AF" } as Record<string, string>)[s] ?? "#9CA3AF";
}

function monthsToDeadline(deadline: string | null): string {
  if (!deadline) return "—";
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms < 0) return "Scaduta";
  const months = Math.ceil(ms / (1000 * 60 * 60 * 24 * 30));
  return `${months} ${months === 1 ? "mese" : "mesi"}`;
}
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  const months = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}
function escapeHtml(text: string): string {
  return text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function riskScoreBar(score: number): string {
  const pct = Math.min(100, Math.round((score / 30) * 100));
  const color = score >= 20 ? "#B91C1C" : score >= 10 ? "#C2410C" : "#15803D";
  return `<div style="background:#E5E7EB;border-radius:3px;height:8px;width:100%;margin-top:6px;"><div style="background:${color};width:${pct}%;height:8px;border-radius:3px;"></div></div>`;
}

// ─── Section header ────────────────────────────────────────────────────────────

function sectionHeader(num: number, title: string, subtitle?: string): string {
  return `
<div style="margin:32px 0 18px;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
    <span style="font-size:10px;font-weight:800;color:#16A34A;letter-spacing:1.5px;text-transform:uppercase;white-space:nowrap;">§ ${String(num).padStart(2, "0")}</span>
    <div style="height:1px;background:#E5E7EB;flex:1;"></div>
  </div>
  <div style="font-size:18px;font-weight:800;color:#0F172A;line-height:1.2;margin-bottom:${subtitle ? "5px" : "0"};">${title}</div>
  ${subtitle ? `<div style="font-size:12px;color:#6B7280;line-height:1.6;">${subtitle}</div>` : ""}
  <div style="height:2px;background:linear-gradient(90deg,#16A34A 0%,#D1FAE5 40%,#F0FDF4 100%);margin-top:10px;border-radius:1px;"></div>
</div>`;
}

// ─── Introduzione contestuale personalizzata ──────────────────────────────────

function renderIntroSection(output: BedrockReportOutput, payload: IntakePayload, generatedDate: string): string {
  const { company } = payload;
  const name    = escapeHtml(company.name);
  const sector  = escapeHtml(company.sector ?? "");
  const nTools  = output.tool_catalog.length;
  const rl      = output.overall_risk_level;

  const riskSentence =
    rl === "prohibited"
      ? `L'analisi ha rilevato la presenza di sistemi AI classificabili come <strong>vietati</strong> ai sensi del Regolamento. Si tratta della categoria di rischio più grave: l'organizzazione è tenuta a intervenire con assoluta priorità per rimuovere o adeguare i sistemi interessati, prima dell'entrata in vigore piena delle disposizioni sanzionatorie.`
      : rl === "high"
      ? `L'analisi ha evidenziato un profilo di rischio <strong>Alto</strong>: uno o più sistemi AI in uso rientrano nelle categorie dell'Allegato III del Regolamento e sono soggetti agli obblighi più stringenti — documentazione tecnica, supervisione umana, gestione del rischio, trasparenza e, ove applicabile, registrazione nel database europeo. Il rispetto delle scadenze normative riveste carattere di urgenza.`
      : rl === "limited"
      ? `L'analisi ha classificato il profilo complessivo come <strong>Rischio Limitato</strong>: i sistemi AI dichiarati sono soggetti principalmente agli obblighi di trasparenza verso gli utenti e i dipendenti (Art. 50 e Art. 26). Gli adempimenti richiesti sono proporzionali, ma richiedono comunque un'azione strutturata e documentata.`
      : `L'analisi ha classificato il profilo complessivo come <strong>Rischio Minimo</strong>: i sistemi AI dichiarati non rientrano nelle categorie ad alto rischio né sono soggetti a obblighi specifici di trasparenza obbligatoria. Rimangono tuttavia applicabili le disposizioni generali in materia di governance interna e formazione del personale (Art. 4 e Art. 17).`;

  const para1 = `Il Regolamento (UE) 2024/1689 sull'Intelligenza Artificiale — comunemente noto come <strong>AI Act</strong> — costituisce il primo quadro normativo organico al mondo dedicato ai sistemi di intelligenza artificiale. Entrato in vigore il 1° agosto 2024, il Regolamento introduce un sistema di classificazione per livello di rischio che impone obblighi differenziati e proporzionali ai soggetti che sviluppano, importano, distribuiscono o fanno uso di sistemi AI nell'ambito dell'Unione Europea. Le disposizioni si applicano progressivamente: le norme relative ai sistemi AI vietati sono vigenti dal 2 febbraio 2025; le prescrizioni per i modelli di intelligenza artificiale per uso generale (GPAI) dall'agosto 2025; gli obblighi completi per i sistemi ad alto rischio autonomi (Annex III) entreranno in vigore il <strong>2 dicembre 2027</strong> e per i sistemi integrati in prodotti (Annex I) il <strong>2 agosto 2028</strong> — scadenze aggiornate dall'accordo di trilogo del <strong>Digital Omnibus</strong> del 7 maggio 2026, che ha prorogato le deadline originali di 16 mesi. Nessuna organizzazione che adotta sistemi AI — indipendentemente dalla propria dimensione — è esclusa dall'ambito di applicazione del Regolamento.`;

  const para2 = `L'adeguamento normativo non è un adempimento di secondo piano: il Reg. UE 2024/1689 prevede un regime sanzionatorio tra i più severi del diritto europeo, con sanzioni che possono raggiungere i <strong>35 milioni di euro o il 7% del fatturato mondiale annuo</strong> per le violazioni più gravi, e fino a 15 milioni di euro o il 3% per le violazioni di portata minore. È tuttavia opportuno rilevare che le autorità nazionali di vigilanza — e la neonata AI Office europea — tengono conto, in sede di irrogazione della sanzione, del grado di collaborazione dell'organizzazione, della tempestività e qualità delle misure correttive adottate, nonché della completezza della documentazione prodotta. Questo principio di proporzionalità attenuata implica che un approccio proattivo, strutturato e tracciabile alla compliance può incidere in misura determinante sull'esito di eventuali procedimenti sanzionatori.`;

  const para3 = `Il presente rapporto è stato elaborato da Actify in data <strong>${generatedDate}</strong> sulla base delle informazioni fornite da <strong>${name}</strong>. L'analisi ha coinvolto <strong>${nTools} ${nTools === 1 ? "sistema AI dichiarato" : "sistemi AI dichiarati"}</strong>${sector ? `, operativi nel settore <strong>${sector}</strong>` : ""}. ${riskSentence}`;

  const para4 = `Il documento è strutturato in nove sezioni tematiche: dalla classificazione dei sistemi AI all'analisi dei gap di conformità, dal cronoprogramma degli obblighi normativi alla stima dell'esposizione sanzionatoria, fino all'illustrazione degli strumenti disponibili per ridurre strutturalmente il rischio. I risultati hanno carattere orientativo e sono basati esclusivamente sulle informazioni dichiarate nel form di assessment. Si raccomanda una lettura critica delle conclusioni alla luce della specifica realtà operativa dell'organizzazione e, ove necessario, la validazione da parte di un esperto qualificato in materia di conformità normativa.`;

  return `
<div style="margin:28px 0 24px;">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#16A34A;margin-bottom:16px;">Prefazione — Contesto Normativo e Finalità del Rapporto</div>
  <div style="border-left:3px solid #E5E7EB;padding-left:20px;">
    <p style="font-size:13px;color:#1E293B;line-height:1.85;margin:0 0 14px;text-align:justify;">${para1}</p>
    <p style="font-size:13px;color:#1E293B;line-height:1.85;margin:0 0 14px;text-align:justify;">${para2}</p>
    <p style="font-size:13px;color:#1E293B;line-height:1.85;margin:0 0 14px;text-align:justify;">${para3}</p>
    <p style="font-size:13px;color:#374151;line-height:1.85;margin:0;text-align:justify;font-style:italic;">${para4}</p>
  </div>
</div>`;
}

// ─── KPI summary bar ──────────────────────────────────────────────────────────

function renderKpiBar(output: BedrockReportOutput): string {
  const cs = output.compliance_summary;
  const urgency = cs.most_urgent_deadline ? `${formatDate(cs.most_urgent_deadline)} (${monthsToDeadline(cs.most_urgent_deadline)})` : "Nessuna";
  const kpis = [
    { label: "Sistemi AI analizzati", value: String(output.tool_catalog.length), color: "#0F172A" },
    { label: "Rischio complessivo", value: riskLabel(output.overall_risk_level), color: riskColor(output.overall_risk_level) },
    { label: "Non conformi", value: String(cs.non_compliant_count), color: cs.non_compliant_count > 0 ? "#B91C1C" : "#15803D" },
    { label: "Gap identificati", value: String(output.compliance_gaps.length), color: output.compliance_gaps.length > 0 ? "#B45309" : "#15803D" },
    { label: "Scadenza più urgente", value: urgency, color: "#374151" },
  ];
  const cells = kpis.map(k => `
    <td style="padding:14px 16px;text-align:center;border-right:1px solid #E5E7EB;">
      <div style="font-size:13px;font-weight:800;color:${k.color};line-height:1.2;">${escapeHtml(k.value)}</div>
      <div style="font-size:10px;color:#9CA3AF;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">${k.label}</div>
    </td>`).join("");
  return `
<div style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin:20px 0;">
  <table style="width:100%;border-collapse:collapse;">
    <tr>${cells}</tr>
  </table>
</div>`;
}

// ─── Gap di conformità ────────────────────────────────────────────────────────

function renderComplianceGaps(gaps: string[]): string {
  if (!gaps || gaps.length === 0) return "";
  const items = gaps.map(gap => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #FDE68A;">
      <span style="color:#D97706;font-size:14px;flex-shrink:0;margin-top:1px;">▲</span>
      <span style="font-size:12px;color:#78350F;line-height:1.6;">${escapeHtml(gap)}</span>
    </div>`).join("");
  return `
${sectionHeader(3, "Gap di Conformità Identificati", "Aree critiche emerse dall'analisi che richiedono intervento prioritario.")}
<div style="background:#FFFBEB;border:1px solid #FDE68A;border-left:4px solid #D97706;border-radius:0 6px 6px 0;padding:4px 16px 8px 16px;margin-bottom:24px;">
  ${items}
</div>`;
}


// ─── Schede strumenti AI ──────────────────────────────────────────────────────

function renderToolCard(tool: ToolCatalogEntry, idx: number): string {
  const articles = tool.applicable_articles.map(a =>
    `<span style="display:inline-block;background:#F3F4F6;border:1px solid #E5E7EB;border-radius:3px;padding:2px 7px;font-size:10px;color:#374151;margin:2px 2px 0 0;">${escapeHtml(a)}</span>`
  ).join("");
  const actions = tool.required_actions.map((a, i) =>
    `<div style="display:flex;gap:8px;margin-bottom:5px;"><span style="color:#16A34A;font-weight:700;font-size:11px;flex-shrink:0;">${i + 1}.</span><span style="font-size:12px;color:#374151;line-height:1.5;">${escapeHtml(a)}</span></div>`
  ).join("");

  return `
<div style="border:1px solid #E5E7EB;border-left:4px solid ${riskColor(tool.risk_classification)};border-radius:0 6px 6px 0;margin-bottom:16px;overflow:hidden;">
  <div style="background:${riskBg(tool.risk_classification)};padding:12px 16px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;border-bottom:1px solid #E5E7EB;">
    <div>
      <span style="font-size:11px;color:#9CA3AF;">${idx}.</span>
      <strong style="font-size:15px;color:#0F172A;margin-left:6px;">${escapeHtml(tool.tool_name)}</strong>
      <span style="font-size:12px;color:#6B7280;margin-left:6px;">${escapeHtml(tool.vendor)}</span>
    </div>
    <span style="background:${riskColor(tool.risk_classification)};color:#fff;font-size:11px;font-weight:700;padding:3px 12px;border-radius:12px;letter-spacing:0.5px;">${riskLabel(tool.risk_classification)}</span>
  </div>
  <div style="padding:12px 16px;">
    <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:10px;">
      <div style="font-size:12px;color:#374151;"><strong>Finalità dichiarata:</strong> ${escapeHtml(tool.declared_purpose)}</div>
    </div>
    <div style="font-size:12px;color:#374151;margin-bottom:10px;padding:8px 12px;background:#F9FAFB;border-radius:4px;border-left:3px solid ${riskColor(tool.risk_classification)};line-height:1.5;">
      ${escapeHtml(tool.rationale_compact)}
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px;">
      <div style="font-size:11px;color:#6B7280;"><strong style="color:#374151;">Stato:</strong> <span style="color:${statusColor(tool.compliance_status)};font-weight:600;">${statusLabel(tool.compliance_status)}</span></div>
      <div style="font-size:11px;color:#6B7280;"><strong style="color:#374151;">Scadenza:</strong> ${formatDate(tool.compliance_deadline)} <span style="color:#9CA3AF;">(${monthsToDeadline(tool.compliance_deadline)})</span></div>
    </div>
    <div style="margin-bottom:${actions ? "10px" : "0"};">${articles}</div>
    ${actions ? `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:10px 12px;"><div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Azioni richieste</div>${actions}</div>` : ""}
  </div>
</div>`;
}

// ─── Cronoprogramma AI Act ────────────────────────────────────────────────────

function renderTimeline(
  timeline: BedrockReportOutput["ai_act_timeline"],
  phaseRelevance: PhaseRelevance,
): string {
  const rows: Array<{ label: string; date: string; items: string[]; phaseKey: keyof PhaseRelevance; isPast: boolean }> = [
    { label: "Già in vigore", date: "Dal 2 febbraio 2025", items: timeline.already_in_force, phaseKey: "already_in_force", isPast: true },
    { label: "Agosto 2025", date: "2 agosto 2025", items: timeline.aug_2025, phaseKey: "aug_2025", isPast: false },
    { label: "Dicembre 2026 *", date: "2 dicembre 2026 *", items: timeline.aug_2026, phaseKey: "aug_2026", isPast: false },
    { label: "Dicembre 2027 *", date: "2 dicembre 2027 *", items: timeline.aug_2027, phaseKey: "aug_2027", isPast: false },
  ];

  const rowsHtml = rows.map(({ label, date, items, phaseKey, isPast }) => {
    if (items.length === 0) return "";
    const relevance = phaseRelevance[phaseKey];
    const listHtml = items.map(i => `<li style="margin-bottom:4px;line-height:1.5;">${escapeHtml(i)}</li>`).join("");
    const borderColor = isPast ? "#B91C1C" : "#374151";
    const bg = isPast ? "#FEF2F2" : "#FAFAFA";
    return `
    <tr>
      <td style="padding:10px 14px;border:1px solid #E5E7EB;background:${bg};border-left:3px solid ${borderColor};width:160px;vertical-align:top;">
        <div style="font-size:12px;font-weight:700;color:#0F172A;">${label}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px;">${date}</div>
        <div style="font-size:10px;font-weight:700;color:${phaseRelevanceColor(relevance)};margin-top:6px;">${phaseRelevanceLabel(relevance)}</div>
      </td>
      <td style="padding:10px 14px;border:1px solid #E5E7EB;font-size:12px;color:#374151;vertical-align:top;">
        <ul style="margin:0;padding:0 0 0 14px;">${listHtml}</ul>
      </td>
    </tr>`;
  }).join("");

  return `
${sectionHeader(5, "Cronoprogramma Obblighi AI Act", "Scadenze del Reg. UE 2024/1689 rilevanti per il profilo aziendale, con indicazione del livello di applicabilità per fase.")}
<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#1D4ED8;line-height:1.6;">
  <strong>* Scadenze aggiornate dal Digital Omnibus</strong> — L'accordo di trilogo del 7 maggio 2026 ha prorogato le deadline originali dell'AI Act: sistemi Annex III autonomi: <strong>2 dicembre 2027</strong> (ex 2 agosto 2026); sistemi Annex I integrati in prodotti: <strong>2 agosto 2028</strong> (ex 2 agosto 2027); Art. 50 (trasparenza) per sistemi pre-esistenti: <strong>2 dicembre 2026</strong>.
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
  <thead>
    <tr>
      <th style="padding:8px 14px;background:#F3F4F6;border:1px solid #E5E7EB;text-align:left;font-size:11px;color:#374151;font-weight:700;">Fase normativa</th>
      <th style="padding:8px 14px;background:#F3F4F6;border:1px solid #E5E7EB;text-align:left;font-size:11px;color:#374151;font-weight:700;">Obblighi applicabili all'organizzazione</th>
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
</table>`;
}

// ─── Piano d'azione ───────────────────────────────────────────────────────────

function renderPriorityActions(actions: PriorityAction[]): string {
  if (!actions || actions.length === 0) return "";
  const items = actions.map((a, i) => `
    <div style="display:flex;gap:14px;margin-bottom:14px;align-items:flex-start;">
      <div style="min-width:32px;height:32px;background:${priorityColor(a.priority)};border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;flex-shrink:0;">${i + 1}</div>
      <div style="flex:1;">
        <div style="margin-bottom:4px;">
          <span style="display:inline-block;background:${priorityColor(a.priority)};color:#fff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:2px;letter-spacing:0.8px;text-transform:uppercase;">${priorityLabel(a.priority)}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:2px;">${escapeHtml(a.action)}</div>
        <div style="font-size:11px;color:#6B7280;line-height:1.5;">${escapeHtml(a.rationale)}</div>
      </div>
    </div>`).join("");
  return `
${sectionHeader(6, "Piano d'Azione Prioritario", "Azioni operative raccomandate, ordinate per urgenza, specifiche per i sistemi AI dichiarati.")}
<div style="margin-bottom:24px;">${items}</div>`;
}

// ─── Documentazione richiesta ─────────────────────────────────────────────────

function docMeta(docName: string): { articles: string[]; automatable: boolean } {
  const n = docName.toLowerCase();
  if (n.includes("inventario") || n.includes("registro"))
    return { articles: ["Art. 49", "Art. 17"], automatable: true };
  if (n.includes("trasparenza") || n.includes("transparency") || n.includes("disclosure") || n.includes("notice"))
    return { articles: ["Art. 50", "Art. 13"], automatable: true };
  if (n.includes("tecnica") || n.includes("technical"))
    return { articles: ["Art. 11", "Art. 13"], automatable: true };
  if (n.includes("monitoraggio") || n.includes("monitoring") || n.includes("post-market"))
    return { articles: ["Art. 9", "Art. 72"], automatable: true };
  if (n.includes("policy") || n.includes("politica") || n.includes("utilizzo"))
    return { articles: ["Art. 26", "Art. 17"], automatable: true };
  if (n.includes("impatto") || n.includes("fria") || n.includes("valutazione"))
    return { articles: ["Art. 27"], automatable: true }; // FRIA ora automatizzabile con Actify
  if (n.includes("governance") || n.includes("responsabil"))
    return { articles: ["Art. 16", "Art. 29"], automatable: false };
  if (n.includes("conformit") || n.includes("dichiarazione"))
    return { articles: ["Art. 47", "Art. 49"], automatable: true };
  return { articles: ["Reg. UE 2024/1689"], automatable: false };
}

function renderRecommendedDocs(docs: string[]): string {
  if (!docs || docs.length === 0) return "";
  const automatableCount = docs.filter(d => docMeta(d).automatable).length;
  const items = docs.map(doc => {
    const { articles, automatable } = docMeta(doc);
    const articlesHtml = articles.map(a =>
      `<span style="display:inline-block;background:#E5E7EB;border-radius:2px;padding:1px 6px;font-size:10px;margin-right:3px;color:#374151;">${escapeHtml(a)}</span>`
    ).join("");
    const badge = automatable
      ? `<span style="display:inline-block;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:2px 8px;font-size:10px;font-weight:700;color:#166534;">&#10003; Generabile con Actify</span>`
      : `<span style="display:inline-block;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:2px 8px;font-size:10px;font-weight:600;color:#6B7280;">&#9998; Richiede supervisione legale</span>`;
    return `
    <div style="border:1px solid #E5E7EB;border-radius:5px;padding:10px 14px;margin-bottom:8px;background:#FAFAFA;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;margin-bottom:5px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:#16A34A;font-size:13px;">&#128196;</span>
          <span style="font-size:13px;font-weight:600;color:#0F172A;">${escapeHtml(doc)}</span>
        </div>
        ${badge}
      </div>
      <div style="margin-left:21px;">${articlesHtml}</div>
    </div>`;
  }).join("");

  return `
${sectionHeader(7, "Documentazione di Compliance Richiesta", `In base ai sistemi AI dichiarati, i seguenti documenti sono necessari per la conformità al Reg. UE 2024/1689. Dei ${docs.length} documenti identificati, ${automatableCount} sono generabili automaticamente tramite la piattaforma Actify.`)}
${items}
<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-left:3px solid #16A34A;border-radius:0 5px 5px 0;padding:10px 14px;margin:8px 0 24px;font-size:11px;color:#166534;line-height:1.6;">
  <strong>Nota:</strong> I documenti marcati "Generabile con Actify" possono essere prodotti automaticamente dalla piattaforma partendo dall'inventario sistemi AI. Quelli che richiedono supervisione legale necessitano di revisione da parte di un professionista qualificato prima dell'adozione ufficiale.
</div>`;
}

// ─── Stima esposizione sanzionatoria (CORE) ───────────────────────────────────

function renderSanctionsSection(payload: IntakePayload): string {
  const report = computeSanctionsReport(payload);
  const { revenue, is_sme, tiers, total_min, total_max, disclaimer } = report;

  const srcLabel: Record<string, string> = {
    exact:     "Fatturato esatto dichiarato",
    declared:  "Valore mediano del range dichiarato",
    estimated: "Stima da dimensione aziendale e settore (precisione limitata)",
  };
  const srcColor: Record<string, string> = {
    exact: "#15803D", declared: "#D97706", estimated: "#9CA3AF",
  };
  const srcIcon: Record<string, string> = {
    exact: "✓", declared: "~", estimated: "≈",
  };

  const rowsHtml = tiers.map(t => `
    <tr>
      <td style="padding:11px 14px;border:1px solid #FED7AA;font-size:12px;color:#92400E;background:#FFFBEB;">${escapeHtml(t.label)}</td>
      <td style="padding:11px 14px;border:1px solid #FED7AA;font-size:12px;color:#374151;text-align:center;">${formatEur(t.cap_absolute)}</td>
      <td style="padding:11px 14px;border:1px solid #FED7AA;font-size:12px;color:#374151;text-align:center;">${t.pct_label} del fatturato</td>
      <td style="padding:11px 14px;border:1px solid #FED7AA;font-size:13px;font-weight:700;color:#B91C1C;text-align:center;">
        ${formatEur(t.estimated_min)} – ${formatEur(t.estimated_max)}
        ${t.is_sme_reduced ? `<div style="font-size:9px;color:#78350F;font-weight:500;margin-top:2px;">PMI: riduzione 50% applicata</div>` : ""}
      </td>
    </tr>`).join("");

  return `
<div style="page-break-before:always;"></div>
<div style="background:linear-gradient(135deg,#431407 0%,#7C2D12 100%);padding:20px 24px;border-radius:8px 8px 0 0;margin-top:32px;">
  <div style="display:flex;align-items:center;gap:12px;">
    <span style="font-size:24px;">&#9888;</span>
    <div>
      <div style="font-size:11px;font-weight:700;color:#FED7AA;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Sezione Core</div>
      <div style="font-size:20px;font-weight:800;color:#FFF7ED;">Stima Esposizione Sanzionatoria</div>
      <div style="font-size:12px;color:#FED7AA;margin-top:2px;">Art. 99 — Regolamento UE 2024/1689 (AI Act)</div>
    </div>
  </div>
</div>

<div style="border:1px solid #FED7AA;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;margin-bottom:28px;">

  <!-- Revenue basis -->
  <div style="background:#FFF7ED;padding:14px 20px;border-bottom:1px solid #FED7AA;display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
    <div style="font-size:12px;color:#7C2D12;">
      <strong>Fatturato di riferimento:</strong>
      <span style="font-size:15px;font-weight:800;color:#B91C1C;margin-left:8px;">${formatEur(revenue.amount)}</span>
    </div>
    <div style="font-size:11px;font-weight:700;color:${srcColor[revenue.source] ?? "#9CA3AF"};background:#fff;border:1px solid ${srcColor[revenue.source] ?? "#E5E7EB"};padding:3px 10px;border-radius:10px;">
      ${srcIcon[revenue.source] ?? "?"} ${srcLabel[revenue.source] ?? revenue.label}
    </div>
    ${is_sme ? `<div style="font-size:11px;font-weight:700;color:#92400E;background:#FEF3C7;border:1px solid #FDE68A;padding:3px 10px;border-radius:10px;">&#9660; PMI — Art. 100: riduzione del 50% applicata</div>` : ""}
  </div>

  <!-- Tier table -->
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="background:#FEF2F2;">
        <th style="padding:9px 14px;border:1px solid #FED7AA;text-align:left;font-size:11px;color:#7C2D12;font-weight:700;">Categoria sanzionatoria</th>
        <th style="padding:9px 14px;border:1px solid #FED7AA;text-align:center;font-size:11px;color:#7C2D12;font-weight:700;">Massimale assoluto</th>
        <th style="padding:9px 14px;border:1px solid #FED7AA;text-align:center;font-size:11px;color:#7C2D12;font-weight:700;">% sul fatturato</th>
        <th style="padding:9px 14px;border:1px solid #FED7AA;text-align:center;font-size:11px;color:#7C2D12;font-weight:700;">Stima per la vostra azienda</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr style="background:#FEF2F2;">
        <td colspan="3" style="padding:12px 14px;border:1px solid #FED7AA;font-size:13px;font-weight:700;color:#0F172A;">
          Esposizione totale cumulata stimata
        </td>
        <td style="padding:12px 14px;border:1px solid #FED7AA;text-align:center;background:#FEF2F2;">
          <div style="font-size:20px;font-weight:900;color:#B91C1C;">${formatEur(total_min)} – ${formatEur(total_max)}</div>
          <div style="font-size:10px;color:#9CA3AF;margin-top:2px;">stima orientativa</div>
        </td>
      </tr>
    </tfoot>
  </table>

  <!-- Disclaimer -->
  <div style="padding:12px 20px;background:#FFFBEB;border-top:1px solid #FDE68A;">
    <div style="font-size:11px;color:#78350F;line-height:1.7;">
      <strong>&#9432; Nota metodologica:</strong> ${escapeHtml(disclaimer)}
      Le autorità di vigilanza raramente applicano il massimale sanzionatorio e tengono conto di fattori attenuanti quali la collaborazione, la gravità della violazione e le misure correttive adottate. La presente stima ha finalità esclusivamente informative e non costituisce in alcun modo un parere legale.
    </div>
  </div>
</div>`;
}

// ─── Come Actify riduce il rischio (dopo sanzioni) ────────────────────────────

interface ActifyFeature {
  icon: string;
  title: string;
  article: string;
  description: string;
}

const ACTIFY_FEATURES: ActifyFeature[] = [
  {
    icon: "&#128202;",
    title: "Analisi e Inventario Sistemi AI",
    article: "Art. 17, 49",
    description: "Mappatura e classificazione automatica di tutti i sistemi AI in uso, con determinazione del livello di rischio, degli obblighi normativi applicabili e delle scadenze per ciascun sistema. Elimina il rischio di sistemi non censiti e non monitorati.",
  },
  {
    icon: "&#128196;",
    title: "Document Vault — Generazione Automatica Documenti",
    article: "Art. 11, 13, 26, 27, 47, 50",
    description: "Produzione automatica dei principali documenti obbligatori: AI Policy, Transparency Notice, Documentazione Tecnica, Monitoring Plan, FRIA e Dichiarazione di Conformità. Ogni documento è personalizzato sul profilo del sistema AI e dell'organizzazione.",
  },
  {
    icon: "&#9881;",
    title: "Gap Tracker — Monitoraggio Continuo dei Gap",
    article: "Art. 9, 72",
    description: "Tracciamento strutturato di tutti i gap di conformità con priorità, scadenze e stato di avanzamento aggiornati in tempo reale. Riduce il rischio di scadenze mancate e di omissioni nelle misure correttive.",
  },
  {
    icon: "&#127891;",
    title: "AI Literacy Tracker",
    article: "Art. 4",
    description: "Gestione e tracciamento della formazione obbligatoria del personale sull'uso responsabile dei sistemi AI. Genera i registri di formazione e monitora i livelli di alfabetizzazione AI per reparto.",
  },
  {
    icon: "&#128276;",
    title: "Monitoraggio Normativo e Notifiche Proattive",
    article: "Art. 9, 61, 72",
    description: "Aggiornamenti automatici in caso di variazioni normative rilevanti, con notifiche proattive sulle scadenze imminenti. Permette all'organizzazione di reagire tempestivamente senza dover monitorare le fonti normative in autonomia.",
  },
  {
    icon: "&#128203;",
    title: "Audit Trail e Registro delle Azioni di Compliance",
    article: "Art. 12, 17",
    description: "Registro cronologico e non modificabile di tutte le azioni di compliance intraprese, pronto per ispezioni da parte delle autorità di vigilanza. Dimostra la diligenza dell'organizzazione in caso di procedimento sanzionatorio.",
  },
  {
    icon: "&#128681;",
    title: "Gestione Incidenti AI",
    article: "Art. 73",
    description: "Procedura guidata per la registrazione, valutazione e segnalazione degli incidenti causati dai sistemi AI. Assicura la conformità agli obblighi di notifica e riduce l'esposizione sanzionatoria in caso di incident.",
  },
  {
    icon: "&#127758;",
    title: "Supporto Registrazione EU AI Database",
    article: "Art. 49",
    description: "Assistenza alla registrazione nel database europeo dei sistemi AI ad alto rischio, con compilazione guidata dei campi obbligatori e verifica della completezza delle informazioni richieste dall'autorità UE.",
  },
];

function renderActifySection(payload: IntakePayload): string {
  const companyName = escapeHtml(payload.company.name);

  const featureRows = ACTIFY_FEATURES.map((f, i) => `
    <div style="display:flex;gap:14px;padding:14px 0;border-bottom:1px solid #D1FAE5;align-items:flex-start;">
      <div style="min-width:36px;height:36px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${f.icon}</div>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;">
          <span style="font-size:13px;font-weight:700;color:#052E16;">${f.title}</span>
          <span style="font-size:10px;font-weight:600;color:#166534;background:#DCFCE7;border-radius:10px;padding:1px 8px;">${f.article}</span>
        </div>
        <div style="font-size:12px;color:#374151;line-height:1.6;">${f.description}</div>
      </div>
    </div>`).join("");

  return `
<div style="border:2px solid #16A34A;border-radius:10px;overflow:hidden;margin:32px 0;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#052E16 0%,#14532D 100%);padding:20px 24px;">
    <div style="display:flex;align-items:center;gap:14px;">
      ${markSvg(36, "green")}
      <div>
        <div style="font-size:11px;font-weight:700;color:#4ADE80;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">§ 09 — Strumenti di Riduzione del Rischio</div>
        <div style="font-size:18px;font-weight:800;color:#F0FDF4;">Come Actify Abbassa la Tua Esposizione Sanzionatoria</div>
        <div style="font-size:12px;color:#86EFAC;margin-top:3px;">Strumenti strutturali per la conformità continuativa al Reg. UE 2024/1689</div>
      </div>
    </div>
  </div>

  <!-- Intro paragraph -->
  <div style="padding:20px 24px;background:#F0FDF4;border-bottom:1px solid #D1FAE5;">
    <p style="font-size:13px;color:#14532D;line-height:1.8;margin:0 0 14px;">
      Sulla base delle criticità emerse nell'assessment, l'adozione della piattaforma Actify consente a <strong>${companyName}</strong> di intervenire strutturalmente su tutte le aree di non conformità identificate. Le organizzazioni che adottano un approccio sistematico alla compliance AI Act — con strumenti dedicati all'inventario, alla documentazione e al monitoraggio continuo — riducono l'esposizione sanzionatoria stimata di <strong>almeno il 50%</strong> rispetto a chi affronta il percorso senza supporto specializzato.
    </p>
    <p style="font-size:12px;color:#166534;line-height:1.7;margin:0;">
      Questa riduzione deriva dalla combinazione di più fattori attenuanti riconosciuti dalle autorità di vigilanza: la dimostrabilità delle misure adottate, la documentazione tecnica completa, la tempestività degli interventi correttivi e la capacità di fornire evidenze immediate in caso di ispezione. Di seguito sono illustrate le funzionalità principali di Actify e il loro contributo specifico alla riduzione del rischio.
    </p>
  </div>

  <!-- Disclaimer metodologico -->
  <div style="padding:12px 24px;background:#ECFDF5;border-bottom:1px solid #D1FAE5;">
    <div style="font-size:11px;color:#065F46;line-height:1.7;">
      <strong>&#9432; Nota:</strong> La stima di riduzione del 50% è un'indicazione orientativa basata su scenari tipici di aziende con profilo di compliance analogo. La piattaforma Actify completa — che accede alla configurazione puntuale di ogni sistema AI, alle misure già adottate e ai processi aziendali effettivi — permette di ottenere una valutazione personalizzata e significativamente più precisa. Le stime del presente assessment hanno carattere esclusivamente informativo.
    </div>
  </div>

  <!-- Feature list -->
  <div style="padding:0 24px 8px;background:#fff;">
    ${featureRows}
  </div>

  <!-- CTA footer -->
  <div style="background:linear-gradient(135deg,#052E16 0%,#14532D 100%);padding:16px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
    <div>
      <div style="font-size:14px;font-weight:800;color:#F0FDF4;">Accedi ad Actify per avviare il tuo percorso di conformità</div>
      <div style="font-size:11px;color:#86EFAC;margin-top:3px;">Genera i documenti richiesti, monitora le scadenze e tieni sotto controllo il rischio AI Act in tempo reale.</div>
    </div>
    <div style="background:#16A34A;color:#fff;font-size:12px;font-weight:700;padding:10px 20px;border-radius:6px;white-space:nowrap;">
      official-actify.com &#8594;
    </div>
  </div>
</div>`;
}

// ─── Metadati assessment ──────────────────────────────────────────────────────

function renderAssessmentMetadata(companyName: string, generatedDate: string): string {
  return `
<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:14px 18px;margin:24px 0 16px;">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;margin-bottom:10px;">Metadati Assessment</div>
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <tr>
      <td style="padding:3px 0;color:#6B7280;width:22%;">Versione assessment</td>
      <td style="padding:3px 12px;color:#0F172A;font-weight:600;width:28%;">v2.0 — Reg. UE 2024/1689</td>
      <td style="padding:3px 0;color:#6B7280;width:22%;">Knowledge base normativa</td>
      <td style="padding:3px 12px;color:#0F172A;font-weight:600;width:28%;">AI Act EU 2024/1689 (IT)</td>
    </tr>
    <tr>
      <td style="padding:3px 0;color:#6B7280;">Modello AI</td>
      <td style="padding:3px 12px;color:#0F172A;font-weight:600;">Amazon Nova Pro (Bedrock EU)</td>
      <td style="padding:3px 0;color:#6B7280;">Data di generazione</td>
      <td style="padding:3px 12px;color:#0F172A;font-weight:600;">${generatedDate}</td>
    </tr>
    <tr>
      <td style="padding:3px 0;color:#6B7280;">Organizzazione</td>
      <td style="padding:3px 12px;color:#0F172A;font-weight:600;" colspan="3">${escapeHtml(companyName)}</td>
    </tr>
  </table>
</div>`;
}

// ─── Render principale ────────────────────────────────────────────────────────

export function render(output: BedrockReportOutput, payload: IntakePayload): string {
  const { company } = payload;
  const generatedDate = new Date().toLocaleDateString("it-IT", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const toolCardsHtml = output.tool_catalog.map((t, i) => renderToolCard(t, i + 1)).join("");
  const hasFindingsNote = output.key_findings_from_notes?.trim().length > 0;
  const hasFooterNote   = output.report_footer_note?.trim().length > 0;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Actify — Rapporto di Conformità AI Act — ${escapeHtml(company.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; color: #111827; margin: 0; padding: 0; background: #fff; font-size: 13px; line-height: 1.6; }
    .page-break { page-break-before: always; }
    h2 { font-size: 18px; font-weight: 800; color: #0F172A; margin: 0; }
    p  { font-size: 13px; line-height: 1.7; color: #374151; margin: 0 0 10px; }
  </style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════
     COPERTINA
═══════════════════════════════════════════════════════════ -->
<div style="min-height:278mm;background:linear-gradient(160deg,#0A1628 0%,#0F172A 50%,#1E293B 100%);padding:48px 44px;display:flex;flex-direction:column;justify-content:space-between;">

  <!-- Top: branding + confidenziale -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div style="line-height:0;">${markSvg(56, "green")}</div>
      <div style="line-height:0;margin-top:12px;">${logoSvg(180, 46)}</div>
    </div>
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:6px 14px;text-align:right;">
      <div style="font-size:9px;font-weight:700;color:#94A3B8;letter-spacing:2px;text-transform:uppercase;">Riservato e Confidenziale</div>
      <div style="font-size:10px;color:#64748B;margin-top:2px;">Documento generato il ${generatedDate}</div>
    </div>
  </div>

  <!-- Center: titolo e azienda -->
  <div style="margin:auto 0;padding:32px 0;">
    <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:3px;margin-bottom:14px;">Rapporto di Conformità</div>
    <h1 style="font-size:36px;font-weight:900;color:#F8FAFC;margin:0 0 12px;line-height:1.15;">Analisi di Conformità<br>al Regolamento UE 2024/1689</h1>
    <div style="width:56px;height:3px;background:#16A34A;border-radius:2px;margin-bottom:24px;"></div>
    <div style="font-size:26px;font-weight:800;color:#22C55E;margin-bottom:4px;">${escapeHtml(company.name)}</div>
    <div style="font-size:13px;color:#94A3B8;">
      ${escapeHtml(company.sector ?? "")}
      ${company.employees_range ? `&nbsp;&middot;&nbsp;${escapeHtml(company.employees_range)} dipendenti` : ""}
      ${company.country ? `&nbsp;&middot;&nbsp;${escapeHtml(company.country)}` : ""}
    </div>
    <div style="font-size:12px;color:#64748B;margin-top:10px;font-style:italic;">
      &ldquo;L&apos;AI &egrave; il tuo vantaggio. La compliance non deve essere il tuo problema.&rdquo;
    </div>
  </div>

  <!-- Bottom: rischio + meta -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;">
    <div>
      <div style="font-size:10px;color:#94A3B8;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Livello di Rischio Complessivo</div>
      <div style="background:${riskColor(output.overall_risk_level)};color:#fff;font-size:16px;font-weight:800;padding:8px 24px;border-radius:6px;display:inline-block;letter-spacing:0.8px;">
        ${riskLabel(output.overall_risk_level)}
      </div>
      <div style="margin-top:8px;font-size:11px;color:#94A3B8;">Punteggio di rischio: <strong style="color:#F8FAFC;">${output.overall_risk_score}/30</strong></div>
      <div style="width:160px;">${riskScoreBar(output.overall_risk_score)}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#4B5563;">
      <div style="color:#94A3B8;">Generato da Actify Platform</div>
      <div style="margin-top:2px;color:#22C55E;font-weight:600;">official-actify.com</div>
      <div style="margin-top:2px;">Reg. UE 2024/1689 — AI Act</div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     CORPO DEL RAPPORTO
═══════════════════════════════════════════════════════════ -->
<div style="padding:0 44px 40px;">

<!-- Avvertenza legale -->
<div style="background:#FFF7ED;border-left:4px solid #C2410C;border-radius:0 4px 4px 0;padding:10px 14px;margin:20px 0;font-size:11px;color:#7C2D12;line-height:1.6;">
  <strong>Avvertenza legale:</strong> Il presente rapporto è generato automaticamente sulla base delle informazioni fornite dall'organizzazione e ha finalità esclusivamente informative. Non costituisce parere legale, non certifica la conformità al Regolamento UE 2024/1689 e non sostituisce la consulenza di un professionista qualificato in materia di compliance AI. I risultati dipendono dalla completezza e accuratezza dei dati forniti nel form di assessment.
</div>

<!-- ── PREFAZIONE ─────────────────────────────────────────────────────────── -->
${renderIntroSection(output, payload, generatedDate)}

<!-- ── § 01  SINTESI ESECUTIVA ─────────────────────────────────────────────── -->
${sectionHeader(1, "Sintesi Esecutiva", "Panoramica del profilo di compliance dell'organizzazione sulla base dei sistemi AI dichiarati.")}

<div style="background:#F0FDF4;border-left:4px solid #16A34A;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:16px;">
  <p style="font-size:13px;font-weight:500;color:#0F172A;line-height:1.8;margin:0;">${escapeHtml(output.executive_summary)}</p>
</div>

${hasFindingsNote ? `
<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-left:3px solid #374151;border-radius:0 5px 5px 0;padding:12px 14px;margin-bottom:16px;font-size:12px;color:#374151;line-height:1.7;">
  <strong>Note emergenti dall'analisi:</strong> ${escapeHtml(output.key_findings_from_notes)}
</div>` : ""}

${renderKpiBar(output)}

<!-- ── § 02  ANALISI SISTEMI AI ─────────────────────────────────────────────── -->
<div class="page-break"></div>
${sectionHeader(2, "Analisi dei Sistemi AI Dichiarati", `Classificazione e valutazione di conformità per ciascuno degli ${output.tool_catalog.length} sistemi AI dichiarati nel form di assessment.`)}
${toolCardsHtml}

<!-- ── § 03  GAP DI CONFORMITÀ ───────────────────────────────────────────── -->
${renderComplianceGaps(output.compliance_gaps)}

<!-- ── § 05  CRONOPROGRAMMA ────────────────────────────────────────────────── -->
<div class="page-break"></div>
${renderTimeline(output.ai_act_timeline, output.phase_relevance)}

<!-- ── § 06  PIANO D'AZIONE ────────────────────────────────────────────────── -->
${renderPriorityActions(output.priority_actions)}

<!-- ── § 07  DOCUMENTAZIONE RICHIESTA ─────────────────────────────────────── -->
${renderRecommendedDocs(output.recommended_documents)}

<!-- ── § 08  STIMA ESPOSIZIONE SANZIONATORIA (CORE) ──────────────────────── -->
${renderSanctionsSection(payload)}

<!-- ── § 09  COME ACTIFY RIDUCE IL RISCHIO ──────────────────────────────── -->
${renderActifySection(payload)}

<!-- ── METADATI ───────────────────────────────────────────────────────────── -->
${renderAssessmentMetadata(company.name, generatedDate)}

<!-- ── NOTE FINALI E AVVERTENZE ───────────────────────────────────────────── -->
<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:14px 18px;margin:8px 0 20px;font-size:11px;color:#4B5563;line-height:1.7;">
  <strong style="color:#0F172A;display:block;margin-bottom:6px;">Avvertenze finali e limitazioni</strong>
  Il presente rapporto è elaborato mediante analisi automatica basata su modelli di intelligenza artificiale (Amazon Bedrock, Nova Pro) e su una base di conoscenza normativa relativa al Reg. UE 2024/1689. La classificazione del rischio, le stime sanzionatorie e il piano d'azione hanno carattere orientativo e non vincolante.
  I risultati riflettono esclusivamente le informazioni dichiarate nel form di assessment: informazioni incomplete, inesatte o non aggiornate possono influire materialmente sulle conclusioni del rapporto.
  L'organizzazione rimane responsabile dell'adozione delle misure di conformità e della verifica della loro adeguatezza rispetto alla propria specifica situazione. Si raccomanda la consulenza di un esperto legale qualificato in materia di AI Act prima di intraprendere azioni basate sul presente documento.
  ${hasFooterNote ? `<br><br><em style="color:#6B7280;">${escapeHtml(output.report_footer_note)}</em>` : ""}
</div>

<!-- ── FOOTER ─────────────────────────────────────────────────────────────── -->
<div style="border-top:1px solid #E5E7EB;padding:14px 0;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#9CA3AF;flex-wrap:wrap;gap:6px;">
  <div style="display:flex;align-items:center;gap:8px;">
    ${markSvg(18, "dark-green")}
    <span>Actify — AI Act Compliance Platform — official-actify.com</span>
  </div>
  <span>Generato il ${generatedDate} &middot; Reg. UE 2024/1689</span>
  <span>Riservato a ${escapeHtml(company.name)}</span>
</div>

</div>
</body>
</html>`;
}
