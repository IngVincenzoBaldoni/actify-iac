import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { systemPrompt } from "./systemPrompt";
import { reportOutputSchema, OUTPUT_SCHEMA_TEMPLATE } from "./outputSchema";
import type { IntakePayload } from "../types/intake";
import type { BedrockReportOutput } from "../types/reportOutput";

const client = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION ?? "eu-central-1",
});

export async function analyze(payload: IntakePayload): Promise<BedrockReportOutput> {
  const userMessage = buildUserMessage(payload);

  try {
    return await invokeModel(userMessage);
  } catch (firstError) {
    // Single retry with a more explicit instruction if the first call fails validation.
    console.warn("bedrockService: first attempt failed, retrying", {
      error: firstError instanceof Error ? firstError.message : String(firstError),
    });
    const retryMessage = buildUserMessage(payload, true);
    return await invokeModel(retryMessage);
  }
}

async function invokeModel(userMessage: string): Promise<BedrockReportOutput> {
  const response = await client.send(
    new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID ?? "amazon.nova-pro-v1:0",
      system: [{ text: systemPrompt }],
      messages: [{ role: "user", content: [{ text: userMessage }] }],
      inferenceConfig: {
        temperature: Number(process.env.BEDROCK_TEMPERATURE ?? 0),
        maxTokens: Number(process.env.BEDROCK_MAX_TOKENS ?? 5120),
      },
    })
  );

  const raw = response.output?.message?.content?.[0]?.text;
  if (!raw) {
    throw new Error("Bedrock: risposta vuota o formato inatteso");
  }

  // Nova Pro occasionally wraps JSON in markdown code blocks or adds preamble text.
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Bedrock: JSON non trovato nella risposta. Preview: ${raw.slice(0, 200)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Bedrock: JSON non valido. Parse error: ${e}`);
  }

  return reportOutputSchema.parse(parsed);
}

function buildUserMessage(payload: IntakePayload, retry = false): string {
  const retryInstruction = retry
    ? "\n\nATTENZIONE — SECONDO TENTATIVO: il JSON precedente non era valido. Assicurati che TUTTI i campi siano presenti e che gli enum abbiano esattamente i valori specificati.\n"
    : "";

  return `Analizza il seguente profilo aziendale e restituisci ESCLUSIVAMENTE il JSON con lo schema specificato. Nessun testo fuori dal JSON.${retryInstruction}

PROFILO AZIENDA:
${JSON.stringify(payload, null, 2)}

OUTPUT RICHIESTO — rispondi con questo schema JSON esatto, nessun testo fuori dal JSON:
${JSON.stringify(OUTPUT_SCHEMA_TEMPLATE, null, 2)}`;
}
