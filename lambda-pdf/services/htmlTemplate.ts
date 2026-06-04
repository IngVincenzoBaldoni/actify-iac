import type {
  BedrockReportOutput,
  ToolCatalogEntry,
  PriorityAction,
  ScoreBreakdown,
  PhaseRelevance,
} from "../types/reportOutput";
import type { IntakePayload } from "../types/intake";
import { logoSvg, markSvg } from "./branding";
import { computeSanctionsReport, formatEur } from "./sanctionsService";
import { determineApplicableArticles } from "./articleRuleEngine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskLabel(level: string): string {
  const map: Record<string, string> = {
    prohibited: "VIETATO",
    high: "ALTO RISCHIO",
    limited: "RISCHIO LIMITATO",
    minimal: "RISCHIO MINIMO",
  };
  return map[level] ?? level.toUpperCase();
}

function riskColor(level: string): string {
  const map: Record<string, string> = {
    prohibited: "#DC2626",
    high: "#EA580C",
    limited: "#CA8A04",
    minimal: "#16A34A",
  };
  return map[level] ?? "#6B7280";
}

function riskBg(level: string): string {
  const map: Record<string, string> = {
    prohibited: "#FEF2F2",
    high: "#FFF7ED",
    limited: "#FEFCE8",
    minimal: "#F0FDF4",
  };
  return map[level] ?? "#F9FAFB";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    compliant: "Conforme",
    non_compliant: "Non conforme",
    monitoring_needed: "Monitoraggio richiesto",
    unknown: "Da verificare",
  };
  return map[status] ?? status;
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    compliant: "#16A34A",
    non_compliant: "#DC2626",
    monitoring_needed: "#CA8A04",
    unknown: "#6B7280",
  };
  return map[status] ?? "#6B7280";
}

function priorityLabel(priority: string): string {
  const map: Record<string, string> = {
    immediate: "IMMEDIATA",
    short_term: "BREVE TERMINE",
    medium_term: "MEDIO TERMINE",
  };
  return map[priority] ?? priority.toUpperCase();
}

function priorityColor(priority: string): string {
  const map: Record<string, string> = {
    immediate: "#DC2626",
    short_term: "#EA580C",
    medium_term: "#CA8A04",
  };
  return map[priority] ?? "#6B7280";
}

function phaseRelevanceLabel(status: string): string {
  const map: Record<string, string> = {
    relevant: "● Rilevante",
    monitor: "◐ Monitorare",
    not_applicable: "○ Non applicabile",
  };
  return map[status] ?? status;
}

function phaseRelevanceColor(status: string): string {
  const map: Record<string, string> = {
    relevant: "#16A34A",
    monitor: "#D97706",
    not_applicable: "#9CA3AF",
  };
  return map[status] ?? "#9CA3AF";
}

