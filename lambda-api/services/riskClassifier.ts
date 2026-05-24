/**
 * Deterministic pre-classifier for AI Act risk levels.
 *
 * Derives risk classification and mandatory compliance articles directly from
 * structured form data — before the LLM call — so that:
 *   1. risk_classification is always correct regardless of LLM output
 *   2. mandatory articles are always present in compliance_gaps
 *   3. sanction exposure is stable across repeated assessments for the same system
 */

import type { AISystem } from '../types/aiSystem';
import type { Company } from '../types/company';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'prohibited' | 'high' | 'limited' | 'minimal';

export interface MandatoryGapTemplate {
  article:             string;
  requirement:         string;
  description:         string;
  what_to_do:          string;
  can_actify_automate: boolean;
  automation_type:     string | null;
}

export interface PreClassification {
  risk_level:        RiskLevel;
  mandatory_articles: string[];     // must appear in compliance_gaps as non-compliant
  annex_ref:         string | null; // e.g. "III, punto 4"
  rationale:         string;        // injected into LLM prompt as constraint
}

// ─── Annex III mapping ────────────────────────────────────────────────────────
// Regex matches against system.category + system.decision_domains (lowercased).

const ANNEX_III_RULES: Array<{
  test:   (s: AISystem) => boolean;
  annex:  string;
  label:  string;
}> = [
  {
    test:  s => s.category === 'hr'
             || match(s, /recruit|assunzion|selezione.candidate|hr|risorse.umane|employ|hiring|licenziament/),
    annex: 'III, punto 4',
    label: 'Sistema HR/recruiting (Allegato III, punto 4) — decisioni su lavoratori o candidati',
  },
  {
    test:  s => s.category === 'healthcare'
             || match(s, /sanit|salute|medic|diagnos|pazient|clinical|healthcare|ospedale/),
    annex: 'III, punto 5a',
    label: 'Sistema sanitario (Allegato III, punto 5a) — uso in contesti medici',
  },
  {
    test:  s => match(s, /credit|prestito|mutuo|finanziamento|assicura|scoring.finan|solvibilit/),
    annex: 'III, punto 5b',
    label: 'Sistema creditizio/assicurativo (Allegato III, punto 5b)',
  },
  {
    test:  s => match(s, /istruzion|scolast|universit|educazion|esame|ammission|valutazion.studente|education/),
    annex: 'III, punto 3',
    label: 'Sistema educativo (Allegato III, punto 3)',
  },
  {
    test:  s => match(s, /giustizia|sentenza|pena|giudiz|tribunale|procura|justice/),
    annex: 'III, punto 8',
    label: 'Sistema giudiziario (Allegato III, punto 8)',
  },
  {
    test:  s => match(s, /migrazion|confine|border|asilo|visto|immigra/),
    annex: 'III, punto 7',
    label: 'Sistema migrazione/frontiera (Allegato III, punto 7)',
  },
  {
    test:  s => match(s, /elezioni|voto|democrazia|politich|propaganda.elettorale/),
    annex: 'III, punto 8b',
    label: 'Sistema processi democratici (Allegato III, punto 8)',
  },
  {
    test:  s => s.data_types.some(d => /biometri/i.test(d))
             && match(s, /law.enforce|polizia|forze.dell.ordine|sorveglianza.di.massa/),
    annex: 'III, punto 1',
    label: 'Identificazione biometrica in contesto law enforcement (Allegato III, punto 1)',
  },
];

// ─── Prohibited practice triggers (Art. 5) ───────────────────────────────────

const PROHIBITED_TRIGGERS: Array<{ test: (s: AISystem) => boolean; reason: string }> = [
  {
    test:   s => match(s, /social.scor|punteggio.social|scoring.sociale/),
    reason: 'Possibile social scoring (Art. 5, par. 1, lett. c)',
  },
  {
    test:   s => s.data_types.some(d => /biometri/i.test(d))
              && match(s, /spazio.pubblico|public.space|sorveglianza.di.massa/)
              && s.human_oversight_level === 'never',
    reason: 'Identificazione biometrica real-time in spazi pubblici senza supervisione (Art. 5, par. 1, lett. h)',
  },
  {
    test:   s => s.data_types.some(d => /emozion/i.test(d))
              && s.target_users.some(u => /employee|dipendent/i.test(u)),
    reason: 'Inferenza emotiva su lavoratori (Art. 5, par. 1, lett. f)',
  },
];

