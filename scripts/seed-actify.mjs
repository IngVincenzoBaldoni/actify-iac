/**
 * seed-actify.mjs — Seed bulk di sistemi AI su un account Actify
 *
 * Prerequisiti:
 *   - Node.js 18+ (fetch nativo + top-level await, nessun npm install)
 *   - AWS CLI configurato (serve solo per auth Cognito)
 *
 * Uso:
 *   node scripts/seed-actify.mjs <email> <password> --high=N --medium=N --low=N
 *
 * Esempi:
 *   node scripts/seed-actify.mjs admin@acme.it MiaPass! --high=3 --medium=5 --low=7
 *   node scripts/seed-actify.mjs admin@acme.it MiaPass! --high=15
 *   node scripts/seed-actify.mjs admin@acme.it MiaPass! --medium=10 --low=5
 *
 * Progettazione gap coverage — 3 cluster articoli distinti:
 *   HIGH  provider → Art. 9-23, 49          (documentazione tecnica, QMS, obblighi fornitore)
 *   HIGH  deployer → Art. 12, 14, 26-29     (log, supervisione, obblighi deployer, FRIA)
 *   MEDIUM LLM/GPAI → Art. 50-55            (trasparenza, obblighi GPAI)
 *   LOW   minimal  → Art. 4                 (solo literacy, by design)
 *
 * Banca: 15 HIGH (7 provider + 8 deployer) + 15 MEDIUM (8 GPAI + 7 altri) + 15 LOW = 45 totali
 */

import { execSync } from 'child_process';

// ── Parsing argomenti ─────────────────────────────────────────────────────────

const [,, EMAIL, PASSWORD, ...flags] = process.argv;

if (!EMAIL || !PASSWORD) {
  console.error('\nUso: node scripts/seed-actify.mjs <email> <password> [flags]\n');
  console.error('  Per rischio (qualsiasi ruolo):');
  console.error('    --high=N    sistemi alto rischio (provider + deployer)');
  console.error('    --medium=N  sistemi medio rischio (GPAI + content generation)');
  console.error('    --low=N     sistemi basso rischio');
  console.error('\n  Per rischio + ruolo specifico:');
  console.error('    --high-provider=N    solo provider alto rischio');
  console.error('    --high-deployer=N    solo deployer alto rischio');
  console.error('    --medium-provider=N  solo provider medio rischio');
  console.error('    --medium-deployer=N  solo deployer medio rischio');
  console.error('    --low-provider=N     solo provider basso rischio');
  console.error('    --low-deployer=N     solo deployer basso rischio');
  console.error('\n  I flag generici (--high) e specifici (--high-provider) sono combinabili.\n');
  process.exit(1);
}

function parseFlag(name) {
  const flag = flags.find(f => f.startsWith(`--${name}=`));
  if (!flag) return 0;
  const val = parseInt(flag.split('=')[1], 10);
  if (isNaN(val) || val < 0) { console.error(`Errore: --${name} deve essere ≥ 0`); process.exit(1); }
  return val;
}

const N_HIGH            = parseFlag('high');
const N_HIGH_PROVIDER   = parseFlag('high-provider');
const N_HIGH_DEPLOYER   = parseFlag('high-deployer');
const N_MEDIUM          = parseFlag('medium');
const N_MEDIUM_PROVIDER = parseFlag('medium-provider');
const N_MEDIUM_DEPLOYER = parseFlag('medium-deployer');
const N_LOW             = parseFlag('low');
const N_LOW_PROVIDER    = parseFlag('low-provider');
const N_LOW_DEPLOYER    = parseFlag('low-deployer');

const totalRequested =
  N_HIGH + N_HIGH_PROVIDER + N_HIGH_DEPLOYER +
  N_MEDIUM + N_MEDIUM_PROVIDER + N_MEDIUM_DEPLOYER +
  N_LOW + N_LOW_PROVIDER + N_LOW_DEPLOYER;

if (totalRequested === 0) {
  console.error('\nErrore: specifica almeno un flag (--high, --high-provider, --medium, ...) maggiore di 0.\n');
  process.exit(1);
}

// ── Configurazione ────────────────────────────────────────────────────────────

const COGNITO_CLIENT_ID = '2v3ggh33m5b4ap7kj96ufcqhmg';
const REGION            = 'eu-central-1';
const API_BASE          = 'https://lql1qfmdua.execute-api.eu-central-1.amazonaws.com';

// ─────────────────────────────────────────────────────────────────────────────
// HIGH RISK — 15 sistemi (7 provider + 8 deployer)
//
// Provider → gap su Art. 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
//            21, 22, 23, 49  (obblighi tecnici e organizzativi del fornitore)
// Deployer → gap su Art. 12, 14, 26, 27, 28, 29  (obblighi del deployer)
// ─────────────────────────────────────────────────────────────────────────────

