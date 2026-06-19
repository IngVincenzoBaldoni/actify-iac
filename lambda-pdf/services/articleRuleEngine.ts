import type { IntakePayload } from '../types/intake';

// Maps wizard decision_domains → Annex III category label + S3 vector keys
const DECISION_DOMAIN_TO_ANNEX: Record<string, { category: string; keys: string[] }> = {
  hiring:                 { category: 'Cat. 4(a)',  keys: ['annex_iii_p1'] },
  performance_management: { category: 'Cat. 4(b)',  keys: ['annex_iii_p1', 'annex_iii_p2'] },
  credit_scoring:         { category: 'Cat. 5(b)',  keys: ['annex_iii_cat5'] },
  insurance:              { category: 'Cat. 5(b)',  keys: ['annex_iii_cat5'] },
  healthcare_diagnosis:   { category: 'Cat. 5(c)',  keys: ['annex_iii_cat5'] },
  education_assessment:   { category: 'Cat. 3',    keys: ['annex_iii_cat3'] },
  public_services:        { category: 'Cat. 5(d)', keys: ['annex_iii_cat5'] },
  law_enforcement:        { category: 'Cat. 6',    keys: ['annex_iii_p2', 'annex_iii_p3'] },
  other_decisions:        { category: '',           keys: [] },
  content_moderation:     { category: '',           keys: [] },
};

// Bug #7 fix — GPAI non è limitato agli LLM: include tutti i modelli per uso generale.
// Ref: Art. 3(63) AI Act — "capable of competently performing a wide range of distinct tasks"
const GPAI_CATEGORIES = new Set([
  'llm', 'multimodal', 'image_generation', 'video_generation',
  'foundation_model', 'code_generation',
]);

export interface PdfRuleEngineResult {
  applicableKeys: string[];
  isHighRisk: boolean;
  isBiometricFlagged: boolean;
  isGpai: boolean;
  annexIIICategories: string[];
  reasoning: string[];
}