function monthsToDeadline(deadline: string | null): string {
  if (!deadline) return "—";
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms < 0) return "Scaduto";
  const months = Math.ceil(ms / (1000 * 60 * 60 * 24 * 30));
  return `${months} ${months === 1 ? "mese" : "mesi"}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  const months = [
    "gen", "feb", "mar", "apr", "mag", "giu",
    "lug", "ago", "set", "ott", "nov", "dic",
  ];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function riskScoreBar(score: number): string {
  const max = 30;
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = score >= 20 ? "#DC2626" : score >= 10 ? "#EA580C" : "#22C55E";
  return `
    <div style="background:#E5E7EB;border-radius:4px;height:10px;width:100%;margin-top:4px;">
      <div style="background:${color};width:${pct}%;height:10px;border-radius:4px;"></div>
    </div>`;
}

function readinessBar(score: number): string {
  const pct = score * 10;
  const color = score >= 7 ? "#16A34A" : score >= 4 ? "#D97706" : "#DC2626";
  return `
    <div style="background:#E5E7EB;border-radius:3px;height:7px;width:100%;margin-top:6px;">
      <div style="background:${color};width:${pct}%;height:7px;border-radius:3px;"></div>
    </div>`;
}

function readinessColor(score: number): string {
  return score >= 7 ? "#16A34A" : score >= 4 ? "#D97706" : "#DC2626";
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function renderToolCard(tool: ToolCatalogEntry, idx: number): string {
  const articlesHtml = tool.applicable_articles
    .map(
      (a) =>
        `<span style="display:inline-block;background:#E5E7EB;border-radius:3px;padding:2px 6px;font-size:10px;margin:2px;">${escapeHtml(a)}</span>`
    )
    .join("");

  const actionsHtml = tool.required_actions
    .map((a) => `<li style="margin-bottom:5px;">${escapeHtml(a)}</li>`)
    .join("");

  return `
  <div style="border:1px solid ${riskColor(tool.risk_classification)};border-left:5px solid ${riskColor(tool.risk_classification)};border-radius:6px;padding:16px;margin-bottom:16px;background:${riskBg(tool.risk_classification)};">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
      <div>
        <span style="font-size:13px;color:#6B7280;font-weight:400;">${idx}.</span>
        <strong style="font-size:16px;color:#111827;margin-left:4px;">${escapeHtml(tool.tool_name)}</strong>
        <span style="font-size:13px;color:#6B7280;margin-left:6px;">${escapeHtml(tool.vendor)}</span>
      </div>
      <span style="background:${riskColor(tool.risk_classification)};color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;letter-spacing:0.5px;">
        ${riskLabel(tool.risk_classification)}
      </span>
    </div>

    <p style="margin:10px 0 6px;font-size:13px;color:#374151;">
      <strong>Finalità dichiarata:</strong> ${escapeHtml(tool.declared_purpose)}
    </p>

    <p style="margin:0 0 10px;font-size:13px;color:#374151;">
      <strong>Analisi del rischio:</strong> ${escapeHtml(tool.rationale_compact)}
    </p>

    <div style="margin-bottom:10px;">
      <strong style="font-size:12px;color:#374151;">Articoli applicabili:</strong><br>
      <div style="margin-top:4px;">${articlesHtml}</div>
    </div>

    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px;">
      <div style="font-size:12px;color:#374151;">
        <strong>Stato conformità:</strong>
        <span style="color:${statusColor(tool.compliance_status)};font-weight:600;"> ${statusLabel(tool.compliance_status)}</span>
      </div>
      <div style="font-size:12px;color:#374151;">
        <strong>Deadline:</strong>
        <span style="font-weight:600;"> ${formatDate(tool.compliance_deadline)}</span>
        <span style="color:#6B7280;"> (${monthsToDeadline(tool.compliance_deadline)})</span>
      </div>
    </div>

    ${
      tool.required_actions.length > 0
        ? `
    <div style="background:rgba(0,0,0,0.03);border-radius:4px;padding:10px 12px;">
      <strong style="font-size:12px;color:#374151;">Azioni richieste:</strong>
      <ul style="margin:8px 0 0 16px;padding:0;font-size:12px;color:#374151;">${actionsHtml}</ul>
    </div>`
        : ""
    }
  </div>`;
}

function renderTimeline(
  timeline: BedrockReportOutput["ai_act_timeline"],
  phaseRelevance: PhaseRelevance
): string {
  const rows: Array<{
    label: string;
    date: string;
    items: string[];
    phaseKey: keyof PhaseRelevance;
  }> = [
    {
      label: "Già in vigore",
      date: "Dal 2 feb 2025",
      items: timeline.already_in_force,
      phaseKey: "already_in_force",
    },
    {
      label: "Agosto 2025",
      date: "2 ago 2025",
      items: timeline.aug_2025,
      phaseKey: "aug_2025",
    },
    {
      label: "Agosto 2026",
      date: "2 ago 2026",
      items: timeline.aug_2026,
      phaseKey: "aug_2026",
    },
    {
      label: "Agosto 2027",
      date: "2 ago 2027",
      items: timeline.aug_2027,
      phaseKey: "aug_2027",
    },
  ];

  const rowsHtml = rows
    .map(({ label, date, items, phaseKey }) => {
      if (items.length === 0) return "";
      const relevance = phaseRelevance[phaseKey];
      const listHtml = items
        .map((i) => `<li style="margin-bottom:3px;">${escapeHtml(i)}</li>`)
        .join("");
      const isPast = label === "Già in vigore";
      const isMain = label === "Agosto 2026";
      const bg = isPast ? "#FEF2F2" : isMain ? "#FFF7ED" : "#F9FAFB";
      const borderColor = isPast ? "#DC2626" : isMain ? "#EA580C" : "#D1D5DB";
      const relevanceColor = phaseRelevanceColor(relevance);
      const relevanceLbl = phaseRelevanceLabel(relevance);
      return `
      <tr>
        <td style="padding:10px 12px;border:1px solid #E5E7EB;background:${bg};border-left:4px solid ${borderColor};width:145px;vertical-align:top;">
          <strong style="font-size:12px;color:#111827;">${label}</strong><br>
          <span style="font-size:11px;color:#6B7280;">${date}</span><br>
          <span style="font-size:10px;font-weight:700;color:${relevanceColor};margin-top:4px;display:inline-block;">${relevanceLbl}</span>
        </td>
        <td style="padding:10px 12px;border:1px solid #E5E7EB;font-size:12px;color:#374151;vertical-align:top;">
          <ul style="margin:0;padding:0 0 0 16px;">${listHtml}</ul>
        </td>
      </tr>`;
    })
    .join("");

  return `
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr>
        <th style="padding:8px 12px;background:#F3F4F6;border:1px solid #E5E7EB;text-align:left;font-size:12px;color:#374151;">Fase &amp; Rilevanza</th>
        <th style="padding:8px 12px;background:#F3F4F6;border:1px solid #E5E7EB;text-align:left;font-size:12px;color:#374151;">Obblighi applicabili alla tua azienda</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>`;
}

function renderPriorityActions(actions: PriorityAction[]): string {
  return actions
    .map(
      (a, i) => `
    <div style="display:flex;gap:12px;margin-bottom:14px;align-items:flex-start;">
      <div style="min-width:36px;height:36px;background:${priorityColor(a.priority)};border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0;">${i + 1}</div>
      <div>
        <span style="display:inline-block;background:${priorityColor(a.priority)};color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;letter-spacing:0.5px;margin-bottom:4px;">${priorityLabel(a.priority)}</span>
        <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#111827;">${escapeHtml(a.action)}</p>
        <p style="margin:0;font-size:12px;color:#6B7280;">${escapeHtml(a.rationale)}</p>
      </div>
    </div>`
    )
    .join("");
}

function renderComplianceGaps(gaps: string[]): string {
  if (!gaps || gaps.length === 0) return "";
  const items = gaps
    .map(
      (gap) => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid #FDE68A;">
      <span style="color:#D97706;font-size:15px;flex-shrink:0;margin-top:1px;">&#9888;</span>
      <span style="font-size:13px;color:#92400E;line-height:1.5;">${escapeHtml(gap)}</span>
    </div>`
    )
    .join("");

  return `
<h2>Potential Compliance Gaps</h2>
<p style="font-size:12px;color:#6B7280;margin-bottom:12px;">Sulla base delle informazioni fornite, sono stati identificati possibili gap nelle seguenti aree di compliance AI Act. Questi elementi richiedono verifica e azione prioritaria.</p>
<div style="background:#FFFBEB;border:1px solid #FDE68A;border-left:4px solid #D97706;border-radius:0 6px 6px 0;padding:4px 14px 4px 14px;margin-bottom:20px;">
  ${items}
</div>`;
}

