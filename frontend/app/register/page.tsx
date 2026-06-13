'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { doSignIn, doSignOut, setSessionCookie } from '@/lib/auth';
import { api } from '@/lib/api';
import { markSvg, logoSvg } from '@/lib/branding';

configureAmplify();

type AccountType = 'pmi' | 'partner';
type PlanTier = 'base' | 'premium' | 'enterprise';
type FeatureOk = boolean | 'partial';
interface PlanFeature { label: string; value: string | null; ok: FeatureOk; }
interface Plan {
  tier: PlanTier; name: string; monthly: number; tagline: string;
  highlight: boolean; badge: string | null; onHold?: boolean; features: PlanFeature[];
}

const PLANS: Plan[] = [
  {
    tier: 'base', name: 'Starter', monthly: 79, tagline: 'Per chi inizia il percorso di compliance',
    highlight: false, badge: null,
    features: [
      { label: 'AI Inventory',            value: 'fino a 10 tool',                ok: true },
      { label: 'Gap Analysis',            value: null,                             ok: true },
      { label: 'Fine Board Estimation',   value: null,                             ok: true },
      { label: 'AI Literacy Tracker',     value: null,                             ok: true },
      { label: 'Document Vault',          value: '5 categorie di documenti',       ok: true },
      { label: 'Audit Trail',             value: null,                             ok: true },
      { label: 'Supporto email standard', value: 'Risposta entro 3 gg lavorativi', ok: true },
    ],
  },
  {
    tier: 'premium', name: 'Professional', monthly: 149, tagline: 'Per aziende che vogliono compliance attiva',
    highlight: true, badge: 'Più popolare',
    features: [
      { label: 'AI Inventory',            value: 'Illimitata',                             ok: true },
      { label: 'Gap Analysis',            value: null,                                     ok: true },
      { label: 'Fine Board Estimation',   value: null,                                     ok: true },
      { label: 'AI Literacy Tracker',     value: null,                                     ok: true },
      { label: 'Document Vault',          value: 'Tutte le categorie + FRIA',              ok: true },
      { label: 'Audit Trail',             value: null,                                     ok: true },
      { label: 'Testo AI Act ufficiale',  value: 'navigabile + link dalla Gap Analysis',   ok: true },
      { label: 'Supporto prioritario',    value: '1 gg lavorativo + call mensile 30 min', ok: true },
    ],
  },
  {
    tier: 'enterprise', name: 'Enterprise', monthly: 249, tagline: 'Funzionalità avanzate per grandi organizzazioni',
    highlight: false, badge: 'Prossimamente', onHold: true,
    features: [
      { label: 'Tutto di Professional',    value: null, ok: true },
      { label: 'AI Inventory illimitato',  value: null, ok: true },
      { label: 'Vendor Hub / DPA tracker', value: null, ok: true },
      { label: 'Regulatory Feed',          value: null, ok: true },
      { label: 'SLA e supporto dedicato',  value: null, ok: true },
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

function RegisterPageInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const [referralCode, setReferralCode] = useState('');
  const [pmiId, setPmiId] = useState('');

  useEffect(() => {
    const ref = searchParams.get('ref') ?? '';
    if (ref) setReferralCode(ref.toUpperCase());
    if (searchParams.get('type') === 'pmi') setAccountType('pmi');
    const pmi = searchParams.get('pmi') ?? '';
    if (pmi) setPmiId(pmi);
  }, [searchParams]);

  // Step 0 = account type, 1 = plan (PMI only), 2 = form
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [annual, setAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);

  // PMI form
  const [form, setForm] = useState({
    company_name: '', email: '', password: '', confirm: '',
    sector: '', employees_range: '', country: 'Italia',
  });
  const [sectorCustom, setSectorCustom] = useState('');

  // Partner form
  const [partnerForm, setPartnerForm] = useState({
    ragione_sociale: '', tipo_studio: '', n_clienti: '',
    email: '', password: '', confirm: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  // ─── PMI submit ─────────────────────────────────────────────────────────────
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
        if (selectedPlan) {
          await api.company.update({ subscription_tier: selectedPlan }).catch(() => {});
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

  // ─── Partner submit ──────────────────────────────────────────────────────────
  async function handlePartnerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (partnerForm.password !== partnerForm.confirm) { setError('Le password non coincidono.'); return; }
    if (partnerForm.password.length < 8) { setError('La password deve avere almeno 8 caratteri.'); return; }
    const nClienti = parseInt(partnerForm.n_clienti, 10);
    if (!nClienti || nClienti < 1) { setError('Inserisci il numero di clienti.'); return; }
    setLoading(true);
    try {
      await api.partner.register({
        email:           partnerForm.email,
        password:        partnerForm.password,
        ragione_sociale: partnerForm.ragione_sociale,
        tipo_studio:     partnerForm.tipo_studio,
        n_clienti:       nClienti,
      });
      await doSignOut().catch(() => {});
      const result = await doSignIn(partnerForm.email, partnerForm.password);
      if (result.isSignedIn) {
        setSessionCookie();
        router.push('/partner');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Errore durante la registrazione.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Step 0: Account type ──────────────────────────────────────────────────
  if (!accountType) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card-wide" style={{ maxWidth: 600 }}>
          <div className="auth-logo">
            <span dangerouslySetInnerHTML={{ __html: markSvg(40) }} />
            <span dangerouslySetInnerHTML={{ __html: logoSvg(180, 50) }} />
          </div>
          <h1 className="auth-h1" style={{ marginBottom: 8 }}>Benvenuto su Actify</h1>
          <p className="auth-sub" style={{ marginBottom: 32 }}>Seleziona il tipo di account</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button
              className="acct-type-card"
              onClick={() => setAccountType('pmi')}
            >
              <div className="acct-type-icon">🏢</div>
              <div>
                <div className="acct-type-title">Sono una PMI</div>
                <div className="acct-type-sub">Voglio gestire la mia compliance AI Act in autonomia</div>
              </div>
              <span className="acct-type-arrow">→</span>
            </button>

            <button
              className="acct-type-card"
              onClick={() => setAccountType('partner')}
            >
              <div className="acct-type-icon">⚖️</div>
              <div>
                <div className="acct-type-title">Sono un Partner</div>
                <div className="acct-type-sub">Studio Legale, Commercialista, DPO — gestisco la compliance di più clienti</div>
              </div>
              <span className="acct-type-arrow">→</span>
            </button>
          </div>

          <p className="auth-link" style={{ marginTop: 32 }}>
            Hai già un account? <a href="/login">Accedi</a>
          </p>
        </div>
      </div>
    );
  }

  // ─── Partner registration form ─────────────────────────────────────────────
  if (accountType === 'partner') {
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

          <h1 className="auth-h1">Registra il tuo Studio</h1>
          <p className="auth-sub">Account Partner — gestisci la compliance dei tuoi clienti</p>

          <form onSubmit={handlePartnerSubmit} className="auth-form">
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
              <label>Email *</label>
              <input type="email" value={partnerForm.email}
                onChange={e => updatePartner('email', e.target.value)}
                placeholder="mario@studiorossi.it" required autoComplete="email" />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Password *</label>
                <input type="password" value={partnerForm.password}
                  onChange={e => updatePartner('password', e.target.value)}
                  placeholder="Min. 8 caratteri" required autoComplete="new-password" />
              </div>
              <div className="field">
                <label>Conferma Password *</label>
                <input type="password" value={partnerForm.confirm}
                  onChange={e => updatePartner('confirm', e.target.value)}
                  placeholder="Ripeti la password" required autoComplete="new-password" />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Registrazione in corso…' : 'Crea Account Partner →'}
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
          <h1 className="plan-h1">Scegli il piano<br />più adatto alla tua azienda</h1>
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
          {PLANS.map(plan => {
            const yearlyPrice    = plan.monthly * 10;
            const basePrice     = annual ? Math.round(yearlyPrice / 12) : plan.monthly;
            const displayPrice  = referralCode ? Math.round(basePrice * 0.8) : basePrice;
            const saving        = plan.monthly * 2;
            const isOnHold      = !!plan.onHold;

            return (
              <div
                key={plan.tier}
                className={`plan-card${plan.highlight ? ' plan-card-premium plan-card-featured' : plan.tier === 'enterprise' ? ' plan-card-enterprise' : ' plan-card-base'}`}
                style={isOnHold ? { opacity: 0.55, filter: 'grayscale(0.4)', pointerEvents: 'none' } : undefined}
              >
                {plan.badge && (
                  <div
                    className={`plan-card-badge ${plan.highlight ? 'badge-premium' : 'badge-enterprise'}`}
                    style={isOnHold ? { background: '#334155', color: '#94a3b8', borderColor: '#475569' } : undefined}
                  >
                    {plan.badge}
                  </div>
                )}

                <div className="plan-card-head">
                  <div className="plan-card-name">{plan.name}</div>
                  <div className="plan-card-tagline">{plan.tagline}</div>
                </div>

                <div className="plan-price-wrap">
                  {referralCode && !isOnHold && (
                    <span style={{ fontSize: 14, color: 'var(--muted)', textDecoration: 'line-through', marginRight: 6, alignSelf: 'flex-end', paddingBottom: 4 }}>
                      €{basePrice}
                    </span>
                  )}
                  <span className="plan-price-currency">€</span>
                  <span className="plan-price-amount" style={referralCode && !isOnHold ? { color: '#16a34a' } : undefined}>{displayPrice}</span>
                  <span className="plan-price-period">/mese</span>
                </div>

                {!isOnHold && (annual ? (
                  <div className="plan-price-annual">
                    €{yearlyPrice.toLocaleString('it-IT')}/anno
                    <span className="plan-price-saving"> · risparmia €{saving}</span>
                  </div>
                ) : (
                  <div className="plan-price-annual">
                    €{yearlyPrice.toLocaleString('it-IT')}/anno con fatturazione annuale
                  </div>
                ))}

                {isOnHold ? (
                  <button className="plan-cta" disabled style={{ background: '#1e293b', color: '#64748b', border: '1px solid #334155', cursor: 'not-allowed' }}>
                    🔒 In lavorazione — disponibile presto
                  </button>
                ) : (
                  <button
                    className={`plan-cta${plan.highlight ? ' plan-cta-featured' : ''}`}
                    onClick={() => choosePlan(plan.tier)}
                  >
                    Inizia con {plan.name} →
                  </button>
                )}

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

        <div style={{ maxWidth: 780, margin: '16px auto 8px', padding: '14px 20px', background: 'rgba(100,116,139,.06)', border: '1px solid rgba(100,116,139,.15)', borderRadius: 10, fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Nota sul supporto — tutti i piani</strong>
          Il supporto Actify è un <strong>supporto tecnico sull'utilizzo della piattaforma</strong>: risponde a domande su funzionalità, configurazione e utilizzo degli strumenti. Non include consulenza normativa, pareri legali né interpretazioni vincolanti del Reg. UE 2024/1689.
          <span style={{ display: 'block', marginTop: 6 }}>
            <strong>Starter:</strong> email standard, risposta entro 3 gg lavorativi, senza SLA. &nbsp;|&nbsp;
            <strong>Professional:</strong> email prioritaria entro 1 gg lavorativo + 1 call mensile di 30 min con il team.
          </span>
        </div>

        <p className="plan-footer-note">
          Nessuna carta di credito richiesta. Puoi cambiare piano in qualsiasi momento.
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
                    <span style={{ textDecoration: 'line-through', color: 'var(--muted)', marginRight: 4 }}>€{planInfo.monthly}</span>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>€{Math.round(planInfo.monthly * 0.8)}/mese</span>
                  </>
                ) : (
                  `€${planInfo.monthly}/mese${annual ? ` · €${planInfo.monthly * 10}/anno` : ''}`
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
