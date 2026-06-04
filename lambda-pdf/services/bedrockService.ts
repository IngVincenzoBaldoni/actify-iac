import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { systemPrompt } from "./systemPrompt";
import { buildRagContext } from "./ragService";
import { determineApplicableArticles, type PdfRuleEngineResult } from "./articleRuleEngine";
import { reportOutputSchema, OUTPUT_SCHEMA_TEMPLATE } from "./outputSchema";
import type { IntakePayload } from "../types/intake";
import type { BedrockReportOutput } from "../types/reportOutput";

const client = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION ?? "eu-central-1",
});

// RAG is enabled unless explicitly disabled via env var (fallback path)
const RAG_ENABLED = process.env.RAG_ENABLED !== "false" &&
                    !!process.env.S3_VECTORS_BUCKET;

export async function analyze(payload: IntakePayload): Promise<BedrockReportOutput> {
  // ── 1. Deterministic rule engine — identify applicable articles ───────────────
  const ruleResult = determineApplicableArticles(payload);
  console.log("[bedrockService] Rule engine:", {
    keys:   ruleResult.applicableKeys.length,
    high:   ruleResult.isHighRisk,
    annex:  ruleResult.annexIIICategories,
  });

  // ── 2. Attempt RAG context retrieval (article-key-targeted) ──────────────────
  let ragContextText: string | null = null;
  let chunksUsed: string[]          = [];

  if (RAG_ENABLED) {
    try {
      const rag    = await buildRagContext(payload, ruleResult.applicableKeys);
      ragContextText = rag.contextText;
      chunksUsed     = rag.chunksUsed;
    } catch (err) {
      // Non-fatal: fall back to static system prompt
      console.warn("bedrockService: RAG retrieval failed, using static prompt", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const userMessage = buildUserMessage(payload, ruleResult, ragContextText, false);

  try {
    const output = await invokeModel(userMessage, ragContextText !== null);
    return { ...output, context_chunks_used: chunksUsed };
  } catch (firstError) {
    // Single retry with stronger instruction on validation failure
    console.warn("bedrockService: first attempt failed, retrying", {
      error: firstError instanceof Error ? firstError.message : String(firstError),
    });
    const retryMessage = buildUserMessage(payload, ruleResult, ragContextText, true);
    const output = await invokeModel(retryMessage, ragContextText !== null);
    return { ...output, context_chunks_used: chunksUsed };
  }
}

async function invokeModel(
  userMessage: string,
  ragActive: boolean,
): Promise<BedrockReportOutput> {
  const activeSystemPrompt = ragActive
    ? buildRagSystemPrompt()
    : systemPrompt;

  const response = await client.send(
    new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID ?? "amazon.nova-pro-v1:0",
      system:  [{ text: activeSystemPrompt }],
      messages: [{ role: "user", content: [{ text: userMessage }] }],
      inferenceConfig: {
        temperature: Number(process.env.BEDROCK_TEMPERATURE ?? 0),
        maxTokens:   Number(process.env.BEDROCK_MAX_TOKENS  ?? 5120),
      },
    })
  );

  const raw = response.output?.message?.content?.[0]?.text;
  if (!raw) {
    throw new Error("Bedrock: risposta vuota o formato inatteso");
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `Bedrock: JSON non trovato nella risposta. Preview: ${raw.slice(0, 200)}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Bedrock: JSON non valido. Parse error: ${e}`);
  }

  return reportOutputSchema.parse(parsed);
}

// ─── RAG System Prompt ────────────────────────────────────────────────────────

