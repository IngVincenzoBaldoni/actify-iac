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
  { v: 'hr', l: 'HR & Recruiting' },
  { v: 'finance', l: 'Finanza & Contabilità' },
  { v: 'marketing', l: 'Marketing & Vendite' },
  { v: 'operations', l: 'Operations & Logistica' },
  { v: 'legal', l: 'Legale & Compliance' },
  { v: 'tech', l: 'Tecnico-IT & Sviluppo' },
  { v: 'healthcare', l: 'Sanità & Life Sciences' },
  { v: 'altro', l: 'Altro' },
];

const DECISION_DOMAINS = [
  { v: 'hiring', l: 'Assunzione, selezione, screening personale' },
  { v: 'performance_management', l: 'Valutazione prestazioni, promozioni' },
  { v: 'credit_scoring', l: 'Valutazione creditizia, scoring finanziario' },
  { v: 'insurance', l: 'Assicurazioni: underwriting, tariffazione' },
  { v: 'healthcare_diagnosis', l: 'Diagnosi medica, supporto clinico' },
  { v: 'education_assessment', l: 'Valutazione studenti, accesso istruzione' },
  { v: 'public_services', l: 'Accesso servizi pubblici, sussidi' },
  { v: 'law_enforcement', l: 'Forze dell\'ordine, biometria' },
  { v: 'content_moderation', l: 'Moderazione contenuti' },
  { v: 'other_decisions', l: 'Altre decisioni su persone fisiche' },
];

const DATA_TYPES = [
  { v: 'biometric', l: 'Biometrici (volto, voce, impronte)' },
  { v: 'health', l: 'Sanitari, cartelle cliniche' },
  { v: 'financial', l: 'Finanziari, bancari, reddituali' },
  { v: 'behavioral', l: 'Comportamentali, pattern di utilizzo' },
  { v: 'location', l: 'Geolocalizzazione o movimenti' },
  { v: 'personal_identifiers', l: 'Identificatori personali (CF, email)' },
  { v: 'sensitive_categories', l: 'Categorie speciali GDPR (etnia, religione)' },
];

const TARGET_USERS = [
  { v: 'internal_employees', l: 'Dipendenti Interni' },
  { v: 'clients_users', l: 'Clienti / Utenti' },
  { v: 'third_parties', l: 'Terze Parti (es. candidati)' },
];

const OUTPUT_TYPES = [
  { v: 'content_generation', l: 'Genera contenuto', desc: 'Testo, codice, immagini, risposte automatiche' },
  { v: 'recommendation', l: 'Raccomandazione', desc: 'Suggerisce opzioni — l\'umano decide' },
  { v: 'scoring', l: 'Scoring / classificazione', desc: 'Assegna punteggi, categorie o priorità a persone/oggetti' },
  { v: 'automated_decision', l: 'Decisione automatica', desc: 'Output applicato direttamente senza revisione umana' },
];

const ACCESS_MODES = [
  { v: 'web_chat', l: 'Interfaccia web / chat', desc: 'Es. ChatGPT.com, Claude.ai — uso diretto da browser' },
  { v: 'api', l: 'API / integrazione', desc: 'Chiamate programmatiche, embedding in altri software' },
  { v: 'plugin', l: 'Plugin / add-on', desc: 'Es. Copilot in Word, estensioni browser' },
  { v: 'integrated', l: 'Prodotto interno', desc: 'Il sistema è parte di un tool aziendale proprietario' },
];

const CUSTOMIZATIONS = [
  { v: 'system_prompt', l: 'System prompt fissi', desc: 'Istruzioni permanenti che condizionano il comportamento del modello' },
  { v: 'fine_tuning', l: 'Fine-tuning', desc: 'Modello ri-addestrato con dati aziendali propri' },
  { v: 'rag', l: 'RAG / knowledge base', desc: 'Il modello recupera documenti aziendali per arricchire le risposte' },
];

const VULNERABLE_GROUPS = [
  { v: 'minors', l: 'Minori (under 18)' },
  { v: 'elderly', l: 'Anziani' },
  { v: 'disabled', l: 'Persone con disabilità' },
  { v: 'economic_hardship', l: 'Persone in difficoltà economica' },
  { v: 'emotional_distress', l: 'Persone in difficoltà emotiva / psicologica' },
];

