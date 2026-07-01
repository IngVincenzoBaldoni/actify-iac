'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { doSignIn, doSignOut, setSessionCookie } from '@/lib/auth';
import { api } from '@/lib/api';
import { markSvg, logoSvg } from '@/lib/branding';

configureAmplify();

type AccountType = 'pmi' | 'partner';
type PlanTier = 'trial' | 'base' | 'premium' | 'enterprise';
type FeatureOk = boolean | 'partial';
interface PlanFeature { label: string; value: string | null; ok: FeatureOk; }
interface Plan {
  tier: PlanTier; name: string; monthly: number; tagline: string;
  highlight: boolean; badge: string | null; icon: string; onHold?: boolean; features: PlanFeature[];
}

const PLANS: Plan[] = [
  {
    tier: 'trial', name: 'Trial', monthly: 19.9, tagline: 'Diagnosi e assessment — scopri dove sei',
    highlight: false, badge: null, icon: '🔬',
    features: [
      { label: 'AIPI — AI Passports Inventory', value: 'Fino a 5 tool AI censiti',     ok: true  },
      { label: 'Gap Analysis',                  value: null,                           ok: true  },
      { label: 'FEB (Fine Board Estimation)',    value: null,                           ok: true  },
      { label: 'Audit Trail',                   value: null,                           ok: true  },
      { label: 'AI Literacy Tracker',           value: null,                           ok: false },
      { label: 'Document Vault',                value: null,                           ok: false },
      { label: 'NBA (Next Best Action)',         value: null,                           ok: false },
    ],
  },
  {
    tier: 'base', name: 'Starter', monthly: 59.9, tagline: 'Per chi inizia il percorso di compliance',
    highlight: false, badge: null, icon: '🚀',
    features: [
      { label: 'AIPI — AI Passports Inventory', value: 'Fino a 10 tool AI censiti',     ok: true },
      { label: 'Gap Analysis',                  value: null,                            ok: true },
      { label: 'FEB (Fine Board Estimation)',    value: null,                            ok: true },
      { label: 'AI Literacy Tracker',           value: null,                            ok: true },
      { label: 'Document Vault',                value: '5 categorie di documenti',      ok: true },
      { label: 'Audit Trail',                   value: null,                            ok: true },
      { label: 'Team collaborativo',            value: 'Fino a 3 membri',               ok: true },
      { label: 'Supporto email standard',       value: 'Risposta entro 3 gg lavorativi', ok: true },
    ],
  },
  {
    tier: 'premium', name: 'Professional', monthly: 99.9, tagline: 'Per aziende che vogliono compliance attiva',
    highlight: true, badge: 'Più popolare', icon: '⚡',
    features: [
      { label: 'AIPI — AI Passports Inventory', value: 'Illimitata',                            ok: true },
      { label: 'Gap Analysis',                  value: null,                                    ok: true },
      { label: 'FEB (Fine Board Estimation)',    value: null,                                    ok: true },
      { label: 'NBA (Next Best Action)',         value: null,                                    ok: true },
      { label: 'AI Literacy Tracker',           value: null,                                    ok: true },
      { label: 'Document Vault',                value: 'Tutte le categorie + FRIA',             ok: true },
      { label: 'Audit Trail',                   value: null,                                    ok: true },
      { label: 'Team collaborativo',            value: 'Fino a 10 membri',                      ok: true },
      { label: 'Testo AI Act ufficiale',        value: 'navigabile + link dalla Gap Analysis',  ok: true },
      { label: 'Supporto prioritario',          value: '1 gg lavorativo + call mensile 1h',     ok: true },
    ],
  },
  {
    tier: 'enterprise', name: 'Enterprise', monthly: 249, tagline: 'Funzionalità avanzate per grandi organizzazioni',
    highlight: false, badge: 'Prossimamente', icon: '🏛️', onHold: true,
    features: [
      { label: 'AIPI — AI Passports Inventory', value: 'Illimitata',                     ok: true },
      { label: 'Document Vault',                value: 'Tutte le categorie + FRIA',      ok: true },
      { label: 'Testo AI Act ufficiale',        value: 'navigabile + link Gap Analysis', ok: true },
      { label: 'Supporto prioritario',          value: '1 gg + call mensile 1h',         ok: true },
      { label: 'Vendor Hub / DPA tracker',      value: null,                             ok: true },
      { label: 'Regulatory Feed avanzato',      value: null,                             ok: true },
    ],
  },
];