function renderScoreBreakdown(breakdown: ScoreBreakdown): string {
  const areas: Array<{ key: keyof ScoreBreakdown; label: string; desc: string }> = [
    {
      key: "governance",
      label: "Governance",
      desc: "Policy, ownership e processi interni AI",
    },
    {
      key: "transparency",
      label: "Trasparenza",
      desc: "AI disclosure verso utenti e dipendenti",
    },
    {
      key: "documentation",
      label: "Documentazione",
      desc: "Documentazione tecnica e registri AI",
    },
    {
      key: "monitoring",
      label: "Monitoraggio",
      desc: "Log, supervisione e revisione periodica",
    },
  ];

  const cardsHtml = areas
    .map(({ key, label, desc }) => {
      const score = breakdown[key];
      const color = readinessColor(score);
      return `
    <div style="border:1px solid #E5E7EB;border-radius:6px;padding:14px 16px;background:#FAFAFA;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6B7280;margin-bottom:2px;">${label}</div>
      <div style="font-size:10px;color:#9CA3AF;margin-bottom:8px;">${desc}</div>
      <div style="font-size:26px;font-weight:900;color:${color};line-height:1;">${score}<span style="font-size:14px;color:#9CA3AF;">/10</span></div>
      ${readinessBar(score)}
    </div>`;
    })
    .join("");

  return `
<h2>Compliance Readiness Breakdown</h2>
<p style="font-size:12px;color:#6B7280;margin-bottom:12px;">Valutazione della maturità di compliance per area, basata sulle informazioni fornite. Punteggio 0–10 dove 10 indica readiness completa.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
  ${cardsHtml}
</div>`;
}

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
    return { articles: ["Art. 29", "Art. 28"], automatable: false };
  if (n.includes("impatto") || n.includes("fria") || n.includes("valutazione"))
    return { articles: ["Art. 9", "Art. 27"], automatable: false };
  if (n.includes("governance") || n.includes("responsabil"))
    return { articles: ["Art. 16", "Art. 29"], automatable: false };
  return { articles: ["Reg. UE 2024/1689"], automatable: false };
}

function renderRecommendedDocs(docs: string[]): string {
  if (!docs || docs.length === 0) return "";
  const itemsHtml = docs
    .map((doc) => {
      const { articles, automatable } = docMeta(doc);
      const articlesHtml = articles
        .map((a) => `<span style="display:inline-block;background:#E5E7EB;border-radius:3px;padding:1px 5px;font-size:10px;margin-right:3px;color:#374151;">${escapeHtml(a)}</span>`)
        .join("");
      const autoLabel = automatable
        ? `<span style="display:inline-block;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:2px 8px;font-size:10px;font-weight:700;color:#166534;">&#10003; Automatizzabile con Actify</span>`
        : `<span style="display:inline-block;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:2px 8px;font-size:10px;font-weight:600;color:#6B7280;">&#9888; Non automatizzabile</span>`;
      return `
    <div style="border:1px solid #E5E7EB;border-radius:6px;padding:10px 14px;margin-bottom:8px;background:#F9FAFB;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;margin-bottom:5px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:#22C55E;font-size:14px;flex-shrink:0;">&#128196;</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${escapeHtml(doc)}</span>
        </div>
        ${autoLabel}
      </div>
      <div style="margin-left:22px;">${articlesHtml}</div>
    </div>`;
    })
    .join("");

  return `
<h2>Documenti di Compliance Raccomandati</h2>
<p style="font-size:12px;color:#6B7280;margin-bottom:12px;">In base ai sistemi AI dichiarati e al profilo aziendale, i seguenti documenti sono necessari per la conformit&agrave; all&apos;AI Act. I documenti marcati <strong style="color:#166534;">Automatizzabile con Actify</strong> potranno essere generati direttamente dalla piattaforma.</p>
${itemsHtml}
<div style="background:#FEFCE8;border:1px solid #FDE68A;border-left:4px solid #CA8A04;border-radius:0 6px 6px 0;padding:12px 16px;margin-top:8px;font-size:11px;color:#713F12;line-height:1.6;">
  &#9432; <strong>Actify sta costruendo un SaaS dedicato</strong> per automatizzare la generazione di tutti i documenti di compliance per ogni sistema AI censito, nel rispetto del Reg. UE 2024/1689. I documenti <em>non automatizzabili</em> richiedono supervisione umana o consulenza legale specializzata.
</div>`;
}

