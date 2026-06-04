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

export interface PdfRuleEngineResult {
  applicableKeys: string[];
  isHighRisk: boolean;
  isBiometricFlagged: boolean;
  isGpai: boolean;
  annexIIICategories: string[];   // e.g. ['Cat. 4(a)', 'Cat. 5(b)']
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

  // ── Art. 4: AI Literacy (universale) ─────────────────────────────────────────
  keys.add('art_4');
  reasoning.push('Art. 4 — AI Literacy: obbligatorio per tutti i provider e deployer dal 2 febbraio 2025');

  // ── Art. 5: pratiche vietate (sempre) ────────────────────────────────────────
  keys.add('art_5_p1'); keys.add('art_5_p2'); keys.add('art_5_p3'); keys.add('art_5_p4');
  reasoning.push('Art. 5 — Pratiche vietate: analisi sempre richiesta per qualsiasi sistema AI');

  // Biometric data types → check Art. 5 prohibited + Annex III cat. 1
  if (payload.decisions.data_types.includes('biometric')) {
    isBiometricFlagged = true;
    keys.add('annex_iii_cat1');
    reasoning.push('Art. 5(1)(d)/(f) + Allegato III cat. 1 — Dati biometrici rilevati: verificare pratiche vietate e alto rischio');
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
    reasoning.push(
      `Art. 6(2) + Allegato III — Alto rischio identificato: ambiti ${annexIIICategories.join(', ')}`
    );
  }

  // ── Art. 9-15: requisiti tecnici alto rischio ─────────────────────────────────
  if (isHighRisk) {
    ['art_9','art_10','art_11','art_12','art_13_p1','art_13_p2','art_14','art_15'].forEach(k => keys.add(k));
    reasoning.push('Art. 9-15 — Requisiti tecnici obbligatori per sistemi ad alto rischio');

    if (isProvider) {
      ['art_16','art_17_p1','art_17_p2','art_18','art_19','art_20','art_21','art_22','art_23'].forEach(k => keys.add(k));
      reasoning.push('Art. 16-25 — Obblighi fornitore sistemi ad alto rischio');
    }

    if (isDeployer) {
      ['art_26_p1','art_26_p2','art_27','art_28','art_29'].forEach(k => keys.add(k));
      reasoning.push('Art. 26-29 — Obblighi deployer sistemi ad alto rischio');
    }

    keys.add('art_49');
    reasoning.push('Art. 49 — Registrazione obbligatoria EU AI Database per sistemi alto rischio');
  }

  // ── Art. 51-55: GPAI ──────────────────────────────────────────────────────────
  if (payload.ai_tools.some(t => t.category === 'llm')) {
    isGpai = true;
    ['art_51','art_52','art_53','art_54','art_55'].forEach(k => keys.add(k));
    reasoning.push('Art. 51-55 — GPAI: LLM identificato come modello per uso generale');
  }

  // ── Art. 50: trasparenza ──────────────────────────────────────────────────────
  const toolsAny = payload.ai_tools as unknown as Array<Record<string, unknown>>;
  const hasNoTransparency  = toolsAny.some(t => t['users_aware'] === false);
  const hasContentGen      = toolsAny.some(t => t['output_type'] === 'content_generation');
  const noOversight        = payload.decisions.human_oversight_level === 'never';

  if (isGpai || hasNoTransparency || hasContentGen || noOversight) {
    keys.add('art_50');
    reasoning.push('Art. 50 — Obblighi di trasparenza: sistema interagisce con persone o genera contenuti');
  }

  // ── Art. 99-100: sanzioni (sempre) ───────────────────────────────────────────
  keys.add('art_99_sanctions'); keys.add('art_100');
  reasoning.push('Art. 99-100 — Sanzioni: inclusi per completezza del report');

  return {
    applicableKeys: Array.from(keys),
    isHighRisk,
    isBiometricFlagged,
    isGpai,
    annexIIICategories,
    reasoning,
  };
}
