'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { AssessmentFormData } from '@/lib/types';

// ─── Static data (mirrors dashboard/setup/page.tsx) ──────────────────────────

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
  { v: 'hr',          l: 'HR & Recruiting' },
  { v: 'finance',     l: 'Finanza & Contabilità' },
  { v: 'marketing',   l: 'Marketing & Vendite' },
  { v: 'operations',  l: 'Operations & Logistica' },
  { v: 'legal',       l: 'Legale & Compliance' },
  { v: 'tech',        l: 'Tecnico-IT & Sviluppo' },
  { v: 'healthcare',  l: 'Sanità & Life Sciences' },
  { v: 'altro',       l: 'Altro' },
];

const DECISION_DOMAINS = [
  { v: 'hiring',               l: 'Assunzione, selezione, screening personale' },
  { v: 'performance_management', l: 'Valutazione prestazioni, promozioni' },
  { v: 'credit_scoring',       l: 'Valutazione creditizia, scoring finanziario' },
  { v: 'insurance',            l: 'Assicurazioni: underwriting, tariffazione' },
  { v: 'healthcare_diagnosis', l: 'Diagnosi medica, supporto clinico' },
  { v: 'education_assessment', l: 'Valutazione studenti, accesso istruzione' },
  { v: 'public_services',      l: 'Accesso servizi pubblici, sussidi' },
  { v: 'law_enforcement',      l: 'Forze dell\'ordine, biometria' },
  { v: 'content_moderation',   l: 'Moderazione contenuti' },
  { v: 'other_decisions',      l: 'Altre decisioni su persone fisiche' },
];

const DATA_TYPES = [
  { v: 'biometric',            l: 'Biometrici (volto, voce, impronte)' },
  { v: 'health',               l: 'Sanitari, cartelle cliniche' },
  { v: 'financial',            l: 'Finanziari, bancari, reddituali' },
  { v: 'behavioral',           l: 'Comportamentali, pattern di utilizzo' },
  { v: 'location',             l: 'Geolocalizzazione o movimenti' },
  { v: 'personal_identifiers', l: 'Identificatori personali (CF, email)' },
  { v: 'sensitive_categories', l: 'Categorie speciali GDPR (etnia, religione)' },
];

const TARGET_USERS = [
  { v: 'internal_employees', l: 'Dipendenti Interni' },
  { v: 'clients_users',      l: 'Clienti / Utenti' },
  { v: 'third_parties',      l: 'Terze Parti (es. candidati)' },
];

const OUTPUT_TYPES = [
  { v: 'content_generation', l: 'Genera contenuto',       desc: 'Testo, codice, immagini, risposte automatiche' },
  { v: 'recommendation',     l: 'Raccomandazione',         desc: 'Suggerisce opzioni — l\'umano decide' },
  { v: 'scoring',            l: 'Scoring / classificazione', desc: 'Assegna punteggi, categorie o priorità a persone/oggetti' },
  { v: 'automated_decision', l: 'Decisione automatica',   desc: 'Output applicato direttamente senza revisione umana' },
];

const ACCESS_MODES = [
  { v: 'web_chat',   l: 'Interfaccia web / chat', desc: 'Es. ChatGPT.com, Claude.ai — uso diretto da browser' },
  { v: 'api',        l: 'API / integrazione',      desc: 'Chiamate programmatiche, embedding in altri software' },
  { v: 'plugin',     l: 'Plugin / add-on',         desc: 'Es. Copilot in Word, estensioni browser' },
  { v: 'integrated', l: 'Prodotto interno',         desc: 'Il sistema è parte di un tool aziendale proprietario' },
];

const CUSTOMIZATIONS = [
  { v: 'system_prompt', l: 'System prompt fissi',   desc: 'Istruzioni permanenti che condizionano il comportamento del modello' },
  { v: 'fine_tuning',   l: 'Fine-tuning',            desc: 'Modello ri-addestrato con dati aziendali propri' },
  { v: 'rag',           l: 'RAG / knowledge base',   desc: 'Il modello recupera documenti aziendali per arricchire le risposte' },
];

const VULNERABLE_GROUPS = [
  { v: 'minors',           l: 'Minori (under 18)' },
  { v: 'elderly',          l: 'Anziani' },
  { v: 'disabled',         l: 'Persone con disabilità' },
  { v: 'economic_hardship', l: 'Persone in difficoltà economica' },
  { v: 'emotional_distress', l: 'Persone in difficoltà emotiva / psicologica' },
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
  { v: 'law_enforcement_risk',        l: 'Valutazione rischio criminalità (contrasto)',     cat: '6 — Contrasto' },
  { v: 'criminal_investigation',      l: 'Indagini penali / profilazione criminale',        cat: '6 — Contrasto' },
  { v: 'migration_assessment',        l: 'Valutazione domande asilo / visto',              cat: '7 — Migrazione' },
  { v: 'border_control',              l: 'Controllo frontiere / lie detection',             cat: '7 — Migrazione' },
  { v: 'justice_administration',      l: 'Sistemi per amministrazione della giustizia',    cat: '8 — Giustizia' },
];