function renderSanctionsSection(payload: IntakePayload): string {
  const report = computeSanctionsReport(payload);
  const { revenue, is_sme, tiers, total_min, total_max, disclaimer } = report;

  const srcLabel: Record<string, string> = {
    exact:     "Fatturato esatto dichiarato",
    declared:  "Valore mediano del range dichiarato",
    estimated: "Stima da dimensione e settore (meno precisa)",
  };
  const srcColor: Record<string, string> = {
    exact: "#16A34A", declared: "#D97706", estimated: "#9CA3AF",
  };

  const rowsHtml = tiers
    .map(
      (t) => `
    <tr>
      <td style="padding:10px 12px;border:1px solid #FED7AA;font-size:12px;color:#92400E;background:#FFFBEB;">${escapeHtml(t.label)}</td>
      <td style="padding:10px 12px;border:1px solid #FED7AA;font-size:12px;color:#374151;text-align:center;">${formatEur(t.cap_absolute)} / ${t.pct_label}</td>
      <td style="padding:10px 12px;border:1px solid #FED7AA;font-size:12px;font-weight:700;color:#DC2626;text-align:center;">${formatEur(t.estimated_min)} – ${formatEur(t.estimated_max)}${t.is_sme_reduced ? ' <span style="font-size:10px;color:#6B7280;font-weight:400;">(PMI -50%)</span>' : ''}</td>
    </tr>`
    )
    .join("");

  return `
<div style="border:1px solid #FED7AA;border-radius:8px;overflow:hidden;margin:20px 0;">
  <div style="background:#FFF7ED;padding:14px 16px;border-bottom:1px solid #FED7AA;">
    <div style="font-size:15px;font-weight:700;color:#9A3412;margin-bottom:6px;">&#128178; Stima Esposizione a Sanzioni — Art. 99 Reg. UE 2024/1689</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
      <div style="font-size:12px;color:#C2410C;">
        <strong>Fatturato usato:</strong> ${formatEur(revenue.amount)}
        <span style="margin-left:6px;font-size:10px;font-weight:700;color:${srcColor[revenue.source] ?? "#9CA3AF"};">(${srcLabel[revenue.source] ?? revenue.label})</span>
      </div>
      ${is_sme ? '<div style="font-size:11px;color:#92400E;background:#FEF3C7;padding:3px 8px;border-radius:10px;border:1px solid #FDE68A;">&#9660; PMI — Art. 100 riduzione 50%</div>' : ""}
    </div>
  </div>

  <!-- Tier table -->
  <div style="padding:0;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:8px 12px;background:#FFF7ED;border:1px solid #FED7AA;text-align:left;font-size:11px;color:#92400E;font-weight:700;">Categoria sanzionatoria</th>
          <th style="padding:8px 12px;background:#FFF7ED;border:1px solid #FED7AA;text-align:center;font-size:11px;color:#92400E;font-weight:700;">Massimale Art. 99</th>
          <th style="padding:8px 12px;background:#FFF7ED;border:1px solid #FED7AA;text-align:center;font-size:11px;color:#92400E;font-weight:700;">Stima per la tua azienda</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:10px 12px;border:1px solid #FED7AA;font-size:13px;font-weight:700;color:#111827;background:#FEF2F2;">Esposizione totale stimata (cumulata)</td>
          <td style="padding:10px 12px;border:1px solid #FED7AA;font-size:14px;font-weight:800;color:#DC2626;text-align:center;background:#FEF2F2;">${formatEur(total_min)} – ${formatEur(total_max)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Disclaimer -->
  <div style="padding:10px 16px;background:#FFFBEB;border-top:1px solid #FDE68A;font-size:10px;color:#78350F;line-height:1.6;">
    &#9888; <em>${escapeHtml(disclaimer)}</em>
  </div>
</div>`;
}

