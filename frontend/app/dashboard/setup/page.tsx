'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

// ─── Static data ──────────────────────────────────────────────────────────────

const LLM_LIST = [
  { id: 'chatgpt',    label: 'ChatGPT',    vendor: 'OpenAI' },
  { id: 'claude',     label: 'Claude',     vendor: 'Anthropic' },
  { id: 'gemini',     label: 'Gemini',     vendor: 'Google' },
  { id: 'copilot',    label: 'Copilot',    vendor: 'Microsoft' },
  { id: 'llama',      label: 'Llama',      vendor: 'Meta' },
  { id: 'mistral',    label: 'Mistral',    vendor: 'Mistral AI' },
  { id: 'perplexity', label: 'Perplexity', vendor: 'Perplexity AI' },
  { id: 'grok',       label: 'Grok',       vendor: 'xAI' },
];

const AI_CATS = [
  { v: 'hr',         l: 'HR & Recruiting' },
  { v: 'finance',    l: 'Finanza & Contabilità' },
  { v: 'marketing',  l: 'Marketing & Vendite' },
  { v: 'operations', l: 'Operations & Logistica' },
  { v: 'legal',      l: 'Legale & Compliance' },
  { v: 'tech',       l: 'Tecnico-IT & Sviluppo' },
  { v: 'healthcare', l: 'Sanità & Life Sciences' },
  { v: 'altro',      l: 'Altro' },
];

const DECISION_DOMAINS = [
  { v: 'hiring',               l: 'Assunzione, selezione, screening personale' },
  { v: 'performance_management', l: 'Valutazione prestazioni, promozioni' },
  { v: 'credit_scoring',       l: 'Valutazione creditizia, scoring finanziario' },
  { v: 'insurance',            l: 'Assicurazioni: underwriting, tariffazione' },
  { v: 'healthcare_diagnosis', l: 'Diagnosi medica, supporto clinico' },
  { v: 'education_assessment', l: 'Valutazione studenti, accesso istruzione' },
  { v: 'public_services',      l: 'Accesso servizi pubblici, sussidi' },
  { v: 'law_enforcement',      l: "Forze dell'ordine, biometria" },
  { v: 'content_moderation',   l: 'Moderazione contenuti' },
  { v: 'other_decisions',      l: 'Altre decisioni su persone fisiche' },
  { v: 'none',                 l: 'Nessuno — Non applicabile', isNone: true },
];

const DATA_TYPES = [
  { v: 'biometric',            l: 'Biometrici (volto, voce, impronte)' },
  { v: 'health',               l: 'Sanitari, cartelle cliniche' },
  { v: 'financial',            l: 'Finanziari, bancari, reddituali' },
  { v: 'behavioral',           l: 'Comportamentali, pattern di utilizzo' },
  { v: 'location',             l: 'Geolocalizzazione o movimenti' },
  { v: 'personal_identifiers', l: 'Identificatori personali (CF, email)' },
  { v: 'sensitive_categories', l: 'Categorie speciali GDPR (etnia, religione)' },
  { v: 'none',                 l: 'Nessun dato sensibile trattato', isNone: true },
];

const TARGET_USERS = [
  { v: 'internal_employees', l: 'Dipendenti Interni' },
  { v: 'clients_users',      l: 'Clienti / Utenti' },
  { v: 'third_parties',      l: 'Terze Parti (es. candidati)' },
];

const OUTPUT_TYPES = [
  { v: 'content_generation', l: 'Genera contenuto',       desc: 'Testo, codice, immagini, risposte automatiche' },
  { v: 'recommendation',     l: 'Raccomandazione',         desc: "Suggerisce opzioni — l'umano decide" },
  { v: 'scoring',            l: 'Scoring / classificazione', desc: 'Assegna punteggi, categorie o priorità a persone/oggetti' },
  { v: 'automated_decision', l: 'Decisione automatica',   desc: 'Output applicato direttamente senza revisione umana' },
];