// ─── System state ─────────────────────────────────────────────────────────────

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
              <div className="rc-title">
                {v === 'always' ? 'Sempre presente' : v === 'sometimes' ? 'In alcuni casi' : v === 'never' ? 'Mai — Full Auto' : 'Non applicabile'}
              </div>
              <div className="rc-dot"></div>
            </div>
            <div className="rc-desc">
              {v === 'always' ? 'Ogni output revisionato prima di produrre effetti'
                : v === 'sometimes' ? 'Solo per casi ad alto rischio'
                : v === 'never' ? 'Decide autonomamente senza intervento umano'
                : 'Non produce decisioni su persone fisiche'}
            </div>
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

// ─── Per-tool block ───────────────────────────────────────────────────────────

function SystemBlock({ idx, total, sys, onUpdate, onRemove }: {
  idx: number;
  total: number;
  sys: SystemState;
  onUpdate: (idx: number, field: string, value: unknown) => void;
  onRemove: (idx: number) => void;
}) {
  function update(field: string, value: unknown) {
    const next: Partial<SystemState> = { [field]: value };
    if (field === 'llm_preset' && value && value !== 'other') {
      const llm = LLM_LIST.find(l => l.id === value);
      if (llm) { next.tool_name = llm.label; next.vendor = llm.vendor; next.category = 'llm'; next.is_llm = true; }
    }
    if (field === 'is_llm' && !value) next.llm_preset = '';
    for (const [k, v] of Object.entries(next)) onUpdate(idx, k, v);
  }

  return (
    <div className="fcard" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--dim)' }}>
          Strumento AI #{idx + 1}
        </div>
        {total > 1 && (
          <button type="button" onClick={() => onRemove(idx)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer', fontSize: 12, padding: '4px 10px', fontFamily: 'inherit' }}>
            Rimuovi
          </button>
        )}
      </div>

      {/* Role */}
      <div className="dec-sub" style={{ marginTop: 0 }}>Ruolo rispetto a questo sistema</div>
      <div className="check-cards" style={{ marginBottom: 16 }}>
        <label className="check-card">
          <input type="radio" name={`role-${idx}`} checked={sys.role === 'deployer'} onChange={() => update('role', 'deployer')} />
          <div>
            <div className="cc-title">Deployer (Utilizzatore)</div>
            <div className="cc-desc">Usi un sistema AI di terzi: API, SaaS, LLM, software specializzato</div>
          </div>
        </label>
        <label className="check-card">
          <input type="radio" name={`role-${idx}`} checked={sys.role === 'provider'} onChange={() => update('role', 'provider')} />
          <div>
            <div className="cc-title">Provider (Fornitore)</div>
            <div className="cc-desc">Sviluppi e commercializzi questo sistema AI con il tuo marchio</div>
          </div>
        </label>
      </div>

      {/* LLM */}
      {sys.role === 'deployer' && (
        <>
          <div className="dec-sub">È un LLM / AI Generativa?</div>
          <div className="check-cards" style={{ marginBottom: 12 }}>
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

      {/* Identity */}
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
        <label>Come lo usi? Per quali processi? *</label>
        <textarea rows={3} value={sys.purpose}
          placeholder="Descrivi l'uso: chi lo usa, per quali attività, che tipo di decisioni supporta…"
          onChange={e => update('purpose', e.target.value)} />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Dipartimento che lo utilizza <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>(AI Literacy — Art. 4)</span></label>
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

      <SystemFields item={sys} onChange={(f, v) => update(f, v)} />
    </div>
  );
}

// ─── Light-mode CSS variable map ──────────────────────────────────────────────

function lightVars(color: string): React.CSSProperties {
  return {
    ['--bg' as string]:       '#f5f7fa',
    ['--surface' as string]:  '#f8f9fb',
    ['--surface2' as string]: '#f0f2f5',
    ['--border' as string]:   '#e2e6ed',
    ['--border2' as string]:  '#cdd3dc',
    ['--text' as string]:     '#111827',
    ['--text2' as string]:    '#374151',
    ['--muted' as string]:    '#6b7280',
    ['--dim' as string]:      '#9ca3af',
    ['--input-bg' as string]: '#ffffff',
    ['--green' as string]:    color,
    ['--green-dark' as string]: color,
    ['--red' as string]:      '#ef4444',
    ['--r' as string]:        '10px',
  };
}

// ─── Main content ─────────────────────────────────────────────────────────────

const SECTORS = [
  { v: 'finance',     l: 'Finanza, Banca, FinTech' },
  { v: 'healthcare',  l: 'Sanità & Life Sciences' },
  { v: 'tech',        l: 'Tecnologia & IT' },
  { v: 'legal',       l: 'Legale & Consulenza' },
  { v: 'hr',          l: 'HR & Recruiting' },
  { v: 'operations',  l: 'Operations & Logistica' },
  { v: 'marketing',   l: 'Marketing & Vendite' },
  { v: 'retail',      l: 'Retail & E-commerce' },
  { v: 'manufacturing', l: 'Manifatturiero & Industria' },
  { v: 'education',   l: 'Istruzione & Formazione' },
  { v: 'altro',       l: 'Altro' },
];

const EMPLOYEES_RANGES = [
  { v: '1-10',     l: '1–10 dipendenti' },
  { v: '11-50',    l: '11–50 dipendenti' },
  { v: '51-250',   l: '51–250 dipendenti' },
  { v: '251-1000', l: '251–1.000 dipendenti' },
  { v: '1000+',    l: 'Oltre 1.000 dipendenti' },
];

const REVENUE_RANGES = [
  { v: 'under_100k',  l: 'Meno di €100.000' },
  { v: '100k_500k',   l: '€100.000 – €500.000' },
  { v: '500k_1m',     l: '€500.000 – €1M' },
  { v: '1m_3m',       l: '€1M – €3M' },
  { v: '3m_10m',      l: '€3M – €10M' },
  { v: '10m_30m',     l: '€10M – €30M' },
  { v: '30m_100m',    l: '€30M – €100M' },
  { v: '100m_500m',   l: '€100M – €500M' },
  { v: '500m_1b',     l: '€500M – €1 miliardo' },
  { v: 'over_1b',     l: 'Oltre €1 miliardo' },
];

function AssessmentContent() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [formData, setFormData] = useState<AssessmentFormData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [loadErr, setLoadErr]   = useState('');
  const [systems, setSystems]   = useState<SystemState[]>([emptySystem()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr]   = useState('');
  const [submitted, setSubmitted]   = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [companyProfile, setCompanyProfile] = useState({
    sector:               '',
    employees_range:      '',
    annual_revenue_range: '',
    annual_revenue_exact: '',
  });

  useEffect(() => {
    if (!token) { setLoadErr('Link non valido.'); setLoading(false); return; }
    api.assessment.getForm(token).then(data => {
      const d = data as unknown as AssessmentFormData;
      if (d.status === 'completato') setAlreadyDone(true);
      setFormData(d);
    }).catch(() => {
      setLoadErr('Link non valido o scaduto.');
    }).finally(() => setLoading(false));
  }, [token]);

  function updateSystem(idx: number, field: string, value: unknown) {
    setSystems(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function addSystem() {
    setSystems(prev => [...prev, emptySystem()]);
  }

  function removeSystem(idx: number) {
    if (systems.length === 1) return;
    setSystems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitErr('');
    if (!companyProfile.sector) {
      setSubmitErr('Seleziona il settore aziendale.');
      return;
    }
    if (!companyProfile.employees_range) {
      setSubmitErr('Seleziona il numero di dipendenti.');
      return;
    }
    const invalid = systems.some(s => !s.tool_name.trim() && !s.llm_preset);
    if (invalid) {
      setSubmitErr('Compila il nome per ogni strumento AI.');
      return;
    }
    const missingPurpose = systems.some(s => !s.purpose.trim());
    if (missingPurpose) {
      setSubmitErr('Descrivi l\'utilizzo per ogni strumento AI.');
      return;
    }
    const exactNum = companyProfile.annual_revenue_exact ? parseFloat(companyProfile.annual_revenue_exact) : null;
    const profilePayload: Record<string, unknown> = {
      sector:          companyProfile.sector,
      employees_range: companyProfile.employees_range,
      ...(exactNum && exactNum > 0
        ? { annual_revenue_exact: exactNum }
        : companyProfile.annual_revenue_range
          ? { annual_revenue_range: companyProfile.annual_revenue_range }
          : {}),
    };
    setSubmitting(true);
    try {
      await api.assessment.submit(token, systems.map(s => ({
        name:                      s.tool_name.trim() || (s.is_llm ? s.llm_preset : '') || 'Sistema AI',
        purpose:                   s.purpose.trim() || 'Uso interno aziendale',
        ...(s.department.trim()        ? { department:                s.department.trim() }       : {}),
        ...(s.headcount && Number(s.headcount) > 0 ? { headcount:    Number(s.headcount) }        : {}),
        role:                      s.role,
        ...(s.vendor.trim()            ? { vendor:                    s.vendor.trim() }            : {}),
        category:                  s.category,
        ...(s.is_llm                   ? { is_llm:                    true }                       : {}),
        ...(s.llm_preset               ? { llm_preset:                s.llm_preset }               : {}),
        ...(s.output_type              ? { output_type:               s.output_type }              : {}),
        ...(s.access_mode              ? { access_mode:               s.access_mode }              : {}),
        ...(s.customizations.length    ? { customizations:            s.customizations }           : {}),
        ...(s.target_users.length      ? { target_users:              s.target_users }             : {}),
        ...(s.vulnerable_groups.length ? { vulnerable_groups:         s.vulnerable_groups,
                                           affects_vulnerable_groups: true }                        : {}),
        ...(s.users_aware_of_ai        ? { users_aware_of_ai:         true }                       : {}),
        ...(s.makes_automated_decisions ? { makes_automated_decisions: true }                      : {}),
        ...(s.human_oversight_level !== 'na' ? { human_oversight_level: s.human_oversight_level } : {}),
        ...(s.decision_domains.length  ? { decision_domains:          s.decision_domains }         : {}),
        ...(s.data_types.length        ? { data_types:                s.data_types }               : {}),
        ...(s.annex_iii_domains.length ? { annex_iii_domains:         s.annex_iii_domains }        : {}),
        ...(s.is_safety_component      ? { is_safety_component:       true }                       : {}),
      })), profilePayload);
      setSubmitted(true);
    } catch (err: unknown) {
      setSubmitErr((err as { message?: string }).message ?? 'Errore durante l\'invio. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  const color      = formData?.partner?.primary_color ?? '#6C47FF';
  const studioName = formData?.partner?.sender_name ?? formData?.partner?.ragione_sociale ?? 'Partner';

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="assessment-page">
        <div style={{ color: '#888', padding: 40 }}>Caricamento questionario…</div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────
  if (loadErr) {
    return (
      <div className="assessment-page">
        <div className="assessment-card">
          <div className="assessment-header" style={{ background: '#f9f9f9' }}>
            <div className="assessment-header-logo">⚠️ Link non valido</div>
          </div>
          <div className="assessment-body" style={{ textAlign: 'center', color: '#888' }}>
            <p>{loadErr}</p>
            <p style={{ marginTop: 12 }}>Contatta il tuo consulente per ricevere un nuovo link.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Already submitted ──────────────────────────────────────────────────────
  if (alreadyDone) {
    return (
      <div className="assessment-page">
        <div className="assessment-card">
          <div className="assessment-header" style={{ borderBottom: `3px solid ${color}` }}>
            <div className="assessment-header-logo">{studioName}</div>
            <div className="assessment-header-sub">AI Compliance Assessment per {formData?.company_name}</div>
          </div>
          <div className="assessment-body" style={{ textAlign: 'center', padding: '48px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#1a1a2e', marginBottom: 8 }}>
              Questionario già compilato
            </div>
            <p style={{ color: '#888', fontSize: 14 }}>
              Questo questionario è già stato completato. Grazie per la collaborazione!
            </p>
          </div>
        </div>
        <div className="assessment-footer">Powered by Actify AI Compliance</div>
      </div>
    );
  }

  // ─── Success ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="assessment-page">
        <div className="assessment-card">
          <div className="assessment-header" style={{ borderBottom: `3px solid ${color}` }}>
            {formData?.partner?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={formData.partner.logo_url} alt={studioName} style={{ height: 40, objectFit: 'contain', marginBottom: 12 }} />
            )}
            <div className="assessment-header-logo">{studioName}</div>
          </div>
          <div className="assessment-body" style={{ textAlign: 'center', padding: '48px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#1a1a2e', marginBottom: 12 }}>
              Grazie, questionario inviato!
            </div>
            <p style={{ color: '#888', fontSize: 14, lineHeight: 1.7 }}>
              Le informazioni sui tuoi strumenti AI sono state trasmesse al tuo consulente.
              Riceverai presto un&apos;analisi di compliance personalizzata.
            </p>
          </div>
          <div className="assessment-footer">Powered by Actify AI Compliance</div>
        </div>
      </div>
    );
  }

  // ─── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="assessment-page" style={{ paddingBottom: 60 }}>
      <div className="assessment-card" style={{ maxWidth: 800 }}>
        {/* Header */}
        <div className="assessment-header" style={{ borderBottom: `3px solid ${color}` }}>
          {formData?.partner?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={formData.partner.logo_url} alt={studioName} style={{ height: 40, objectFit: 'contain', marginBottom: 12 }} />
          )}
          <div className="assessment-header-logo">{studioName}</div>
          <div className="assessment-header-sub">
            Questionario AI Compliance per <strong>{formData?.company_name}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="assessment-body">
            {/* Intro */}
            <div style={{ background: '#f0f4ff', border: '1px solid #c7d7ff', borderRadius: 10, padding: '16px 20px', marginBottom: 28, fontSize: 14, color: '#1a1a2e', lineHeight: 1.7 }}>
              <strong>Perché questo questionario?</strong> Il Regolamento UE sull&apos;Intelligenza Artificiale (AI Act) obbliga le organizzazioni a mappare e classificare i propri sistemi AI. Compila una sezione per ciascuno strumento AI utilizzato in azienda. Richiede circa <strong>10–20 minuti</strong>.
            </div>

            {/* Company profile */}
            <div className="fcard" style={lightVars(color)}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--dim)', marginBottom: 18 }}>
                Profilo Azienda
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18, lineHeight: 1.6, background: '#f0f4ff', border: '1px solid #c7d7ff', borderRadius: 8, padding: '12px 16px' }}>
                Questi dati servono a calibrare la stima delle sanzioni previste dall&apos;AI Act (Art. 99–100), che sono calcolate in percentuale sul fatturato annuo globale.
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Settore aziendale *</label>
                  <select value={companyProfile.sector}
                    onChange={e => setCompanyProfile(p => ({ ...p, sector: e.target.value }))}>
                    <option value="">— Seleziona —</option>
                    {SECTORS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Numero di dipendenti *</label>
                  <select value={companyProfile.employees_range}
                    onChange={e => setCompanyProfile(p => ({ ...p, employees_range: e.target.value }))}>
                    <option value="">— Seleziona —</option>
                    {EMPLOYEES_RANGES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Fatturato annuo (range) <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>consigliato</span></label>
                  <select value={companyProfile.annual_revenue_range}
                    onChange={e => setCompanyProfile(p => ({ ...p, annual_revenue_range: e.target.value, annual_revenue_exact: '' }))}>
                    <option value="">— Seleziona —</option>
                    {REVENUE_RANGES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                </div>
                <div className="field" style={{ maxWidth: 240 }}>
                  <label>Fatturato esatto (€) <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>facoltativo</span></label>
                  <input type="number" min={0} placeholder="Es. 4500000"
                    value={companyProfile.annual_revenue_exact}
                    onChange={e => setCompanyProfile(p => ({ ...p, annual_revenue_exact: e.target.value, annual_revenue_range: e.target.value ? '' : p.annual_revenue_range }))} />
                </div>
              </div>
            </div>

            {/* Systems */}
            <div style={lightVars(color)}>
              {systems.map((sys, idx) => (
                <SystemBlock
                  key={idx}
                  idx={idx}
                  total={systems.length}
                  sys={sys}
                  onUpdate={updateSystem}
                  onRemove={removeSystem}
                />
              ))}

              <button type="button" className="assessment-add-btn" onClick={addSystem}
                style={{ borderColor: color, color: color }}>
                + Aggiungi un altro strumento AI
              </button>
            </div>

            {submitErr && (
              <div style={{ color: '#ef4444', fontSize: 13, marginTop: 20, fontWeight: 500, padding: '12px 16px', background: 'rgba(239,68,68,.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,.2)' }}>
                {submitErr}
              </div>
            )}

            <button
              type="submit"
              className="assessment-submit-btn"
              style={{ background: color, marginTop: 28 }}
              disabled={submitting}
            >
              {submitting
                ? 'Invio in corso…'
                : `Invia Questionario (${systems.length} strument${systems.length === 1 ? 'o' : 'i'})`}
            </button>

            <p style={{ fontSize: 12, color: '#aaa', marginTop: 16, textAlign: 'center', lineHeight: 1.6 }}>
              Inviando il questionario confermi che le informazioni fornite sono accurate e rappresentative dell&apos;utilizzo reale degli strumenti AI nella tua organizzazione.
            </p>
          </div>
        </form>

        <div className="assessment-footer">
          Questionario inviato da {studioName} tramite la piattaforma Actify AI Compliance.
        </div>
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#888', textAlign: 'center' }}>Caricamento…</div>}>
      <AssessmentContent />
    </Suspense>
  );
}
