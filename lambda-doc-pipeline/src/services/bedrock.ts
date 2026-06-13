import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { ConverseCommandInput } from '@aws-sdk/client-bedrock-runtime';
import type { GenerativeSlotInput } from '../types';

const REGION          = process.env.BEDROCK_REGION          ?? process.env.AWS_REGION ?? 'eu-central-1';
const MODEL_STANDARD  = process.env.BEDROCK_MODEL_STANDARD  ?? 'eu.amazon.nova-pro-v1:0';
const MODEL_ECONOMY   = process.env.BEDROCK_MODEL_ECONOMY   ?? 'eu.amazon.nova-lite-v1:0';

const bedrock = new BedrockRuntimeClient({ region: REGION });

const PROMPT_VERSION = '1.0.0';

// ─── System prompt (centralized, versionata) ─────────────────────────────────
const SYSTEM_PROMPT = `Sei un redattore tecnico specializzato nella redazione di documenti di compliance per l'AI Act (Regolamento UE 2024/1689) destinati a PMI italiane.
Il tuo compito è compilare slot specifici di documenti strutturati. Ogni slot ha uno scopo preciso, vincoli di parole e un formato JSON di output.

REGOLE ASSOLUTE:
1. Cita ESCLUSIVAMENTE articoli e considerando presenti nel blocco <normativa> fornito. Non inventare riferimenti normativi.
2. Non affermare mai che il sistema è "conforme", "certificato" o "pienamente adempiente" — usa formulazioni operative ("si raccomanda", "è previsto", "il presente documento stabilisce").
3. Lingua italiana, registro professionale. Niente markdown headers nel testo (la struttura è fornita dal template).
4. Rispondi SOLO con il JSON specificato nello schema di output. Nessun testo fuori dal JSON.
5. Le azioni richieste devono essere concrete, operative e adatte a una PMI.`;

export { PROMPT_VERSION };

export async function generateSlotContent(
  slot: GenerativeSlotInput,
  context: {
    companyName:    string;
    sector:         string;
    employeesRange: string;
    toolName:       string;
    vendor?:        string;
    purpose:        string;
    role:           string;
    gapDescription: string;
    whatToDo:       string;
  },
  articleContext: string,
  modelId?: string,
): Promise<Record<string, unknown>> {
  const model = modelId ?? MODEL_STANDARD;

  const userMessage = `<contesto_pmi>
Azienda: ${context.companyName}
Settore: ${context.sector}
Dimensione: ${context.employeesRange} dipendenti
</contesto_pmi>

<sistema_ai>
Nome: ${context.toolName}
Fornitore: ${context.vendor ?? 'N/D'}
Scopo: ${context.purpose}
Ruolo AI Act: ${context.role}
</sistema_ai>

<gap>
Gap identificato: ${context.gapDescription}
Azione richiesta: ${context.whatToDo}
</gap>

<normativa>
${articleContext}
</normativa>

<istruzione_slot>
Sezione: "${slot.sectionTitle}"
Istruzione: ${slot.instruction}
Massimo ${slot.maxWords} parole. Tono: ${slot.tone}.
</istruzione_slot>

Compila questo slot rispettando ESATTAMENTE lo schema JSON fornito nel tool "emit_slot".`;

  const input: ConverseCommandInput = {
    modelId: model,
    system:   [{ text: SYSTEM_PROMPT }],
    messages: [{ role: 'user', content: [{ text: userMessage }] }],
    inferenceConfig: { maxTokens: Math.min(slot.maxWords * 8, 2048), temperature: 0, topP: 0.9 },
    toolConfig: {
      tools: [{
        toolSpec: {
          name:        'emit_slot',
          description: 'Emit the structured slot content',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          inputSchema: { json: slot.outputSchema as any },
        },
      }],
      toolChoice: { tool: { name: 'emit_slot' } },
    },
  };

  const response = await bedrock.send(new ConverseCommand(input));

  const blocks = response.output?.message?.content ?? [];

  // Find tool_use block
  for (const block of blocks) {
    if ('toolUse' in block && block.toolUse && typeof block.toolUse === 'object') {
      const toolBlock = block.toolUse as { name?: string; input?: unknown };
      if (toolBlock.input && typeof toolBlock.input === 'object') {
        return toolBlock.input as Record<string, unknown>;
      }
    }
  }

  // Fallback: parse first text block as JSON
  for (const block of blocks) {
    if ('text' in block && typeof block.text === 'string') {
      try { return JSON.parse(block.text) as Record<string, unknown>; } catch {}
    }
  }

  throw new Error(`Bedrock returned no structured output for slot ${slot.slotId}`);
}
