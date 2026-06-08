import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

const bedrock  = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION ?? 'eu-central-1' });
const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? 'eu.amazon.nova-pro-v1:0';

export interface CertSuggestion {
  name:         string;
  provider:     string;
  description:  string;
  search_query: string;
  level:        'beginner' | 'intermediate' | 'advanced';
  format:       string;
}

export async function suggestCertifications(params: {
  dept_name:    string;
  headcount:    number;
  tool_name:    string;
  tool_purpose: string;
  company_name: string;
  company_sector: string;
}): Promise<CertSuggestion[]> {
  const prompt = `Sei un esperto di formazione AI e compliance. Suggerisci 5 certificazioni o percorsi formativi reali per soddisfare l'obbligo di AI Literacy (Art. 4 EU AI Act) per il seguente profilo:

DIPARTIMENTO: ${params.dept_name} (${params.headcount} persone)
STRUMENTO AI USATO: ${params.tool_name}
USO SPECIFICO: ${params.tool_purpose}
AZIENDA: ${params.company_name} (settore: ${params.company_sector})

Rispondi ESCLUSIVAMENTE con un array JSON di 5 oggetti con questo schema esatto:
[
  {
    "name": "Nome esatto della certificazione o corso",
    "provider": "Ente erogatore (es. Google, Microsoft, DeepLearning.AI, IBM, Coursera, EU Commission…)",
    "description": "Descrizione in italiano — perché è rilevante per questo profilo (max 200 caratteri)",
    "search_query": "Query di ricerca Google ottimale per trovare questo corso (es. 'Google AI Essentials Coursera' oppure 'Microsoft AI-900 certification')",
    "level": "beginner|intermediate|advanced",
    "format": "Es. MOOC online gratuito, Corso a pagamento, E-learning con badge, Certificazione professionale"
  }
]

Priorità: rilevanza per l'uso specifico dello strumento AI, accessibilità in italiano o inglese, copertura Art. 4 AI Act (alfabetizzazione AI, rischi, uso consapevole).
Suggerisci solo certificazioni e corsi reali e ben noti (es. Elements of AI, Google AI Essentials, Microsoft AI-900, AI for Everyone di DeepLearning.AI, IBM AI Foundations, corsi Coursera/edX riconosciuti).
NON inventare URL — l'url NON è richiesto in questo JSON.
Zero testo fuori dal JSON.`;

  const response = await bedrock.send(new ConverseCommand({
    modelId:  MODEL_ID,
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 2048, temperature: 0.3 },
  }));

  const firstContent = response.output?.message?.content?.[0];
  const rawText = firstContent && 'text' in firstContent ? (firstContent.text as string) : undefined;
  if (!rawText) throw new Error('Bedrock returned no text');

  const jsonText = rawText.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed)) throw new Error('Expected array from Bedrock');

  return parsed.slice(0, 5).map((item: Record<string, unknown>) => ({
    name:         String(item.name ?? ''),
    provider:     String(item.provider ?? ''),
    description:  String(item.description ?? ''),
    search_query: String(item.search_query ?? `${item.name ?? ''} ${item.provider ?? ''}`),
    level:        (['beginner', 'intermediate', 'advanced'].includes(item.level as string)
      ? item.level : 'beginner') as CertSuggestion['level'],
    format:       String(item.format ?? ''),
  }));
}
