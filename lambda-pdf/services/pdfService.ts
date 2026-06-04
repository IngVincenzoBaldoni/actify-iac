import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless as boolean,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ─── Normative document HTML template ────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  monitoring_plan:        "Piano di Monitoraggio — Art. 14 AI Act",
  transparency_notice:    "Disclosure Notice — Art. 50 AI Act",
  risk_assessment:        "FRIA — Art. 27 AI Act",
  policy_template:        "Policy Interna AI — Art. 9 AI Act",
  document_generation:    "Documentazione Tecnica — Art. 11 AI Act",
  conformity_declaration: "Dichiarazione di Conformità — Art. 47 AI Act",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Converts basic Markdown (headers, bold, lists) to HTML — no external deps
function markdownToHtml(text: string): string {
  return text
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hul]|<\/[hul]|<li|<\/li)(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
}

export function buildNormativeDocumentHtml(params: {
  content:       string;
  title:         string;
  company_name:  string;
  document_type: string;
  generated_at:  string;
  article:       string;
}): string {
  const typeLabel = DOC_TYPE_LABELS[params.document_type] ?? params.document_type;
  const bodyHtml  = markdownToHtml(params.content);
  const dateStr   = formatDate(params.generated_at);

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; }

    .doc-header {
      background: #0f0f0f; color: #fff; padding: 28px 48px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .doc-header .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .doc-header .meta { text-align: right; font-size: 11px; color: #888; line-height: 1.6; }

    .doc-cover { padding: 40px 48px; border-bottom: 3px solid #e5e5e5; margin-bottom: 24px; }
    .doc-type-badge {
      display: inline-block; background: #f0f0f0; color: #555;
      font-size: 10px; font-weight: 700; letter-spacing: 1px;
      text-transform: uppercase; padding: 4px 10px; border-radius: 4px; margin-bottom: 14px;
    }
    .doc-title { font-size: 26px; font-weight: 800; margin-bottom: 6px; line-height: 1.25; }
    .doc-company { font-size: 14px; color: #666; margin-bottom: 20px; }
    .doc-meta-row { display: flex; gap: 28px; font-size: 12px; color: #888; flex-wrap: wrap; }
    .doc-meta-row span strong { color: #444; }

    .doc-disclaimer {
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px;
      padding: 12px 16px; margin: 0 48px 24px; font-size: 11px; color: #92400e;
      line-height: 1.55;
    }

    .doc-body { padding: 0 48px 80px; }
    .doc-body h2 {
      font-size: 16px; font-weight: 700; margin: 28px 0 10px;
      border-bottom: 2px solid #eee; padding-bottom: 6px; color: #111;
    }
    .doc-body h3 { font-size: 14px; font-weight: 700; margin: 20px 0 8px; color: #333; }
    .doc-body h4 { font-size: 13px; font-weight: 600; margin: 16px 0 6px; color: #444; }
    .doc-body p  { font-size: 13px; line-height: 1.7; margin-bottom: 10px; }
    .doc-body ul { margin: 6px 0 14px 22px; }
    .doc-body li { font-size: 13px; line-height: 1.65; margin-bottom: 4px; }
    .doc-body strong { font-weight: 700; }
    .doc-body em { font-style: italic; }

    .doc-footer {
      position: fixed; bottom: 0; left: 0; right: 0;
      padding: 10px 48px; background: #fafafa; border-top: 1px solid #e5e5e5;
      display: flex; justify-content: space-between; font-size: 10px; color: #999;
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="logo">Actify</div>
    <div class="meta">
      AI Act Compliance Platform<br>
      Reg. UE 2024/1689
    </div>
  </div>

  <div class="doc-cover">
    <div class="doc-type-badge">${typeLabel}</div>
    <h1 class="doc-title">${params.title}</h1>
    <p class="doc-company">${params.company_name}</p>
    <div class="doc-meta-row">
      <span>Riferimento: <strong>${params.article}</strong></span>
      <span>Generato il: <strong>${dateStr}</strong></span>
      <span>Generato da: <strong>Actify AI</strong></span>
    </div>
  </div>

  <div class="doc-disclaimer">
    ⚠ Documento generato automaticamente da Actify sulla base del profilo sistema dichiarato.
    Verificare la correttezza dei dati e far revisionare da un consulente legale prima dell'uso ufficiale.
    Actify non assume responsabilità per l'accuratezza legale del contenuto.
  </div>

  <div class="doc-body">
    ${bodyHtml}
  </div>

  <div class="doc-footer">
    <span>${params.company_name} — ${params.title}</span>
    <span>Generato da Actify · actify.io</span>
  </div>
</body>
</html>`;
}
