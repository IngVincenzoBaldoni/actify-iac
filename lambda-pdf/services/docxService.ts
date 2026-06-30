import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ShadingType,
  BorderStyle,
} from 'docx';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocxMeta {
  generationId:  string;
  schemaVersion: string;
  generatedAt:   string;
}

type DocNode = Paragraph | Table;

// ─── Inline text parser ───────────────────────────────────────────────────────
// Handles **bold** and [DA COMPLETARE...] with yellow highlight

function parseInline(text: string): TextRun[] {
  const runs: TextRun[]                = [];
  const re  = /(\*\*[^*]+\*\*|\[DA COMPLETARE[^\]]*\])/g;
  let   last = 0;
  let   m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      runs.push(new TextRun({ text: text.slice(last, m.index) }));
    }
    const token = m[0];
    if (token.startsWith('**')) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
    } else {
      // [DA COMPLETARE ...] → yellow highlight
      runs.push(new TextRun({ text: token, bold: true, highlight: 'yellow' }));
    }
    last = m.index + token.length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last) }));
  return runs.length > 0 ? runs : [new TextRun({ text })];
}

// ─── Markdown table → Word Table ──────────────────────────────────────────────

const LIGHT_BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' } as const;

function parseMarkdownTable(lines: string[]): Table {
  // Remove separator row (| --- | --- |)
  const dataLines = lines.filter(l => !/^\|[\s\-|]+\|$/.test(l));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:     LIGHT_BORDER,
      bottom:  LIGHT_BORDER,
      left:    LIGHT_BORDER,
      right:   LIGHT_BORDER,
      insideHorizontal: LIGHT_BORDER,
      insideVertical:   LIGHT_BORDER,
    },
    rows: dataLines.map((line, rowIdx) => {
      const isHeader = rowIdx === 0;
      const cells    = line.split('|').slice(1, -1).map(c => c.trim());

      return new TableRow({
        tableHeader: isHeader,
        children: cells.map(cell =>
          new TableCell({
            shading: isHeader
              ? { type: ShadingType.SOLID, color: 'EEF2FF' }
              : { type: ShadingType.CLEAR, color: 'FFFFFF' },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: isHeader
                  ? [new TextRun({ text: cell, bold: true, color: '1E1B4B' })]
                  : parseInline(cell),
                spacing: { after: 0 },
              }),
            ],
          }),
        ),
      });
    }),
  });
}

// ─── Section content parser ───────────────────────────────────────────────────

function parseContentBlock(content: string): DocNode[] {
  const result: DocNode[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines and horizontal rules
    if (!line.trim() || /^---+$/.test(line.trim())) { i++; continue; }

    // Markdown table
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) tableLines.push(lines[i++]);
      if (tableLines.length >= 2) {
        result.push(parseMarkdownTable(tableLines));
        result.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 80 } }));
      }
      continue;
    }

    // Bullet list item
    if (line.startsWith('- ')) {
      result.push(new Paragraph({
        children: [new TextRun({ text: '•  ' }), ...parseInline(line.slice(2))],
        indent:   { left: 360 },
        spacing:  { after: 80 },
      }));
      i++;
      continue;
    }

    // Numbered list item (1. 2. 3. …)
    if (/^\d+\.\s/.test(line)) {
      result.push(new Paragraph({
        children: parseInline(line),
        indent:   { left: 360 },
        spacing:  { after: 80 },
      }));
      i++;
      continue;
    }

    // Sub-heading ### H3
    if (line.startsWith('### ')) {
      result.push(new Paragraph({
        heading:  HeadingLevel.HEADING_3,
        children: [new TextRun({ text: line.slice(4), bold: true, color: '374151' })],
        spacing:  { before: 200, after: 80 },
      }));
      i++;
      continue;
    }

    // Regular paragraph with inline formatting
    result.push(new Paragraph({
      children: parseInline(line),
      spacing:  { after: 100 },
    }));
    i++;
  }

  return result;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function buildTechDocDocx(
  markdownContent: string,
  meta: DocxMeta,
  fallbackTitle = 'Documentazione Tecnica',
): Promise<Buffer> {

  const chunks     = markdownContent.split('\n\n---\n\n');
  const children: DocNode[] = [];

  // ── Cover page from first chunk (# Title + **meta:** lines) ─────────────────
  const headerChunk = chunks[0] ?? '';
  const titleLine   = headerChunk.split('\n').find(l => l.startsWith('# '));
  const docTitle    = titleLine?.slice(2) ?? fallbackTitle;

  // BOZZA warning banner
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text:  '⚠   BOZZA — COMPLETARE E FIRMARE PRIMA DELL\'USO UFFICIALE   ⚠',
        bold:  true,
        size:  24,
        color: 'C0392B',
      })],
      spacing: { after: 480 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C0392B', space: 8 },
      },
    }),
  );

  // Document title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading:   HeadingLevel.TITLE,
      children:  [new TextRun({ text: docTitle, bold: true, size: 44, color: '1E1B4B' })],
      spacing:   { after: 240 },
    }),
  );

  // Metadata lines from header
  const metaLines = headerChunk.split('\n').filter(l => l.startsWith('**') && l.includes(':'));
  for (const ml of metaLines) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children:  parseInline(ml.replace(/\s*\\?$/, '')),
      spacing:   { after: 60 },
    }));
  }

  // Generation provenance footnote
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text:    `Generato da Actify AI — ID: ${meta.generationId}  |  Schema v${meta.schemaVersion}  |  ${meta.generatedAt.slice(0, 10)}`,
      size:    16,
      color:   '9CA3AF',
      italics: true,
    })],
    spacing: { after: 720 },
  }));

  // ── Sections (chunks[1..N]) ──────────────────────────────────────────────────
  for (let idx = 1; idx < chunks.length; idx++) {
    const chunk = chunks[idx].trim();
    if (!chunk) continue;

    const firstBreak = chunk.indexOf('\n\n');
    const headingLine = firstBreak === -1
      ? chunk.replace(/^## /, '')
      : chunk.slice(0, firstBreak).replace(/^## /, '');
    const contentBlock = firstBreak === -1 ? '' : chunk.slice(firstBreak + 2);

    // Page break before signature page and closing sections
    const isClosingSection = headingLine.startsWith('Approvazione')
      || headingLine.startsWith('Riferimenti')
      || headingLine.startsWith('Azioni')
      || headingLine.startsWith('Avvertenza');

    if (isClosingSection) {
      children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    }

    // Section heading with bottom border
    children.push(new Paragraph({
      heading:   HeadingLevel.HEADING_1,
      children:  [new TextRun({ text: headingLine, bold: true, color: '1E1B4B' })],
      spacing:   { before: 360, after: 160 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 2, color: 'C7D2FE', space: 4 },
      },
    }));

    // Section content
    const nodes = parseContentBlock(contentBlock);
    children.push(...nodes);

    children.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 160 } }));
  }

  // ── Build Document ────────────────────────────────────────────────────────────
  const doc = new Document({
    creator:     'Actify AI',
    description: 'Documentazione Tecnica AI Act — Allegato IV Reg. UE 2024/1689',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 }, // 11pt in half-points
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // ~2 cm
        },
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}