export function determineApplicableArticles(payload: IntakePayload): PdfRuleEngineResult {
  const keys = new Set<string>();
  const reasoning: string[] = [];
  const annexIIICategories: string[] = [];
  let isHighRisk         = false;
  let isBiometricFlagged = false;
  let isGpai             = false;

  const role       = payload.ai_role;
  const isProvider = role === 'provider' || role === 'both';
  const isDeployer = role === 'deployer'  || role === 'both';

  // Bug #4 fix — entity_type non ancora nel form intake (campo futuro).
  // Conservativo: se non impostato include Art. 27; esclude solo se entity_type === 'private'.
  const entityType = (payload as unknown as Record<string, unknown>).entity_type as string | undefined;
  const isPublicBodyOrPublicService =
    entityType === 'public_body' || entityType === 'private_public_service';
  const isExplicitlyPrivate = entityType === 'private';

  // ── Art. 4: AI Literacy (universale) ─────────────────────────────────────────
  keys.add('art_4');
  reasoning.push('Art. 4 — AI Literacy: obbligatorio per tutti i provider e deployer dal 2 febbraio 2025');

  // ── Art. 5: pratiche vietate (sempre) ────────────────────────────────────────
  keys.add('art_5_p1'); keys.add('art_5_p2'); keys.add('art_5_p3'); keys.add('art_5_p4');
  reasoning.push('Art. 5 — Pratiche vietate: analisi sempre richiesta per qualsiasi sistema AI');

  // Bug #2 fix — Biometria: ALTO RISCHIO (Annex III cat. 1) per tutti.
  // Art. 5(1)(d) PROIBITO solo se contesto law enforcement.
  // Ref: Art. 5(1)(d) "...for the purpose of law enforcement in publicly accessible spaces..."
  if (payload.decisions.data_types.includes('biometric')) {
    isBiometricFlagged = true;
    keys.add('annex_iii_cat1');
    isHighRisk = true;
    const isLawEnforcementDomain = payload.decisions.decision_domains.includes('law_enforcement');
    if (isLawEnforcementDomain) {
      reasoning.push('Art. 5(1)(d) — Identificazione biometrica remota in spazi pubblici per finalità di contrasto: PROIBITO');
    } else {
      reasoning.push('Allegato III cat. 1 — Biometria: sistema ad ALTO RISCHIO (non proibito per operatori privati senza finalità di contrasto)');
    }
  }

  // ── Annex III domain mapping → Art. 6(2) ─────────────────────────────────────
  for (const domain of payload.decisions.decision_domains) {
    const mapping = DECISION_DOMAIN_TO_ANNEX[domain];
    if (!mapping) continue;
    if (mapping.category && !annexIIICategories.includes(mapping.category)) {
      annexIIICategories.push(mapping.category);
    }
    mapping.keys.forEach(k => keys.add(k));
    if (mapping.keys.length > 0) isHighRisk = true;
  }

  if (annexIIICategories.length > 0) {
    keys.add('art_6_classification');
    reasoning.push(`Art. 6(2) + Allegato III — Alto rischio identificato: ambiti ${annexIIICategories.join(', ')}`);
  }

  // ── Se alto rischio: obblighi tecnici ruolo-dipendenti ───────────────────────
  if (isHighRisk) {
    // Bug #1 fix — Art. 9-15: obblighi esclusivi del PROVIDER (Capo 2, Titolo III).
    // Art. 11 (documentazione tecnica) è provider-only: "Providers...shall draw up technical documentation" (Art. 11(1)).
    if (isProvider) {
      ['art_9','art_10','art_11','art_12','art_13_p1','art_13_p2','art_14','art_15'].forEach(k => keys.add(k));
      reasoning.push('Art. 9-15 — Requisiti tecnici sistemi ad alto rischio: obblighi del provider');
    }

    // Art. 12 (log retention, Art. 26(5)) e Art. 14 (supervisione umana, Art. 26(2)):
    // applicabili ai deployer puri — gli unici obblighi tecnici diretti.
    if (isDeployer && !isProvider) {
      ['art_12','art_14'].forEach(k => keys.add(k));
      reasoning.push('Art. 12, 14 — Obblighi tecnici applicabili ai deployer: log retention (Art. 26(5)) e supervisione umana (Art. 26(2))');
    }

    // Art. 16-25: obblighi fornitore
    if (isProvider) {
      ['art_16','art_17_p1','art_17_p2','art_18','art_19','art_20','art_21','art_22','art_23'].forEach(k => keys.add(k));
      reasoning.push('Art. 16-25 — Obblighi fornitore sistemi ad alto rischio');
    }

    // Art. 26-29: obblighi deployer
    // Bug #4 fix — Art. 27 (FRIA) solo per enti pubblici e privati che erogano servizi pubblici (Art. 27(1)).
    if (isDeployer) {
      ['art_26_p1','art_26_p2','art_28','art_29'].forEach(k => keys.add(k));
      if (isPublicBodyOrPublicService || !isExplicitlyPrivate) {
        keys.add('art_27');
        reasoning.push(isPublicBodyOrPublicService
          ? 'Art. 27 — FRIA: obbligatorio per enti pubblici e privati che erogano servizi pubblici'
          : 'Art. 27 — FRIA: incluso in via conservativa (imposta entity_type=private per escluderlo)');
      }
      reasoning.push('Art. 26, 28, 29 — Obblighi deployer sistemi ad alto rischio');
    }

    // Bug #6 fix — Art. 49: obbligo registrazione database EU.
    // Provider: SEMPRE (Art. 49(1)). Deployer: solo infrastrutture critiche + ente pubblico (Art. 49(2)).
    if (isProvider) {
      keys.add('art_49');
      reasoning.push('Art. 49(1) — Registrazione nel database EU: obbligo provider');
    }
    // Nota: il form intake PDF non ha il dominio critical_infrastructure — questa casistica
    // si gestirà quando verrà aggiunto. Per ora deployer privati non ricevono Art. 49.
  }

  // Bug #7 fix — GPAI: esteso a tutte le categorie di modelli per uso generale
  const gpaiToolCategories = payload.ai_tools
    .map(t => (t as unknown as Record<string, unknown>).category as string)
    .filter(c => c && GPAI_CATEGORIES.has(c));

  if (gpaiToolCategories.length > 0) {
    isGpai = true;
    ['art_51','art_52','art_53','art_54','art_55'].forEach(k => keys.add(k));
    reasoning.push(`Art. 51-55 — GPAI: modelli per uso generale rilevati (${[...new Set(gpaiToolCategories)].join(', ')})`);
  }

  // Bug #5 fix — Art. 50: trigger basato su interazione con persone o contenuti sintetici.
  // Rimosso `human_oversight_level === 'never'`: assenza di supervisione non implica interazione
  // con persone fisiche. Ref: Art. 50(1) "...intended to interact directly with natural persons..."
  const toolsAny = payload.ai_tools as unknown as Array<Record<string, unknown>>;
  const hasNoTransparency = toolsAny.some(t => t['users_aware'] === false);
  const hasContentGen     = toolsAny.some(t => t['output_type'] === 'content_generation');

  if (isGpai || hasNoTransparency || hasContentGen) {
    keys.add('art_50');
    reasoning.push('Art. 50 — Obblighi di trasparenza: sistema interagisce con persone fisiche o genera contenuti sintetici');
  }

  // ── Art. 99-100: sanzioni (sempre) ───────────────────────────────────────────
  keys.add('art_99_sanctions'); keys.add('art_100');
  reasoning.push('Art. 99-100 — Sanzioni: inclusi per completezza del report');

  // TODO Bug #3 — Art. 25: transizione deployer → provider non implementata.
  // Richiede campi: puts_own_name_on_system, made_substantial_modification, integrated_gpai_into_high_risk.

  return {
    applicableKeys: Array.from(keys),
    isHighRisk,
    isBiometricFlagged,
    isGpai,
    annexIIICategories,
    reasoning,
  };
}