const ACCESS_MODES = [
  { v: 'web_chat',   l: 'Interfaccia web / chat', desc: 'Es. ChatGPT.com, Claude.ai — uso diretto da browser' },
  { v: 'api',        l: 'API / integrazione',      desc: 'Chiamate programmatiche, embedding in altri software' },
  { v: 'plugin',     l: 'Plugin / add-on',         desc: 'Es. Copilot in Word, estensioni browser' },
  { v: 'integrated', l: 'Prodotto interno',        desc: 'Il sistema è parte di un tool aziendale proprietario' },
];

const CUSTOMIZATIONS = [
  { v: 'system_prompt', l: 'System prompt fissi',   desc: 'Istruzioni permanenti che condizionano il comportamento del modello' },
  { v: 'fine_tuning',   l: 'Fine-tuning',            desc: 'Modello ri-addestrato con dati aziendali propri' },
  { v: 'rag',           l: 'RAG / knowledge base',  desc: 'Il modello recupera documenti aziendali per arricchire le risposte' },
];

const VULNERABLE_GROUPS = [
  { v: 'minors',           l: 'Minori (under 18)' },
  { v: 'elderly',          l: 'Anziani' },
  { v: 'disabled',         l: 'Persone con disabilità' },
  { v: 'economic_hardship',l: 'Persone in difficoltà economica' },
  { v: 'emotional_distress',l: 'Persone in difficoltà emotiva / psicologica' },
  { v: 'none',             l: 'Nessuno — Non applicabile', isNone: true },
];

const ANNEX_III_OPTIONS = [
  { v: 'biometric_identification',    l: 'Identificazione biometrica remota',              cat: '1 — Biometria' },
  { v: 'biometric_categorization',    l: 'Categorizzazione biometrica',                    cat: '1 — Biometria' },
  { v: 'emotion_recognition',         l: 'Riconoscimento emozioni',                        cat: '1 — Biometria' },
  { v: 'critical_infrastructure',     l: 'Infrastruttura critica (energia, acqua, trasporti)', cat: '2 — Infrastruttura critica' },
  { v: 'education_admission',         l: 'Ammissione/accesso a percorsi formativi',        cat: '3 — Istruzione' },
  { v: 'education_assessment',        l: 'Valutazione studenti, esami, proctoring',        cat: '3 — Istruzione' },
  { v: 'recruitment',                 l: 'Assunzione e selezione personale',               cat: '4 — Occupazione/HR' },
  { v: 'work_performance',            l: 'Valutazione/promozione/cessazione lavoratori',   cat: '4 — Occupazione/HR' },
  { v: 'work_monitoring',             l: 'Monitoraggio lavoratori (task allocation)',       cat: '4 — Occupazione/HR' },
  { v: 'credit_scoring',              l: 'Valutazione merito creditizio',                  cat: '5 — Servizi essenziali' },
  { v: 'insurance_pricing',           l: 'Pricing assicurativo (vita / salute)',            cat: '5 — Servizi essenziali' },
  { v: 'public_services_eligibility', l: 'Accesso a servizi pubblici (benefici, sussidi)', cat: '5 — Servizi essenziali' },
  { v: 'emergency_dispatch',          l: 'Dispatch servizi di emergenza',                  cat: '5 — Servizi essenziali' },
  { v: 'law_enforcement_risk',        l: 'Valutazione rischio criminalità (contrasto)',    cat: '6 — Contrasto' },
  { v: 'criminal_investigation',      l: 'Indagini penali / profilazione criminale',       cat: '6 — Contrasto' },
  { v: 'migration_assessment',        l: 'Valutazione domande asilo / visto',              cat: '7 — Migrazione' },
  { v: 'border_control',              l: 'Controllo frontiere / lie detection',             cat: '7 — Migrazione' },
  { v: 'justice_administration',      l: 'Sistemi per amministrazione della giustizia',    cat: '8 — Giustizia' },
];

// ─── Default system state ─────────────────────────────────────────────────────

