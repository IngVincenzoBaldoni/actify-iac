import type { AISystem } from '../types/aiSystem';
import type { Company } from '../types/company';

// Mappa: valore del form annex_iii_domain → chiavi vettori S3 applicabili
const ANNEX_III_KEY_MAP: Record<string, string[]> = {
  // Categoria 1: Biometria
  'biometric_identification':    ['annex_iii_cat1'],
  'biometric_categorization':    ['annex_iii_cat1'],
  'emotion_recognition':         ['annex_iii_cat1'],
  // Categoria 2: Infrastruttura critica
  'critical_infrastructure':     ['annex_iii_cat2'],
  // Categoria 3: Istruzione
  'education_admission':         ['annex_iii_cat3'],
  'education_assessment':        ['annex_iii_cat3'],
  // Categoria 4: Occupazione (già indexed: annex_iii_p1, annex_iii_p2)
  'recruitment':                 ['annex_iii_p1'],
  'work_performance':            ['annex_iii_p1', 'annex_iii_p2'],
  'work_monitoring':             ['annex_iii_p2'],
  // Categoria 5: Servizi essenziali
  'credit_scoring':              ['annex_iii_cat5'],
  'insurance_pricing':           ['annex_iii_cat5'],
  'public_services_eligibility': ['annex_iii_cat5'],
  'emergency_dispatch':          ['annex_iii_cat5'],
  // Categoria 6: Contrasto (già indexed: annex_iii_p2..p4)
  'law_enforcement_risk':        ['annex_iii_p2', 'annex_iii_p3'],
  'criminal_investigation':      ['annex_iii_p3', 'annex_iii_p4'],
  // Categoria 7: Migrazione
  'migration_assessment':        ['annex_iii_cat7'],
  'border_control':              ['annex_iii_cat7'],
  // Categoria 8: Giustizia (già indexed: annex_iii_p5)
  'justice_administration':      ['annex_iii_p5'],
};

export interface RuleEngineResult {
  applicableKeys: string[];
  isHighRisk: boolean;
  isProhibited: boolean;
  isGpai: boolean;
  reasoning: string[]; // descrizioni leggibili del perché ogni gruppo di articoli è stato incluso
}

