'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { doSignIn, doSignOut, setSessionCookie } from '@/lib/auth';
import { api } from '@/lib/api';
import { markSvg, logoSvg } from '@/lib/branding';

configureAmplify();

type PlanTier = 'base' | 'premium' | 'enterprise';
type FeatureOk = boolean | 'partial';
interface PlanFeature { label: string; value: string | null; ok: FeatureOk; }
interface Plan {
  tier: PlanTier; name: string; monthly: number; tagline: string;
  highlight: boolean; badge: string | null; features: PlanFeature[];
}

const PLANS: Plan[] = [
  {
    tier: 'base', name: 'Base', monthly: 99, tagline: 'Per chi inizia il percorso di compliance',
    highlight: false, badge: null,
    features: [
      { label: 'AI Inventory', value: 'fino a 5 tool', ok: true },
      { label: 'Document Vault', value: 'limitato', ok: true },
      { label: 'Fine Board', value: 'solo ultimo check', ok: 'partial' },
      { label: 'AI Literacy Tracker', value: null, ok: false },
      { label: 'Vendor Hub / DPA tracker', value: null, ok: false },
      { label: 'Regulatory Feed', value: null, ok: false },
      { label: 'Audit Trail immutabile', value: null, ok: false },
      { label: 'Export PDF/Word', value: null, ok: true },
      { label: 'SLA e supporto dedicato', value: null, ok: false },
    ],
  },
  {
    tier: 'premium', name: 'Premium', monthly: 149, tagline: 'Per aziende che vogliono compliance attiva',
    highlight: true, badge: 'Più popolare',
    features: [
      { label: 'AI Inventory', value: 'fino a 20 tool', ok: true },
      { label: 'Document Vault', value: 'completo', ok: true },
      { label: 'Fine Board', value: 'storico completo', ok: true },
      { label: 'AI Literacy Tracker', value: null, ok: true },
      { label: 'Vendor Hub / DPA tracker', value: null, ok: false },
      { label: 'Regulatory Feed', value: null, ok: true },
      { label: 'Audit Trail immutabile', value: null, ok: true },
      { label: 'Export PDF/Word', value: null, ok: true },
      { label: 'SLA e supporto dedicato', value: null, ok: false },
    ],
  },
  {
    tier: 'enterprise', name: 'Enterprise', monthly: 249, tagline: 'Per aziende strutturate e avanzate',
    highlight: false, badge: 'Completo',
    features: [
      { label: 'AI Inventory', value: 'illimitato', ok: true },
      { label: 'Document Vault', value: 'completo', ok: true },
      { label: 'Fine Board', value: 'storico completo', ok: true },
      { label: 'AI Literacy Tracker', value: null, ok: true },
      { label: 'Vendor Hub / DPA tracker', value: null, ok: true },
      { label: 'Regulatory Feed', value: null, ok: true },
      { label: 'Audit Trail immutabile', value: null, ok: true },
      { label: 'Export PDF/Word', value: null, ok: true },
      { label: 'SLA e supporto dedicato', value: null, ok: true },
    ],
  },
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

export default function RegisterPage() {
  const router = useRouter();

  // Step 1 = plan selection, Step 2 = registration form
  const [step, setStep] = useState<1 | 2>(1);
  const [annual, setAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);

  const [form, setForm] = useState({
    company_name: '', email: '', password: '', confirm: '',
    sector: '', employees_range: '', country: 'Italia',
  });
  const [sectorCustom, setSectorCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function choosePlan(tier: PlanTier) {
    setSelectedPlan(tier);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: React.FormEvent) {
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
      });
      await doSignOut().catch(() => {});
      const result = await doSignIn(form.email, form.password);
      if (result.isSignedIn) {
        setSessionCookie();
        // Set the chosen plan, then go directly to setup
        if (selectedPlan) {
          await api.company.update({ subscription_tier: selectedPlan }).catch(() => {});
        }
        router.push('/dashboard/setup');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Errore durante la registrazione.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Step 1: Plan selection ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="reg-plan-page">
        <div className="reg-plan-topbar">
          <div className="plan-logo">
            <span dangerouslySetInnerHTML={{ __html: markSvg(26, 'green') }} />
            <span className="plan-logo-name">Actify</span>
          </div>
          <p className="reg-plan-step-label">Passo 1 di 2 — Scegli il piano</p>
          <a href="/login" className="plan-back-link">Hai già un account? Accedi</a>
        </div>

        <div className="reg-plan-hero">
          <h1 className="plan-h1">Scegli il piano<br />più adatto alla tua azienda</h1>
          <p className="plan-sub">Conformità EU AI Act completa. Cambia piano in qualsiasi momento.</p>

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
          {PLANS.map(plan => {
            const yearlyPrice  = plan.monthly * 10;
            const displayPrice = annual ? Math.round(yearlyPrice / 12) : plan.monthly;
            const saving       = plan.monthly * 2;

            return (
              <div
                key={plan.tier}
                className={`plan-card${plan.highlight ? ' plan-card-premium plan-card-featured' : plan.tier === 'enterprise' ? ' plan-card-enterprise' : ' plan-card-base'}`}
              >
                {plan.badge && (
                  <div className={`plan-card-badge ${plan.highlight ? 'badge-premium' : 'badge-enterprise'}`}>
                    {plan.badge}
                  </div>
                )}

                <div className="plan-card-head">
                  <div className="plan-card-name">{plan.name}</div>
                  <div className="plan-card-tagline">{plan.tagline}</div>
                </div>

                <div className="plan-price-wrap">
                  <span className="plan-price-currency">€</span>
                  <span className="plan-price-amount">{displayPrice}</span>
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

                <button
                  className={`plan-cta${plan.highlight ? ' plan-cta-featured' : ''}`}
                  onClick={() => choosePlan(plan.tier)}
                >
                  Inizia con {plan.name} →
                </button>

                <div className="plan-features">
                  <div className="plan-feat-title">Cosa include</div>
                  {plan.features.map(f => (
                    <div key={f.label} className={`plan-feat-row${!f.ok ? ' plan-feat-off' : ''}`}>
                      <FeatIcon ok={f.ok} />
                      <span className="plan-feat-label">{f.label}</span>
                      {f.value && <span className="plan-feat-value">{f.value}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="plan-footer-note">
          Nessuna carta di credito richiesta. Puoi cambiare piano in qualsiasi momento.
        </p>
      </div>
    );
  }

  // ─── Step 2: Registration form ─────────────────────────────────────────────
  const planInfo = PLANS.find(p => p.tier === selectedPlan);

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <span dangerouslySetInnerHTML={{ __html: markSvg(40) }} />
          <span dangerouslySetInnerHTML={{ __html: logoSvg(180, 50) }} />
        </div>

        {/* Step indicator */}
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

        {/* Selected plan chip */}
        {planInfo && (
          <div className="reg-plan-chip">
            <div className="reg-plan-chip-left">
              <span className={`tier-badge tier-${selectedPlan}`}>{planInfo.name}</span>
              <span className="reg-plan-chip-price">
                €{planInfo.monthly}/mese{annual ? ` · €${planInfo.monthly * 10}/anno` : ''}
              </span>
            </div>
            <button className="reg-plan-chip-change" onClick={() => setStep(1)}>
              Cambia piano
            </button>
          </div>
        )}

        <h1 className="auth-h1">Registra la tua azienda</h1>
        <p className="auth-sub">Crea il tuo account per iniziare</p>

        <form onSubmit={handleSubmit} className="auth-form">
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