function renderAssessmentMetadata(companyName: string, generatedDate: string): string {
  return `
<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:12px 16px;margin:16px 0;">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#9CA3AF;margin-bottom:8px;">Assessment Metadata</div>
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <tr>
      <td style="padding:3px 8px 3px 0;color:#6B7280;width:25%;">Assessment Version</td>
      <td style="padding:3px 8px;color:#111827;font-weight:500;width:25%;">v1.0</td>
      <td style="padding:3px 8px;color:#6B7280;width:25%;">AI Act Knowledge Base</td>
      <td style="padding:3px 8px;color:#111827;font-weight:500;width:25%;">EU Reg. 2024/1689</td>
    </tr>
    <tr>
      <td style="padding:3px 8px 3px 0;color:#6B7280;">Generated By</td>
      <td style="padding:3px 8px;color:#111827;font-weight:500;">Amazon Bedrock (Nova Pro)</td>
      <td style="padding:3px 8px;color:#6B7280;">Assessment Date</td>
      <td style="padding:3px 8px;color:#111827;font-weight:500;">${generatedDate}</td>
    </tr>
    <tr>
      <td style="padding:3px 8px 3px 0;color:#6B7280;">Organization</td>
      <td style="padding:3px 8px;color:#111827;font-weight:500;" colspan="3">${escapeHtml(companyName)}</td>
    </tr>
  </table>
</div>`;
}

// ─── Actify Remediation Capabilities ─────────────────────────────────────────

interface ActifyCapability {
  article: string;
  description: string;
  documents: string[];       // documents Actify auto-generates
  riskReduction: number;     // estimated % risk reduction
  automatable: boolean;
}

const ARTICLE_CAPABILITIES: ActifyCapability[] = [
  {
    article: 'Art. 4 — AI Literacy',
    description: 'Formazione e alfabetizzazione AI del personale',
    documents: ['Piano di Formazione AI Literacy', 'Registro Partecipanti Formazione AI', 'Modulo Presa Visione Sistemi AI'],
    riskReduction: 12,
    automatable: true,
  },
  {
    article: 'Art. 11 — Documentazione Tecnica',
    description: 'Documentazione tecnica completa per sistemi ad alto rischio',
    documents: ['Documentazione Tecnica del Sistema AI (Art. 11)', 'Scheda Architettura e Dati Training'],
    riskReduction: 22,
    automatable: true,
  },
  {
    article: 'Art. 12 — Log-Book',
    description: 'Registri automatici delle attività del sistema AI',
    documents: ['Log-Book Automatico Attività AI', 'Registro Versioni e Modifiche'],
    riskReduction: 15,
    automatable: true,
  },
  {
    article: 'Art. 13 + 50 — Trasparenza',
    description: 'Obblighi di trasparenza verso utenti e dipendenti',
    documents: ['AI Transparency Notice Personalizzata', 'Informativa AI per Dipendenti', 'Disclosure AI per Utenti Finali'],
    riskReduction: 18,
    automatable: true,
  },
  {
    article: 'Art. 17 — Quality Management',
    description: 'Sistema di gestione della qualità per provider',
    documents: ['Quality Management System AI (QMS)', 'Procedure di Validazione e Testing'],
    riskReduction: 20,
    automatable: false,
  },
  {
    article: 'Art. 26/29 — Obblighi Deployer',
    description: 'Policy interne e procedure per l\'uso responsabile dell\'AI',
    documents: ['Policy Utilizzo AI Interno', 'Procedura Supervisione Umana Output AI', 'Registro Decisioni Automatizzate'],
    riskReduction: 20,
    automatable: true,
  },
  {
    article: 'Art. 9/10 — Risk Management',
    description: 'Sistema di gestione del rischio e governance dati',
    documents: ['Piano di Gestione Rischio AI', 'Data Governance Framework per Training AI'],
    riskReduction: 25,
    automatable: false,
  },
  {
    article: 'Art. 27 — FRIA',
    description: 'Valutazione d\'impatto sui diritti fondamentali',
    documents: ['FRIA — Fundamental Rights Impact Assessment'],
    riskReduction: 18,
    automatable: false,
  },
  {
    article: 'Art. 49 — Registrazione EU',
    description: 'Registrazione nella banca dati UE per sistemi ad alto rischio',
    documents: ['Scheda Registrazione EU AI Database', 'Dichiarazione di Conformità UE'],
    riskReduction: 10,
    automatable: true,
  },
];

