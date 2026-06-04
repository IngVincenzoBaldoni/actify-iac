'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { configureAmplify } from '@/lib/amplify';
import { isAuthenticated } from '@/lib/auth';
import { api } from '@/lib/api';
import { markSvg } from '@/lib/branding';

configureAmplify();

export type PlanTier = 'base' | 'premium' | 'enterprise';

type FeatureOk = boolean | 'partial';

interface PlanFeature { label: string; value: string | null; ok: FeatureOk; }
interface Plan {
  tier: PlanTier; name: string; monthly: number; tagline: string;
  color: string; badge: string | null; toolLimit: number;
  features: PlanFeature[];
}

const PLANS: Plan[] = [
  {
    tier: 'base',
    name: 'Base',
    monthly: 99,
    tagline: 'Per chi inizia il percorso di compliance',
    color: 'plan-card-base',
    badge: null,
    toolLimit: 5,
    features: [
      { label: 'AI Inventory', value: 'Fino a 5 tool', ok: true },
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
    tier: 'premium',
    name: 'Premium',
    monthly: 149,
    tagline: 'Per aziende che vogliono compliance attiva',
    color: 'plan-card-premium',
    badge: 'Più popolare',
    toolLimit: 20,
    features: [
      { label: 'AI Inventory', value: 'Fino a 20 tool', ok: true },
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
    tier: 'enterprise',
    name: 'Enterprise',
    monthly: 249,
    tagline: 'Per aziende strutturate con esigenze avanzate',
    color: 'plan-card-enterprise',
    badge: 'Completo',
    toolLimit: Infinity,
    features: [
      { label: 'AI Inventory', value: 'Tool illimitati', ok: true },
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

function PlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboard = searchParams.get('onboard') === '1';

  const [annual, setAnnual] = useState(false);
  const [selecting, setSelecting] = useState<PlanTier | null>(null);
  const [error, setError] = useState('');

  async function selectPlan(tier: PlanTier) {
    setError('');
    setSelecting(tier);
    try {
      const ok = await isAuthenticated();
      if (!ok) { router.push('/login'); return; }
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

      <div className="plan-hero">
        <h1 className="plan-h1">Scegli il piano giusto<br />per la tua azienda</h1>
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
          const yearlyPrice  = plan.monthly * 10;
          const displayPrice = annual ? Math.round(yearlyPrice / 12) : plan.monthly;
          const saving       = plan.monthly * 2;
          const isBusy       = selecting === plan.tier;

          return (
            <div key={plan.tier} className={`plan-card ${plan.color}${plan.badge === 'Più popolare' ? ' plan-card-featured' : ''}`}>
              {plan.badge && (
                <div className={`plan-card-badge ${plan.tier === 'premium' ? 'badge-premium' : 'badge-enterprise'}`}>
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
                  O €{yearlyPrice.toLocaleString('it-IT')}/anno con fatturazione annuale
                </div>
              )}

              <button
                className={`plan-cta${plan.badge === 'Più popolare' ? ' plan-cta-featured' : ''}`}
                onClick={() => selectPlan(plan.tier)}
                disabled={!!selecting}
              >
                {isBusy ? (
                  <span className="plan-cta-spin" />
                ) : (
                  `Inizia con ${plan.name} →`
                )}
              </button>

              <div className="plan-features">
                <div className="plan-feat-title">Cosa include</div>
                {plan.features.map(f => (
                  <div key={f.label} className={`plan-feat-row${!f.ok ? ' plan-feat-off' : ''}`}>
                    <FeatureIcon ok={f.ok} />
                    <span className="plan-feat-label">{f.label}</span>
                    {f.value && <span className="plan-feat-value">{f.value}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="plan-error">{error}</div>}

      <div className="plan-footer-note">
        Nessuna carta di credito richiesta per iniziare. Puoi cambiare o disdire il piano in qualsiasi momento.
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
