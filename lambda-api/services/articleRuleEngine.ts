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
  // Categoria 4: Occupazione
  'recruitment':                 ['annex_iii_p1'],
  'work_performance':            ['annex_iii_p1', 'annex_iii_p2'],
  'work_monitoring':             ['annex_iii_p2'],
  // Categoria 5: Servizi essenziali
  'credit_scoring':              ['annex_iii_cat5'],
  'insurance_pricing':           ['annex_iii_cat5'],
  'public_services_eligibility': ['annex_iii_cat5'],
  'emergency_dispatch':          ['annex_iii_cat5'],
  // Categoria 6: Contrasto
  'law_enforcement_risk':        ['annex_iii_p2', 'annex_iii_p3'],
  'criminal_investigation':      ['annex_iii_p3', 'annex_iii_p4'],
  // Categoria 7: Migrazione
  'migration_assessment':        ['annex_iii_cat7'],
  'border_control':              ['annex_iii_cat7'],
  // Categoria 8: Giustizia
  'justice_administration':      ['annex_iii_p5'],
};

// Bug #7 fix — GPAI non è limitato agli LLM: include tutti i modelli per uso generale
// Ref: Art. 3(63) AI Act — "capable of competently performing a wide range of distinct tasks"
const GPAI_CATEGORIES = new Set([
  'llm', 'multimodal', 'image_generation', 'video_generation',
  'foundation_model', 'code_generation',
]);

export interface RuleEngineResult {
  applicableKeys: string[];
  isHighRisk: boolean;
  isProhibited: boolean;
  isGpai: boolean;
  reasoning: string[];
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

  // system.role è per-sistema ('provider'|'deployer') ed è più specifico di company.ai_role
  // che può essere 'both' o 'unknown'. Usare system.role come fonte primaria.
  const role = (system.role ?? company.ai_role) as string;
  const isProvider = role === 'provider' || role === 'both';
  const isDeployer = role === 'deployer' || role === 'both';
  const annexDomains = (system.annex_iii_domains ?? []) as string[];

  // Bug #4 fix — entity_type non ancora nel form (campo futuro da aggiungere).
  // Conservativo: se non impostato, include Art. 27 per non perdere obblighi di enti pubblici.
  // Quando entity_type === 'private' sarà esplicitamente dichiarato, Art. 27 verrà escluso.
  const entityType = (company as unknown as Record<string, unknown>).entity_type as string | undefined;
  const isPublicBodyOrPublicService =
    entityType === 'public_body' || entityType === 'private_public_service';
  const isExplicitlyPrivate = entityType === 'private';

  console.log('[RULE ENGINE] System:', system.tool_name, '| Company role:', role, '| entity_type:', entityType ?? 'not set');
  console.log('[RULE ENGINE] annex_iii_domains:', annexDomains);
  console.log('[RULE ENGINE] is_safety_component:', system.is_safety_component);

  // ── Art. 4: AI Literacy (universale) ─────────────────────────────────────────
  keys.add('art_4');
  reasoning.push('Art. 4 — AI Literacy: obbligo universale per provider e deployer dal 2 febbraio 2025');

  // ── Art. 5: pratiche vietate (SEMPRE) ────────────────────────────────────────
  keys.add('art_5_p1'); keys.add('art_5_p2'); keys.add('art_5_p3'); keys.add('art_5_p4');
  reasoning.push('Art. 5 — Pratiche vietate: analisi sempre richiesta');

  // Art. 5(1)(b): sfruttamento vulnerabilità — solo TECNICHE MANIPOLATIVE attive.
  // La mera presenza di utenti vulnerabili NON è proibita; è HIGH RISK (Annex III/Art. 27).

  // Art. 5(1)(f): riconoscimento emozioni in ambienti lavorativi/educativi
  if (annexDomains.includes('emotion_recognition') &&
    (system.target_users?.includes('employees') || system.target_users?.includes('students'))) {
    isProhibited = true;
    reasoning.push('Art. 5(1)(f) — Riconoscimento emozioni vietato in ambienti lavorativi/educativi');
  }

  // Bug #2 fix — Art. 5(1)(d): proibito SOLO se biometria real-time per finalità di contrasto.
  // Un operatore privato con biometria su general_public → Annex III cat. 1 (alto rischio), NON proibito.
  // Ref: Art. 5(1)(d) "...for the purpose of law enforcement in publicly accessible spaces..."
  const isLawEnforcementContext =
    annexDomains.includes('law_enforcement_risk') ||
    annexDomains.includes('criminal_investigation');

