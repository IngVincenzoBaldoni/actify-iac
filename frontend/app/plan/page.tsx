'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { isAuthenticated } from '@/lib/auth';
import { api } from '@/lib/api';
import { markSvg } from '@/lib/branding';

configureAmplify();

export type PlanTier = 'trial' | 'base' | 'premium' | 'enterprise';

type FeatureOk = boolean | 'partial';

interface PlanFeature { label: string; value: string | null; ok: FeatureOk; }
interface Plan {
  tier: PlanTier; name: string; monthly: number; tagline: string;
  color: string; badge: string | null; toolLimit: number;
  icon: string;
  onHold?: boolean;
  features: PlanFeature[];
}

const PLANS: Plan[] = [
  {
    tier: 'trial',
    name: 'Trial',
    monthly: 19.9,
    tagline: 'Diagnosi e assessment — scopri dove sei',
    color: 'plan-card-trial',
    badge: null,
    icon: '🔬',
    toolLimit: 5,
    features: [
      { label: 'AIPI — AI Passports Inventory', value: 'Fino a 5 tool AI censiti',    ok: true },
      { label: 'Gap Analysis',                  value: null,                          ok: true },
      { label: 'FEB (Fine Board Estimation)',    value: null,                          ok: true },
      { label: 'Audit Trail',                   value: null,                          ok: true },
      { label: 'AI Literacy Tracker',           value: null,                          ok: false },
      { label: 'Document Vault',                value: null,                          ok: false },
      { label: 'NBA (Next Best Action)',         value: null,                          ok: false },
      { label: 'Supporto email',                value: 'Risposta entro 5 gg lavorativi', ok: true },
    ],
  },
  {
    tier: 'base',
    name: 'Starter',
    monthly: 59.9,
    tagline: 'Per chi inizia il percorso di compliance',
    color: 'plan-card-base',
    badge: null,
    icon: '🚀',
    toolLimit: 10,
    features: [
      { label: 'AIPI — AI Passports Inventory', value: 'Fino a 10 tool AI censiti',  ok: true },
      { label: 'Gap Analysis',                 value: null,                          ok: true },
      { label: 'FEB (Fine Board Estimation)',   value: null,                          ok: true },
      { label: 'AI Literacy Tracker',          value: null,                          ok: true },
      { label: 'Document Vault',               value: '5 categorie di documenti',    ok: true },
      { label: 'Audit Trail',                  value: null,                          ok: true },
      { label: 'Team collaborativo',           value: 'Fino a 3 membri',             ok: true },
      { label: 'Supporto email standard',      value: 'Risposta entro 3 gg lavorativi', ok: true },
    ],
  },
  {
    tier: 'premium',
    name: 'Professional',
    monthly: 99.9,
    tagline: 'Per aziende che vogliono compliance attiva',
    color: 'plan-card-premium',
    badge: 'Più popolare',
    icon: '⚡',
    toolLimit: Infinity,
    features: [
      { label: 'AIPI — AI Passports Inventory', value: 'Illimitata',                              ok: true },
      { label: 'Gap Analysis',                 value: null,                                      ok: true },
      { label: 'FEB (Fine Board Estimation)',   value: null,                                      ok: true },
      { label: 'NBA (Next Best Action)',        value: null,                                      ok: true },
      { label: 'AI Literacy Tracker',          value: null,                                      ok: true },
      { label: 'Document Vault',               value: 'Tutte le categorie + FRIA',               ok: true },
      { label: 'Audit Trail',                  value: null,                                      ok: true },
      { label: 'Team collaborativo',           value: 'Fino a 10 membri',                        ok: true },
      { label: 'Testo AI Act ufficiale',       value: 'navigabile + link dalla Gap Analysis',    ok: true },
      { label: 'Supporto prioritario',         value: '1 gg lavorativo + call mensile 1h',      ok: true },
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    monthly: 249,
    tagline: 'Funzionalità avanzate per grandi organizzazioni',
    color: 'plan-card-enterprise',
    badge: 'Prossimamente',
    icon: '🏛️',
    toolLimit: Infinity,
    onHold: true,
    features: [
      { label: 'AIPI — AI Passports Inventory', value: 'Illimitata',                     ok: true },
      { label: 'Document Vault',            value: 'Tutte le categorie + FRIA',         ok: true },
      { label: 'Testo AI Act ufficiale',    value: 'navigabile + link Gap Analysis',    ok: true },
      { label: 'Supporto prioritario',      value: '1 gg + call mensile 1h',            ok: true },
      { label: 'Vendor Hub / DPA tracker',  value: null,                                ok: true },
      { label: 'Regulatory Feed avanzato',  value: null,                                ok: true },
    ],
  },
];

function FeatureIcon({ ok }: { ok: boolean | 'partial' }) {
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

function fmtP(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(2).replace('.', ',');
}

function PlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboard  = searchParams.get('onboard')  === '1';
  const expired  = searchParams.get('expired')  === '1';

  const [annual, setAnnual] = useState(false);
  const [selecting, setSelecting] = useState<PlanTier | null>(null);
  const [error, setError] = useState('');
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [hasStripe, setHasStripe] = useState(false);

  useEffect(() => {
    if (onboard) return;
    isAuthenticated().then(ok => {
      if (!ok) return;
      api.company.get().then((c: unknown) => {
        const co = c as Record<string, unknown>;
        setCurrentTier((co.subscription_tier as string) ?? null);
        setHasStripe(!!co.stripe_subscription_id);
      }).catch(() => {});
    });
  }, [onboard]);

  async function selectPlan(tier: PlanTier) {
    setError('');
    setSelecting(tier);
    try {
      const ok = await isAuthenticated();
      if (!ok) { router.push('/login'); return; }

      const billingCycle = annual ? 'annual' : 'monthly';

      if (expired && tier !== 'enterprise') {
        const { url } = await api.billing.createCheckoutSession({ tier, billing_cycle: billingCycle });
        window.location.href = url;
        return;
      }

      if (hasStripe && tier !== 'enterprise') {
        await api.billing.changePlan({ tier, billing_cycle: billingCycle });
        router.push('/dashboard/settings?changed=1');
        return;
      }

      await api.company.update({ subscription_tier: tier });
      router.push(onboard ? '/dashboard/setup' : '/dashboard/settings');
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'Errore. Riprova.');
      setSelecting(null);
    }
  }

  return (
    <div className="plan-page">
      <div className="plan-topbar">
        <div className="plan-logo">
          <span dangerouslySetInnerHTML={{ __html: markSvg(28, 'green') }} />
          <span className="plan-logo-name">Actify</span>
        </div>
        {!onboard && (
          <a href="/dashboard/settings" className="plan-back-link">← Torna alle impostazioni</a>
        )}
      </div>

      {expired && (
        <div style={{
          margin: '0 auto 0', maxWidth: 900, padding: '14px 24px',
          background: 'rgba(239,68,68,.10)', border: '1px solid rgba(239,68,68,.30)',
          borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="10" cy="10" r="9" stroke="rgba(239,68,68,.7)" strokeWidth="1.5"/>
            <path d="M10 6v5M10 14v.5" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5' }}>Il tuo abbonamento è scaduto</div>
            <div style={{ fontSize: 13, color: 'rgba(252,165,165,.75)', marginTop: 2 }}>Scegli un piano per riprendere l&apos;accesso ad Actify.</div>
          </div>
        </div>
      )}

      <div className="plan-hero">
        <div className="plan-pill">
          <div className="plan-pill-dot" />
          Reg. UE 2024/1689 · AI Act Compliance
        </div>
        <h1 className="plan-h1">Scegli il piano giusto<br /><span className="plan-h1-accent">per la tua azienda</span></h1>
        <p className="plan-sub">
          Conformità EU AI Act senza sorprese. Cambia piano in qualsiasi momento.
        </p>

        <div className="plan-toggle-wrap">
          <button
            className={`plan-tog-btn${!annual ? ' active' : ''}`}
            onClick={() => setAnnual(false)}
          >
            Mensile
          </button>
          <button
            className={`plan-tog-btn${annual ? ' active' : ''}`}
            onClick={() => setAnnual(true)}
          >
            Annuale
            <span className="plan-tog-save">2 mesi gratis</span>
          </button>
        </div>

        {annual && (
          <p className="plan-annual-note">
            Fatturazione annuale — equivalente a pagare 10 mesi, risparmi 2.
          </p>
        )}
      </div>

      <div className="plan-cards">
        {PLANS.map(plan => {
          const yearlyPrice    = plan.monthly * 10;
          const annualMonthly  = Math.round((yearlyPrice / 12) * 100) / 100;
          const displayPrice   = annual ? annualMonthly : plan.monthly;
          const saving         = Math.round(plan.monthly * 2);
          const isBusy       = selecting === plan.tier;
          const isOnHold     = !!plan.onHold;
          const isCurrent    = !onboard && !expired && hasStripe && currentTier === plan.tier;
          const ctaLabel     = isCurrent
            ? 'Piano attuale'
            : hasStripe && !expired && plan.tier !== 'enterprise'
              ? currentTier && ['trial','base','premium'].indexOf(plan.tier) > ['trial','base','premium'].indexOf(currentTier)
                ? `Passa a ${plan.name} →`
                : `Passa a ${plan.name} →`
              : `Inizia con ${plan.name} →`;

          return (
            <div
              key={plan.tier}
              className={`plan-card ${plan.color}${plan.badge === 'Più popolare' ? ' plan-card-featured' : ''}`}
              style={isOnHold ? { position: 'relative', overflow: 'hidden' } : undefined}
            >
              {plan.badge && (
                <div className={`plan-card-badge ${plan.tier === 'premium' ? 'badge-premium' : 'badge-enterprise'}`}
                  style={isOnHold ? { background: '#334155', color: '#94a3b8', borderColor: '#475569' } : undefined}>
                  {plan.badge}
                </div>
              )}

              <div className="plan-card-top">
                <div className="plan-card-icon">{plan.icon}</div>
                <div className="plan-card-name">{plan.name}</div>
                <div className="plan-card-tagline">{plan.tagline}</div>
              </div>

              <div className="plan-price-wrap">
                <span className="plan-price-currency">€</span>
                <span className="plan-price-amount">
                  {fmtP(displayPrice).split(',')[0]}
                  {fmtP(displayPrice).includes(',') && (
                    <span className="plan-price-cents">,{fmtP(displayPrice).split(',')[1]}</span>
                  )}
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
                  O €{yearlyPrice.toLocaleString('it-IT')}/anno con fatturazione annuale
                </div>
              )}

              {isOnHold ? (
                <button className="plan-cta" disabled style={{ background: '#1e293b', color: '#64748b', border: '1px solid #334155', cursor: 'not-allowed' }}>
                  🔒 Disponibile presto
                </button>
              ) : (
                <button
                  className={`plan-cta${plan.badge === 'Più popolare' ? ' plan-cta-featured' : ''}`}
                  onClick={() => selectPlan(plan.tier)}
                  disabled={!!selecting || isCurrent}
                  style={isCurrent ? { opacity: 0.45, cursor: 'default', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.6)' } : undefined}
                >
                  {isBusy ? <span className="plan-cta-spin" /> : ctaLabel}
                </button>
              )}

              <div className="plan-features" style={isOnHold ? { filter: 'blur(4px)', opacity: 0.4, userSelect: 'none', pointerEvents: 'none' } : undefined}>
                <div className="plan-feat-title">Cosa include</div>
                {plan.features.filter(f => f.ok !== false).map(f => (
                  <div key={f.label} className="plan-feat-row">
                    <FeatureIcon ok={f.ok} />
                    <span className="plan-feat-label">{f.label}</span>
                    {f.value && <span className="plan-feat-value">{f.value}</span>}
                  </div>
                ))}
              </div>

              {isOnHold && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 20 }}>
                  <div style={{
                    transform: 'rotate(-30deg)',
                    padding: '11px 52px',
                    background: 'rgba(15,23,42,0.6)',
                    border: '2px solid rgba(234,179,8,0.6)',
                    borderRadius: 6,
                    color: 'rgba(250,204,21,0.92)',
                    fontSize: 18,
                    fontWeight: 900,
                    letterSpacing: '5px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    textShadow: '0 0 24px rgba(234,179,8,0.5)',
                    boxShadow: '0 4px 40px rgba(234,179,8,0.1)',
                  }}>
                    🚧 Work in Progress
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <div className="plan-error">{error}</div>}

      {/* Trust signals */}
      <div className="plan-trust-row">
        <div className="plan-trust-item"><div className="plan-trust-tdot" />Cambia piano quando vuoi</div>
        <div className="plan-trust-item"><div className="plan-trust-tdot" />Dati in EU · GDPR compliant</div>
        <div className="plan-trust-item"><div className="plan-trust-tdot" />AWS eu-central-1 (Frankfurt)</div>
      </div>

      <div style={{ maxWidth: 780, margin: '24px auto 8px', padding: '14px 20px', background: 'rgba(100,116,139,.06)', border: '1px solid rgba(100,116,139,.15)', borderRadius: 10, fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Nota sul supporto — tutti i piani</strong>
        Il supporto Actify è un <strong>supporto tecnico sull'utilizzo della piattaforma</strong>: risponde a domande su funzionalità, configurazione e utilizzo degli strumenti. Non include consulenza normativa, pareri legali né interpretazioni vincolanti del Reg. UE 2024/1689.
        Per questioni di natura legale o normativa si raccomanda di rivolgersi a un professionista qualificato in materia di compliance AI.
        <span style={{ display: 'block', marginTop: 6 }}>
          <strong>Trial:</strong> email, risposta entro 5 giorni lavorativi. &nbsp;|&nbsp;
          <strong>Starter:</strong> email, risposta entro 3 giorni lavorativi, senza garanzia di SLA. &nbsp;|&nbsp;
          <strong>Professional:</strong> email prioritaria entro 1 giorno lavorativo + 1 call mensile 30 min con il team Actify.
        </span>
      </div>

      <div className="plan-footer-note">
        Puoi cambiare o disdire il piano in qualsiasi momento, senza penali.
      </div>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="db-loading"><div className="spin"></div></div>}>
      <PlanContent />
    </Suspense>
  );
}