function buildRagSystemPrompt(): string {
  return `# SYSTEM PROMPT — Actify AI Act Compliance Engine (RAG v2)
# Versione: 2.0 | Maggio 2026 | Regolamento UE 2024/1689

---

## [IDENTITÀ E RUOLO]

Sei il motore di analisi compliance di Actify, una piattaforma B2B specializzata nell'assistere PMI italiane ed europee nella conformità al Regolamento UE 2024/1689 (EU AI Act).

Il tuo ruolo è analizzare il profilo di un'azienda e produrre un assessment di compliance preciso e azionabile.

---

## [REGOLE FERME — ANTI-ALLUCINAZIONE]

1. **Basa OGNI conclusione esclusivamente sui passaggi normativi forniti nel CONTESTO NORMATIVO RECUPERATO.**
2. **Per ogni finding nel JSON, popola il campo \`legal_basis\` con l'articolo/allegato di riferimento trovato nel contesto.**
3. **Se il contesto recuperato non è sufficiente per rispondere a un aspetto, non inventare — ometti o usa \`"insufficient_context"\`.**
4. **NON fare affermazioni normative non supportate da un articolo o allegato specifico nel contesto.**
5. **Quando citi un obbligo, indica SEMPRE l'articolo di riferimento.**
6. **Rispondi ESCLUSIVAMENTE con il JSON strutturato specificato nel messaggio utente.**
7. **Tutti i campi testuali in italiano. Valori enum sempre in inglese come specificato.**

---

## [PRINCIPI OPERATIVI]

- Usa TUTTI i dati forniti: campi strutturati del form E note libere.
- Sii conservativo nella classificazione: in caso di dubbio tra due livelli di rischio, scegli il più alto.
- Analizza ogni sistema di IA dichiarato singolarmente.
- Il ruolo Provider comporta obblighi molto più stringenti del Deployer — evidenziarlo sempre.
- Considera le combinazioni di fattori: un tool a rischio limitato in un contesto ad alto impatto può diventare alto rischio.`;
}

// ─── User Message Builder ─────────────────────────────────────────────────────

function buildUserMessage(
  payload: IntakePayload,
  ruleResult: PdfRuleEngineResult,
  ragContext: string | null,
  retry: boolean,
): string {
  const retryNote = retry
    ? "\n\nATTENZIONE — SECONDO TENTATIVO: il JSON precedente non era valido. " +
      "Assicurati che TUTTI i campi siano presenti e che gli enum abbiano esattamente i valori specificati.\n"
    : "";

  const contextBlock = ragContext
    ? `\n\n---\n## CONTESTO NORMATIVO RECUPERATO (AI Act — Reg. UE 2024/1689)\n\nBasa le tue conclusioni ESCLUSIVAMENTE su questi passaggi normativi.\n\n${ragContext}\n\n---\n`
    : "";

  // Deterministic pre-analysis block — guides the model towards correct article set
  const ruleBlock =
    `\n\n---\n## ANALISI NORMATIVA DETERMINISTICA (pre-calcolata)\n\n` +
    `Il motore deterministico ha identificato i seguenti articoli applicabili per questo profilo:\n` +
    ruleResult.reasoning.map(r => `- ${r}`).join('\n') + '\n' +
    (ruleResult.isHighRisk ? `\n⚠ SISTEMA AD ALTO RISCHIO — obblighi Art. 9-15 pienamente applicabili.\n` : '') +
    (ruleResult.annexIIICategories.length > 0
      ? `Allegato III categorie applicabili: ${ruleResult.annexIIICategories.join(', ')}\n`
      : '') +
    `\nUsa questa analisi come punto di partenza e arricchisci con i dettagli del contesto normativo recuperato.\n---\n`;

  return (
    `Analizza il seguente profilo aziendale e restituisci ESCLUSIVAMENTE il JSON con lo schema specificato. Nessun testo fuori dal JSON.${retryNote}` +
    ruleBlock +
    contextBlock +
    `\n\nPROFILO AZIENDA:\n${JSON.stringify(payload, null, 2)}` +
    `\n\nOUTPUT RICHIESTO — rispondi con questo schema JSON esatto, nessun testo fuori dal JSON:\n${JSON.stringify(OUTPUT_SCHEMA_TEMPLATE, null, 2)}`
  );
}