function emptySystem() {
  return {
    role:                      'deployer' as 'deployer' | 'provider',
    is_llm:                    false,
    llm_preset:                '',
    tool_name:                 '',
    vendor:                    '',
    category:                  'altro' as string,
    purpose:                   '',
    department:                '',
    headcount:                 '' as string | number,
    output_type:               '',
    access_mode:               '',
    customizations:            [] as string[],
    users_aware_of_ai:         false,
    target_users:              [] as string[],
    vulnerable_groups:         [] as string[],
    makes_automated_decisions: false,
    human_oversight_level:     'na' as string,
    decision_domains:          [] as string[],
    affects_vulnerable_groups: false,
    data_types:                [] as string[],
    annex_iii_domains:         [] as string[],
    is_safety_component:       false,
  };
}

type SystemState = ReturnType<typeof emptySystem>;

// ─── Wizard steps ─────────────────────────────────────────────────────────────

const STEPS = ['Sistema AI', 'Configurazione', 'Impatto', 'Note & Riepilogo'];

// ─── SetupContent ─────────────────────────────────────────────────────────────

function SetupContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const addMode      = searchParams.get('add') === '1';

  const [step, setStep]             = useState(1);
  const [sys, setSys]               = useState<SystemState>(emptySystem());
  const [contextNotes, setCtx]      = useState('');
  const [submitting, setSubmitting]  = useState(false);
  const [error, setError]           = useState('');
  const [stepError, setStepError]   = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    api.company.get().then((c) => {
      const co = c as { setup_completed?: boolean; name?: string };
      if (co.name) setCompanyName(co.name);
      if (!addMode && co.setup_completed) router.replace('/dashboard/inventory');
    }).catch(() => {});
  }, [router, addMode]);

  function update(field: string, value: unknown) {
    setSys(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'llm_preset' && value) {
        const llm = LLM_LIST.find(l => l.id === value);
        if (llm) { next.tool_name = llm.label; next.vendor = llm.vendor; next.category = 'llm'; next.is_llm = true; }
      }
      if (field === 'is_llm' && !value) next.llm_preset = '';
      // auto-fill vendor with company name when switching to provider
      if (field === 'role' && value === 'provider' && !prev.vendor.trim()) {
        next.vendor = companyName;
      }
      // clear auto-filled vendor when switching back to deployer
      if (field === 'role' && value === 'deployer' && prev.vendor === companyName) {
        next.vendor = '';
      }
      return next;
    });
  }

  function tog<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
  }

  function togExclusive(arr: string[], v: string): string[] {
    if (v === 'none') return arr.includes('none') ? [] : ['none'];
    const without = arr.filter(x => x !== 'none');
    return without.includes(v) ? without.filter(x => x !== v) : [...without, v];
  }

  function buildPayload() {
    return {
      tool_name:                 sys.tool_name.trim() || (sys.is_llm ? sys.llm_preset : 'Sistema AI'),
      vendor:                    sys.vendor.trim(),
      category:                  sys.category,
      role:                      sys.role,
      purpose:                   sys.purpose.trim() || 'Uso interno aziendale',
      target_users:              sys.target_users,
      makes_automated_decisions: sys.makes_automated_decisions,
      human_oversight_level:     sys.human_oversight_level,
      decision_domains:          sys.decision_domains.filter(v => v !== 'none'),
      affects_vulnerable_groups: sys.vulnerable_groups.some(v => v !== 'none'),
      data_types:                sys.data_types.filter(v => v !== 'none'),
      ...(sys.department?.trim()                   ? { department:          sys.department.trim() }          : {}),
      ...(sys.headcount && Number(sys.headcount) > 0 ? { headcount:         Number(sys.headcount) }           : {}),
      ...(sys.output_type                           ? { output_type:        sys.output_type }                 : {}),
      ...(sys.access_mode                           ? { access_mode:        sys.access_mode }                 : {}),
      ...(sys.vulnerable_groups.some(v => v !== 'none') ? { vulnerable_groups: sys.vulnerable_groups.filter(v => v !== 'none') } : {}),
      ...(sys.customizations.length > 0             ? { customizations:     sys.customizations }              : {}),
      ...(sys.annex_iii_domains.length > 0          ? { annex_iii_domains:  sys.annex_iii_domains }          : {}),
      ...(sys.is_safety_component                   ? { is_safety_component: sys.is_safety_component }       : {}),
    };
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      await api.systems.create(buildPayload());
      if (!addMode) {
        await api.company.setup({ ai_role: sys.role, context_notes: contextNotes });
      } else {
        await api.company.update({ setup_completed: true }).catch(() => {});
      }
      router.push('/dashboard/inventory');
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Errore durante il salvataggio.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Grouped Annex III ──────────────────────────────────────────────────────
  const annexGrouped = ANNEX_III_OPTIONS.reduce((acc, o) => {
    if (!acc[o.cat]) acc[o.cat] = [];
    acc[o.cat].push(o);
    return acc;
  }, {} as Record<string, typeof ANNEX_III_OPTIONS>);

  const canProceed1 = !!(sys.tool_name.trim() || (sys.is_llm && sys.llm_preset && sys.llm_preset !== 'other'))
    && !!sys.purpose.trim();

  function validateStep2(): string {
    if (!sys.output_type) return 'Seleziona il tipo di output prodotto dal sistema.';
    if (sys.role === 'deployer' && !sys.access_mode) return 'Seleziona la modalità di accesso al sistema.';
    if (sys.vulnerable_groups.length === 0) return 'Indica i soggetti vulnerabili coinvolti, oppure seleziona "Nessuno — Non applicabile".';
    return '';
  }

  function validateStep3(): string {
    if (sys.data_types.length === 0) return 'Indica le tipologie di dati trattati, oppure seleziona "Nessun dato sensibile trattato".';
    return '';
  }

  return (
    <div className="setup-page">

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      <div className="setup-header">
        <div className="setup-steps">
          {STEPS.map((name, i) => (
            <div key={i} className={`setup-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
              <div className="setup-step-dot">{step > i + 1 ? '✓' : i + 1}</div>
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="setup-body">

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1 — Sistema AI
        ══════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <>
            <div className="panel-head">
              <h2>{addMode ? 'Aggiungi Sistema AI' : 'Primo Sistema AI'}</h2>
              <p>Censisci un sistema AI alla volta. Potrai aggiungerne altri in seguito dall&apos;Inventory.</p>
            </div>

            {/* Role */}
            <div className="fcard">
              <h3>Qual è il tuo ruolo rispetto a questo sistema?</h3>
              <div className="check-cards">
                <label className="check-card">
                  <input type="radio" name="role" checked={sys.role === 'deployer'} onChange={() => update('role', 'deployer')} />
                  <div>
                    <div className="cc-title">🏢 Deployer — Utilizzatore</div>
                    <div className="cc-desc">Usi un sistema AI di terzi nella tua organizzazione: API, SaaS, LLM, software specializzato</div>
                  </div>
                </label>
                <label className="check-card">
                  <input type="radio" name="role" checked={sys.role === 'provider'} onChange={() => update('role', 'provider')} />
                  <div>
                    <div className="cc-title">🔧 Provider — Fornitore</div>
                    <div className="cc-desc">Sviluppi e commercializzi questo sistema AI con il tuo marchio verso clienti o utenti</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Deployer: LLM quick-pick */}
            {sys.role === 'deployer' && (
              <div className="fcard">
                <h3>È un LLM / AI Generativa?</h3>
                <div className="check-cards" style={{ marginBottom: 16 }}>
                  <label className="check-card">
                    <input type="checkbox" checked={sys.is_llm} onChange={e => update('is_llm', e.target.checked)} />
                    <div>
                      <div className="cc-title">Sì, è un modello LLM / AI Generativa</div>
                      <div className="cc-desc">ChatGPT, Claude, Gemini, Copilot, Llama e simili</div>
                    </div>
                  </label>
                </div>
                {sys.is_llm && (
                  <>
                    <div className="dec-sub" style={{ marginBottom: 10 }}>Seleziona il modello</div>
                    <div className="llm-grid">
                      {LLM_LIST.map(llm => (
                        <button key={llm.id} type="button"
                          className={`llm-chip ${sys.llm_preset === llm.id ? 'sel' : ''}`}
                          onClick={() => update('llm_preset', llm.id)}>
                          <span className="llm-chip-name">{llm.label}</span>
                          {llm.vendor && <span className="llm-chip-vendor">{llm.vendor}</span>}
                        </button>
                      ))}
                      <button type="button"
                        className={`llm-chip ${sys.llm_preset === 'other' ? 'sel' : ''}`}
                        onClick={() => update('llm_preset', 'other')}>
                        <span className="llm-chip-name">Altro LLM</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Identity */}
            <div className="fcard">
              <h3>Identità del Sistema</h3>
              <div className="field-row">
                <div className="field">
                  <label>Nome Sistema *</label>
                  <input type="text" value={sys.tool_name}
                    placeholder={sys.is_llm ? 'Es. ChatGPT Aziendale, Claude API…' : 'Es. HireVue, Salesforce Einstein…'}
                    onChange={e => update('tool_name', e.target.value)} />
                </div>
                <div className="field">
                  <label>Vendor / Fornitore</label>
                  <input type="text" value={sys.vendor}
                    placeholder="Es. OpenAI, HireVue Inc…"
                    onChange={e => update('vendor', e.target.value)} />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Categoria funzionale</label>
                  <select value={sys.category} onChange={e => update('category', e.target.value)}>
                    {sys.is_llm && <option value="llm">LLM / AI Generativa</option>}
                    {AI_CATS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Come lo usi? Per quali processi? *</label>
                <textarea rows={3} value={sys.purpose}
                  placeholder="Descrivi l'uso: chi lo usa, per quali attività, che tipo di decisioni supporta…"
                  onChange={e => update('purpose', e.target.value)} />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Dipartimento <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>(AI Literacy — Art. 4)</span></label>
                  <input type="text" value={sys.department}
                    placeholder="Es. HR, Marketing, Finance, Operations…"
                    onChange={e => update('department', e.target.value)} />
                </div>
                <div className="field" style={{ maxWidth: 180 }}>
                  <label>N° persone nel dipartimento</label>
                  <input type="number" min={1} value={sys.headcount}
                    placeholder="Es. 12"
                    onChange={e => update('headcount', e.target.value ? parseInt(e.target.value, 10) : '')} />
                </div>
              </div>
            </div>

            <div className="setup-nav">
              {!canProceed1 && (sys.tool_name.trim() || (sys.is_llm && sys.llm_preset)) && !sys.purpose.trim() && (
                <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 500 }}>Descrivi come usi il sistema per continuare.</div>
              )}
              <button className="btn-next" onClick={() => { setStepError(''); setStep(2); }} disabled={!canProceed1}>
                Avanti →
              </button>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2 — Configurazione (role-conditional)
        ══════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <>
            <div className="panel-head">
              <h2>Configurazione</h2>
              <p>{sys.role === 'provider'
                ? 'Definisci le caratteristiche tecniche e normative del sistema che sviluppi.'
                : 'Descrivi come usi il sistema nella tua organizzazione e chi coinvolge.'}</p>
            </div>

            {/* Output type — entrambi i ruoli */}
            <div className="fcard">
              <h3>Tipo di Output prodotto dal sistema</h3>
              <div className="radio-grid">
                {OUTPUT_TYPES.map(o => (
                  <label key={o.v} className="radio-card">
                    <input type="radio" checked={sys.output_type === o.v} onChange={() => update('output_type', o.v)} />
                    <div className="rc-row"><div className="rc-title">{o.l}</div><div className="rc-dot"></div></div>
                    <div className="rc-desc">{o.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* Deployer: accesso + personalizzazioni */}
            {sys.role === 'deployer' && (
              <>
                <div className="fcard">
                  <h3>Modalità di Accesso al Sistema</h3>
                  <div className="radio-grid">
                    {ACCESS_MODES.map(a => (
                      <label key={a.v} className="radio-card">
                        <input type="radio" checked={sys.access_mode === a.v} onChange={() => update('access_mode', a.v)} />
                        <div className="rc-row"><div className="rc-title">{a.l}</div><div className="rc-dot"></div></div>
                        <div className="rc-desc">{a.desc}</div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="fcard">
                  <h3>Personalizzazioni applicate</h3>
                  <div className="check-cards">
                    {CUSTOMIZATIONS.map(c => (
                      <label key={c.v} className="check-card">
                        <input type="checkbox" checked={sys.customizations.includes(c.v)}
                          onChange={e => update('customizations', e.target.checked
                            ? [...sys.customizations, c.v]
                            : sys.customizations.filter(x => x !== c.v))} />
                        <div><div className="cc-title">{c.l}</div><div className="cc-desc">{c.desc}</div></div>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Provider: Allegato III + safety component */}
            {sys.role === 'provider' && (
              <div className="fcard">
                <h3>Classificazione AI Act — Alto Rischio</h3>

                <div className="dec-sub">Componente di sicurezza (Art. 6 §1)</div>
                <div className="check-cards" style={{ marginBottom: 20 }}>
                  <label className="check-card">
                    <input type="checkbox" checked={sys.is_safety_component}
                      onChange={e => update('is_safety_component', e.target.checked)} />
                    <div>
                      <div className="cc-title">Componente di sicurezza in prodotto regolamentato</div>
                      <div className="cc-desc">Integrato in dispositivi medici, macchinari industriali, veicoli, aviazione, ecc.</div>
                    </div>
                  </label>
                </div>

                <div className="dec-sub">Categorie Allegato III (Art. 6 §2)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                  {Object.entries(annexGrouped).map(([cat, opts]) => (
                    <div key={cat}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Cat. {cat}
                      </div>
                      <div className="check-list cl-2col">
                        {opts.map(o => (
                          <label key={o.v} className="check-row">
                            <input type="checkbox"
                              checked={sys.annex_iii_domains.includes(o.v)}
                              onChange={() => update('annex_iii_domains', tog(sys.annex_iii_domains, o.v))} />
                            <span>{o.l}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Entrambi: persone coinvolte */}
            <div className="fcard">
              <h3>Persone &amp; Trasparenza</h3>

              <div className="dec-sub">Chi è coinvolto / impattato da questo sistema?</div>
              <div className="check-list" style={{ marginBottom: 16 }}>
                {TARGET_USERS.map(u => (
                  <label key={u.v} className="check-row">
                    <input type="checkbox" checked={sys.target_users.includes(u.v)}
                      onChange={() => update('target_users', tog(sys.target_users, u.v))} />
                    <span>{u.l}</span>
                  </label>
                ))}
              </div>

              <div className="dec-sub">Soggetti vulnerabili coinvolti <span style={{ color: 'var(--red, #EF4444)', fontSize: 11 }}>*</span></div>
              <div className="check-list cl-2col" style={{ marginBottom: 16 }}>
                {VULNERABLE_GROUPS.map(g => (
                  <label key={g.v} className="check-row" style={g.isNone ? { borderTop: '1px solid rgba(255,255,255,.07)', marginTop: 6, paddingTop: 6 } : undefined}>
                    <input type="checkbox" checked={sys.vulnerable_groups.includes(g.v)}
                      onChange={() => update('vulnerable_groups', togExclusive(sys.vulnerable_groups, g.v))} />
                    <span style={g.isNone ? { color: 'var(--muted)', fontStyle: 'italic' } : undefined}>{g.l}</span>
                  </label>
                ))}
              </div>

              <div className="check-cards">
                <label className="check-card">
                  <input type="checkbox" checked={sys.users_aware_of_ai}
                    onChange={e => update('users_aware_of_ai', e.target.checked)} />
                  <div>
                    <div className="cc-title">Gli utenti sono informati che interagiscono con un sistema AI</div>
                    <div className="cc-desc">Obbligo di trasparenza — Art. 50 AI Act</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="setup-nav">
              <button className="btn-back" onClick={() => { setStepError(''); setStep(1); }}>← Indietro</button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                {stepError && <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 500, textAlign: 'right', maxWidth: 320 }}>{stepError}</div>}
                <button className="btn-next" onClick={() => {
                  const err = validateStep2();
                  if (err) { setStepError(err); return; }
                  setStepError('');
                  setStep(3);
                }}>Avanti →</button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 3 — Impatto Decisionale
        ══════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <>
            <div className="panel-head">
              <h2>Impatto Decisionale</h2>
              <p>Queste informazioni alimentano il motore AI per calcolare l&apos;esposizione sanzionatoria e identificare i gap normativi rilevanti.</p>
            </div>

            <div className="fcard">
              <h3>Decisioni su Persone Fisiche</h3>
              <div className="check-cards">
                <label className="check-card">
                  <input type="checkbox" checked={sys.makes_automated_decisions}
                    onChange={e => update('makes_automated_decisions', e.target.checked)} />
                  <div>
                    <div className="cc-title">Produce decisioni o raccomandazioni che impattano persone fisiche</div>
                    <div className="cc-desc">Assunzione, credito, diagnosi, valutazioni, accesso a servizi</div>
                  </div>
                </label>
              </div>

              <div className="dec-sub" style={{ marginTop: 20 }}>Supervisione Umana (Human-in-the-Loop)</div>
              <div className="radio-grid">
                {(['always', 'sometimes', 'never', 'na'] as const).map(v => (
                  <label key={v} className="radio-card">
                    <input type="radio" checked={sys.human_oversight_level === v} onChange={() => update('human_oversight_level', v)} />
                    <div className="rc-row">
                      <div className="rc-title">
                        {v === 'always' ? 'Sempre presente' : v === 'sometimes' ? 'In alcuni casi' : v === 'never' ? 'Mai — Full Auto' : 'Non applicabile'}
                      </div>
                      <div className="rc-dot"></div>
                    </div>
                    <div className="rc-desc">
                      {v === 'always' ? 'Ogni output revisionato prima di produrre effetti' : v === 'sometimes' ? 'Solo per casi ad alto rischio o edge case' : v === 'never' ? 'Il sistema decide autonomamente senza intervento umano' : 'Non produce decisioni su persone fisiche'}
                    </div>
                  </label>
                ))}
              </div>

              <div className="dec-sub" style={{ marginTop: 20 }}>Ambiti di Decisione</div>
              <div className="check-list cl-2col">
                {DECISION_DOMAINS.map(d => (
                  <label key={d.v} className="check-row" style={d.isNone ? { borderTop: '1px solid rgba(255,255,255,.07)', marginTop: 6, paddingTop: 6 } : undefined}>
                    <input type="checkbox" checked={sys.decision_domains.includes(d.v)}
                      onChange={() => update('decision_domains', togExclusive(sys.decision_domains, d.v))} />
                    <span style={d.isNone ? { color: 'var(--muted)', fontStyle: 'italic' } : undefined}>{d.l}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="fcard">
              <h3>Tipologie di Dati Trattati <span style={{ color: '#EF4444', fontSize: 12 }}>*</span></h3>
              <div className="check-list cl-2col">
                {DATA_TYPES.map(d => (
                  <label key={d.v} className="check-row" style={d.isNone ? { borderTop: '1px solid rgba(255,255,255,.07)', marginTop: 6, paddingTop: 6 } : undefined}>
                    <input type="checkbox" checked={sys.data_types.includes(d.v)}
                      onChange={() => update('data_types', togExclusive(sys.data_types, d.v))} />
                    <span style={d.isNone ? { color: 'var(--muted)', fontStyle: 'italic' } : undefined}>{d.l}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="setup-nav">
              <button className="btn-back" onClick={() => { setStepError(''); setStep(2); }}>← Indietro</button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                {stepError && <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 500, textAlign: 'right', maxWidth: 320 }}>{stepError}</div>}
                <button className="btn-next" onClick={() => {
                  const err = validateStep3();
                  if (err) { setStepError(err); return; }
                  setStepError('');
                  setStep(4);
                }}>Avanti →</button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 4 — Note di Contesto + Riepilogo
        ══════════════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <>
            <div className="panel-head">
              <h2>Note &amp; Riepilogo</h2>
              <p>Aggiungi contesto specifico opzionale, poi verifica i dati prima di aggiungere il sistema all&apos;Inventory.</p>
            </div>

            {/* Context notes */}
            <div className="fcard">
              <div className="hint">
                <span className="hint-icon">🎯</span>
                <span>Più dettagli fornisci qui, più precisa sarà l&apos;analisi di compliance — settore, processo specifico, vincoli normativi particolari, modalità d&apos;uso.</span>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Note di Contesto — Opzionale</label>
                <textarea rows={4} value={contextNotes}
                  onChange={e => setCtx(e.target.value)}
                  placeholder="Es: Usiamo HireVue per lo screening iniziale dei candidati nel settore bancario. L'output determina chi riceve un colloquio fisico. Vengono analizzati video e pattern vocali…" />
              </div>
            </div>

            {/* Compliance disclaimer */}
            <div style={{
              margin: '0 0 16px',
              padding: '16px 20px',
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 14,
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
            }}>
              <div style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>🛡️</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(34,197,94,0.9)', marginBottom: 6 }}>
                  La valutazione di compliance è uno step separato
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                  Dopo aver aggiunto il sistema all&apos;Inventory, puoi avviare un{' '}
                  <strong style={{ color: 'var(--text2)' }}>Compliance Check automatico</strong>{' '}
                  che analizza il passaporto rispetto agli articoli dell&apos;AI Act (Reg. UE 2024/1689).
                  I gap normativi identificati potranno essere{' '}
                  <strong style={{ color: 'var(--text2)' }}>verificati e marcati come conformi</strong>{' '}
                  direttamente dalla piattaforma man mano che adotti le misure correttive — senza dover ripetere il censimento.
                </div>
              </div>
            </div>

            {/* Review */}
            <div className="fcard">
              <h3>Riepilogo</h3>
              <div className="rev-row">
                <span className="rk">Sistema</span>
                <span className="rv">{sys.tool_name || sys.llm_preset || '—'}</span>
              </div>
              {sys.vendor && (
                <div className="rev-row">
                  <span className="rk">Vendor</span>
                  <span className="rv">{sys.vendor}</span>
                </div>
              )}
              <div className="rev-row">
                <span className="rk">Ruolo</span>
                <span className="rv">{sys.role === 'provider' ? '🔧 Provider (Fornitore)' : '🏢 Deployer (Utilizzatore)'}</span>
              </div>
              <div className="rev-row">
                <span className="rk">Categoria</span>
                <span className="rv">{AI_CATS.find(c => c.v === sys.category)?.l ?? sys.category}</span>
              </div>
              {sys.output_type && (
                <div className="rev-row">
                  <span className="rk">Output</span>
                  <span className="rv">{OUTPUT_TYPES.find(o => o.v === sys.output_type)?.l ?? sys.output_type}</span>
                </div>
              )}
              {sys.department && (
                <div className="rev-row">
                  <span className="rk">Dipartimento</span>
                  <span className="rv">{sys.department}</span>
                </div>
              )}
              <div className="rev-row">
                <span className="rk">Decisioni su persone</span>
                <span className="rv">{sys.makes_automated_decisions ? '✓ Sì' : 'No'}</span>
              </div>
              <div className="rev-row">
                <span className="rk">Supervisione umana</span>
                <span className="rv">
                  {sys.human_oversight_level === 'always' ? 'Sempre presente'
                    : sys.human_oversight_level === 'sometimes' ? 'In alcuni casi'
                    : sys.human_oversight_level === 'never' ? 'Mai — Full Auto'
                    : 'Non applicabile'}
                </span>
              </div>
              {sys.data_types.length > 0 && (
                <div className="rev-row">
                  <span className="rk">Dati trattati</span>
                  <span className="rv">{sys.data_types.length} categorie selezionate</span>
                </div>
              )}
              {sys.annex_iii_domains.length > 0 && (
                <div className="rev-row">
                  <span className="rk">Allegato III</span>
                  <span className="rv" style={{ color: '#EF4444' }}>{sys.annex_iii_domains.length} categorie alto rischio</span>
                </div>
              )}
            </div>

            {error && <div className="alert-err show">{error}</div>}
            <div className="setup-nav">
              <button className="btn-back" onClick={() => { setStepError(''); setStep(3); }}>← Indietro</button>
              <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Salvataggio…' : '✓ Aggiungi all\'Inventory →'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="db-loading"><div className="spin"></div></div>}>
      <SetupContent />
    </Suspense>
  );
}