const ANNEX_III_OPTIONS = [
  { v: 'biometric_identification',    l: 'Identificazione biometrica remota',    cat: '1 — Biometria' },
  { v: 'biometric_categorization',    l: 'Categorizzazione biometrica',           cat: '1 — Biometria' },
  { v: 'emotion_recognition',         l: 'Riconoscimento emozioni',               cat: '1 — Biometria' },
  { v: 'critical_infrastructure',     l: 'Infrastruttura critica (energia, acqua, trasporti)', cat: '2 — Infrastruttura critica' },
  { v: 'education_admission',         l: 'Ammissione/accesso a percorsi formativi', cat: '3 — Istruzione' },
  { v: 'education_assessment',        l: 'Valutazione studenti, esami, proctoring', cat: '3 — Istruzione' },
  { v: 'recruitment',                 l: 'Assunzione e selezione personale',        cat: '4 — Occupazione/HR' },
  { v: 'work_performance',            l: 'Valutazione/promozione/cessazione lavoratori', cat: '4 — Occupazione/HR' },
  { v: 'work_monitoring',             l: 'Monitoraggio lavoratori (task allocation)', cat: '4 — Occupazione/HR' },
  { v: 'credit_scoring',              l: 'Valutazione merito creditizio',            cat: '5 — Servizi essenziali' },
  { v: 'insurance_pricing',           l: 'Pricing assicurativo (vita / salute)',     cat: '5 — Servizi essenziali' },
  { v: 'public_services_eligibility', l: 'Accesso a servizi pubblici (benefici, sussidi)', cat: '5 — Servizi essenziali' },
  { v: 'emergency_dispatch',          l: 'Dispatch servizi di emergenza',            cat: '5 — Servizi essenziali' },
  { v: 'law_enforcement_risk',        l: 'Valutazione rischio criminalità (contrasto)', cat: '6 — Contrasto' },
  { v: 'criminal_investigation',      l: 'Indagini penali / profilazione criminale',    cat: '6 — Contrasto' },
  { v: 'migration_assessment',        l: 'Valutazione domande asilo / visto',         cat: '7 — Migrazione' },
  { v: 'border_control',              l: 'Controllo frontiere / lie detection',        cat: '7 — Migrazione' },
  { v: 'justice_administration',      l: 'Sistemi per amministrazione della giustizia', cat: '8 — Giustizia' },
];

// ─── Default system state ─────────────────────────────────────────────────────

function emptySystem() {
  return {
    role: 'deployer' as 'deployer' | 'provider',
    is_llm: false,
    llm_preset: '',
    tool_name: '',
    vendor: '',
    category: 'altro' as string,
    purpose: '',
    department: '',
    headcount: '' as string | number,
    output_type: '',
    access_mode: '',
    customizations: [] as string[],
    users_aware_of_ai: false,
    target_users: [] as string[],
    vulnerable_groups: [] as string[],
    makes_automated_decisions: false,
    human_oversight_level: 'na' as string,
    decision_domains: [] as string[],
    affects_vulnerable_groups: false,
    data_types: [] as string[],
    annex_iii_domains: [] as string[],
    is_safety_component: false,
  };
}

type SystemState = ReturnType<typeof emptySystem>;

// ─── SystemFields component ───────────────────────────────────────────────────