// Selects applicable capabilities based on compliance gaps and applicable articles
function selectCapabilities(
  output: BedrockReportOutput,
  payload: IntakePayload,
): ActifyCapability[] {
  const ruleResult = determineApplicableArticles(payload);
  const keys       = new Set(ruleResult.applicableKeys);
  const gaps       = output.compliance_gaps.join(' ').toLowerCase();

  return ARTICLE_CAPABILITIES.filter(cap => {
    const artLower = cap.article.toLowerCase();
    if (artLower.includes('art. 4'))                        return keys.has('art_4');
    if (artLower.includes('art. 11'))                       return keys.has('art_11');
    if (artLower.includes('art. 12'))                       return keys.has('art_12');
    if (artLower.includes('art. 13') || artLower.includes('50')) return keys.has('art_50') || keys.has('art_13_p1');
    if (artLower.includes('art. 17'))                       return keys.has('art_16') && ruleResult.isHighRisk;
    if (artLower.includes('art. 26') || artLower.includes('29')) return keys.has('art_26_p1') || keys.has('art_29');
    if (artLower.includes('art. 9') || artLower.includes('10')) return keys.has('art_9') || gaps.includes('rischio');
    if (artLower.includes('art. 27'))                       return keys.has('art_27');
    if (artLower.includes('art. 49'))                       return keys.has('art_49');
    return false;
  });
}

function renderActifyRemediation(
  output: BedrockReportOutput,
  payload: IntakePayload,
): string {
  const capabilities = selectCapabilities(output, payload);
  if (capabilities.length === 0) return '';

  const automatableCount  = capabilities.filter(c => c.automatable).length;
  const totalDocs         = capabilities.reduce((n, c) => n + c.documents.length, 0);
  const avgRiskReduction  = Math.min(
    65,
    Math.round(capabilities.reduce((n, c) => n + c.riskReduction, 0) / 1.5)
  );

  const rows = capabilities.map(cap => {
    const docsHtml = cap.documents
      .map(d => `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
        <span style="color:${cap.automatable ? '#22C55E' : '#CA8A04'};font-size:12px;">
          ${cap.automatable ? '&#128196;' : '&#9998;'}
        </span>
        <span style="font-size:12px;color:#111827;">${escapeHtml(d)}</span>
      </div>`)
      .join('');

    const badgeHtml = cap.automatable
      ? `<span style="display:inline-block;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:2px 7px;font-size:10px;font-weight:700;color:#166534;">&#10003; Automatizzabile</span>`
      : `<span style="display:inline-block;background:#FEFCE8;border:1px solid #FDE68A;border-radius:10px;padding:2px 7px;font-size:10px;font-weight:600;color:#713F12;">&#9998; Con supporto</span>`;

    return `
    <tr>
      <td style="padding:12px;border:1px solid #D1FAE5;vertical-align:top;">
        <div style="font-size:12px;font-weight:700;color:#065F46;margin-bottom:3px;">${escapeHtml(cap.article)}</div>
        <div style="font-size:11px;color:#6B7280;">${escapeHtml(cap.description)}</div>
        <div style="margin-top:6px;">${badgeHtml}</div>
      </td>
      <td style="padding:12px;border:1px solid #D1FAE5;vertical-align:top;">${docsHtml}</td>
      <td style="padding:12px;border:1px solid #D1FAE5;vertical-align:top;text-align:center;white-space:nowrap;">
        <div style="font-size:20px;font-weight:800;color:#22C55E;">-${cap.riskReduction}%</div>
        <div style="font-size:10px;color:#9CA3AF;">stima rischio</div>
      </td>
    </tr>`;
  }).join('');

  return `
<div style="border:2px solid #22C55E;border-radius:12px;overflow:hidden;margin:28px 0;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#052e16,#14532d);padding:18px 20px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
      ${markSvg(36, 'green')}
      <div>
        <div style="font-size:16px;font-weight:800;color:#fff;">Come Actify riduce il tuo rischio</div>
        <div style="font-size:12px;color:#86EFAC;margin-top:2px;">Automazione compliance AI Act su misura per il tuo profilo</div>
      </div>
    </div>
    <!-- KPI strip -->
    <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:14px;">
      <div style="background:rgba(255,255,255,0.1);border-radius:8px;padding:10px 16px;min-width:120px;text-align:center;">
        <div style="font-size:26px;font-weight:900;color:#22C55E;">${totalDocs}</div>
        <div style="font-size:10px;color:#86EFAC;text-transform:uppercase;letter-spacing:0.5px;">documenti generabili</div>
      </div>
      <div style="background:rgba(255,255,255,0.1);border-radius:8px;padding:10px 16px;min-width:120px;text-align:center;">
        <div style="font-size:26px;font-weight:900;color:#22C55E;">${automatableCount}</div>
        <div style="font-size:10px;color:#86EFAC;text-transform:uppercase;letter-spacing:0.5px;">aree automatizzabili</div>
      </div>
      <div style="background:rgba(34,197,94,0.2);border:1px solid rgba(34,197,94,0.4);border-radius:8px;padding:10px 16px;min-width:160px;text-align:center;">
        <div style="font-size:26px;font-weight:900;color:#4ADE80;">-${avgRiskReduction}%</div>
        <div style="font-size:10px;color:#86EFAC;text-transform:uppercase;letter-spacing:0.5px;">riduzione rischio stimata</div>
      </div>
    </div>
  </div>

  <!-- Table -->
  <div style="background:#fff;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#F0FDF4;">
          <th style="padding:10px 12px;border:1px solid #D1FAE5;text-align:left;font-size:11px;color:#065F46;font-weight:700;width:28%;">Articolo AI Act</th>
          <th style="padding:10px 12px;border:1px solid #D1FAE5;text-align:left;font-size:11px;color:#065F46;font-weight:700;width:57%;">Documenti Actify genera automaticamente</th>
          <th style="padding:10px 12px;border:1px solid #D1FAE5;text-align:center;font-size:11px;color:#065F46;font-weight:700;width:15%;">Riduzione rischio</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <!-- Footer CTA -->
  <div style="background:#F0FDF4;padding:14px 20px;border-top:1px solid #D1FAE5;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
    <div>
      <div style="font-size:13px;font-weight:700;color:#065F46;">Accedi alla piattaforma Actify</div>
      <div style="font-size:11px;color:#6B7280;margin-top:2px;">Genera tutti i documenti sopra in pochi minuti. Inventario AI, report compliance, monitoraggio scadenze.</div>
    </div>
    <div style="background:#22C55E;color:#fff;font-size:13px;font-weight:700;padding:10px 20px;border-radius:8px;white-space:nowrap;">
      Inizia su official-actify.com →
    </div>
  </div>
</div>`;
}

