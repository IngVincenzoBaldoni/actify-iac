import { z } from "zod";
import type { BedrockReportOutput } from "../types/reportOutput";

const riskLevelSchema = z.enum(["prohibited", "high", "limited", "minimal"]);
const complianceStatusSchema = z.enum([
  "compliant",
  "non_compliant",
  "monitoring_needed",
  "unknown",
]);
const prioritySchema = z.enum(["immediate", "short_term", "medium_term"]);
const toolCategorySchema = z.string().min(1).max(100);
const phaseRelevanceSchema = z.enum(["relevant", "monitor", "not_applicable"]);

export const reportOutputSchema = z.object({
  executive_summary: z.string().min(1),
  overall_risk_level: riskLevelSchema,
  overall_risk_score: z.number().min(0).max(30),

  tool_catalog: z
    .array(
      z.object({
        tool_name: z.string().min(1),
        vendor: z.string().min(1),
        category: toolCategorySchema,
        declared_purpose: z.string().min(1),
        risk_classification: riskLevelSchema,
        applicable_articles: z.array(z.string()),
        // RAG v2: specific articles/annexes that drove this classification
        legal_basis: z.array(z.string()).optional(),
        rationale_compact: z.string().min(1),
        compliance_status: complianceStatusSchema,
        compliance_deadline: z.string().nullable(),
        required_actions: z.array(z.string()),
      })
    )
    .min(1),

  ai_act_timeline: z.object({
    already_in_force: z.array(z.string()),
    aug_2025: z.array(z.string()),
    aug_2026: z.array(z.string()),
    aug_2027: z.array(z.string()),
  }),

  phase_relevance: z.object({
    already_in_force: phaseRelevanceSchema,
    aug_2025: phaseRelevanceSchema,
    aug_2026: phaseRelevanceSchema,
    aug_2027: phaseRelevanceSchema,
  }),

  compliance_summary: z.object({
    compliant_count: z.number().int().min(0),
    non_compliant_count: z.number().int().min(0),
    monitoring_count: z.number().int().min(0),
    most_urgent_deadline: z.string().nullable(),
    months_to_urgency: z.number().nullable(),
  }),

  compliance_gaps: z.array(z.string()).min(1),

  priority_actions: z
    .array(
      z.object({
        priority: prioritySchema,
        action: z.string().min(1),
        rationale: z.string().min(1),
      })
    )
    .min(1),

  recommended_documents: z.array(z.string()).min(1),

  key_findings_from_notes: z.string(),
  report_footer_note: z.string().min(1),
  // RAG v2: chunk IDs used to assemble normative context — populated by bedrockService, not the LLM
  context_chunks_used: z.array(z.string()).optional(),
}) satisfies z.ZodType<BedrockReportOutput>;

export type ReportOutputSchema = z.infer<typeof reportOutputSchema>;

// Template sent to Bedrock in the user message so the model knows the exact expected structure.
export const OUTPUT_SCHEMA_TEMPLATE = {
  executive_summary:
    "<60-80 parole — inizia SEMPRE con 'Actify ha identificato X sistemi AI attivi soggetti a obblighi [specificare quali — es. trasparenza Art.50, governance, Annex III].' — evidenzia i controlli organizzativi e documentali assenti o non verificabili sulla base delle informazioni fornite — wording NEUTRO e CAUTELATIVO, mai assertivo — es. 'alcuni controlli risultano assenti o non verificabili sulla base delle informazioni fornite'>",
  overall_risk_level: "prohibited | high | limited | minimal",
  overall_risk_score: "<number 0-30>",
  tool_catalog: [
    {
      tool_name: "<nome>",
      vendor: "<vendor | 'Proprietario' | 'Non specificato'>",
      category:
        "<categoria: llm | hr | finance | marketing | operations | legal | tech | healthcare | altro>",
      declared_purpose: "<max 10 parole>",
      risk_classification: "prohibited | high | limited | minimal",
      applicable_articles: ["Art. X", "Annex III cat. Y(z)"],
      legal_basis: ["<articolo/allegato specifico dal contesto normativo recuperato che giustifica questa classificazione — es: 'Art. 6(2)', 'Allegato III cat. 4(a)', 'Art. 5(g)'>"],
      rationale_compact: "<max 20 parole — causa specifica del rischio>",
      compliance_status: "compliant | non_compliant | monitoring_needed | unknown",
      compliance_deadline: "YYYY-MM-DD | null",
      required_actions: [
        "<azione operativa CONCRETA e SPECIFICA — NO genericismi tipo 'verificare conformità' o 'aggiornare policy' — SI azioni dettagliate tipo: 'Aggiungere avviso AI disclosure nella schermata iniziale del chatbot', 'Creare sezione nella privacy policy che descrive l uso di [nome tool] per [finalità]', 'Definire procedura di escalation umana per richieste sensibili del chatbot', 'Redigere documentazione tecnica del sistema secondo Art.11', 'Formalizzare procedura di supervisione umana degli output AI' — wording NEUTRO: EVITA 'Designare DPO' → USA 'Valutare assegnazione di un responsabile per la governance AI'>",
        "<azione 2 concreta>",
      ],
    },
  ],
  ai_act_timeline: {
    already_in_force: ["<obbligo già attivo — max 10 parole>"],
    aug_2025: ["<obbligo — max 10 parole>"],
    aug_2026: ["<obbligo — max 10 parole>"],
    aug_2027: ["<obbligo — max 10 parole>"],
  },
  phase_relevance: {
    already_in_force:
      "relevant | monitor | not_applicable — (relevant = obblighi già applicabili ai sistemi dichiarati, monitor = da tenere sotto controllo, not_applicable = non pertinente per questo profilo)",
    aug_2025: "relevant | monitor | not_applicable",
    aug_2026: "relevant | monitor | not_applicable",
    aug_2027: "relevant | monitor | not_applicable",
  },
  compliance_summary: {
    compliant_count: "<n>",
    non_compliant_count: "<n>",
    monitoring_count: "<n>",
    most_urgent_deadline: "YYYY-MM-DD | null",
    months_to_urgency: "<n> | null",
  },
  compliance_gaps: [
    "<gap identificato — max 10 parole — es: 'Assenza inventario sistemi AI documentato', 'Nessuna policy interna utilizzo AI per dipendenti', 'Trasparenza verso utenti finali non verificabile', 'Human oversight non formalizzato per sistemi decisionali', 'Documentazione tecnica sistemi AI assente o incompleta', 'Processo gestione incidenti AI non definito', 'Formazione dipendenti su utilizzo AI assente'>",
  ],
  priority_actions: [
    {
      priority: "immediate | short_term | medium_term",
      action:
        "<azione operativa concreta — max 15 parole — specifica il sistema AI coinvolto quando possibile>",
      rationale:
        "<max 15 parole — motivo operativo/normativo specifico>",
    },
  ],
  recommended_documents: [
    "<documento di compliance raccomandato — es: 'Inventario Sistemi AI', 'Policy Utilizzo AI Interno', 'AI Transparency Notice per [nome sistema]', 'Procedura di Human Oversight', 'Documentazione Tecnica [nome sistema]', 'Registro Decisioni Automatizzate', 'Piano di Gestione Incidenti AI', 'Informativa AI per dipendenti'>",
  ],
  key_findings_from_notes:
    "<max 50 parole — osservazioni critiche dalle note libere del contesto>",
  report_footer_note:
    "<max 30 parole — CTA verso SaaS Actify Pro per documentazione e monitoring continuativo>",
};
