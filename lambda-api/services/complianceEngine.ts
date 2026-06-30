import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { v4 as uuidv4 } from 'uuid';
import { systemPrompt } from './systemPrompt';
import { complianceResultSchema, type ComplianceResultParsed } from './complianceOutputSchema';
import { computeSanctions, ComplianceResultWithSanctions } from './sanctions';
import { buildRagContext } from './ragService';
import { determineApplicableArticles } from './articleRuleEngine';
import { normalizeChecklistEntry, type ChecklistEntry } from '../types/aiSystem';
import type { AISystem } from '../types/aiSystem';
import type { Company } from '../types/company';

const bedrock   = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION ?? 'eu-central-1' });
const MODEL_ID  = process.env.BEDROCK_MODEL_ID ?? 'eu.amazon.nova-pro-v1:0';
const RAG_ENABLED = process.env.RAG_ENABLED !== 'false' && !!process.env.S3_VECTORS_BUCKET;

// ─── Article metadata ─────────────────────────────────────────────────────────

// FIX-11: human-readable titles for synthetic compliant gaps
const ARTICLE_TITLES: Record<number, string> = {
  5:  'Pratiche di IA vietate',
  6:  'Classificazione sistemi ad alto rischio',
  9:  'Sistema di gestione della qualità',
  10: 'Governance dei dati',
  11: 'Documentazione tecnica',
  12: 'Registrazione automatica degli eventi',
  13: 'Trasparenza e fornitura di informazioni',
  14: 'Supervisione umana',
  15: 'Accuratezza, robustezza e cybersicurezza',
  16: 'Obblighi dei provider',
  17: 'Sistema di gestione qualità (provider)',
  18: 'Documentazione tecnica (provider)',
  19: 'Registrazione automatica (provider)',
  20: 'Cooperazione con autorità (provider)',
  21: 'Misure correttive (provider)',
  22: 'Notifica autorità nazionale (provider)',
  23: 'Obblighi informativi provider',
  24: 'Obblighi rappresentante autorizzato UE',
  25: 'Obblighi importatori',
  26: 'Obblighi dei deployer',
  27: 'Valutazione impatto diritti fondamentali (FRIA)',
  28: 'Obblighi distributori',
  29: 'Obblighi per ruoli multipli',
  49: 'Registrazione nella banca dati EU',
  50: 'Trasparenza verso gli utenti',
  51: 'Classificazione modelli GPAI',
  52: 'Obblighi provider GPAI',
  53: 'Obblighi provider GPAI con rischio sistemico',
  54: 'Valutazione modelli GPAI con rischio sistemico',
  55: 'Incidenti gravi — modelli GPAI',
  99: 'Sanzioni (Art. 99)',
  100: 'Sanzioni per PMI (Art. 100)',
};