const STUDIO_TYPES = [
  'Studio Legale', 'Studio Commercialista / CAF', 'DPO / Data Protection Office',
  'Studio di Consulenza Manageriale', 'Studio IT / Cybersecurity', 'Altro',
];

function FeatIcon({ ok }: { ok: FeatureOk }) {
  if (ok === true) return (
    <svg className="feat-check" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="rgba(34,197,94,.15)" stroke="rgba(34,197,94,.3)"/>
      <path d="M5 8l2 2 4-4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (ok === 'partial') return (
    <svg className="feat-check" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="rgba(250,204,21,.1)" stroke="rgba(250,204,21,.3)"/>
      <path d="M5 8h6" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg className="feat-check" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="rgba(100,116,139,.08)" stroke="rgba(100,116,139,.2)"/>
      <path d="M5.5 10.5l5-5M10.5 10.5l-5-5" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

const SECTORS = [
  'Risorse Umane / Recruiting', 'Servizi Finanziari / Banca', 'Assicurazioni',
  'Sanità / Life Sciences', 'Istruzione / EdTech', 'Manifatturiero / Industria',
  'Tecnologia / SaaS', 'Retail / E-commerce', 'Pubblica Amministrazione',
  'Legale / Compliance', 'Marketing / Media', 'Logistica / Supply Chain',
  'Energia / Utilities', 'Immobiliare / PropTech', 'Trasporti / Mobilità',
  'Costruzioni / Edilizia', 'Turismo / Hospitality', 'Telecomunicazioni',
  'Agricoltura / Agritech', 'Altro - specifica',
];
const SIZES = [
  { value: '1-10', label: '1–10 (Micro)' },
  { value: '11-50', label: '11–50 (Piccola)' },
  { value: '51-250', label: '51–250 (Media)' },
  { value: '251-1000', label: '251–1.000 (Grande)' },
  { value: '1000+', label: '1.000+ (Enterprise)' },
];

function fmtP(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(2).replace('.', ',');
}

function RegisterPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [referralCode, setReferralCode] = useState('');
  const [pmiId, setPmiId]               = useState('');

  useEffect(() => {
    const ref = searchParams.get('ref') ?? '';
    if (ref) setReferralCode(ref.toUpperCase());
    if (searchParams.get('type') === 'pmi') setAccountType('pmi');
    const pmi = searchParams.get('pmi') ?? '';
    if (pmi) setPmiId(pmi);
  }, [searchParams]);

  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [step, setStep]               = useState<1 | 2>(1);
  const [annual, setAnnual]           = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);

  const [form, setForm] = useState({
    company_name: '', email: '', password: '', confirm: '',
    sector: '', employees_range: '', country: 'Italia',
  });
  const [sectorCustom, setSectorCustom] = useState('');
  const [partnerForm, setPartnerForm] = useState({
    ragione_sociale: '', tipo_studio: '', n_clienti: '',
    email: '', messaggio: '',
  });
  const [partnerRequestSent, setPartnerRequestSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }
  function updatePartner(field: string, value: string) {
    setPartnerForm(f => ({ ...f, [field]: value }));
  }

  function choosePlan(tier: PlanTier) {
    setSelectedPlan(tier);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handlePMISubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Le password non coincidono.'); return; }
    if (form.password.length < 8) { setError('La password deve avere almeno 8 caratteri.'); return; }
    if (form.sector === 'Altro - specifica' && !sectorCustom.trim()) {
      setError('Specifica il tuo settore nel campo di testo.'); return;
    }
    setLoading(true);
    try {
      await api.auth.register({
        email:           form.email,
        password:        form.password,
        company_name:    form.company_name,
        sector:          form.sector === 'Altro - specifica' ? sectorCustom.trim() : form.sector,
        employees_range: form.employees_range,
        country:         form.country,
        ...(referralCode ? { referral_code: referralCode } : {}),
        ...(pmiId ? { pmi_id: pmiId } : {}),
      });
      await doSignOut().catch(() => {});
      const result = await doSignIn(form.email, form.password);
      if (result.isSignedIn) {
        setSessionCookie();
        if (selectedPlan && selectedPlan !== 'enterprise') {
          const billingCycle = annual ? 'annual' : 'monthly';
          const { url } = await api.billing.createCheckoutSession({
            tier: selectedPlan, billing_cycle: billingCycle, email: form.email,
          });
          window.location.href = url;
          return;
        }
        router.push('/dashboard/inventory');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Errore durante la registrazione.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePartnerRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const nClienti = parseInt(partnerForm.n_clienti, 10);
    if (!nClienti || nClienti < 1) { setError('Inserisci il numero di clienti stimati.'); return; }
    setLoading(true);
    try {
      await api.partner.requestAccess({
        ragione_sociale: partnerForm.ragione_sociale,
        tipo_studio:     partnerForm.tipo_studio,
        n_clienti:       nClienti,
        email:           partnerForm.email,
        messaggio:       partnerForm.messaggio || undefined,
      });
      setPartnerRequestSent(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Errore durante l\'invio della richiesta.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Step 0: Account type ──────────────────────────────────────────────────
  if (!accountType) {
    return (
      <div className="auth-split">
        {/* Left brand panel */}
        <div className="auth-split-brand">
          <div className="auth-brand-logo">
            <span dangerouslySetInnerHTML={{ __html: markSvg(32) }} />
            <span className="auth-brand-logo-name">Actify</span>
          </div>

          <div className="auth-brand-body">
            <h1 className="auth-brand-h1">
              Compliance AI Act<br />
              <span>strutturata,<br />documentata, difendibile.</span>
            </h1>
            <p className="auth-brand-sub">
              Dalla mappatura dei sistemi AI alla documentazione ufficiale —
              una piattaforma per aziende e professionisti che operano nel Reg. UE 2024/1689.
            </p>

            <div className="auth-brand-bullets">
              <div className="auth-brand-bullet">
                <div className="auth-brand-bdot">
                  <svg viewBox="0 0 10 10" fill="none" width="10" height="10">
                    <path d="M2 5l2 2 4-4" stroke="#22C55E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="auth-brand-btext">
                  Sanzioni fino a <strong>€35M o 7% del fatturato</strong> — conosci la tua esposizione reale
                </div>
              </div>
              <div className="auth-brand-bullet">
                <div className="auth-brand-bdot">
                  <svg viewBox="0 0 10 10" fill="none" width="10" height="10">
                    <path d="M2 5l2 2 4-4" stroke="#22C55E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="auth-brand-btext">
                  Documenti ufficiali generati da AI — <strong>pronti per ispezione</strong>
                </div>
              </div>
              <div className="auth-brand-bullet">
                <div className="auth-brand-bdot">
                  <svg viewBox="0 0 10 10" fill="none" width="10" height="10">
                    <path d="M2 5l2 2 4-4" stroke="#22C55E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="auth-brand-btext">
                  Infrastruttura <strong>AWS EU</strong> · dati in Europa · GDPR-compliant
                </div>
              </div>
            </div>
          </div>

          <div className="auth-brand-trust">
            <div className="auth-brand-trust-dot" />
            <span>Piattaforma Made in Italy — Reg. UE 2024/1689 AI Act</span>
          </div>
        </div>

        {/* Right form panel */}
        <div className="auth-split-form">
          <div className="auth-split-inner">
            <h1 className="auth-split-h1">Crea il tuo account</h1>
            <p className="auth-split-sub">Seleziona il tipo di account per iniziare</p>

            <button className="acct-v2-card" onClick={() => setAccountType('pmi')}>
              <div className="acct-v2-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="2" y="8" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M7 8V6a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M11 13v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="11" cy="12.5" r="1" fill="currentColor"/>
                </svg>
              </div>
              <div className="acct-v2-info">
                <div className="acct-v2-title">Sono una PMI</div>
                <div className="acct-v2-sub">Voglio gestire la mia compliance AI Act in autonomia</div>
              </div>
              <svg className="acct-v2-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M5 8h6M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <button className="acct-v2-card" onClick={() => setAccountType('partner')}>
              <div className="acct-v2-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.6"/>
                  <circle cx="15" cy="7" r="3" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M2 19c0-3.314 2.686-6 6-6h6c3.314 0 6 2.686 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="acct-v2-info">
                <div className="acct-v2-title">Sono un Partner</div>
                <div className="acct-v2-sub">Studio Legale, Commercialista, DPO — gestisco la compliance di più clienti</div>
              </div>
              <svg className="acct-v2-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M5 8h6M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <p className="auth-split-link" style={{ marginTop: 24 }}>
              Hai già un account? <a href="/login">Accedi</a>
            </p>

            <div className="acct-feat-strip">
              <div className="acct-feat-item">
                <div className="acct-feat-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="acct-feat-label">AI Inventory</span>
              </div>
              <div className="acct-feat-item">
                <div className="acct-feat-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 12L6 5l3 5 2-3 3 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="acct-feat-label">Gap Analysis</span>
              </div>
              <div className="acct-feat-item">
                <div className="acct-feat-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 13l2.5-4 2 2.5L9 6l2.5 4L14 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="acct-feat-label">Fine Board Est.</span>
              </div>
              <div className="acct-feat-item">
                <div className="acct-feat-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2a2 2 0 100 4 2 2 0 000-4z" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="acct-feat-label">AI Literacy</span>
              </div>
              <div className="acct-feat-item">
                <div className="acct-feat-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="acct-feat-label">Document Vault</span>
              </div>
              <div className="acct-feat-item">
                <div className="acct-feat-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v4M8 10v4M2 8h4M10 8h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                </div>
                <span className="acct-feat-label">Audit Trail</span>
              </div>
              <div className="acct-feat-item">
                <div className="acct-feat-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13 5l-5 5-2-2-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 5h3v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="acct-feat-label">Next Best Action</span>
              </div>
              <div className="acct-feat-item">
                <div className="acct-feat-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="6" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/>
                    <circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M1 13c0-2.21 2.24-4 5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M9 10c.6-.26 1.27-.4 2-.4 2.76 0 5 1.79 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="acct-feat-label">Collaborative Team</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Partner contact form (gated — no direct registration) ───────────────────
  if (accountType === 'partner') {
    if (partnerRequestSent) {
      return (
        <div className="auth-page">
          <div className="auth-card">
            <div className="auth-logo">
              <span dangerouslySetInnerHTML={{ __html: markSvg(40) }} />
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(34,197,94,.12)', border: '1.5px solid rgba(34,197,94,.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: 24,
              }}>✓</div>
              <h1 className="auth-h1" style={{ margin: '0 0 12px' }}>Richiesta inviata!</h1>
              <p className="auth-sub" style={{ margin: '0 0 20px', lineHeight: 1.6 }}>
                Abbiamo ricevuto la tua richiesta di accesso al <strong>Partner Portal</strong>.<br/>
                Il team Actify la esaminerà e riceverai una risposta via email entro <strong>1–2 giorni lavorativi</strong>.
              </p>
              <a href="/" className="auth-btn" style={{ display: 'inline-block', textDecoration: 'none', padding: '11px 28px', borderRadius: 9 }}>
                Torna alla home →
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="auth-page">
        <div className="auth-card auth-card-wide">
          <div className="auth-logo">
            <span dangerouslySetInnerHTML={{ __html: markSvg(40) }} />
            <span dangerouslySetInnerHTML={{ __html: logoSvg(180, 50) }} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <button className="btn-ghost" onClick={() => setAccountType(null)} style={{ padding: '4px 0', fontSize: 13 }}>
              ← Torna indietro
            </button>
          </div>

          <h1 className="auth-h1">Richiedi l&apos;accesso Partner</h1>
          <p className="auth-sub">Compila il form — ti invieremo il link di registrazione entro 1–2 giorni lavorativi</p>

          <form onSubmit={handlePartnerRequestSubmit} className="auth-form">
            <div className="field">
              <label>Ragione Sociale *</label>
              <input type="text" value={partnerForm.ragione_sociale}
                onChange={e => updatePartner('ragione_sociale', e.target.value)}
                placeholder="Studio Rossi & Associati S.r.l." required />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Tipo di Studio *</label>
                <select value={partnerForm.tipo_studio}
                  onChange={e => updatePartner('tipo_studio', e.target.value)} required>
                  <option value="">— Seleziona —</option>
                  {STUDIO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field" style={{ maxWidth: 180 }}>
                <label>N° clienti stimati *</label>
                <input type="number" min={1} value={partnerForm.n_clienti}
                  onChange={e => updatePartner('n_clienti', e.target.value)}
                  placeholder="Es. 30" required />
              </div>
            </div>

            <div className="field">
              <label>Email di contatto *</label>
              <input type="email" value={partnerForm.email}
                onChange={e => updatePartner('email', e.target.value)}
                placeholder="mario@studiorossi.it" required autoComplete="email" />
            </div>

            <div className="field">
              <label>Messaggio (opzionale)</label>
              <textarea
                value={partnerForm.messaggio}
                onChange={e => updatePartner('messaggio', e.target.value)}
                placeholder="Raccontaci brevemente il tuo studio e come vorresti usare Actify…"
                rows={3}
                style={{ resize: 'vertical', minHeight: 80 }}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Invio in corso…' : 'Invia richiesta di accesso →'}
            </button>
          </form>

          <p className="auth-link">
            Hai già un account? <a href="/login">Accedi</a>
          </p>
        </div>
      </div>
    );
  }

  // ─── PMI: Step 1 — Plan selection ─────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="reg-plan-page">
        <div className="reg-plan-topbar">
          <div className="plan-logo">
            <span dangerouslySetInnerHTML={{ __html: markSvg(26, 'green') }} />
            <span className="plan-logo-name">Actify</span>
          </div>
          <p className="reg-plan-step-label">Passo 1 di 2 — Scegli il piano</p>
          <a href="/register" className="plan-back-link">← Cambia tipo account</a>
        </div>

        <div className="reg-plan-hero">
          <div className="plan-pill">
            <div className="plan-pill-dot" />
            Reg. UE 2024/1689 · AI Act Compliance
          </div>
          <h1 className="plan-h1">
            Scegli il piano<br />
            <span className="plan-h1-accent">più adatto alla tua azienda</span>
          </h1>
          <p className="plan-sub">Conformità EU AI Act completa. Cambia piano in qualsiasi momento.</p>

          {referralCode && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 10, padding: '10px 18px', margin: '12px 0', fontSize: 14 }}>
              <span style={{ fontSize: 20 }}>🎁</span>
              <div>
                <div style={{ fontWeight: 700, color: '#16a34a' }}>20% di sconto applicato!</div>
                <div style={{ fontSize: 12, color: '#15803d' }}>Codice referral: <strong>{referralCode}</strong> — valido per i primi 12 mesi</div>
              </div>
            </div>
          )}

          <div className="plan-toggle-wrap">
            <button className={`plan-tog-btn${!annual ? ' active' : ''}`} onClick={() => setAnnual(false)}>
              Mensile
            </button>
            <button className={`plan-tog-btn${annual ? ' active' : ''}`} onClick={() => setAnnual(true)}>
              Annuale
              <span className="plan-tog-save">2 mesi gratis</span>
            </button>
          </div>
        </div>

        <div className="plan-cards reg-plan-cards">
          {PLANS.map((plan, planIdx) => {
            const yearlyPrice    = plan.monthly * 10;
            const annualMonthly  = Math.round((yearlyPrice / 12) * 100) / 100;
            const displayPrice   = annual ? annualMonthly : plan.monthly;
            const saving         = Math.round(plan.monthly * 2);
            const refPrice       = Math.round(displayPrice * 0.8 * 100) / 100;
            const isOnHold      = !!plan.onHold;

            return (
              <div
                key={plan.tier}
                className={`plan-card plan-card-anim${plan.highlight ? ' plan-card-premium plan-card-featured' : plan.tier === 'enterprise' ? ' plan-card-enterprise' : plan.tier === 'trial' ? ' plan-card-trial' : ' plan-card-base'}`}
                style={{ '--card-idx': String(planIdx) } as React.CSSProperties}
              >
                {plan.badge && (
                  <div
                    className={`plan-card-badge ${plan.highlight ? 'badge-premium' : 'badge-enterprise'}`}
                    style={isOnHold ? { background: '#334155', color: '#94a3b8', borderColor: '#475569' } : undefined}
                  >
                    {plan.badge}
                  </div>
                )}

                <div className={`plan-card-header plan-card-header-${plan.tier}`}>
                  <div className={`plan-card-header-icon pchi-${plan.tier}`}>
                    {plan.tier === 'trial' && (
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <circle cx="9.5" cy="9.5" r="5.5" stroke="currentColor" strokeWidth="1.7"/>
                        <path d="M14 14L18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                        <path d="M7 9.5h5M9.5 7v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    )}
                    {plan.tier === 'base' && (
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M2 17L7 10.5l3.5 4.5 3.5-6 5.5 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18 5v4.5M18 5h-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                      </svg>
                    )}
                    {plan.tier === 'premium' && (
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M13.5 2L5 13h6.5L9 20 19 9h-6.5L13.5 2z" fill="rgba(74,222,128,.18)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {plan.tier === 'enterprise' && (
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M3 20V9.5L11 4l8 5.5V20H3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                        <rect x="8.5" y="13" width="5" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M7 11h1.5M13.5 11H15M7 14.5h1M14 14.5h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                  <div className="plan-card-name">{plan.name}</div>
                  <div className="plan-card-tagline">{plan.tagline}</div>
                </div>

                <div className="plan-price-wrap">
                  {referralCode && !isOnHold && (
                    <span style={{ fontSize: 14, color: 'var(--muted)', textDecoration: 'line-through', marginRight: 6, alignSelf: 'flex-end', paddingBottom: 4 }}>
                      €{fmtP(plan.monthly)}
                    </span>
                  )}
                  <span className="plan-price-currency">€</span>
                  <span className="plan-price-amount" style={referralCode && !isOnHold ? { color: '#16a34a' } : undefined}>
                    {(() => { const p = referralCode && !isOnHold ? fmtP(refPrice) : fmtP(displayPrice); const [int, dec] = p.split(','); return <>{int}{dec && <span className="plan-price-cents">,{dec}</span>}</>; })()}
                  </span>
                  <span className="plan-price-period">/mese</span>
                </div>

                {annual ? (
                  <div className="plan-price-annual">
                    €{yearlyPrice.toLocaleString('it-IT')}/anno
                    <span className="plan-price-saving"> · risparmia €{saving}</span>
                  </div>
                ) : (
                  <div className="plan-price-annual">
                    €{yearlyPrice.toLocaleString('it-IT')}/anno con fatturazione annuale
                  </div>
                )}

                {isOnHold ? (
                  <button className="plan-cta" disabled style={{ background: '#1e293b', color: '#64748b', border: '1px solid #334155', cursor: 'not-allowed' }}>
                    Disponibile presto
                  </button>
                ) : (
                  <button
                    className={`plan-cta${plan.highlight ? ' plan-cta-featured' : ''}`}
                    onClick={() => choosePlan(plan.tier)}
                  >
                    Inizia con {plan.name} →
                  </button>
                )}

                <div className="plan-features" style={isOnHold ? { filter: 'blur(4px)', opacity: 0.4, userSelect: 'none', pointerEvents: 'none' } : undefined}>
                  <div className="plan-feat-title">Cosa include</div>
                  {plan.features.filter(f => plan.tier !== 'trial' || f.ok !== false).map(f => (
                    <div key={f.label} className={`plan-feat-row${!f.ok ? ' plan-feat-off' : ''}`}>
                      <FeatIcon ok={f.ok} />
                      <span className="plan-feat-label">{f.label}</span>
                      {f.value && <span className="plan-feat-value">{f.value}</span>}
                    </div>
                  ))}
                </div>

                {isOnHold && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 20 }}>
                    <div style={{
                      transform: 'rotate(-28deg)',
                      padding: '11px 52px',
                      background: 'rgba(15,23,42,0.65)',
                      border: '2px solid rgba(234,179,8,0.55)',
                      borderRadius: 6,
                      color: 'rgba(250,204,21,0.9)',
                      fontSize: 17,
                      fontWeight: 900,
                      letterSpacing: '5px',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      textShadow: '0 0 20px rgba(234,179,8,0.4)',
                    }}>
                      Work in Progress
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust signals */}
        <div className="plan-trust-row">
          <div className="plan-trust-item">
            <div className="plan-trust-tdot" />
            Cambia piano quando vuoi
          </div>
          <div className="plan-trust-item">
            <div className="plan-trust-tdot" />
            Dati in EU · GDPR compliant
          </div>
          <div className="plan-trust-item">
            <div className="plan-trust-tdot" />
            AWS eu-central-1 (Frankfurt)
          </div>
        </div>

        <div style={{ maxWidth: 780, margin: '20px auto 8px', padding: '14px 20px', background: 'rgba(100,116,139,.05)', border: '1px solid rgba(100,116,139,.13)', borderRadius: 10, fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Nota sul supporto — tutti i piani</strong>
          Il supporto Actify è un <strong>supporto tecnico sull&apos;utilizzo della piattaforma</strong>: risponde a domande su funzionalità, configurazione e utilizzo degli strumenti. Non include consulenza normativa, pareri legali né interpretazioni vincolanti del Reg. UE 2024/1689.
          <span style={{ display: 'block', marginTop: 6 }}>
            <strong>Starter:</strong> email standard, risposta entro 3 gg lavorativi, senza SLA. &nbsp;|&nbsp;
            <strong>Professional:</strong> email prioritaria entro 1 gg lavorativo + 1 call mensile di 30 min con il team.
          </span>
        </div>

        <p className="plan-footer-note">
          Puoi cambiare piano in qualsiasi momento.
        </p>
      </div>
    );
  }

  // ─── PMI: Step 2 — Registration form ──────────────────────────────────────
  const planInfo = PLANS.find(p => p.tier === selectedPlan);

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <span dangerouslySetInnerHTML={{ __html: markSvg(40) }} />
          <span dangerouslySetInnerHTML={{ __html: logoSvg(180, 50) }} />
        </div>

        <div className="reg-steps">
          <div className="reg-step reg-step-done">
            <div className="reg-step-dot">✓</div>
            <span>Piano selezionato</span>
          </div>
          <div className="reg-step-line" />
          <div className="reg-step reg-step-active">
            <div className="reg-step-dot">2</div>
            <span>Crea account</span>
          </div>
        </div>

        {planInfo && (
          <div className="reg-plan-chip">
            <div className="reg-plan-chip-left">
              <span className={`tier-badge tier-${selectedPlan}`}>{planInfo.name}</span>
              <span className="reg-plan-chip-price">
                {referralCode ? (
                  <>
                    <span style={{ textDecoration: 'line-through', color: 'var(--muted)', marginRight: 4 }}>€{fmtP(planInfo.monthly)}</span>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>€{fmtP(Math.round(planInfo.monthly * 0.8 * 100) / 100)}/mese</span>
                  </>
                ) : (
                  `€${fmtP(planInfo.monthly)}/mese${annual ? ` · €${planInfo.monthly * 10}/anno` : ''}`
                )}
              </span>
              {referralCode && (
                <span style={{ fontSize: 11, background: 'rgba(34,197,94,.15)', color: '#16a34a', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                  🎁 Ref: {referralCode}
                </span>
              )}
            </div>
            <button className="reg-plan-chip-change" onClick={() => setStep(1)}>
              Cambia piano
            </button>
          </div>
        )}

        <h1 className="auth-h1">Registra la tua azienda</h1>
        <p className="auth-sub">Crea il tuo account per iniziare</p>

        <form onSubmit={handlePMISubmit} className="auth-form">
          <div className="field">
            <label>Nome Azienda *</label>
            <input type="text" value={form.company_name} onChange={e => update('company_name', e.target.value)}
              placeholder="Acme S.r.l." required />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Settore *</label>
              <select value={form.sector} onChange={e => update('sector', e.target.value)} required>
                <option value="">— Seleziona —</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {form.sector === 'Altro - specifica' && (
                <input type="text" style={{ marginTop: 8 }} value={sectorCustom}
                  onChange={e => setSectorCustom(e.target.value)}
                  placeholder="Es. Agroalimentare, Moda, Sport..." required />
              )}
            </div>
            <div className="field">
              <label>Dimensione *</label>
              <select value={form.employees_range} onChange={e => update('employees_range', e.target.value)} required>
                <option value="">— Dipendenti —</option>
                {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Email aziendale *</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
              placeholder="mario@azienda.it" required autoComplete="email" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Password *</label>
              <input type="password" value={form.password} onChange={e => update('password', e.target.value)}
                placeholder="Min. 8 caratteri" required autoComplete="new-password" />
            </div>
            <div className="field">
              <label>Conferma Password *</label>
              <input type="password" value={form.confirm} onChange={e => update('confirm', e.target.value)}
                placeholder="Ripeti la password" required autoComplete="new-password" />
            </div>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Registrazione in corso…' : `Crea Account con piano ${planInfo?.name ?? ''} →`}
          </button>
        </form>

        <p className="auth-link">
          Hai già un account? <a href="/login">Accedi</a>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--muted)' }}>Caricamento…</div>}>
      <RegisterPageInner />
    </Suspense>
  );
}