export function determineApplicableArticles(
  system: AISystem,
  company: Company,
): RuleEngineResult {
  const keys = new Set<string>();
  const reasoning: string[] = [];
  let isProhibited = false;
  let isHighRisk = false;
  let isGpai = false;

  const role = company.ai_role as string;
  const isProvider = role === 'provider' || role === 'both';
  const isDeployer = role === 'deployer' || role === 'both';
  const annexDomains = (system.annex_iii_domains ?? []) as string[];

  console.log('[RULE ENGINE] System:', system.tool_name, '| Company role:', role);
  console.log('[RULE ENGINE] annex_iii_domains:', annexDomains);
  console.log('[RULE ENGINE] is_safety_component:', system.is_safety_component);

  // ── Art. 4: AI Literacy (SEMPRE — universale per provider e deployer) ────────
  keys.add('art_4');
  reasoning.push('Art. 4 — AI Literacy: obbligo universale di garantire adeguata alfabetizzazione AI del personale (applicabile dal 2 febbraio 2025, si applica a tutti i provider e deployer)');

  // ── Art. 5: pratiche vietate (SEMPRE) ──────────────────────────────────────
  keys.add('art_5_p1'); keys.add('art_5_p2'); keys.add('art_5_p3'); keys.add('art_5_p4');
  reasoning.push('Art. 5 — Pratiche vietate: analisi sempre richiesta');

  // Art. 5(1)(b): sfruttamento vulnerabilità → solo se sistema usa TECNICHE MANIPOLATIVE attive su gruppi vulnerabili.
  // La mera presenza di soggetti vulnerabili tra gli utenti NON rende il sistema proibito — è HIGH RISK (Annex III/Art. 27).
  // isProhibited rimane false; il LLM analizzerà Art. 5 e determinerà se c'è effettiva violazione.

  // Art. 5(1)(f): riconoscimento emozioni in ambienti lavorativi/educativi
  if (annexDomains.includes('emotion_recognition') &&
    (system.target_users?.includes('employees') || system.target_users?.includes('students'))) {
    isProhibited = true;
    reasoning.push('Art. 5(1)(f) — Riconoscimento emozioni vietato in ambienti lavorativi/educativi');
  }

  // Art. 5(1)(d): biometria remota real-time in spazi pubblici (se target include public)
  if (annexDomains.includes('biometric_identification') &&
    system.target_users?.includes('general_public')) {
    isProhibited = true;
    reasoning.push('Art. 5(1)(d) — Identificazione biometrica remota real-time in spazi pubblici');
  }

  // ── Classificazione rischio ─────────────────────────────────────────────────

  // Art. 6(1): componente di sicurezza in prodotto regolamentato
  if (system.is_safety_component) {
    isHighRisk = true;
    keys.add('art_6_classification');
    keys.add('annex_i_p1'); keys.add('annex_i_p2'); keys.add('annex_i_p3');
    reasoning.push('Art. 6(1) — Alto rischio: componente di sicurezza in prodotto soggetto a legislazione UE di armonizzazione (Allegato I)');
  }

  // Art. 6(2): sistema in Allegato III
  if (annexDomains.length > 0) {
    isHighRisk = true;
    keys.add('art_6_classification');
    // Aggiungi le chiavi Allegato III specifiche per i domini selezionati
    for (const domain of annexDomains) {
      const domainKeys = ANNEX_III_KEY_MAP[domain] ?? [];
      domainKeys.forEach(k => keys.add(k));
    }
    reasoning.push(`Art. 6(2) — Alto rischio: sistema in Allegato III (categorie: ${annexDomains.join(', ')})`);
  }

  // ── Se alto rischio: obblighi tecnici Art. 9-15 (SEMPRE per sistemi ad alto rischio) ─
  if (isHighRisk) {
    // Requisiti tecnici base (Art. 9-15)
    ['art_9','art_10','art_11','art_12','art_13_p1','art_13_p2','art_14','art_15'].forEach(k => keys.add(k));
    reasoning.push('Art. 9-15 — Requisiti tecnici obbligatori per sistemi ad alto rischio');

    // Art. 16-25: obblighi fornitore
    if (isProvider) {
      ['art_16','art_17_p1','art_17_p2','art_18','art_19','art_20','art_21','art_22','art_23'].forEach(k => keys.add(k));
      reasoning.push('Art. 16-25 — Obblighi fornitore sistemi ad alto rischio');
    }

    // Art. 26-29: obblighi deployer
    if (isDeployer) {
      ['art_26_p1','art_26_p2','art_27','art_28','art_29'].forEach(k => keys.add(k));
      reasoning.push('Art. 26-29 — Obblighi deployer sistemi ad alto rischio');
    }

    // Art. 49: registrazione nella banca dati EU (obbligatorio per Allegato III)
    keys.add('art_49');
    reasoning.push('Art. 49 — Registrazione nella banca dati EU obbligatoria');
  }

  // ── GPAI: modelli per uso generale (Art. 51-55) ─────────────────────────────
  if (system.category === 'llm') {
    isGpai = true;
    ['art_51','art_52','art_53','art_54','art_55'].forEach(k => keys.add(k));
    reasoning.push('Art. 51-55 — GPAI: sistema classificato come modello per uso generale (LLM)');
  }

  // ── Art. 50: Trasparenza ─────────────────────────────────────────────────────
  // Obbligatorio per: sistemi che interagiscono con persone, generano contenuti, no oversight
  const needsTransparency =
    system.category === 'llm' ||
    system.human_oversight_level === 'never' ||
    system.output_type === 'content_generation' ||
    annexDomains.includes('emotion_recognition');

  if (needsTransparency) {
    keys.add('art_50');
    reasoning.push('Art. 50 — Obblighi di trasparenza: sistema interagisce con persone fisiche o genera contenuti');
  }

  // ── Sanzioni Art. 99-100 (SEMPRE) ────────────────────────────────────────────
  keys.add('art_99_sanctions'); keys.add('art_100');
  reasoning.push('Art. 99-100 — Sanzioni: sempre inclusi per completezza del report');

  console.log('[RULE ENGINE] Applicable keys:', Array.from(keys));
  console.log('[RULE ENGINE] isHighRisk:', isHighRisk, '| isProhibited:', isProhibited, '| isGpai:', isGpai);

  return {
    applicableKeys: Array.from(keys),
    isHighRisk,
    isProhibited,
    isGpai,
    reasoning,
  };
}