  if (annexDomains.includes('biometric_identification') &&
      system.target_users?.includes('general_public') &&
      isLawEnforcementContext) {
    isProhibited = true;
    reasoning.push('Art. 5(1)(d) — Identificazione biometrica remota real-time in spazi pubblici per finalità di contrasto: PROIBITO');
  }

  // ── Classificazione rischio ───────────────────────────────────────────────────

  // Art. 6(1): componente di sicurezza in prodotto regolamentato (Allegato I)
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
    for (const domain of annexDomains) {
      const domainKeys = ANNEX_III_KEY_MAP[domain] ?? [];
      domainKeys.forEach(k => keys.add(k));
    }
    reasoning.push(`Art. 6(2) — Alto rischio: sistema in Allegato III (categorie: ${annexDomains.join(', ')})`);
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
    // applicabili ai deployer puri — gli unici obblighi tecnici diretti per i deployer.
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
    // Bug #4 fix — Art. 27 (FRIA) è obbligatorio SOLO per enti pubblici e privati
    // che erogano servizi pubblici (Art. 27(1)). Un'azienda privata che usa un sistema
    // HR per i propri dipendenti NON è soggetta all'Art. 27.
    if (isDeployer) {
      ['art_26_p1','art_26_p2','art_28','art_29'].forEach(k => keys.add(k));
      if (isPublicBodyOrPublicService || !isExplicitlyPrivate) {
        // Conservativo se entity_type non ancora impostato nel profilo company
        keys.add('art_27');
        reasoning.push(isPublicBodyOrPublicService
          ? 'Art. 27 — FRIA: obbligatorio per enti pubblici e privati che erogano servizi pubblici'
          : 'Art. 27 — FRIA: incluso in via conservativa (imposta entity_type=private nel profilo per escluderlo)');
      }
      reasoning.push('Art. 26, 28, 29 — Obblighi deployer sistemi ad alto rischio');
    }

    // Bug #6 fix — Art. 49: obbligo di registrazione nel database EU.
    // Provider: SEMPRE (Art. 49(1)) — prima dell'immissione sul mercato.
    // Deployer: solo se infrastrutture critiche (Annex III punto 2) E ente pubblico/assimilato (Art. 49(2)).
    // Deployer privati di altri sistemi Annex III → nessun obbligo diretto di registrazione.
    if (isProvider) {
      keys.add('art_49');
      reasoning.push('Art. 49(1) — Registrazione nel database EU: obbligo provider prima dell\'immissione sul mercato');
    }
    if (isDeployer && !isProvider &&
        annexDomains.includes('critical_infrastructure') &&
        isPublicBodyOrPublicService) {
      keys.add('art_49');
      reasoning.push('Art. 49(2) — Registrazione nel database EU: deployer di infrastrutture critiche / ente pubblico');
    }
  }

  // Bug #7 fix — GPAI: Art. 51-55 si applicano a tutti i modelli per uso generale,
  // non solo agli LLM. Include multimodal, image/video generation, foundation models, code gen.
  if (GPAI_CATEGORIES.has(system.category)) {
    isGpai = true;
    ['art_51','art_52','art_53','art_54','art_55'].forEach(k => keys.add(k));
    reasoning.push(`Art. 51-55 — GPAI: modello per uso generale (categoria: ${system.category})`);
  }

  // Bug #5 fix — Art. 50: trigger basato su interazione con persone fisiche o contenuti sintetici.
  // Rimosso `human_oversight_level === 'never'`: un sistema senza supervisione (es. trading algoritmico)
  // non interagisce con persone fisiche → non triggera Art. 50.
  // Ref: Art. 50(1) "...AI systems intended to interact directly with natural persons..."
  const needsTransparency =
    isGpai ||
    system.output_type === 'content_generation' ||
    (system.output_type as string) === 'deepfake' ||
    annexDomains.includes('emotion_recognition') ||
    annexDomains.includes('biometric_categorization');

  if (needsTransparency) {
    keys.add('art_50');
    reasoning.push('Art. 50 — Obblighi di trasparenza: sistema interagisce con persone fisiche o genera contenuti sintetici');
  }

  // ── Sanzioni Art. 99-100 (SEMPRE) ────────────────────────────────────────────
  keys.add('art_99_sanctions'); keys.add('art_100');
  reasoning.push('Art. 99-100 — Sanzioni: sempre inclusi per completezza del report');

  // TODO Bug #3 — Art. 25: transizione deployer → provider non ancora implementata.
  // Richiede campi form: puts_own_name_on_system, made_substantial_modification, integrated_gpai_into_high_risk.
  // Quando questi campi saranno disponibili: se (isDeployer && deployer_becomes_provider) → sovrascrivere isProvider = true.

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