function SystemFields({ item, onChange }: {
  item: SystemState;
  onChange: (field: string, value: unknown) => void;
}) {
  function tog<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
  }

  return (
    <div className="dec-section">
      <div className="dec-title">Configurazione &amp; Accesso</div>
      <div className="dec-sub">Tipo di Output</div>
      <div className="radio-grid">
        {OUTPUT_TYPES.map(o => (
          <label key={o.v} className="radio-card">
            <input type="radio" checked={item.output_type === o.v} onChange={() => onChange('output_type', o.v)} />
            <div className="rc-row"><div className="rc-title">{o.l}</div><div className="rc-dot"></div></div>
            <div className="rc-desc">{o.desc}</div>
          </label>
        ))}
      </div>

      <div className="dec-sub">Modalità di Accesso</div>
      <div className="radio-grid">
        {ACCESS_MODES.map(a => (
          <label key={a.v} className="radio-card">
            <input type="radio" checked={item.access_mode === a.v} onChange={() => onChange('access_mode', a.v)} />
            <div className="rc-row"><div className="rc-title">{a.l}</div><div className="rc-dot"></div></div>
            <div className="rc-desc">{a.desc}</div>
          </label>
        ))}
      </div>

      <div className="dec-sub">Personalizzazioni</div>
      <div className="check-cards">
        {CUSTOMIZATIONS.map(c => (
          <label key={c.v} className="check-card">
            <input type="checkbox" checked={item.customizations.includes(c.v)}
              onChange={e => onChange('customizations', e.target.checked ? [...item.customizations, c.v] : item.customizations.filter(x => x !== c.v))} />
            <div><div className="cc-title">{c.l}</div><div className="cc-desc">{c.desc}</div></div>
          </label>
        ))}
      </div>

      <div className="dec-title">Persone &amp; Trasparenza</div>
      <div className="dec-sub">Utenti Target</div>
      <div className="check-list">
        {TARGET_USERS.map(u => (
          <label key={u.v} className="check-row">
            <input type="checkbox" checked={item.target_users.includes(u.v)}
              onChange={() => onChange('target_users', tog(item.target_users, u.v))} />
            <span>{u.l}</span>
          </label>
        ))}
      </div>

      <div className="dec-sub">Soggetti Vulnerabili Coinvolti</div>
      <div className="check-list cl-2col">
        {VULNERABLE_GROUPS.map(g => (
          <label key={g.v} className="check-row">
            <input type="checkbox" checked={item.vulnerable_groups.includes(g.v)}
              onChange={() => onChange('vulnerable_groups', tog(item.vulnerable_groups, g.v))} />
            <span>{g.l}</span>
          </label>
        ))}
      </div>

      <div className="check-cards" style={{ marginTop: 10 }}>
        <label className="check-card">
          <input type="checkbox" checked={item.users_aware_of_ai}
            onChange={e => onChange('users_aware_of_ai', e.target.checked)} />
          <div>
            <div className="cc-title">Gli utenti sono informati che stanno interagendo con un sistema AI</div>
            <div className="cc-desc">Obbligo di trasparenza — Art. 50 AI Act</div>
          </div>
        </label>
      </div>

      <div className="dec-title">Impatto Decisionale</div>
      <div className="check-cards">
        <label className="check-card">
          <input type="checkbox" checked={item.makes_automated_decisions}
            onChange={e => onChange('makes_automated_decisions', e.target.checked)} />
          <div>
            <div className="cc-title">Produce decisioni o raccomandazioni che impattano persone fisiche</div>
            <div className="cc-desc">Assunzione, credito, diagnosi, valutazioni, accesso a servizi</div>
          </div>
        </label>
      </div>

      <div className="dec-sub">Supervisione Umana (Human-in-the-Loop)</div>
      <div className="radio-grid">
        {(['always', 'sometimes', 'never', 'na'] as const).map(v => (
          <label key={v} className="radio-card">
            <input type="radio" checked={item.human_oversight_level === v} onChange={() => onChange('human_oversight_level', v)} />
            <div className="rc-row">
              <div className="rc-title">{v === 'always' ? 'Sempre presente' : v === 'sometimes' ? 'In alcuni casi' : v === 'never' ? 'Mai — Full Auto' : 'Non applicabile'}</div>
              <div className="rc-dot"></div>
            </div>
            <div className="rc-desc">{v === 'always' ? 'Ogni output revisionato prima di produrre effetti' : v === 'sometimes' ? 'Solo per casi ad alto rischio' : v === 'never' ? 'Decide autonomamente senza intervento umano' : 'Non produce decisioni su persone fisiche'}</div>
          </label>
        ))}
      </div>

      <div className="dec-sub">Ambiti di Decisione</div>
      <div className="check-list cl-2col">
        {DECISION_DOMAINS.map(d => (
          <label key={d.v} className="check-row">
            <input type="checkbox" checked={item.decision_domains.includes(d.v)}
              onChange={() => onChange('decision_domains', tog(item.decision_domains, d.v))} />
            <span>{d.l}</span>
          </label>
        ))}
      </div>

      <div className="dec-title">Classificazione AI Act — Alto Rischio</div>

      <div className="dec-sub">Componente di sicurezza (Art. 6 §1)</div>
      <div className="check-cards">
        <label className="check-card">
          <input type="checkbox" checked={item.is_safety_component}
            onChange={e => onChange('is_safety_component', e.target.checked)} />
          <div>
            <div className="cc-title">Componente di sicurezza in prodotto regolamentato</div>
            <div className="cc-desc">Il sistema è integrato in un prodotto soggetto a normativa UE di armonizzazione (dispositivo medico, macchinario, veicolo, aviazione, ecc.)</div>
          </div>
        </label>
      </div>

      <div className="dec-sub">Categorie Allegato III (Art. 6 §2)</div>
      {(() => {
        const grouped = ANNEX_III_OPTIONS.reduce((acc, o) => {
          if (!acc[o.cat]) acc[o.cat] = [];
          acc[o.cat].push(o);
          return acc;
        }, {} as Record<string, typeof ANNEX_III_OPTIONS>);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(grouped).map(([cat, opts]) => (
              <div key={cat}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Cat. {cat}
                </div>
                <div className="check-list cl-2col">
                  {opts.map(o => (
                    <label key={o.v} className="check-row">
                      <input type="checkbox"
                        checked={item.annex_iii_domains.includes(o.v)}
                        onChange={() => onChange('annex_iii_domains', tog(item.annex_iii_domains, o.v))} />
                      <span>{o.l}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="dec-title">Dati Trattati</div>
      <div className="check-list cl-2col">
        {DATA_TYPES.map(d => (
          <label key={d.v} className="check-row">
            <input type="checkbox" checked={item.data_types.includes(d.v)}
              onChange={() => onChange('data_types', tog(item.data_types, d.v))} />
            <span>{d.l}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addMode = searchParams.get('add') === '1';

  // add mode: 1 step only; initial setup: 3 steps
  const [step, setStep] = useState(1);

  const [sys, setSys] = useState<SystemState>(emptySystem());

  // Step 2: governance (initial setup only)
  const [governance, setGov] = useState({
    has_dpo: false, dpo_status: 'none' as 'inhouse' | 'service' | 'none',
    has_ai_inventory: false, has_impact_assessment: false,
    has_human_oversight: false, has_incident_procedure: false,
    has_ai_policy: false, has_training: false,
  });

  // Step 3: notes (initial setup only)
  const [contextNotes, setContextNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (addMode) return;
    api.company.get().then((c) => {
      if ((c as { setup_completed?: boolean }).setup_completed) router.replace('/dashboard/inventory');
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
      return next;
    });
  }

  function buildSystemPayload() {
    return {
      tool_name:                 sys.tool_name.trim() || (sys.is_llm ? sys.llm_preset : 'Sistema AI'),
      vendor:                    sys.vendor.trim(),
      category:                  sys.category,
      role:                      sys.role,
      purpose:                   sys.purpose.trim() || 'Uso interno aziendale',
      target_users:              sys.target_users,
      makes_automated_decisions: sys.makes_automated_decisions,
      human_oversight_level:     sys.human_oversight_level,
      decision_domains:          sys.decision_domains,
      affects_vulnerable_groups: sys.vulnerable_groups.length > 0,
      data_types:                sys.data_types,
      ...(sys.department?.trim() ? { department: sys.department.trim() } : {}),
      ...(sys.headcount && Number(sys.headcount) > 0 ? { headcount: Number(sys.headcount) } : {}),
      ...(sys.output_type  ? { output_type: sys.output_type }           : {}),
      ...(sys.vulnerable_groups.length > 0 ? { vulnerable_groups: sys.vulnerable_groups } : {}),
      ...(sys.customizations.length > 0    ? { customizations: sys.customizations }        : {}),
      ...(sys.annex_iii_domains.length > 0 ? { annex_iii_domains: sys.annex_iii_domains } : {}),
      ...(sys.is_safety_component           ? { is_safety_component: sys.is_safety_component } : {}),
    };
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      await api.systems.create(buildSystemPayload());
      if (!addMode) {
        await api.company.setup({ ai_role: sys.role, context_notes: contextNotes, governance });
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

  // ─── Step labels ─────────────────────────────────────────────────────────────
  const steps = addMode
    ? ['Sistema AI']
    : ['Sistema AI', 'AI Readiness', 'Conferma'];

  return (
    <div className="setup-page">
      <div className="setup-header">
        {addMode
          ? <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Aggiungi Sistema AI</h2>
          : (
            <div className="setup-steps">
              {steps.map((name, i) => (
                <div key={i} className={`setup-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
                  <div className="setup-step-dot">{step > i + 1 ? '✓' : i + 1}</div>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          )}
      </div>

      <div className="setup-body">

        {/* ── Step 1: Sistema AI ─────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="panel-head">
              <h2>Sistema AI</h2>
              <p>Censisci un sistema AI alla volta. Potrai aggiungerne altri in seguito.</p>
            </div>

            {/* Role */}
            <div className="fcard">
              <h3>Ruolo rispetto a questo sistema</h3>
              <div className="check-cards">
                <label className="check-card">
                  <input type="radio" name="role" checked={sys.role === 'deployer'} onChange={() => update('role', 'deployer')} />
                  <div>
                    <div className="cc-title">Deployer (Utilizzatore)</div>
                    <div className="cc-desc">Usi un sistema AI di terzi: API, SaaS, LLM, software specializzato</div>
                  </div>
                </label>
                <label className="check-card">
                  <input type="radio" name="role" checked={sys.role === 'provider'} onChange={() => update('role', 'provider')} />
                  <div>
                    <div className="cc-title">Provider (Fornitore)</div>
                    <div className="cc-desc">Sviluppi e commercializzi questo sistema AI con il tuo marchio</div>
                  </div>
                </label>
              </div>
            </div>

            {/* System identity */}
            <div className="fcard">
              <h3>Identità del Sistema</h3>

              {sys.role === 'deployer' && (
                <>
                  <div className="dec-sub" style={{ marginBottom: 8 }}>È un LLM / AI Generativa?</div>
                  <div className="check-cards" style={{ marginBottom: 16 }}>
                    <label className="check-card">
                      <input type="checkbox" checked={sys.is_llm}
                        onChange={e => update('is_llm', e.target.checked)} />
                      <div>
                        <div className="cc-title">Sì, è un modello LLM / AI Generativa</div>
                        <div className="cc-desc">ChatGPT, Claude, Gemini, Copilot, Llama, ecc.</div>
                      </div>
                    </label>
                  </div>

                  {sys.is_llm && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="dec-sub" style={{ marginBottom: 8 }}>Seleziona il modello</div>
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
                    </div>
                  )}
                </>
              )}

              <div className="field-row">
                <div className="field">
                  <label>Nome Sistema *</label>
                  <input type="text" value={sys.tool_name}
                    placeholder={sys.is_llm ? 'Es. ChatGPT, Claude…' : 'Es. HireVue, Salesforce Einstein…'}
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
                  <label>Categoria</label>
                  <select value={sys.category} onChange={e => update('category', e.target.value)}>
                    {sys.is_llm && <option value="llm">LLM / AI Generativa</option>}
                    {AI_CATS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Come lo usi? Per quali processi?</label>
                <textarea rows={3} value={sys.purpose}
                  placeholder="Descrivi l'uso: chi lo usa, per quali attività, che tipo di decisioni supporta…"
                  onChange={e => update('purpose', e.target.value)} />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Dipartimento che lo utilizza <span style={{color:'var(--muted)',fontWeight:400,fontSize:12}}>(AI Literacy — Art. 4)</span></label>
                  <input type="text" value={sys.department}
                    placeholder="Es. HR, Marketing, Finance, Operations…"
                    onChange={e => update('department', e.target.value)} />
                </div>
                <div className="field" style={{maxWidth:180}}>
                  <label>N° persone nel dipartimento</label>
                  <input type="number" min={1} value={sys.headcount}
                    placeholder="Es. 12"
                    onChange={e => update('headcount', e.target.value ? parseInt(e.target.value, 10) : '')} />
                </div>
              </div>

              <SystemFields item={sys} onChange={update} />
            </div>

            <div className="setup-nav">
              {addMode ? (
                <>
                  {error && <div className="alert-err show">{error}</div>}
                  <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Salvataggio…' : '+ Aggiungi all\'Inventory →'}
                  </button>
                </>
              ) : (
                <button className="btn-next" onClick={() => setStep(2)}>Avanti →</button>
              )}
            </div>
          </>
        )}

        {/* ── Step 2: AI Readiness (initial setup only) ──────────────────────── */}
        {step === 2 && !addMode && (
          <>
            <div className="panel-head">
              <h2>AI Readiness</h2>
              <p>Valuta il livello di presidio già in atto nella tua organizzazione.</p>
            </div>
            <div className="fcard">
              <h3>DPO — Responsabile Protezione Dati</h3>
              <div className="radio-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                {(['inhouse', 'service', 'none'] as const).map(v => (
                  <label key={v} className="radio-card">
                    <input type="radio" name="dpo" value={v}
                      checked={governance.dpo_status === v}
                      onChange={() => setGov(g => ({ ...g, dpo_status: v, has_dpo: v !== 'none' }))} />
                    <div className="rc-row"><div className="rc-title">{v === 'inhouse' ? 'In-house' : v === 'service' ? 'As a Service' : 'Non presente'}</div><div className="rc-dot"></div></div>
                    <div className="rc-desc">{v === 'inhouse' ? 'DPO dipendente o figura interna' : v === 'service' ? 'DPO esterno / consulente' : 'Nessun DPO formalmente designato'}</div>
                  </label>
                ))}
              </div>
            </div>
            <div className="fcard">
              <h3>Presidi di Conformità AI</h3>
              <div className="check-cards">
                {([
                  { key: 'has_ai_inventory', title: 'Inventario AI formalizzato', desc: 'Registro documentato di tutti i sistemi AI in uso' },
                  { key: 'has_impact_assessment', title: 'Valutazione impatto AI (FRIA / DPIA)', desc: 'AI Act Art. 27 e GDPR Art. 35' },
                  { key: 'has_incident_procedure', title: 'Procedura gestione incidenti AI', desc: 'Processo per segnalare e gestire malfunzionamenti AI' },
                  { key: 'has_ai_policy', title: 'Policy interna sull\'uso dell\'AI', desc: 'Regole, responsabilità e limiti nell\'adozione AI' },
                  { key: 'has_training', title: 'Formazione del personale sull\'AI', desc: 'Formazione sull\'uso sicuro e consapevole dell\'AI' },
                  { key: 'has_human_oversight', title: 'Supervisione umana documentata', desc: 'Procedure documentate di controllo umano sulle decisioni AI' },
                ] as { key: keyof typeof governance; title: string; desc: string }[]).map(item => (
                  <label key={item.key} className="check-card">
                    <input type="checkbox" checked={governance[item.key] as boolean}
                      onChange={e => setGov(g => ({ ...g, [item.key]: e.target.checked }))} />
                    <div><div className="cc-title">{item.title}</div><div className="cc-desc">{item.desc}</div></div>
                  </label>
                ))}
              </div>
            </div>
            <div className="setup-nav">
              <button className="btn-back" onClick={() => setStep(1)}>← Indietro</button>
              <button className="btn-next" onClick={() => setStep(3)}>Avanti →</button>
            </div>
          </>
        )}

        {/* ── Step 3: Note & Conferma (initial setup only) ───────────────────── */}
        {step === 3 && !addMode && (
          <>
            <div className="panel-head">
              <h2>Note &amp; Conferma</h2>
              <p>Aggiungi contesto specifico opzionale e completa il setup.</p>
            </div>
            <div className="fcard">
              <div className="hint">
                <span className="hint-icon">🎯</span>
                <span>Descrivi dettagli critici del tuo settore o uso specifico. Il motore AI userà queste note nell'analisi di compliance.</span>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Note Libere — Contesto Specifico (opzionale)</label>
                <textarea rows={5} value={contextNotes}
                  onChange={e => setContextNotes(e.target.value)}
                  placeholder="Es: Usiamo questo sistema per lo screening candidati nel settore bancario. L'output determina chi riceve un colloquio…" />
              </div>
            </div>
            <div className="fcard">
              <h3>Riepilogo</h3>
              <div className="rev-row"><span className="rk">Sistema censito</span><span className="rv">{sys.tool_name || '—'}</span></div>
              <div className="rev-row"><span className="rk">Ruolo</span><span className="rv">{sys.role}</span></div>
              <div className="rev-row"><span className="rk">Categoria</span><span className="rv">{sys.category}</span></div>
              <div className="rev-row"><span className="rk">DPO</span><span className="rv">{governance.dpo_status}</span></div>
              <div className="rev-row"><span className="rk">Policy AI</span><span className="rv">{governance.has_ai_policy ? 'Sì' : 'No'}</span></div>
            </div>
            {error && <div className="alert-err show">{error}</div>}
            <div className="setup-nav">
              <button className="btn-back" onClick={() => setStep(2)}>← Indietro</button>
              <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Salvataggio…' : '✓ Completa Setup →'}
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
