import type { BedrockReportOutput, ToolCatalogEntry, PriorityAction } from "../types/reportOutput";
import type { IntakePayload } from "../types/intake";

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

function scoreBar(score: number): string {
  const max = 30;
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = score >= 20 ? "#DC2626" : score >= 10 ? "#EA580C" : "#22C55E";
  return `
    <div style="background:#E5E7EB;border-radius:4px;height:10px;width:100%;margin-top:4px;">
      <div style="background:${color};width:${pct}%;height:10px;border-radius:4px;"></div>
    </div>`;
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function renderToolCard(tool: ToolCatalogEntry, idx: number): string {
  const articlesHtml = tool.applicable_articles
    .map((a) => `<span style="display:inline-block;background:#E5E7EB;border-radius:3px;padding:2px 6px;font-size:10px;margin:2px;">${escapeHtml(a)}</span>`)
    .join("");

  const actionsHtml = tool.required_actions
    .map((a) => `<li style="margin-bottom:4px;">${escapeHtml(a)}</li>`)
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

    ${tool.required_actions.length > 0 ? `
    <div>
      <strong style="font-size:12px;color:#374151;">Azioni richieste:</strong>
      <ul style="margin:6px 0 0 16px;padding:0;font-size:12px;color:#374151;">${actionsHtml}</ul>
    </div>` : ""}
  </div>`;
}

function renderTimeline(timeline: BedrockReportOutput["ai_act_timeline"]): string {
  const rows: Array<{ label: string; date: string; items: string[] }> = [
    { label: "Già in vigore", date: "Dal 2 feb 2025", items: timeline.already_in_force },
    { label: "Agosto 2025", date: "2 ago 2025", items: timeline.aug_2025 },
    { label: "Agosto 2026", date: "2 ago 2026", items: timeline.aug_2026 },
    { label: "Agosto 2027", date: "2 ago 2027", items: timeline.aug_2027 },
  ];

  const rowsHtml = rows
    .map(({ label, date, items }) => {
      if (items.length === 0) return "";
      const listHtml = items
        .map((i) => `<li style="margin-bottom:3px;">${escapeHtml(i)}</li>`)
        .join("");
      const isPast = label === "Già in vigore";
      const isMain = label === "Agosto 2026";
      const bg = isPast ? "#FEF2F2" : isMain ? "#FFF7ED" : "#F9FAFB";
      const borderColor = isPast ? "#DC2626" : isMain ? "#EA580C" : "#D1D5DB";
      return `
      <tr>
        <td style="padding:10px 12px;border:1px solid #E5E7EB;background:${bg};border-left:4px solid ${borderColor};width:130px;vertical-align:top;">
          <strong style="font-size:12px;color:#111827;">${label}</strong><br>
          <span style="font-size:11px;color:#6B7280;">${date}</span>
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
        <th style="padding:8px 12px;background:#F3F4F6;border:1px solid #E5E7EB;text-align:left;font-size:12px;color:#374151;">Fase</th>
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

// ─── Main render ──────────────────────────────────────────────────────────────

export function render(
  output: BedrockReportOutput,
  payload: IntakePayload
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
  <title>Actify — AI Act Compliance Report — ${escapeHtml(company.name)}</title>
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
  <div>
    <div style="font-size:32px;font-weight:800;color:#22C55E;letter-spacing:-1px;">Actify</div>
    <div style="font-size:12px;color:#94A3B8;margin-top:2px;letter-spacing:1px;text-transform:uppercase;">AI Act Compliance Platform</div>
  </div>

  <!-- Main title block -->
  <div style="margin:auto 0;">
    <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Report di Compliance</div>
    <h1 style="font-size:34px;font-weight:800;color:#F8FAFC;margin:0 0 8px;line-height:1.2;">Analisi AI Act<br>Personalizzata</h1>
    <div style="width:48px;height:4px;background:#22C55E;border-radius:2px;margin-bottom:20px;"></div>
    <div style="font-size:22px;font-weight:700;color:#22C55E;">${escapeHtml(company.name)}</div>
    <div style="font-size:14px;color:#94A3B8;margin-top:4px;">${escapeHtml(company.sector)} · ${escapeHtml(company.employees_range)} dipendenti · ${escapeHtml(company.country)}</div>
  </div>

  <!-- Risk badge + meta -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;">
    <div>
      <div style="font-size:11px;color:#94A3B8;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Livello di Rischio Complessivo</div>
      <div style="background:${riskColor(output.overall_risk_level)};color:#fff;font-size:18px;font-weight:800;padding:8px 20px;border-radius:8px;display:inline-block;letter-spacing:0.5px;">
        ${riskLabel(output.overall_risk_level)}
      </div>
      <div style="margin-top:6px;font-size:11px;color:#94A3B8;">Punteggio: ${output.overall_risk_score}/30${scoreBar(output.overall_risk_score)}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#64748B;">
      <div>Generato il ${generatedDate}</div>
      <div style="margin-top:2px;">Reg. UE 2024/1689 — EU AI Act</div>
      <div style="margin-top:2px;color:#22C55E;">actify.io</div>
    </div>
  </div>
</div>

<div style="padding:0 40px;">

<!-- ─── DISCLAIMER ─── -->
<div style="background:#FFF7ED;border-left:4px solid #EA580C;padding:10px 14px;margin:20px 0;font-size:11px;color:#92400E;border-radius:0 4px 4px 0;">
  <strong>Nota:</strong> Questo report è generato automaticamente a fini informativi e non costituisce parere legale. Per consulenza specifica consultare un professionista qualificato.
</div>

<!-- ─── EXECUTIVE SUMMARY ─── -->
<h2>Executive Summary</h2>
<p style="font-size:14px;line-height:1.7;color:#111827;background:#F0FDF4;border-left:4px solid #22C55E;padding:14px 16px;border-radius:0 6px 6px 0;">
  ${escapeHtml(output.executive_summary)}
</p>

<!-- ─── PANORAMICA COMPLIANCE ─── -->
<h2>Panoramica Compliance</h2>
<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">

  <div style="flex:1;min-width:120px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:14px;text-align:center;">
    <div style="font-size:28px;font-weight:800;color:#16A34A;">${cs.compliant_count}</div>
    <div style="font-size:11px;color:#374151;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Conformi</div>
  </div>

  <div style="flex:1;min-width:120px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px;text-align:center;">
    <div style="font-size:28px;font-weight:800;color:#DC2626;">${cs.non_compliant_count}</div>
    <div style="font-size:11px;color:#374151;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Non Conformi</div>
  </div>

  <div style="flex:1;min-width:120px;background:#FEFCE8;border:1px solid #FDE68A;border-radius:8px;padding:14px;text-align:center;">
    <div style="font-size:28px;font-weight:800;color:#CA8A04;">${cs.monitoring_count}</div>
    <div style="font-size:11px;color:#374151;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Monitoraggio</div>
  </div>

  <div style="flex:1;min-width:120px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px;text-align:center;">
    <div style="font-size:28px;font-weight:800;color:#475569;">${totalTools}</div>
    <div style="font-size:11px;color:#374151;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Sistemi AI</div>
  </div>

</div>

${cs.most_urgent_deadline ? `
<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:6px;padding:12px 16px;font-size:13px;color:#92400E;">
  <strong>Deadline più urgente:</strong> ${formatDate(cs.most_urgent_deadline)}
  ${cs.months_to_urgency != null ? `<span style="margin-left:8px;background:#EA580C;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${cs.months_to_urgency} ${cs.months_to_urgency === 1 ? "mese" : "mesi"}</span>` : ""}
</div>` : ""}

<!-- ─── CATALOGO STRUMENTI AI ─── -->
<div class="page-break"></div>
<h2>Catalogo Strumenti AI</h2>
<p style="font-size:12px;color:#6B7280;margin-bottom:16px;">Analisi individuale di ogni sistema di IA dichiarato in conformità al Reg. UE 2024/1689.</p>
${toolCardsHtml}

<!-- ─── TIMELINE AI ACT ─── -->
<div class="page-break"></div>
<h2>Timeline AI Act — Obblighi Applicabili</h2>
<p style="font-size:12px;color:#6B7280;margin-bottom:12px;">Scadenze del Regolamento UE 2024/1689 rilevanti per il profilo della tua azienda.</p>
${renderTimeline(output.ai_act_timeline)}

<!-- ─── AZIONI PRIORITARIE ─── -->
<h2 style="margin-top:28px;">Piano d'Azione Prioritario</h2>
<p style="font-size:12px;color:#6B7280;margin-bottom:16px;">Azioni raccomandate ordinate per urgenza.</p>
${renderPriorityActions(output.priority_actions)}

<!-- ─── NOTE DAL COLLOQUIO ─── -->
${output.key_findings_from_notes ? `
<h2>Osservazioni dal Colloquio</h2>
<div style="background:#FEFCE8;border:1px solid #FDE68A;border-left:4px solid #CA8A04;border-radius:0 6px 6px 0;padding:14px 16px;font-size:13px;color:#713F12;">
  ${escapeHtml(output.key_findings_from_notes)}
</div>` : ""}

<!-- ─── CALL TO ACTION ─── -->
<div style="background:linear-gradient(135deg,#14532D,#166534);border-radius:10px;padding:28px;margin:28px 0;text-align:center;">
  <div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:8px;">Vuoi una compliance AI Act completa e continuativa?</div>
  <div style="font-size:13px;color:#BBF7D0;margin-bottom:16px;">${escapeHtml(output.report_footer_note)}</div>
  <div style="display:inline-block;background:#22C55E;color:#fff;font-weight:700;font-size:14px;padding:10px 28px;border-radius:6px;letter-spacing:0.3px;">
    Scopri Actify SaaS → actify.io
  </div>
</div>

<!-- ─── FOOTER ─── -->
<div style="border-top:1px solid #E5E7EB;padding:16px 0;margin-top:8px;display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF;flex-wrap:wrap;gap:4px;">
  <span>Actify — AI Act Compliance Platform — actify.io</span>
  <span>Generato il ${generatedDate} · Reg. UE 2024/1689</span>
  <span>Questo documento è riservato e destinato esclusivamente a ${escapeHtml(company.name)}</span>
</div>

</div>
</body>
</html>`;
}