// ─── Main render ──────────────────────────────────────────────────────────────

export function render(
  output: BedrockReportOutput,
  payload: IntakePayload,
): string {
  const { company } = payload;
  const generatedDate = new Date().toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const toolCardsHtml = output.tool_catalog
    .map((tool, idx) => renderToolCard(tool, idx + 1))
    .join("");

  const { compliance_summary: cs } = output;
  const totalTools = output.tool_catalog.length;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Actify &mdash; AI Act Compliance Report &mdash; ${escapeHtml(company.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; margin: 0; padding: 0; background: #fff; }
    .page-break { page-break-after: always; }
    h2 { font-size: 18px; color: #111827; border-bottom: 2px solid #22C55E; padding-bottom: 6px; margin: 24px 0 14px; }
    h3 { font-size: 14px; color: #374151; margin: 14px 0 8px; }
    p  { font-size: 13px; line-height: 1.6; color: #374151; margin: 0 0 10px; }
  </style>
</head>
<body>

<!-- ─── COVER PAGE ─── -->
<div style="min-height:270mm;background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:48px 40px;display:flex;flex-direction:column;justify-content:space-between;">

  <!-- Logo + tagline -->
  <div style="text-align:center;">
    <div style="display:block;line-height:0;">${markSvg(80, "green")}</div>
    <div style="display:block;line-height:0;margin-top:16px;">${logoSvg(220, 56)}</div>
    <div style="font-size:13px;color:#94A3B8;margin-top:14px;font-style:italic;letter-spacing:0.2px;">&ldquo;L&apos;AI &egrave; il tuo vantaggio. La compliance non deve essere il tuo problema.&rdquo;</div>
  </div>

  <!-- Main title block -->
  <div style="margin:auto 0;">
    <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Report di Compliance</div>
    <h1 style="font-size:34px;font-weight:800;color:#F8FAFC;margin:0 0 8px;line-height:1.2;">Analisi AI Act<br>Personalizzata</h1>
    <div style="width:48px;height:4px;background:#22C55E;border-radius:2px;margin-bottom:20px;"></div>
    <div style="font-size:22px;font-weight:700;color:#22C55E;">${escapeHtml(company.name)}</div>
    <div style="font-size:14px;color:#94A3B8;margin-top:4px;">${escapeHtml(company.sector)} &middot; ${escapeHtml(company.employees_range)} dipendenti &middot; ${escapeHtml(company.country)}</div>
  </div>

  <!-- Risk badge + meta -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;">
    <div>
      <div style="font-size:11px;color:#94A3B8;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Livello di Rischio Complessivo</div>
      <div style="background:${riskColor(output.overall_risk_level)};color:#fff;font-size:18px;font-weight:800;padding:8px 20px;border-radius:8px;display:inline-block;letter-spacing:0.5px;">
        ${riskLabel(output.overall_risk_level)}
      </div>
      <div style="margin-top:6px;font-size:11px;color:#94A3B8;">Punteggio: ${output.overall_risk_score}/30${riskScoreBar(output.overall_risk_score)}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#64748B;">
      <div>Generato il ${generatedDate}</div>
      <div style="margin-top:2px;">Reg. UE 2024/1689 &mdash; EU AI Act</div>
      <div style="margin-top:2px;color:#22C55E;">official-actify.com</div>
    </div>
  </div>
</div>

<div style="padding:0 40px;">

<!-- ─── DISCLAIMER ─── -->
<div style="background:#FFF7ED;border-left:4px solid #EA580C;padding:10px 14px;margin:20px 0;font-size:11px;color:#92400E;border-radius:0 4px 4px 0;">
  <strong>Nota:</strong> Questo report &egrave; generato automaticamente a fini informativi e non costituisce parere legale. Per consulenza specifica consultare un professionista qualificato.
</div>

<!-- ─── EXECUTIVE SUMMARY ─── -->
<h2>Executive Summary</h2>
<p style="font-size:14px;line-height:1.7;color:#111827;background:#F0FDF4;border-left:4px solid #22C55E;padding:14px 16px;border-radius:0 6px 6px 0;">
  ${escapeHtml(output.executive_summary)}
</p>

<!-- ─── CATALOGO STRUMENTI AI ─── -->
<div class="page-break"></div>
<h2>Catalogo Strumenti AI</h2>
<p style="font-size:12px;color:#6B7280;margin-bottom:16px;">Analisi individuale di ogni sistema di IA dichiarato in conformit&agrave; al Reg. UE 2024/1689.</p>
${toolCardsHtml}

<!-- ─── TIMELINE AI ACT ─── -->
<div class="page-break"></div>
<h2>Timeline AI Act &mdash; Obblighi Applicabili</h2>
<p style="font-size:12px;color:#6B7280;margin-bottom:12px;">Scadenze del Reg. UE 2024/1689 rilevanti per il profilo della tua azienda, con indicazione del livello di rilevanza per ogni fase.</p>
${renderTimeline(output.ai_act_timeline, output.phase_relevance)}

<!-- ─── AZIONI PRIORITARIE ─── -->
<h2 style="margin-top:28px;">Piano d&apos;Azione Prioritario</h2>
<p style="font-size:12px;color:#6B7280;margin-bottom:16px;">Azioni operative raccomandate, ordinate per urgenza, specifiche per i sistemi AI dichiarati.</p>
${renderPriorityActions(output.priority_actions)}

<!-- ─── RECOMMENDED DOCUMENTS ─── -->
${renderRecommendedDocs(output.recommended_documents)}

<!-- ─── ACTIFY REMEDIATION CAPABILITIES ─── -->
${renderActifyRemediation(output, payload)}

<!-- ─── SANZIONI ART. 99 ─── -->
${renderSanctionsSection(payload)}

<!-- ─── CALL TO ACTION ─── -->
<div style="background:linear-gradient(135deg,#0F172A,#1E293B);border:1px solid #22C55E;border-radius:12px;padding:36px 28px;margin:28px 0;text-align:center;">
  <div style="display:flex;align-items:center;justify-content:center;margin-bottom:14px;">
    ${markSvg(44, "green")}
  </div>
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#86EFAC;margin-bottom:10px;">Prossimo passo</div>
  <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:10px;line-height:1.3;">Actify SaaS &mdash; In Arrivo</div>
  <div style="font-size:13px;color:#94A3B8;margin-bottom:20px;max-width:480px;margin-left:auto;margin-right:auto;">Stiamo costruendo la piattaforma Actify per automatizzare la compliance AI Act della tua azienda. Non appena disponibile, sarai ricontattato all&apos;email fornita in questo assessment.</div>
  <div style="display:inline-block;text-align:left;margin-bottom:20px;">
    ${[
      "Generazione automatica documenti AI governance",
      "Stima esposizione a potenziali sanzioni Art. 99",
      "Inventario sistemi AI sempre aggiornato",
      "Tracciamento obblighi di compliance nel tempo",
      "Centralizzazione attività di governance AI",
    ]
      .map(
        (item) => `
    <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#CBD5E1;margin-bottom:6px;">
      <span style="color:#22C55E;font-weight:700;">&#10003;</span>${escapeHtml(item)}
    </div>`
      )
      .join("")}
  </div>
  <div style="font-size:11px;color:#64748B;max-width:400px;margin:0 auto;">&#9432; Verrai ricontattato non appena la piattaforma sar&agrave; disponibile. Nel frattempo visita <span style="color:#22C55E;">official-actify.com</span></div>
</div>

<!-- ─── ASSESSMENT METADATA ─── -->
${renderAssessmentMetadata(company.name, generatedDate)}

<!-- ─── CONFIDENCE DISCLAIMER ─── -->
<div style="background:#FEFCE8;border:1px solid #FDE68A;border-left:4px solid #CA8A04;border-radius:0 4px 4px 0;padding:10px 14px;margin:8px 0 16px;font-size:11px;color:#713F12;line-height:1.6;">
  <strong>Confidence Disclaimer:</strong> This assessment is generated automatically based on the information provided by the organization and does not constitute legal advice or official certification of compliance. Results depend on the completeness and accuracy of the submitted data. For official legal guidance consult a qualified AI Act compliance professional.
</div>

<!-- ─── FOOTER ─── -->
<div style="border-top:1px solid #E5E7EB;padding:16px 0;margin-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#9CA3AF;flex-wrap:wrap;gap:8px;">
  <div style="display:flex;align-items:center;gap:8px;">
    ${markSvg(20, "dark-green")}
    <span>Actify &mdash; AI Act Compliance Platform &mdash; official-actify.com</span>
  </div>
  <span>Generato il ${generatedDate} &middot; Reg. UE 2024/1689</span>
  <span>Riservato a ${escapeHtml(company.name)}</span>
</div>

</div>
</body>
</html>`;
}