const HIGH_RISK = [

  // ── PROVIDER (7) ── Art. 9-23 + 49 ──────────────────────────────────────

  {
    tool_name: 'CreditSense Forge',
    vendor: 'FinTech Solutions GmbH',
    category: 'finance',
    role: 'provider',
    purpose: 'SDK di credit scoring per banche e finanziarie: modello ML addestrato su dati creditizi europei, distribuito via API per la valutazione automatica del merito creditizio di privati e PMI.',
    department: 'Prodotto',
    headcount: 60,
    target_users: ['credit_analysts', 'loan_officers'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: ['credit_scoring'],
    affects_vulnerable_groups: false,
    data_types: ['financial_data', 'personal_data', 'behavioral_data'],
    output_type: 'scoring',
    annex_iii_domains: ['credit_scoring'],
    is_safety_component: false,
  },

  {
    tool_name: 'EduAssess Engine',
    vendor: 'EdTech Padova',
    category: 'altro',
    role: 'provider',
    purpose: 'Motore SaaS di valutazione adattiva per istituti scolastici e università: analisi delle risposte studentesche, scoring automatico e report sul gap formativo per docenti.',
    department: 'Prodotto',
    headcount: 25,
    target_users: ['students', 'teachers'],
    makes_automated_decisions: true,
    human_oversight_level: 'always',
    decision_domains: ['education_assessment'],
    affects_vulnerable_groups: true,
    data_types: ['personal_data', 'behavioral_data', 'educational_data'],
    output_type: 'scoring',
    annex_iii_domains: ['education_assessment'],
    is_safety_component: false,
  },

  {
    tool_name: 'BiometricAuth SDK',
    vendor: 'IDTech Verona',
    category: 'tech',
    role: 'provider',
    purpose: 'SDK per l\'identificazione biometrica in modalità 1:N su dataset di grandi dimensioni, integrato da clienti enterprise per il controllo accessi fisici e digitali.',
    department: 'Engineering',
    headcount: 40,
    target_users: ['developers', 'security_engineers'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['biometric', 'personal_data'],
    output_type: 'automated_decision',
    annex_iii_domains: ['biometric_identification'],
    is_safety_component: false,
  },

  {
    tool_name: 'InsureCalc Pro',
    vendor: 'InsurTech Napoli',
    category: 'finance',
    role: 'provider',
    purpose: 'Piattaforma SaaS di tariffazione assicurativa per polizze vita e salute: calcolo del premio personalizzato basato su profilo clinico, stile di vita e dati telematici.',
    department: 'Prodotto',
    headcount: 35,
    target_users: ['underwriters', 'actuaries'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['health_data', 'personal_data', 'financial_data'],
    output_type: 'scoring',
    annex_iii_domains: ['insurance_pricing'],
    is_safety_component: false,
  },

  {
    tool_name: 'SafetyRelay Control',
    vendor: 'IndustrialAI Torino',
    category: 'operations',
    role: 'provider',
    purpose: 'Componente di sicurezza AI embedded in sistemi di controllo industriale SCADA: rilevamento anomalie in tempo reale e attivazione arresto di emergenza per impianti manifatturieri soggetti alla Direttiva Macchine.',
    department: 'Engineering',
    headcount: 50,
    target_users: ['plant_operators', 'safety_engineers'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['operational_data', 'sensor_data'],
    output_type: 'automated_decision',
    annex_iii_domains: [],
    is_safety_component: true,
  },

  {
    tool_name: 'JusticeScore AI',
    vendor: 'LegalAI Geneva',
    category: 'legal',
    role: 'provider',
    purpose: 'API di risk scoring per il sistema giudiziario: analisi dei fascicoli processuali per la predizione della recidiva e supporto alla determinazione della misura cautelare.',
    department: 'Prodotto',
    headcount: 20,
    target_users: ['judges', 'prosecutors'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: true,
    data_types: ['legal_documents', 'personal_data', 'behavioral_data'],
    output_type: 'scoring',
    annex_iii_domains: ['justice_administration'],
    is_safety_component: false,
  },

  {
    tool_name: 'HireIQ Engine',
    vendor: 'TalentAI Inc.',
    category: 'hr',
    role: 'provider',
    purpose: 'Suite AI per la selezione del personale: parsing CV, test di competenze adattivi, video interview analysis e ranking automatico dei candidati distribuita via API ai clienti HR tech.',
    department: 'Prodotto',
    headcount: 80,
    target_users: ['hr_managers', 'recruiters'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: ['recruitment'],
    affects_vulnerable_groups: false,
    data_types: ['personal_data', 'professional_data', 'behavioral_data'],
    output_type: 'scoring',
    annex_iii_domains: ['recruitment'],
    is_safety_component: false,
  },

  // ── DEPLOYER (8) ── Art. 12, 14, 26, 27, 28, 29 ─────────────────────────

  {
    tool_name: 'HireIQ Pro',
    vendor: 'TalentAI Inc.',
    category: 'hr',
    role: 'deployer',
    purpose: 'Piattaforma di screening e ranking automatico dei candidati per le selezioni interne: analisi semantica del CV, confronto con profilo atteso e punteggio di idoneità.',
    department: 'Risorse Umane',
    headcount: 450,
    target_users: ['hr_managers', 'recruiters'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: ['recruitment'],
    affects_vulnerable_groups: false,
    data_types: ['personal_data', 'professional_data', 'behavioral_data'],
    output_type: 'scoring',
    annex_iii_domains: ['recruitment'],
    is_safety_component: false,
  },

  {
    tool_name: 'TalentPulse 360',
    vendor: 'PeopleMetrics',
    category: 'hr',
    role: 'deployer',
    purpose: 'Valutazione continua delle performance dei dipendenti tramite analisi comportamentale, OKR tracking e sentiment survey aggregato, con scoring automatico.',
    department: 'People & Culture',
    headcount: 1200,
    target_users: ['employees', 'hr_managers'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: ['work_performance'],
    affects_vulnerable_groups: false,
    data_types: ['personal_data', 'behavioral_data', 'professional_data'],
    output_type: 'scoring',
    annex_iii_domains: ['work_performance'],
    is_safety_component: false,
  },

  {
    tool_name: 'WorkMonitor Plus',
    vendor: 'HR Analytics EU',
    category: 'hr',
    role: 'deployer',
    purpose: 'Monitoraggio dell\'attività dei dipendenti in remoto: produttività, tempo attivo, pattern comportamentali e anomalie di accesso ai sistemi aziendali.',
    department: 'IT & Compliance',
    headcount: 800,
    target_users: ['employees', 'it_managers'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: ['work_monitoring'],
    affects_vulnerable_groups: false,
    data_types: ['behavioral_data', 'personal_data', 'operational_data'],
    output_type: 'scoring',
    annex_iii_domains: ['work_monitoring'],
    is_safety_component: false,
  },

  {
    tool_name: 'PublicBenefit AI',
    vendor: 'GovTech Roma',
    category: 'altro',
    role: 'deployer',
    purpose: 'Sistema AI per la determinazione automatica dell\'eleggibilità a sussidi pubblici, assegni familiari e agevolazioni fiscali tramite analisi del profilo socioeconomico del richiedente.',
    department: 'Servizi al Cittadino',
    headcount: 500,
    target_users: ['citizens', 'public_officers'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: [],
    affects_vulnerable_groups: true,
    data_types: ['personal_data', 'financial_data', 'social_data'],
    output_type: 'automated_decision',
    annex_iii_domains: ['public_services_eligibility'],
    is_safety_component: false,
  },

  {
    tool_name: 'BioAccess Gate',
    vendor: 'SecureBio Milano',
    category: 'tech',
    role: 'deployer',
    purpose: 'Controllo accessi fisici tramite riconoscimento facciale e categorizzazione biometrica per l\'accesso alle sedi aziendali e alle aree riservate.',
    department: 'Security',
    headcount: 1000,
    target_users: ['employees', 'visitors'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['biometric', 'personal_data'],
    output_type: 'automated_decision',
    annex_iii_domains: ['biometric_categorization'],
    is_safety_component: false,
  },

  {
    tool_name: 'MigrationAssess Pro',
    vendor: 'GovAI Brussels',
    category: 'altro',
    role: 'deployer',
    purpose: 'Valutazione automatizzata delle domande di visto e permesso di soggiorno: analisi documentale, scoring del richiedente e classificazione del profilo di rischio migratorio.',
    department: 'Immigrazione',
    headcount: 400,
    target_users: ['immigration_officers', 'applicants'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: [],
    affects_vulnerable_groups: true,
    data_types: ['personal_data', 'biometric', 'legal_documents'],
    output_type: 'scoring',
    annex_iii_domains: ['migration_assessment'],
    is_safety_component: false,
  },

  {
    tool_name: 'AdmissionBot',
    vendor: 'UniTech Solutions',
    category: 'altro',
    role: 'deployer',
    purpose: 'Selezione automatizzata delle domande di ammissione universitaria: ranking candidati per corso, analisi dei requisiti curriculari e predizione del tasso di completamento.',
    department: 'Segreteria Didattica',
    headcount: 180,
    target_users: ['students', 'admission_officers'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: ['education_admission'],
    affects_vulnerable_groups: true,
    data_types: ['personal_data', 'educational_data', 'behavioral_data'],
    output_type: 'scoring',
    annex_iii_domains: ['education_admission'],
    is_safety_component: false,
  },

  {
    tool_name: 'CreditSense SME',
    vendor: 'FinTech Solutions GmbH',
    category: 'finance',
    role: 'deployer',
    purpose: 'Credit scoring automatico per la valutazione dell\'affidabilità creditizia di PMI richiedenti finanziamenti: analisi bilanci, flussi bancari e scoring da modello esterno.',
    department: 'Crediti',
    headcount: 120,
    target_users: ['credit_analysts', 'loan_officers'],
    makes_automated_decisions: true,
    human_oversight_level: 'sometimes',
    decision_domains: ['credit_scoring'],
    affects_vulnerable_groups: false,
    data_types: ['financial_data', 'personal_data', 'behavioral_data'],
    output_type: 'scoring',
    annex_iii_domains: ['credit_scoring'],
    is_safety_component: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MEDIUM RISK — 15 sistemi (8 GPAI/LLM + 4 content generation + 3 altri)
//
// GPAI (category:'llm') → gap su Art. 50, 51, 52, 53, 54, 55
// Content gen (output_type:'content_generation') → gap su Art. 50
// Altri → gap su Art. 4 + eventuale Art. 50
// ─────────────────────────────────────────────────────────────────────────────

const MEDIUM_RISK = [

  // ── GPAI Provider (4) ── Art. 50 + 51-55 ────────────────────────────────

  {
    tool_name: 'NovaPro LLM Platform',
    vendor: 'GenAI Italia',
    category: 'llm',
    role: 'provider',
    purpose: 'Modello linguistico di grandi dimensioni addestrato su corpus europeo, distribuito via API a sviluppatori e aziende per applicazioni conversazionali, generazione di contenuti e analisi semantica.',
    department: 'AI Research',
    headcount: 45,
    target_users: ['developers', 'sme_owners', 'content_creators'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['content_data', 'behavioral_data'],
    output_type: 'content_generation',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  {
    tool_name: 'CodeGen AI Studio',
    vendor: 'DevAI Labs',
    category: 'llm',
    role: 'provider',
    purpose: 'Modello AI per la generazione automatica di codice sorgente, completamento intelligente, refactoring e generazione di test unitari distribuito come copilot per IDE e ambienti cloud.',
    department: 'Engineering',
    headcount: 30,
    target_users: ['developers', 'architects'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['code_data', 'operational_data'],
    output_type: 'content_generation',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  {
    tool_name: 'LegalAssist Pro LLM',
    vendor: 'LexAI Milano',
    category: 'llm',
    role: 'provider',
    purpose: 'LLM specializzato nel dominio legale italiano ed europeo: generazione di bozze contrattuali, analisi giurisprudenziale, summarization di fascicoli e Q&A normativo per studi legali e uffici compliance.',
    department: 'Prodotto',
    headcount: 22,
    target_users: ['lawyers', 'legal_counsel', 'compliance_officers'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['legal_documents', 'personal_data'],
    output_type: 'content_generation',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  {
    tool_name: 'MedSumm AI',
    vendor: 'HealthAI Florence',
    category: 'llm',
    role: 'provider',
    purpose: 'Modello linguistico per la medicina: summarization di cartelle cliniche, generazione di lettere di dimissione, coding ICD-11 automatico e Q&A clinico distribuito a ospedali e MMG.',
    department: 'AI Research',
    headcount: 18,
    target_users: ['doctors', 'nurses', 'hospital_admins'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: true,
    data_types: ['health_data', 'personal_data'],
    output_type: 'content_generation',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  // ── GPAI Deployer (4) ── Art. 50 + 51-55 ────────────────────────────────

  {
    tool_name: 'CustomerCare GPT',
    vendor: 'OpenCX Italia',
    category: 'llm',
    role: 'deployer',
    purpose: 'Assistente virtuale conversazionale per la gestione delle richieste di supporto clienti su canali web, app mobile e social, senza rivelazione della natura AI al cliente finale.',
    department: 'Customer Service',
    headcount: 600,
    target_users: ['general_public', 'consumers'],
    makes_automated_decisions: false,
    human_oversight_level: 'sometimes',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['personal_data', 'behavioral_data', 'conversation_data'],
    output_type: 'content_generation',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  {
    tool_name: 'HRCopilot Assistant',
    vendor: 'PeopleAI EU',
    category: 'llm',
    role: 'deployer',
    purpose: 'Assistente AI conversazionale per i dipendenti: risponde a domande su ferie, benefit, policy interne e procedure HR; genera comunicazioni standard e supporta l\'onboarding.',
    department: 'Risorse Umane',
    headcount: 2000,
    target_users: ['employees', 'hr_managers'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['personal_data', 'operational_data'],
    output_type: 'content_generation',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  {
    tool_name: 'TaxAdvisor GPT',
    vendor: 'Fiscale.ai',
    category: 'llm',
    role: 'deployer',
    purpose: 'Chatbot AI per consulenza fiscale preliminare: analisi della situazione tributaria, suggerimento detrazioni, generazione di bozze di dichiarazione e Q&A normativo per privati e piccoli imprenditori.',
    department: 'Finance & Tax',
    headcount: 60,
    target_users: ['general_public', 'sme_owners', 'accountants'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['financial_data', 'personal_data', 'legal_documents'],
    output_type: 'content_generation',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  {
    tool_name: 'BrandVoice AI',
    vendor: 'AdTech Milano',
    category: 'llm',
    role: 'deployer',
    purpose: 'LLM configurato sul tone-of-voice aziendale per la generazione automatica di copy pubblicitario, post social, newsletter e descrizioni prodotto su larga scala.',
    department: 'Marketing',
    headcount: 80,
    target_users: ['marketing_teams', 'content_creators'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['content_data', 'behavioral_data'],
    output_type: 'content_generation',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  // ── Content generation non-GPAI (4) ── Art. 50 ──────────────────────────

  {
    tool_name: 'DocuGen Legal Suite',
    vendor: 'LegalTech Roma',
    category: 'legal',
    role: 'provider',
    purpose: 'Piattaforma SaaS per la generazione automatica di documenti legali: contratti, privacy policy, DPA, statuti societari su template configurabili per studi legali e uffici compliance.',
    department: 'Prodotto',
    headcount: 15,
    target_users: ['lawyers', 'notaries', 'sme_owners'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['legal_documents', 'personal_data'],
    output_type: 'content_generation',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  {
    tool_name: 'ContentFactory AI',
    vendor: 'Creative Labs EU',
    category: 'marketing',
    role: 'provider',
    purpose: 'Piattaforma SaaS per la generazione automatica di contenuti marketing multilingua: articoli SEO, post social, email campaign, descrizioni prodotto e script video.',
    department: 'Content',
    headcount: 20,
    target_users: ['marketing_teams', 'content_creators'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['content_data', 'behavioral_data'],
    output_type: 'content_generation',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  {
    tool_name: 'MeetingMinutes AI',
    vendor: 'Productivity Tools EU',
    category: 'altro',
    role: 'deployer',
    purpose: 'Trascrizione e sintesi automatica di riunioni aziendali con estrazione di action items, decisioni chiave e assegnazione automatica dei follow-up ai partecipanti.',
    department: 'Operations',
    headcount: 500,
    target_users: ['employees', 'managers'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['conversation_data', 'personal_data'],
    output_type: 'content_generation',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  {
    tool_name: 'PolicyDraft AI',
    vendor: 'GovTech Solutions',
    category: 'legal',
    role: 'provider',
    purpose: 'Generatore automatico di policy aziendali (GDPR, AI policy, codici etici, procedure di sicurezza) basato su normativa aggiornata e template customizzabili per il settore.',
    department: 'Compliance',
    headcount: 18,
    target_users: ['compliance_officers', 'legal_counsel', 'hr_managers'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['legal_documents'],
    output_type: 'content_generation',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  // ── Altri (3) — automated decision non-annex ─────────────────────────────

  {
    tool_name: 'FraudShield Banking',
    vendor: 'SecureAI AG',
    category: 'finance',
    role: 'deployer',
    purpose: 'Rilevamento real-time di frodi su transazioni bancarie e carte con blocco automatico delle operazioni anomale basato su pattern comportamentale e anomaly detection.',
    department: 'Risk Management',
    headcount: 200,
    target_users: ['bank_customers', 'compliance_officers'],
    makes_automated_decisions: true,
    human_oversight_level: 'never',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['financial_data', 'behavioral_data', 'personal_data'],
    output_type: 'automated_decision',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  {
    tool_name: 'AlgoTrader Pro',
    vendor: 'QuantAI London',
    category: 'finance',
    role: 'deployer',
    purpose: 'Trading algoritmico ad alta frequenza su mercati azionari europei: esecuzione automatica di strategie quantitative basate su ML senza intervento umano in tempo reale.',
    department: 'Asset Management',
    headcount: 25,
    target_users: ['fund_managers', 'compliance_officers'],
    makes_automated_decisions: true,
    human_oversight_level: 'never',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['financial_data', 'market_data'],
    output_type: 'automated_decision',
    annex_iii_domains: [],
    is_safety_component: false,
  },

  {
    tool_name: 'DynaPricer',
    vendor: 'PriceAI Labs',
    category: 'finance',
    role: 'deployer',
    purpose: 'Dynamic pricing per e-commerce B2C: adegua prezzi in tempo reale in base a domanda, inventory, profilo utente e benchmark competitivo, senza supervisione umana.',
    department: 'Revenue Management',
    headcount: 50,
    target_users: ['general_public', 'consumers'],
    makes_automated_decisions: true,
    human_oversight_level: 'never',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['behavioral_data', 'financial_data', 'personal_data'],
    output_type: 'automated_decision',
    annex_iii_domains: [],
    is_safety_component: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOW RISK — 15 sistemi
// Tutti recommendation-only, supervisione umana always, no annex
// Gap attesi: solo Art. 4 (by design — sistemi a rischio minimo)
// ─────────────────────────────────────────────────────────────────────────────

const LOW_RISK = [
  {
    tool_name: 'LexAI Contracts',
    vendor: 'LegalTech Roma',
    category: 'legal',
    role: 'deployer',
    purpose: 'Analisi automatica di contratti commerciali: rilevamento clausole a rischio, inconsistenze rispetto ai template aziendali e deviazioni da standard di settore. Output sempre revisionato dal team legale.',
    department: 'Legal Affairs',
    headcount: 35,
    target_users: ['lawyers', 'legal_counsel'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['legal_documents', 'personal_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'CodeGuardian',
    vendor: 'DevSecOps Inc.',
    category: 'tech',
    role: 'provider',
    purpose: 'Revisione statica del codice sorgente per rilevamento vulnerabilità OWASP, anti-pattern architetturali e violazioni di coding standard. Tutti i flag vengono revisionati dal team di sicurezza.',
    department: 'Engineering',
    headcount: 40,
    target_users: ['developers', 'security_engineers'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['code_data', 'operational_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'TaxBot Compliance',
    vendor: 'Fiscale.ai',
    category: 'legal',
    role: 'deployer',
    purpose: 'Verifica automatica della compliance fiscale con individuazione di anomalie dichiarative e suggerimento di scenari di ottimizzazione. Tutte le raccomandazioni vengono validate dal consulente.',
    department: 'Finance & Tax',
    headcount: 60,
    target_users: ['tax_advisors', 'cfo', 'accountants'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['financial_data', 'legal_documents', 'personal_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'SentimentRadar',
    vendor: 'Social Intelligence EU',
    category: 'marketing',
    role: 'deployer',
    purpose: 'Monitoraggio e analisi del sentiment su social media, review e forum per la gestione reputazionale e il competitive intelligence. Report settimanale al team brand.',
    department: 'Brand Management',
    headcount: 25,
    target_users: ['brand_managers', 'marketing_analysts'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['social_media_data', 'behavioral_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'DemandForecast Pro',
    vendor: 'RetailAI Group',
    category: 'operations',
    role: 'deployer',
    purpose: 'Previsione della domanda retail tramite ML su dati storici, stagionalità e trend di mercato per ottimizzare gli ordini ai fornitori. Gli ordini sono sempre approvati dai buyer.',
    department: 'Supply Chain',
    headcount: 400,
    target_users: ['buyers', 'category_managers'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['operational_data', 'financial_data', 'market_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'MarketMind Ads',
    vendor: 'AdTech Milano',
    category: 'marketing',
    role: 'deployer',
    purpose: 'Ottimizzazione di campagne pubblicitarie digitali tramite segmentazione predittiva dell\'audience. Le campagne vengono sempre riviste e approvate dal team marketing prima dell\'attivazione.',
    department: 'Marketing',
    headcount: 80,
    target_users: ['marketing_analysts', 'brand_managers'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['behavioral_data', 'personal_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'TranslateAI Pro',
    vendor: 'Lingua Technologies',
    category: 'altro',
    role: 'deployer',
    purpose: 'Traduzione automatica di documenti aziendali in 40 lingue con adattamento del registro per contesti legali, tecnici e commerciali. Output sempre revisionato da traduttori professionisti.',
    department: 'Communications',
    headcount: 200,
    target_users: ['employees', 'translators'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['content_data', 'personal_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'DataQuality AI',
    vendor: 'DataOps Italia',
    category: 'tech',
    role: 'deployer',
    purpose: 'Pulizia e validazione automatica di dataset aziendali: rilevamento duplicati, anomalie statistiche e inconsistenze semantiche. Tutte le modifiche ai dati sono soggette ad approvazione.',
    department: 'Data Engineering',
    headcount: 30,
    target_users: ['data_engineers', 'analysts'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['operational_data', 'personal_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'ExpenseReport AI',
    vendor: 'FinOps Cloud',
    category: 'finance',
    role: 'deployer',
    purpose: 'Automazione della gestione note spese: OCR scontrini, categorizzazione e verifica policy aziendale. L\'approvazione finale è sempre del responsabile finanziario.',
    department: 'Finance',
    headcount: 600,
    target_users: ['employees', 'finance_managers'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['financial_data', 'personal_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'SearchAssist KB',
    vendor: 'KnowledgeAI',
    category: 'altro',
    role: 'deployer',
    purpose: 'Ricerca semantica sulla knowledge base aziendale (Confluence, SharePoint, documenti interni): risposta contestualizzata alle domande operative dei dipendenti.',
    department: 'IT',
    headcount: 800,
    target_users: ['employees'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['content_data', 'operational_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'SupplyOptimizer',
    vendor: 'LogAI Systems',
    category: 'operations',
    role: 'deployer',
    purpose: 'Ottimizzazione della supply chain: suggerimento di riordino scorte e routing logistico. Le decisioni operative restano in capo ai responsabili operations.',
    department: 'Operations',
    headcount: 320,
    target_users: ['operations_managers', 'warehouse_staff'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['operational_data', 'financial_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'PredictiveMaint AI',
    vendor: 'Industry4.0 Brescia',
    category: 'operations',
    role: 'deployer',
    purpose: 'Manutenzione predittiva per impianti industriali: analisi vibrazionale e termica per anticipare guasti. I fermi macchina sono sempre decisi e pianificati dal team manutenzione.',
    department: 'Manutenzione',
    headcount: 400,
    target_users: ['maintenance_engineers', 'plant_managers'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['sensor_data', 'operational_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'TrainingBot HR',
    vendor: 'LearnAI Platform',
    category: 'hr',
    role: 'deployer',
    purpose: 'Percorsi di formazione personalizzati per i dipendenti: analisi skill gap e suggerimento corsi. La scelta finale del percorso formativo è sempre del dipendente e del suo manager.',
    department: 'Learning & Development',
    headcount: 700,
    target_users: ['employees', 'hr_managers'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: false,
    data_types: ['personal_data', 'behavioral_data', 'educational_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'HealthAssist Dx',
    vendor: 'MedAI Florence',
    category: 'healthcare',
    role: 'deployer',
    purpose: 'Supporto decisionale clinico per la diagnosi differenziale in medicina generale: analisi sintomi e suggerimento percorsi diagnostici. Il medico mantiene sempre l\'autorità clinica.',
    department: 'Clinical Services',
    headcount: 280,
    target_users: ['doctors', 'nurses'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: true,
    data_types: ['health_data', 'personal_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
  {
    tool_name: 'MedImageAI Radiology',
    vendor: 'Siemens Healthineers',
    category: 'healthcare',
    role: 'deployer',
    purpose: 'Supporto alla refertazione radiologica: rilevamento automatico di possibili anomalie in immagini RX, TC, RM. Il radiologo verifica sempre ogni referto prima dell\'invio al clinico.',
    department: 'Radiologia',
    headcount: 90,
    target_users: ['radiologists'],
    makes_automated_decisions: false,
    human_oversight_level: 'always',
    decision_domains: [],
    affects_vulnerable_groups: true,
    data_types: ['health_data', 'biometric', 'personal_data'],
    output_type: 'recommendation',
    annex_iii_domains: [],
    is_safety_component: false,
  },
];

// ── Step 1: Autenticazione Cognito ────────────────────────────────────────────

console.log(`\nAutenticazione Cognito per ${EMAIL}...`);

let idToken;
try {
  const authResult = JSON.parse(execSync(
    `aws cognito-idp initiate-auth \
      --auth-flow USER_PASSWORD_AUTH \
      --auth-parameters USERNAME="${EMAIL}",PASSWORD="${PASSWORD}" \
      --client-id ${COGNITO_CLIENT_ID} \
      --region ${REGION} \
      --output json`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  ));
  idToken = authResult.AuthenticationResult.IdToken;
  console.log('Autenticazione riuscita.\n');
} catch (err) {
  console.error('Autenticazione fallita:', err.stderr ?? err.message);
  process.exit(1);
}

// ── Step 2: Sistemi già censiti in piattaforma ────────────────────────────────

console.log('Recupero sistemi già censiti in piattaforma...');

let existingNames = new Set();
try {
  const res = await fetch(`${API_BASE}/api/systems`, {
    headers: { 'Authorization': `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const existing = await res.json();
  existingNames = new Set(
    (Array.isArray(existing) ? existing : [])
      .map(s => String(s.tool_name ?? '').trim().toLowerCase())
      .filter(Boolean)
  );
  console.log(`  Trovati ${existingNames.size} tool già censiti.\n`);
} catch (err) {
  console.warn(`  Impossibile recuperare i sistemi esistenti: ${err.message}`);
  console.warn('  Procedo comunque — i duplicati verranno rifiutati dall\'API (409).\n');
}

// ── Step 3: Selezione sistemi ─────────────────────────────────────────────────

function pick(bank, n, riskLabel, roleFilter, existing) {
  if (n === 0) return [];
  const filtered = roleFilter ? bank.filter(s => s.role === roleFilter) : bank;
  const label = roleFilter ? `${riskLabel} | ${roleFilter}` : riskLabel;
  const skipped = filtered.filter(s => existing.has(s.tool_name.trim().toLowerCase()));
  skipped.forEach(s => console.log(`  ⊘  SKIP  ${s.tool_name}  [${label}]  (già censito)`));
  const available = filtered.filter(s => !existing.has(s.tool_name.trim().toLowerCase()));
  if (n > available.length) {
    console.warn(`  Richiesti ${n} tool [${label}] ma solo ${available.length} non ancora censiti nella banca.`);
  }
  return available.slice(0, Math.min(n, available.length)).map(s => ({ ...s, _risk: riskLabel }));
}

const toCreate = [
  ...pick(HIGH_RISK,   N_HIGH,            'HIGH',   null,        existingNames),
  ...pick(HIGH_RISK,   N_HIGH_PROVIDER,   'HIGH',   'provider',  existingNames),
  ...pick(HIGH_RISK,   N_HIGH_DEPLOYER,   'HIGH',   'deployer',  existingNames),
  ...pick(MEDIUM_RISK, N_MEDIUM,          'MEDIUM', null,        existingNames),
  ...pick(MEDIUM_RISK, N_MEDIUM_PROVIDER, 'MEDIUM', 'provider',  existingNames),
  ...pick(MEDIUM_RISK, N_MEDIUM_DEPLOYER, 'MEDIUM', 'deployer',  existingNames),
  ...pick(LOW_RISK,    N_LOW,             'LOW',    null,        existingNames),
  ...pick(LOW_RISK,    N_LOW_PROVIDER,    'LOW',    'provider',  existingNames),
  ...pick(LOW_RISK,    N_LOW_DEPLOYER,    'LOW',    'deployer',  existingNames),
];

// dedup per sicurezza (se --high e --high-provider si sovrappongono sullo stesso tool)
const seen = new Set();
const toCreateDeduped = toCreate.filter(s => {
  const key = s.tool_name.trim().toLowerCase();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(`\nDa creare: ${toCreateDeduped.length}\n`);

if (toCreateDeduped.length === 0) {
  console.log('Tutti i tool selezionati sono già censiti in piattaforma. Nulla da fare.\n');
  process.exit(0);
}

// ── Step 4: Creazione sistemi ─────────────────────────────────────────────────

let ok = 0, fail = 0;

for (const sys of toCreateDeduped) {
  const { _risk, ...payload } = sys;
  const tag = `[${_risk} | ${sys.role}]`;
  try {
    const res = await fetch(`${API_BASE}/api/systems`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json();

    if (res.ok) {
      console.log(`[${++ok}/${toCreateDeduped.length}] OK    ${sys.tool_name}  ${tag}  — ID: ${body.system_id ?? '?'}`);
    } else if (res.status === 409) {
      console.warn(`       SKIP  ${sys.tool_name}  ${tag}  (409 — già censito)`);
    } else {
      console.error(`       FAIL  ${sys.tool_name}  ${tag}  HTTP ${res.status}: ${JSON.stringify(body)}`);
      fail++;
    }
  } catch (err) {
    console.error(`       ERROR ${sys.tool_name}  ${tag}  rete: ${err.message}`);
    fail++;
  }

  await new Promise(r => setTimeout(r, 300));
}

// ── riepilogo per rischio e ruolo ─────────────────────────────────────────────

const byGroup = {};
toCreateDeduped.forEach(s => {
  const key = `${s._risk} | ${s.role}`;
  byGroup[key] = (byGroup[key] || 0) + 1;
});

console.log(`\n${'─'.repeat(44)}`);
console.log(`Creati:   ${ok}`);
Object.entries(byGroup).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
if (existingNames.size > 0) console.log(`Già in piattaforma: ${existingNames.size}`);
if (fail > 0) console.log(`Falliti:  ${fail}`);
console.log(`${'─'.repeat(44)}\n`);