// Extract article number from a vector key like "art_26_p1" → 26
function keyToArticleNum(key: string): number | null {
  const m = key.match(/^art_(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// Extract article number from a human-readable label like "Art. 26" → 26
function labelToArticleNum(label: string): number | null {
  const m = label.match(/art(?:icolo|\.?)[\s.]*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

// ─── RAG system prompt ────────────────────────────────────────────────────────

const RAG_SYSTEM_PROMPT = `Sei il motore di analisi compliance di Actify, specializzato nel Regolamento UE 2024/1689 (EU AI Act).

Principi operativi:
- Usa il CONTESTO NORMATIVO fornito per identificare obblighi e gap di compliance
- Cita solo articoli presenti nel contesto fornito — non inventare o generalizzare
- Analizza SOLO il sistema AI indicato; non fare analisi generica sull'azienda
- La classificazione di rischio è fornita come vincolo nel messaggio utente — non ricalcolarla né modificarla
- Analizza ESCLUSIVAMENTE gli articoli elencati in "ARTICOLI DA ANALIZZARE ORA"
- Non generare gap per articoli non in quella lista
- Tutti i campi testuali in italiano. Valori enum sempre in inglese come specificato
- Rispondi ESCLUSIVAMENTE con il JSON con lo schema esatto indicato. Zero testo fuori dal JSON.`;

// ─── Output template ──────────────────────────────────────────────────────────

const OUTPUT_TEMPLATE = {
  risk_classification: "prohibited|high|limited|minimal",
  applicable_articles: ["Art. X", "Annex III cat. Y"],
  compliance_gaps: [{
    gap_id: "uuid-v4",
    article: "Art. 14",
    requirement: "Supervisione umana",
    status: "missing|partial|compliant",
    deadline: "YYYY-MM-DD o null",
    urgency: "critical|high|medium|low",
    description: "Descrizione gap in italiano (max 250 caratteri)",
    what_to_do: "Azione correttiva specifica in italiano (max 250 caratteri)",
    can_actify_automate: true,
    automation_type: "monitoring_plan",
    source_chunks: ["chunk_id del chunk normativo che supporta questo gap"],
  }],
  score: { governance: 0, transparency: 0, documentation: 0, monitoring: 0 },
  compliance_summary: {
    compliant_count: 0, non_compliant_count: 0, monitoring_count: 0,
    most_urgent_deadline: "YYYY-MM-DD o null", months_to_urgency: 0,
  },
  priority_actions: [{
    priority: "immediate|short_term|medium_term",
    action: "Azione prioritaria in italiano",
    rationale: "Motivazione con riferimento articolo e scadenza",
  }],
  executive_summary: "Sommario esecutivo in italiano (max 400 caratteri)",
};

// ─── User message builder ─────────────────────────────────────────────────────

interface ArticleContext {
  classification: string;
  classificationRationale: string;
  allArticleNums: number[];
  pendingNums: number[];
  addressedNums: number[];
  partialHints: string[];
}

function buildUserMessage(
  system:         AISystem,
  company:        Company,
  ragContext?:    string,
  artCtx?:        ArticleContext,
): string {
  const contextBlock = ragContext
    ? `\n\nCONTESTO NORMATIVO AI ACT (usa questi testi per identificare obblighi e gap):\n${ragContext}\n\n---`
    : '';

  const notesBlock = company.context_notes?.trim()
    ? `\nNOTE AGGIUNTIVE AZIENDA:\n${company.context_notes.trim()}\n\n---`
    : '';

  // FIX-11: article scope constraints for incremental re-check
  const articleScope = artCtx ? `
CLASSIFICAZIONE PRE-DETERMINATA: ${artCtx.classification}
MOTIVAZIONE: ${artCtx.classificationRationale}

ARTICOLI APPLICABILI TOTALI: ${artCtx.allArticleNums.map(n => `Art. ${n}`).join(', ')}
${artCtx.addressedNums.length > 0
  ? `ARTICOLI GIÀ ADDRESSATI (esclusi dall'analisi): ${artCtx.addressedNums.map(n => `Art. ${n}`).join(', ')}\n`
  : ''}ARTICOLI DA ANALIZZARE ORA: ${artCtx.pendingNums.map(n => `Art. ${n}`).join(', ')}

Analizza ESCLUSIVAMENTE gli articoli elencati in "DA ANALIZZARE ORA".
Non generare gap per articoli non in questa lista. Usa la classificazione pre-determinata — non ricalcolarla.
${artCtx.partialHints.length > 0
  ? `\nREQUISITI IN LAVORAZIONE (azioni parziali già avviate):\n${artCtx.partialHints.join('\n')}\nPer questi requisiti usa status "partial" e abbassa urgency di un livello.\n`
  : ''}` : '';

  return `Esegui un compliance check AI Act sul seguente sistema AI specifico.${contextBlock}

CONTESTO AZIENDA:
- Nome: ${company.name}
- Settore: ${company.sector}
- Dipendenti: ${company.employees_range}
- Ruolo AI Act aziendale: ${company.ai_role}
- DPO presente: ${company.governance?.has_dpo ?? false} (tipo: ${company.governance?.dpo_status ?? 'none'})
- Inventory AI formalizzato: ${company.governance?.has_ai_inventory ?? false}
- Valutazione impatto condotta: ${company.governance?.has_impact_assessment ?? false}
- Policy AI interna: ${company.governance?.has_ai_policy ?? false}
- Formazione personale: ${company.governance?.has_training ?? false}
${notesBlock}
SISTEMA AI DA ANALIZZARE:
${JSON.stringify({
  nome:                 system.tool_name,
  vendor:               system.vendor,
  categoria:            system.category,
  ruolo_azienda:        system.role,
  scopo:                system.purpose,
  tipo_output:          system.output_type ?? null,
  utenti_target:        system.target_users,
  gruppi_vulnerabili:   system.vulnerable_groups ?? [],
  personalizzazioni_llm: system.customizations ?? [],
  decisioni_automatizzate: system.makes_automated_decisions,
  supervisione_umana:   system.human_oversight_level,
  ambiti_decisione:     system.decision_domains,
  soggetti_vulnerabili: system.affects_vulnerable_groups,
  tipologie_dati:       system.data_types,
}, null, 2)}
${articleScope}
ISTRUZIONI:
- Analizza SOLO questo sistema AI, non fare analisi generica sull'azienda
- Deadline principale AI Act (aggiornata dal Digital Omnibus, 7 maggio 2026): sistemi Annex III autonomi → 2027-12-02; sistemi Annex I (prodotti) → 2028-08-02; Art. 50 per sistemi pre-esistenti → 2026-12-02
- Per ogni gap includi source_chunks con i chunk_id del contesto normativo che supportano il gap
- Art. 99 e Art. 100 sono articoli sulle SANZIONI, non requisiti implementativi: NON generare gap con status "missing" per questi articoli — includi al massimo un gap status "compliant" o omettili del tutto
- Un gap per articolo (il principale): non generare gap multipli sullo stesso articolo
- description: MAX 250 caratteri. what_to_do: MAX 250 caratteri. executive_summary: MAX 400 caratteri. Sii sintetico e diretto
- Rispondi ESCLUSIVAMENTE con il JSON con lo schema esatto qui sotto. Zero testo fuori dal JSON.

REGOLA AUTOMATION — imposta can_actify_automate: true e scegli automation_type per:
- Art. 9 (Risk Management System) → "monitoring_plan"
- Art. 11 (Documentazione tecnica) → "document_generation"
- Art. 13 (Trasparenza verso deployer) → "transparency_notice"
- Art. 14 (Supervisione umana) → "monitoring_plan"
- Art. 17 (QMS provider) → "policy_template"
- Art. 26 (Obblighi deployer, policy interna) → "policy_template"
- Art. 27 (FRIA — Valutazione impatto diritti fondamentali) → "risk_assessment"
- Art. 47 (Dichiarazione di conformità UE) → "conformity_declaration"
- Art. 49 (Registrazione EU database) → "conformity_declaration"
- Art. 50 (Trasparenza verso utenti finali) → "transparency_notice"
- Art. 72 (Monitoraggio post-commercializzazione) → "monitoring_plan"
Per Art. 5, 6, 10, 12, 15 → can_actify_automate: false, automation_type: null (richiedono azioni tecniche/procedurali non documentali)

${JSON.stringify(OUTPUT_TEMPLATE, null, 2)}`;
}

// ─── FIX-11: Build synthetic "compliant" gap for an addressed article ─────────

function buildAddressedGap(
  artNum: number,
  checklist: Record<string, ChecklistEntry | 'present' | 'missing'>,
): ComplianceResultParsed['compliance_gaps'][number] {
  const artLabel = `Art. ${artNum}`;
  // Try exact label match (case-insensitive)
  const rawEntry = checklist[artLabel]
    ?? checklist[artLabel.toLowerCase()]
    ?? checklist[`art. ${artNum}`];
  const entry = normalizeChecklistEntry(rawEntry);

  let description = `Requisito soddisfatto: ${ARTICLE_TITLES[artNum] ?? artLabel}.`;
  if (entry.evidence_note) description += ` Nota: ${entry.evidence_note}`;
  else if (entry.addressed_at) description += ` Addressato il ${entry.addressed_at}.`;

  return {
    gap_id:            `addressed-art-${artNum}`,
    article:           artLabel,
    requirement:       ARTICLE_TITLES[artNum] ?? 'Requisito normativo',
    status:            'compliant',
    deadline:          null,
    urgency:           'low',
    description,
    what_to_do:        '',
    can_actify_automate: false,
    automation_type:   null,
    source_chunks:     [],
  };
}

// ─── Grounding verification ───────────────────────────────────────────────────

function verifyGrounding(
  validated:         ComplianceResultParsed,
  chunksUsed:        string[],
  retrievedArticles: string[],
): ComplianceResultParsed {
  if (chunksUsed.length === 0 && retrievedArticles.length === 0) return validated;

  const chunkIdSet = new Set(chunksUsed);
  const articleSet = new Set(
    retrievedArticles.map(a => {
      const m = a.match(/\d+/);
      return m ? `art. ${m[0]}` : a.toLowerCase().trim();
    })
  );

  const gaps = validated.compliance_gaps.map(gap => {
    const normMatch = gap.article.match(/art(?:icolo|\.?)[\s.]*(\d+)/i);
    const artKey    = normMatch ? `art. ${normMatch[1]}` : gap.article.toLowerCase().trim();
    const chunkMatch   = (gap.source_chunks ?? []).some(id => chunkIdSet.has(id));
    const articleMatch = articleSet.has(artKey);
    return { ...gap, ungrounded: !chunkMatch && !articleMatch };
  });

  return { ...validated, compliance_gaps: gaps };
}

// ─── FIX-12: apply checklist — partial items preserved, present → compliant ───

function applyChecklist(
  result:    ComplianceResultParsed,
  checklist: Record<string, ChecklistEntry | 'present' | 'missing'>,
): ComplianceResultParsed {
  const gaps = result.compliance_gaps.map(gap => {
    const rawEntry = checklist[gap.article]
      ?? checklist[gap.article.toLowerCase().replace(/\s+/g, ' ').trim()];
    if (!rawEntry) return gap;
    const entry = normalizeChecklistEntry(rawEntry);
    if (entry.status === 'present') return { ...gap, status: 'compliant' as const };
    return gap;
  });

  return {
    ...result,
    compliance_gaps: gaps,
    compliance_summary: {
      ...result.compliance_summary,
      compliant_count:     gaps.filter(g => g.status === 'compliant').length,
      non_compliant_count: gaps.filter(g => g.status !== 'compliant').length,
      monitoring_count:    gaps.filter(g => g.status === 'partial').length,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RagMetadata {
  rag_used:              boolean;
  rag_chunk_count:       number;
  rag_fallback_reason?:  string;
  rule_engine_reasoning?: string[];
}

export async function runComplianceCheck(
  system:    AISystem,
  company:   Company,
  checklist?: Record<string, ChecklistEntry | 'present' | 'missing'>,
): Promise<ComplianceResultWithSanctions & { context_chunks_used?: string[]; rag_metadata: RagMetadata }> {

  // ── Phase 1: Rule engine — determine ALL applicable article keys ──────────
  const { applicableKeys, isProhibited, isHighRisk, isGpai, reasoning } =
    determineApplicableArticles(system, company);

  // Derive unique article numbers from keys (e.g. art_26_p1 → 26)
  const allArticleNums = [...new Set(
    applicableKeys.map(keyToArticleNum).filter((n): n is number => n !== null)
  )].sort((a, b) => a - b);

  const classification = isProhibited ? 'prohibited' : isHighRisk ? 'high'
    : (system.category === 'llm' || system.human_oversight_level === 'never') ? 'limited'
    : 'minimal';

  // ── Phase 2: FIX-11 — split pending vs addressed articles ─────────────────
  const addressedNums = new Set<number>();
  const partialHints: string[] = [];

  if (checklist) {
    for (const [artLabel, rawEntry] of Object.entries(checklist)) {
      const entry = normalizeChecklistEntry(rawEntry);
      const num = labelToArticleNum(artLabel);
      if (!num) continue;
      if (entry.status === 'present') {
        addressedNums.add(num);
      } else if (entry.status === 'partial') {
        const hint = `Art. ${num}: azione in corso${entry.evidence_note ? ` — "${entry.evidence_note}"` : ''}`;
        partialHints.push(hint);
      }
    }
  }

  const pendingNums = allArticleNums.filter(n => !addressedNums.has(n));

  // Filter S3 vector keys to only pending articles
  // Keep annex/non-article keys always (they provide classification context)
  const pendingKeys = applicableKeys.filter(k => {
    const num = keyToArticleNum(k);
    return num === null || !addressedNums.has(num);
  });

  // ── Phase 3: RAG context for pending articles only ────────────────────────
  let activeSystemPrompt = systemPrompt;
  let ragContextText: string | undefined;
  let chunksUsed:        string[] = [];
  let retrievedArticles: string[] = [];
  let ragMetadata: RagMetadata = { rag_used: false, rag_chunk_count: 0 };

  if (RAG_ENABLED) {
    const rag = await buildRagContext(system, company, pendingKeys);
    chunksUsed        = rag.chunksUsed;
    retrievedArticles = rag.retrievedArticles;
    ragMetadata = {
      rag_used:              rag.ragUsed,
      rag_chunk_count:       rag.chunkCount,
      rag_fallback_reason:   rag.fallbackReason,
      rule_engine_reasoning: rag.ruleEngineReasoning ?? reasoning,
    };
    if (rag.ragUsed) {
      ragContextText     = rag.contextText;
      activeSystemPrompt = RAG_SYSTEM_PROMPT;
    }
  } else {
    ragMetadata.rule_engine_reasoning = reasoning;
  }

  const artCtx: ArticleContext = {
    classification,
    classificationRationale: reasoning.join('; '),
    allArticleNums,
    pendingNums,
    addressedNums: [...addressedNums],
    partialHints,
  };

  // ── Phase 4: LLM call (only if there are pending articles) ───────────────
  let validated: ComplianceResultParsed;

  if (pendingNums.length === 0) {
    // All articles addressed — skip Bedrock entirely
    validated = {
      risk_classification: classification as ComplianceResultParsed['risk_classification'],
      applicable_articles: allArticleNums.map(n => `Art. ${n}`),
      compliance_gaps: [],
      score: { governance: 10, transparency: 10, documentation: 10, monitoring: 10 },
      compliance_summary: {
        compliant_count: 0, non_compliant_count: 0, monitoring_count: 0,
        most_urgent_deadline: null, months_to_urgency: null,
      },
      priority_actions: [],
      executive_summary: 'Tutti i requisiti applicabili risultano soddisfatti.',
    };
  } else {
    const response = await bedrock.send(new ConverseCommand({
      modelId:  MODEL_ID,
      system:   [{ text: activeSystemPrompt }],
      messages: [{ role: 'user', content: [{ text: buildUserMessage(system, company, ragContextText, artCtx) }] }],
      inferenceConfig: { maxTokens: 5120, temperature: 0 },
    }));

    const firstContent = response.output?.message?.content?.[0];
    const rawText = firstContent && 'text' in firstContent ? (firstContent.text as string) : undefined;
    if (!rawText) throw new Error('Bedrock returned no text output');

    let jsonText = rawText.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      if (!(parseErr instanceof SyntaxError)) throw parseErr;
      // JSON was truncated (hit maxTokens limit) — retry once with stricter conciseness constraints
      const retryMsg = buildUserMessage(system, company, ragContextText, artCtx)
        + '\n\nIMPORTANTE: Genera MASSIMO 6 gap (solo i più critici). description e what_to_do: MAX 150 caratteri ciascuno. executive_summary: MAX 250 caratteri. Il JSON deve essere completo e valido.';
      const retryResponse = await bedrock.send(new ConverseCommand({
        modelId:  MODEL_ID,
        system:   [{ text: activeSystemPrompt }],
        messages: [{ role: 'user', content: [{ text: retryMsg }] }],
        inferenceConfig: { maxTokens: 5120, temperature: 0 },
      }));
      const retryContent = retryResponse.output?.message?.content?.[0];
      const retryText = retryContent && 'text' in retryContent ? (retryContent.text as string) : undefined;
      if (!retryText) throw new Error('Bedrock retry returned no text output');
      jsonText = retryText.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      parsed   = JSON.parse(jsonText);
    }
    validated    = complianceResultSchema.parse(parsed);

    // Always replace LLM-generated gap_ids with server-side UUIDs to guarantee uniqueness.
    // The LLM may output the template example string ("uuid-v4") or duplicate ids.
    validated = {
      ...validated,
      compliance_gaps: validated.compliance_gaps.map(gap => ({ ...gap, gap_id: uuidv4() })),
    };

    if (chunksUsed.length > 0 || retrievedArticles.length > 0) {
      validated = verifyGrounding(validated, chunksUsed, retrievedArticles);
    }
  }

  // ── Phase 5: FIX-11 — merge synthetic compliant gaps for addressed articles ─
  const addressedGaps = [...addressedNums].map(n =>
    buildAddressedGap(n, checklist ?? {})
  );
  const mergedGaps = [...validated.compliance_gaps, ...addressedGaps];
  validated = {
    ...validated,
    compliance_gaps: mergedGaps,
    compliance_summary: {
      ...validated.compliance_summary,
      compliant_count: mergedGaps.filter(g => g.status === 'compliant').length,
      non_compliant_count: mergedGaps.filter(g => g.status !== 'compliant').length,
      monitoring_count: mergedGaps.filter(g => g.status === 'partial').length,
    },
  };

  // ── Phase 5b: Always inject Art. 4 (AI Literacy) gap if not already present ─
  const hasArt4 = validated.compliance_gaps.some(g =>
    /art(?:icolo|\.?)[\s.]*4\b/i.test(g.article)
  );
  if (!hasArt4) {
    const art4ChecklistEntry = checklist
      ? normalizeChecklistEntry(checklist['Art. 4'] ?? checklist['art. 4'])
      : null;
    const art4Status = art4ChecklistEntry?.status === 'present' ? 'compliant' as const
      : art4ChecklistEntry?.status === 'partial'  ? 'partial' as const
      : 'missing' as const;

    validated = {
      ...validated,
      compliance_gaps: [
        ...validated.compliance_gaps,
        {
          gap_id:             uuidv4(),
          article:            'Art. 4',
          requirement:        'AI Literacy — Alfabetizzazione AI',
          status:             art4Status,
          deadline:           '2025-08-02',
          urgency:            art4Status === 'compliant' ? 'low' : 'medium' as const,
          description:        'L\'Art. 4 dell\'EU AI Act richiede che i fornitori e i deployer garantiscano un adeguato livello di competenza AI al personale che utilizza o supervisiona sistemi AI.',
          what_to_do:         'Verifica la tua compliance sull\'AI Literacy Tracker: mappa i dipartimenti, registra le certificazioni ottenute e ottieni suggerimenti formativi personalizzati per ogni team.',
          can_actify_automate: false,
          automation_type:    null,
          source_chunks:      [],
        },
      ],
    };
  }

  // Safety net: apply checklist to catch any gaps the LLM generated for addressed articles
  if (checklist && Object.keys(checklist).length > 0) {
    validated = applyChecklist(validated, checklist);
  }

  // ── Phase 6: Sanction calculation ─────────────────────────────────────────
  const result = computeSanctions(validated, company);

  return {
    ...result,
    ...(chunksUsed.length > 0 ? { context_chunks_used: chunksUsed } : {}),
    rag_metadata: ragMetadata,
  };
}