// ─── Mandatory gap templates per article ─────────────────────────────────────
// Static descriptions used when the LLM fails to cite a mandatory article.

export const MANDATORY_GAP_TEMPLATES: Record<string, MandatoryGapTemplate> = {
  'Art. 5': {
    article:             'Art. 5',
    requirement:         'Divieto pratiche vietate',
    description:         'Il sistema potrebbe configurare una pratica vietata ai sensi dell\'Art. 5 AI Act. È necessaria revisione legale immediata per escludere l\'applicabilità del divieto.',
    what_to_do:          'Richiedere parere legale specializzato. Se il sistema rientra in una pratica vietata, cessare immediatamente l\'uso e notificare l\'autorità di vigilanza.',
    can_actify_automate: false,
    automation_type:     null,
  },
  'Art. 6': {
    article:             'Art. 6',
    requirement:         'Classificazione formale come sistema AI ad alto rischio',
    description:         'Il sistema non è stato formalmente classificato come sistema AI ad alto rischio secondo i criteri dell\'Art. 6 e dell\'Allegato III. La classificazione è obbligatoria prima della messa in servizio.',
    what_to_do:          'Effettuare e documentare la classificazione formale del sistema ai sensi dell\'Art. 6 e Allegato III. Conservare la documentazione classificatoria nel fascicolo tecnico.',
    can_actify_automate: true,
    automation_type:     'risk_assessment',
  },
  'Art. 9': {
    article:             'Art. 9',
    requirement:         'Sistema di gestione dei rischi',
    description:         'Non è presente un sistema strutturato e documentato di gestione dei rischi per tutto il ciclo di vita del sistema AI ad alto rischio (Art. 9).',
    what_to_do:          'Implementare un risk management system documentato: identificazione e analisi dei rischi noti e ragionevolmente prevedibili, misure di mitigazione, test e revisione continua.',
    can_actify_automate: true,
    automation_type:     'risk_assessment',
  },
  'Art. 13': {
    article:             'Art. 13',
    requirement:         'Trasparenza e informazioni agli utenti del sistema',
    description:         'Il sistema AI ad alto rischio manca di documentazione di trasparenza adeguata verso i deployer/utenti (Art. 13): capacità, limitazioni, supervisione umana richiesta, performance attesa.',
    what_to_do:          'Redigere istruzioni d\'uso complete: scopo previsto, capacità e limitazioni, livello di accuratezza, condizioni operative, dati richiesti, supervisione umana necessaria.',
    can_actify_automate: true,
    automation_type:     'transparency_notice',
  },
  'Art. 14': {
    article:             'Art. 14',
    requirement:         'Supervisione umana',
    description:         'Non sono state implementate misure tecniche e organizzative adeguate per garantire la supervisione umana del sistema AI ad alto rischio prima e durante l\'uso (Art. 14).',
    what_to_do:          'Definire procedure di supervisione: chi supervisiona, con quale frequenza, come si interviene sulle decisioni automatizzate, come si disabilita il sistema in caso di anomalie.',
    can_actify_automate: true,
    automation_type:     'monitoring_plan',
  },
  'Art. 17': {
    article:             'Art. 17',
    requirement:         'Sistema di gestione della qualità (obblighi Provider)',
    description:         'Il provider non ha istituito un sistema di gestione della qualità documentato per il sistema AI ad alto rischio, come richiesto dall\'Art. 17.',
    what_to_do:          'Implementare un QMS documentato che copra: strategia compliance, procedure di progettazione e sviluppo, gestione dati di addestramento, governance post-commercializzazione.',
    can_actify_automate: true,
    automation_type:     'policy_template',
  },
  'Art. 18': {
    article:             'Art. 18',
    requirement:         'Documentazione tecnica (obblighi Provider)',
    description:         'La documentazione tecnica richiesta dall\'Allegato IV per i provider di sistemi AI ad alto rischio non è stata predisposta (Art. 18).',
    what_to_do:          'Redigere documentazione tecnica conforme all\'Allegato IV: descrizione del sistema, architettura, dati di addestramento, metriche di performance, misure di cybersecurity.',
    can_actify_automate: true,
    automation_type:     'document_generation',
  },
  'Art. 20': {
    article:             'Art. 20',
    requirement:         'Monitoraggio post-commercializzazione (obblighi Provider)',
    description:         'Non è attivo un sistema di monitoraggio post-commercializzazione per il sistema AI ad alto rischio come richiesto dall\'Art. 20.',
    what_to_do:          'Definire piano di monitoraggio: metriche da tracciare, frequenza revisioni, soglie di allerta, procedure di segnalazione incidenti gravi all\'autorità di vigilanza.',
    can_actify_automate: true,
    automation_type:     'monitoring_plan',
  },
  'Art. 26': {
    article:             'Art. 26',
    requirement:         'Obblighi del deployer di sistemi AI ad alto rischio',
    description:         'Il deployer non ha implementato le misure obbligatorie previste dall\'Art. 26: assegnazione responsabilità interne, conformità istruzioni d\'uso, supervisione umana, conservazione log.',
    what_to_do:          'Adottare misure tecniche e organizzative: nominare un referente interno AI, formare il personale, implementare la supervisione umana, conservare i log operativi per almeno 6 mesi.',
    can_actify_automate: true,
    automation_type:     'policy_template',
  },
  'Art. 50': {
    article:             'Art. 50',
    requirement:         'Trasparenza verso gli utenti finali',
    description:         'Gli utenti finali non vengono informati in modo chiaro e tempestivo di interagire con un sistema AI. La disclosure è obbligatoria ai sensi dell\'Art. 50.',
    what_to_do:          'Implementare notice obbligatoria visibile prima dell\'interazione: specificare che si tratta di un sistema AI, il suo scopo, come contestare le decisioni.',
    can_actify_automate: true,
    automation_type:     'transparency_notice',
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function match(system: AISystem, pattern: RegExp): boolean {
  const haystack = [
    system.category,
    system.purpose,
    ...system.decision_domains,
    ...system.target_users,
  ].join(' ').toLowerCase();
  return pattern.test(haystack);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function preClassify(system: AISystem, company: Company): PreClassification {
  // 1 — Prohibited practices (Art. 5)
  for (const trigger of PROHIBITED_TRIGGERS) {
    if (trigger.test(system)) {
      return {
        risk_level:         'prohibited',
        mandatory_articles: ['Art. 5'],
        annex_ref:          null,
        rationale:          trigger.reason,
      };
    }
  }

  // 2 — High risk via Annex III
  for (const rule of ANNEX_III_RULES) {
    if (rule.test(system)) {
      return {
        risk_level:         'high',
        mandatory_articles: buildHighRiskArticles(company),
        annex_ref:          rule.annex,
        rationale:          rule.label,
      };
    }
  }

  // 3 — High risk via other criteria (automated decisions on vulnerable groups)
  if (system.makes_automated_decisions && system.affects_vulnerable_groups) {
    return {
      risk_level:         'high',
      mandatory_articles: buildHighRiskArticles(company),
      annex_ref:          null,
      rationale:          'Decisioni automatizzate su soggetti vulnerabili — classificabile come alto rischio',
    };
  }

  // 4 — Limited risk (LLM / no human oversight → Art. 50 transparency)
  if (system.category === 'llm' || system.human_oversight_level === 'never') {
    return {
      risk_level:         'limited',
      mandatory_articles: ['Art. 50'],
      annex_ref:          null,
      rationale:          'Sistema LLM generativo o senza supervisione umana: obbligo trasparenza Art. 50',
    };
  }

  // 5 — Minimal
  return {
    risk_level:         'minimal',
    mandatory_articles: [],
    annex_ref:          null,
    rationale:          'Nessuna categoria Allegato III rilevata — rischio minimale',
  };
}

function buildHighRiskArticles(company: Company): string[] {
  const isProvider = company.ai_role === 'provider' || company.ai_role === 'both';
  const isDeployer = company.ai_role === 'deployer' || company.ai_role === 'both';

  const articles = ['Art. 6', 'Art. 9', 'Art. 13', 'Art. 14'];

  if (isProvider) {
    articles.push('Art. 17', 'Art. 18', 'Art. 20');
  }
  if (isDeployer) {
    articles.push('Art. 26');
  }

  return articles;
}
