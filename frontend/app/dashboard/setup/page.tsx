'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

const LLM_LIST = [
  { id: 'chatgpt',    label: 'ChatGPT',    vendor: 'OpenAI' },
  { id: 'claude',     label: 'Claude',     vendor: 'Anthropic' },
  { id: 'gemini',     label: 'Gemini',     vendor: 'Google' },
  { id: 'copilot',    label: 'Copilot',    vendor: 'Microsoft' },
  { id: 'llama',      label: 'Llama',      vendor: 'Meta' },
  { id: 'mistral',    label: 'Mistral',    vendor: 'Mistral AI' },
  { id: 'perplexity', label: 'Perplexity', vendor: 'Perplexity AI' },
  { id: 'grok',       label: 'Grok',       vendor: 'xAI' },
  { id: 'other_llm',  label: 'Altro LLM',  vendor: '' },
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

interface LlmEntry {
  id: string; label: string; vendor: string;
  custom_name: string; purpose: string;
  target_users: string[];
  makes_automated_decisions: boolean; human_oversight_level: string;
  decision_domains: string[]; affects_vulnerable_groups: boolean; data_types: string[];
}

interface SpecializedTool {
  category: string; tool_name: string; vendor: string; purpose: string;
  target_users: string[];
  makes_automated_decisions: boolean; human_oversight_level: string;
  decision_domains: string[]; affects_vulnerable_groups: boolean; data_types: string[];
}

interface ProviderSystem {
  tool_name: string; vendor: string; category: string; purpose: string;
  target_users: string[];
  makes_automated_decisions: boolean; human_oversight_level: string;
  decision_domains: string[]; affects_vulnerable_groups: boolean; data_types: string[];
}

function emptySpecialized(): SpecializedTool {
  return { category: 'hr', tool_name: '', vendor: '', purpose: '', target_users: [], makes_automated_decisions: false, human_oversight_level: 'na', decision_domains: [], affects_vulnerable_groups: false, data_types: [] };
}
function emptyProvider(): ProviderSystem {
  return { tool_name: '', vendor: '', category: 'tech', purpose: '', target_users: [], makes_automated_decisions: false, human_oversight_level: 'na', decision_domains: [], affects_vulnerable_groups: false, data_types: [] };
}

function DecisionFields({ item, onChange }: {
  item: { target_users: string[]; makes_automated_decisions: boolean; human_oversight_level: string; decision_domains: string[]; affects_vulnerable_groups: boolean; data_types: string[] };
  onChange: (field: string, value: unknown) => void;
}) {
  return (
    <div className="dec-section">
      <div className="dec-sub">Utenti Target</div>
      <div className="check-list">
        {TARGET_USERS.map(u => (
          <label key={u.v} className="check-row">
            <input type="checkbox" checked={item.target_users.includes(u.v)}
              onChange={e => {
                const arr = item.target_users;
                onChange('target_users', e.target.checked ? [...arr, u.v] : arr.filter(x => x !== u.v));
              }} />
            <span>{u.l}</span>
          </label>
        ))}
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
        <label className="check-card">
          <input type="checkbox" checked={item.affects_vulnerable_groups}
            onChange={e => onChange('affects_vulnerable_groups', e.target.checked)} />
          <div>
            <div className="cc-title">Interagisce con soggetti vulnerabili</div>
            <div className="cc-desc">Minori, anziani, persone con disabilità, in difficoltà economica</div>
          </div>
        </label>
      </div>
      <div className="dec-sub">Supervisione Umana</div>
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
              onChange={e => {
                const arr = item.decision_domains;
                onChange('decision_domains', e.target.checked ? [...arr, d.v] : arr.filter(x => x !== d.v));
              }} />
            <span>{d.l}</span>
          </label>
        ))}
      </div>
      <div className="dec-sub">Tipologie di Dati</div>
      <div className="check-list cl-2col">
        {DATA_TYPES.map(d => (
          <label key={d.v} className="check-row">
            <input type="checkbox" checked={item.data_types.includes(d.v)}
              onChange={e => {
                const arr = item.data_types;
                onChange('data_types', e.target.checked ? [...arr, d.v] : arr.filter(x => x !== d.v));
              }} />
            <span>{d.l}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addMode = searchParams.get('add') === '1';
  const [step, setStep] = useState(1);

  // Step 1 state
  const [isDeployer, setIsDeployer] = useState(false);
  const [isProvider, setIsProvider] = useState(false);
  const [selectedLlmIds, setSelectedLlmIds] = useState<string[]>([]);
  const [llmDetails, setLlmDetails] = useState<Record<string, LlmEntry>>({});
  const [specializedTools, setSpecializedTools] = useState<SpecializedTool[]>([]);
  const [providerSystems, setProviderSystems] = useState<ProviderSystem[]>([]);

  // Step 2 state
  const [governance, setGov] = useState({
    has_dpo: false, dpo_status: 'none' as 'inhouse' | 'service' | 'none',
    has_ai_inventory: false, has_impact_assessment: false,
    has_human_oversight: false, has_incident_procedure: false,
    has_ai_policy: false, has_training: false,
  });

  // Step 3 state
  const [contextNotes, setContextNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (addMode) return; // skip redirect in add-mode
    api.company.get().then((c) => {
      if ((c as { setup_completed?: boolean }).setup_completed) router.replace('/dashboard/inventory');
    }).catch(() => {});
  }, [router, addMode]);

  function toggleLlm(llm: typeof LLM_LIST[0]) {
    setSelectedLlmIds(prev => {
      if (prev.includes(llm.id)) {
        setLlmDetails(d => { const n = { ...d }; delete n[llm.id]; return n; });
        return prev.filter(id => id !== llm.id);
      } else {
        setLlmDetails(d => ({
          ...d, [llm.id]: {
            id: llm.id, label: llm.label, vendor: llm.vendor,
            custom_name: '', purpose: '',
            target_users: [],
            makes_automated_decisions: false, human_oversight_level: 'na',
            decision_domains: [], affects_vulnerable_groups: false, data_types: [],
          }
        }));
        return [...prev, llm.id];
      }
    });
  }

  function updateLlm(id: string, field: string, value: unknown) {
    setLlmDetails(d => ({ ...d, [id]: { ...d[id], [field]: value } }));
  }

  function updateSpecialized(idx: number, field: string, value: unknown) {
    setSpecializedTools(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function updateProvider(idx: number, field: string, value: unknown) {
    setProviderSystems(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const aiRole = isProvider && isDeployer ? 'both' : isProvider ? 'provider' : isDeployer ? 'deployer' : 'unknown';

      // Build systems list
      const systems: Record<string, unknown>[] = [];

      // LLM entries
      for (const id of selectedLlmIds) {
        const l = llmDetails[id];
        if (!l) continue;
        const name = id === 'other_llm' ? (l.custom_name || 'LLM Non specificato') : l.label;
        systems.push({
          tool_name: name, vendor: l.vendor || l.label,
          category: 'llm', role: 'deployer', purpose: l.purpose || `Uso di ${name}`,
          target_users: l.target_users, makes_automated_decisions: l.makes_automated_decisions,
          human_oversight_level: l.human_oversight_level,
          decision_domains: l.decision_domains, affects_vulnerable_groups: l.affects_vulnerable_groups,
          data_types: l.data_types,
        });
      }

      // Specialized deployer tools
      for (const s of specializedTools) {
        if (!s.tool_name.trim()) continue;
        systems.push({ ...s, role: 'deployer', target_users: [] });
      }

      // Provider systems
      for (const s of providerSystems) {
        if (!s.tool_name.trim()) continue;
        systems.push({ ...s, role: 'provider', target_users: [] });
      }

      for (const sys of systems) {
        await api.systems.create(sys);
      }

      if (!addMode) {
        await api.company.setup({ ai_role: aiRole, context_notes: contextNotes, governance });
      }
      router.push('/dashboard/inventory');
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Errore durante il salvataggio.');
    } finally {
      setSubmitting(false);
    }
  }

  const totalSystems = selectedLlmIds.length + specializedTools.filter(s => s.tool_name).length + providerSystems.filter(s => s.tool_name).length;

  return (
    <div className="setup-page">
      <div className="setup-header">
        {addMode
          ? <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Aggiungi Sistemi AI</h2>
          : null}
        {!addMode && <div className="setup-steps">
          {['Ruolo & Sistemi AI', 'AI Readiness', 'Note & Conferma'].map((name, i) => (
            <div key={i} className={`setup-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
              <div className="setup-step-dot">{step > i + 1 ? '✓' : i + 1}</div>
              <span>{name}</span>
            </div>
          ))}
        </div>}
      </div>

      <div className="setup-body">

        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <div className="panel-head">
              <h2>Ruolo &amp; Sistemi AI</h2>
              <p>Seleziona il tuo ruolo e censisci i sistemi AI della tua organizzazione.</p>
            </div>

            <div className="fcard">
              <h3>Il tuo ruolo rispetto ai sistemi AI</h3>
              <div className="check-cards">
                <label className="check-card">
                  <input type="checkbox" checked={isDeployer} onChange={e => setIsDeployer(e.target.checked)} />
                  <div>
                    <div className="cc-title">Deployer (Utilizzatore)</div>
                    <div className="cc-desc">Usi sistemi AI di terzi: API, SaaS, LLM, software specializzati</div>
                  </div>
                </label>
                <label className="check-card">
                  <input type="checkbox" checked={isProvider} onChange={e => setIsProvider(e.target.checked)} />
                  <div>
                    <div className="cc-title">Provider (Fornitore)</div>
                    <div className="cc-desc">Sviluppi e commercializzi sistemi AI con il tuo marchio</div>
                  </div>
                </label>
              </div>
            </div>

            {/* ── Deployer section ── */}
            {isDeployer && (
              <>
                <div className="fcard">
                  <h3>Strumenti LLM / AI Generativa</h3>
                  <p className="fcard-sub">Seleziona i modelli che usi nella tua organizzazione</p>
                  <div className="llm-grid">
                    {LLM_LIST.map(llm => (
                      <button key={llm.id} type="button"
                        className={`llm-chip ${selectedLlmIds.includes(llm.id) ? 'sel' : ''}`}
                        onClick={() => toggleLlm(llm)}>
                        <span className="llm-chip-name">{llm.label}</span>
                        {llm.vendor && <span className="llm-chip-vendor">{llm.vendor}</span>}
                      </button>
                    ))}
                  </div>

                  {selectedLlmIds.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      {selectedLlmIds.map(id => {
                        const l = llmDetails[id];
                        if (!l) return null;
                        return (
                          <div key={id} className="tool-card" style={{ marginBottom: 16 }}>
                            <div className="tc-head">
                              <span className="tc-num">{l.label}{l.vendor ? ` — ${l.vendor}` : ''}</span>
                              <button className="btn-rm" onClick={() => toggleLlm(LLM_LIST.find(x => x.id === id)!)}>✕</button>
                            </div>
                            {id === 'other_llm' && (
                              <div className="field-row">
                                <div className="field">
                                  <label>Nome strumento *</label>
                                  <input type="text" value={l.custom_name} placeholder="Nome dello strumento LLM..."
                                    onChange={e => updateLlm(id, 'custom_name', e.target.value)} />
                                </div>
                                <div className="field">
                                  <label>Vendor / Fornitore</label>
                                  <input type="text" value={l.vendor} placeholder="Es. Together AI, Cohere..."
                                    onChange={e => updateLlm(id, 'vendor', e.target.value)} />
                                </div>
                              </div>
                            )}
                            <div className="field">
                              <label>Come lo usi? Per quali processi?</label>
                              <textarea rows={2} value={l.purpose}
                                placeholder={`Come usi ${l.label} nella tua organizzazione? Chi ne fa uso?`}
                                onChange={e => updateLlm(id, 'purpose', e.target.value)} />
                            </div>
                            <DecisionFields item={l} onChange={(f, v) => updateLlm(id, f, v)} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="fcard">
                  <h3>Strumenti AI Specializzati</h3>
                  <p className="fcard-sub">Software AI verticali: HR, finanza, CRM, ecc. (es. HireVue, Salesforce Einstein)</p>
                  {specializedTools.map((s, idx) => (
                    <div key={idx} className="tool-card" style={{ marginBottom: 16 }}>
                      <div className="tc-head">
                        <span className="tc-num">Strumento {idx + 1}</span>
                        <button className="btn-rm" onClick={() => setSpecializedTools(prev => prev.filter((_, i) => i !== idx))}>✕ Rimuovi</button>
                      </div>
                      <div className="field-row">
                        <div className="field">
                          <label>Categoria</label>
                          <select value={s.category} onChange={e => updateSpecialized(idx, 'category', e.target.value)}>
                            {AI_CATS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label>Nome Sistema *</label>
                          <input type="text" value={s.tool_name} placeholder="Es. HireVue, Salesforce Einstein..."
                            onChange={e => updateSpecialized(idx, 'tool_name', e.target.value)} />
                        </div>
                      </div>
                      <div className="field-row">
                        <div className="field">
                          <label>Vendor / Fornitore</label>
                          <input type="text" value={s.vendor} placeholder="Es. HireVue Inc., Salesforce..."
                            onChange={e => updateSpecialized(idx, 'vendor', e.target.value)} />
                        </div>
                      </div>
                      <div className="field">
                        <label>Scopo d'uso</label>
                        <textarea rows={2} value={s.purpose}
                          placeholder="A cosa serve nella tua azienda? Chi lo usa? Quali decisioni supporta?"
                          onChange={e => updateSpecialized(idx, 'purpose', e.target.value)} />
                      </div>
                      <DecisionFields item={s} onChange={(f, v) => updateSpecialized(idx, f, v)} />
                    </div>
                  ))}
                  <button className="btn-add" onClick={() => setSpecializedTools(prev => [...prev, emptySpecialized()])}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    Aggiungi Strumento Specializzato
                  </button>
                </div>
              </>
            )}

            {/* ── Provider section ── */}
            {isProvider && (
              <div className="fcard">
                <h3>Sistemi AI Proprietari</h3>
                <p className="fcard-sub">Sistemi che sviluppi e distribuisci con il tuo marchio</p>
                {providerSystems.map((s, idx) => (
                  <div key={idx} className="tool-card" style={{ marginBottom: 16 }}>
                    <div className="tc-head">
                      <span className="tc-num">Sistema {idx + 1}</span>
                      <button className="btn-rm" onClick={() => setProviderSystems(prev => prev.filter((_, i) => i !== idx))}>✕ Rimuovi</button>
                    </div>
                    <div className="field-row">
                      <div className="field">
                        <label>Nome Sistema *</label>
                        <input type="text" value={s.tool_name} placeholder="Es. Actify Analytics, SmartHire..."
                          onChange={e => updateProvider(idx, 'tool_name', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Vendor / Marchio</label>
                        <input type="text" value={s.vendor} placeholder="Il tuo nome o brand..."
                          onChange={e => updateProvider(idx, 'vendor', e.target.value)} />
                      </div>
                    </div>
                    <div className="field-row">
                      <div className="field">
                        <label>Categoria</label>
                        <select value={s.category} onChange={e => updateProvider(idx, 'category', e.target.value)}>
                          {AI_CATS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label>Descrizione e scopo</label>
                      <textarea rows={2} value={s.purpose} placeholder="Cosa fa il sistema? A chi è destinato?"
                        onChange={e => updateProvider(idx, 'purpose', e.target.value)} />
                    </div>
                    <DecisionFields item={s} onChange={(f, v) => updateProvider(idx, f, v)} />
                  </div>
                ))}
                <button className="btn-add" onClick={() => setProviderSystems(prev => [...prev, emptyProvider()])}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  Aggiungi Sistema Proprietario
                </button>
              </div>
            )}

            <div className="setup-nav">
              {addMode
                ? <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Salvataggio…' : '✓ Aggiungi Sistemi →'}</button>
                : <button className="btn-next" onClick={() => setStep(2)}>Avanti →</button>
              }
            </div>
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
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
                    <div className="rc-row">
                      <div className="rc-title">{v === 'inhouse' ? 'In-house' : v === 'service' ? 'As a Service' : 'Non presente'}</div>
                      <div className="rc-dot"></div>
                    </div>
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
                ] as { key: keyof typeof governance; title: string; desc: string }[]).map(item => (
                  <label key={item.key} className="check-card">
                    <input type="checkbox" checked={governance[item.key] as boolean}
                      onChange={e => setGov(g => ({ ...g, [item.key]: e.target.checked }))} />
                    <div>
                      <div className="cc-title">{item.title}</div>
                      <div className="cc-desc">{item.desc}</div>
                    </div>
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

        {/* ── Step 3 ── */}
        {step === 3 && (
          <>
            <div className="panel-head">
              <h2>Note &amp; Conferma</h2>
              <p>Aggiungi contesto specifico che l'AI utilizzerà per l'analisi.</p>
            </div>
            <div className="fcard">
              <div className="hint">
                <span className="hint-icon">🎯</span>
                <span>Descrivi come usi esattamente i sistemi AI, chi ne è impattato, aspetti critici del tuo settore. <strong>Garbage in, garbage out.</strong></span>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Note Libere — Contesto Specifico</label>
                <textarea rows={6} value={contextNotes}
                  onChange={e => setContextNotes(e.target.value)}
                  placeholder="Es: Usiamo HireVue per lo screening candidati. Il sistema produce un punteggio e chi scende sotto 60 non viene mai contattato. Operiamo nel settore bancario..." />
              </div>
            </div>
            <div className="fcard">
              <h3>Riepilogo</h3>
              <div className="rev-row"><span className="rk">Sistemi AI censiti</span><span className="rv">{totalSystems}</span></div>
              <div className="rev-row"><span className="rk">LLM selezionati</span><span className="rv">{selectedLlmIds.length}</span></div>
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
