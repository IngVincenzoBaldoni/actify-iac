'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { api } from '@/lib/api';
import type { Partner, PartnerPMI } from '@/lib/types';

configureAmplify();

// ─── Pricing ─────────────────────────────────────────────────────────────────

const PLAN_PRICE: Record<string, number> = {
  trial:      0,
  base:       79,
  premium:    129,
  enterprise: 249,
};

const PLAN_LABEL: Record<string, string> = {
  trial:      'Trial (€0/mese)',
  base:       'Starter (€79/mese)',
  premium:    'Professional (€129/mese)',
  enterprise: 'Enterprise (€249/mese)',
};

// ─── Tier gamification ────────────────────────────────────────────────────────

const TIERS = [
  { name: 'Affiliate',         min: 0,   max: 5,        share: 20, icon: '⭐',  color: '#64748b', bg: 'rgba(100,116,139,.1)' },
  { name: 'Associate Partner', min: 6,   max: 20,       share: 25, icon: '🌟', color: '#6C47FF', bg: 'rgba(108,71,255,.1)'  },
  { name: 'Partner',           min: 21,  max: 50,       share: 30, icon: '🥈',  color: '#0ea5e9', bg: 'rgba(14,165,233,.1)'  },
  { name: 'Executive Partner', min: 51,  max: 100,      share: 35, icon: '🥇',  color: '#f59e0b', bg: 'rgba(245,158,11,.1)'  },
  { name: 'Senior Partner',    min: 101, max: Infinity, share: 50, icon: '💎',  color: '#06b6d4', bg: 'rgba(6,182,212,.1)'   },
];

function getTier(count: number) {
  return TIERS.find(t => count >= t.min && count <= t.max) ?? TIERS[0];
}

// Share marginale per posizione 1-based: PMI #1-5 → 20%, #6-20 → 25%, ecc.
function getShareForPosition(pos: number): number {
  if (pos <= 5)   return 20;
  if (pos <= 20)  return 25;
  if (pos <= 50)  return 30;
  if (pos <= 100) return 35;
  return 50;
}

function fmt(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);
}

function fmtInt(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RevenueSharePage() {
  const router = useRouter();

  const [partner, setPartner]   = useState<Partner | null>(null);
  const [pmiList, setPmiList]   = useState<PartnerPMI[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.partner.getMe() as unknown as Promise<Partner>,
      api.partner.listPMI() as Promise<PartnerPMI[]>,
    ]).then(([p, pmi]) => {
      setPartner(p);
      setPmiList(pmi);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 48, color: 'var(--muted)' }}>Caricamento…</div>;

  // ─── Calculations ───────────────────────────────────────────────────────────

  const onboarded = pmiList.filter(p => p.status === 'onboarded');
  const count     = onboarded.length;
  const tier      = getTier(count);
  const tierIdx   = TIERS.indexOf(tier);
  const nextTier  = TIERS[tierIdx + 1] ?? null;
  const progress  = nextTier
    ? Math.min(100, Math.round(((count - tier.min) / (tier.max - tier.min + 1)) * 100))
    : 100;

  const REFERRAL_DISCOUNT = 0.20; // PMI paga 80% grazie al referral partner

  // Ordina per data di onboarding per assegnare la posizione in ordine cronologico
  const sortedOnboarded = [...onboarded].sort((a, b) =>
    new Date(a.onboarded_at ?? a.created_at).getTime() - new Date(b.onboarded_at ?? b.created_at).getTime()
  );

  const pmiRows = sortedOnboarded.map((pmi, idx) => {
    const position    = idx + 1;
    const shareRate   = getShareForPosition(position);
    const subTier     = (pmi.onboarded_company?.subscription_tier ?? 'trial').toLowerCase();
    const listino     = PLAN_PRICE[subTier] ?? 0;
    const monthlyPaid = listino * (1 - REFERRAL_DISCOUNT);
    const myShare     = Math.round(monthlyPaid * shareRate) / 100;
    return { pmi, listino, monthlyPaid, myShare, shareRate, position };
  });

  const totalMRR = pmiRows.reduce((s, r) => s + r.myShare, 0);
  const totalARR = totalMRR * 12;

  // Guadagno marginale della prossima PMI (se si sblocca il tier successivo)
  const avgMonthlyPaid = pmiRows.length > 0
    ? pmiRows.reduce((s, r) => s + r.monthlyPaid, 0) / pmiRows.length
    : PLAN_PRICE['premium'] * (1 - REFERRAL_DISCOUNT);
  const nextPMIShareRate = getShareForPosition(count + 1);
  const nextPMIEarning  = Math.round(avgMonthlyPaid * nextPMIShareRate) / 100;

  return (
    <>
      {/* Top bar */}
      <div className="partner-topbar">
        <div>
          <button
            onClick={() => router.back()}
            style={{ fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 6 }}
          >
            ← Discovery Dashboard
          </button>
          <div className="partner-h1">💰 Revenue Share Program</div>
          <div className="partner-sub">
            {partner?.ragione_sociale ?? 'Account Partner'} — guadagni stimati dalle PMI onboarded
          </div>
        </div>
      </div>

      {/* ─── KPI row ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <KpiCard
          label="MRR stimato"
          value={fmt(totalMRR)}
          sub="Incasso mensile attuale"
          accent="#16a34a"
        />
        <KpiCard
          label="ARR potenziale"
          value={fmtInt(totalARR)}
          sub="Se tutte le PMI rinnovano"
          accent="#6C47FF"
        />
        <KpiCard
          label="Prossima PMI"
          value={`${nextPMIShareRate}%`}
          sub={nextPMIShareRate > getShareForPosition(count) ? `+${fmt(nextPMIEarning)}/mese sbloccando ${nextTier?.name ?? tier.name}` : `${fmt(nextPMIEarning)}/mese stimati`}
          accent={tier.color}
        />
        <KpiCard
          label="PMI Onboardate"
          value={String(count)}
          sub={nextTier ? `${nextTier.min - count} al prossimo livello` : 'Livello massimo'}
          accent="#0ea5e9"
        />
      </div>

      {/* ─── Tier progress ───────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20, color: 'var(--text)' }}>
          Avanzamento Tier Partner
        </div>

        {/* Tier steps */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, position: 'relative' }}>
          {/* connector line */}
          <div style={{ position: 'absolute', top: 20, left: '10%', right: '10%', height: 2, background: 'var(--border)', zIndex: 0 }} />
          {TIERS.map((t, i) => {
            const isActive  = t.name === tier.name;
            const isPast    = i < tierIdx;
            const isFuture  = i > tierIdx;
            return (
              <div key={t.name} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', margin: '0 auto 8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                  background: isPast ? t.bg : isActive ? t.bg : 'var(--surface)',
                  border: `2px solid ${isPast || isActive ? t.color : 'var(--border)'}`,
                  boxShadow: isActive ? `0 0 0 4px ${t.bg}` : 'none',
                  transition: 'all .3s',
                }}>
                  {isPast ? '✓' : t.icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? t.color : isFuture ? 'var(--dim)' : 'var(--muted)' }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                  {t.share}% share
                </div>
                {isActive && (
                  <div style={{ fontSize: 10, color: t.color, fontWeight: 700, marginTop: 2 }}>← sei qui</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        {nextTier && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              <span>{count} PMI onboardate</span>
              <span>Obiettivo: {nextTier.min} PMI → {nextTier.name} ({nextTier.share}%)</span>
            </div>
            <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: `linear-gradient(90deg, ${tier.color}, ${nextTier.color})`,
                borderRadius: 5, transition: 'width .5s',
              }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              Dalla <strong style={{ color: 'var(--text)' }}>{nextTier.min}a PMI in poi</strong> guadagnerai il{' '}
              <strong style={{ color: nextTier.color }}>{nextTier.share}%</strong> su ogni nuova PMI onboardata
              {' '}— le prime {tier.max} rimangono al {tier.share}%.
            </div>
          </div>
        )}
        {!nextTier && (
          <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 13, color: tier.color, fontWeight: 700 }}>
            💎 Hai raggiunto il livello massimo — {tier.share}% su ogni PMI
          </div>
        )}
      </div>

      {/* ─── PMI table ───────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>PMI Onboardate — Dettaglio Guadagni</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>% calcolata per scaglione di posizione</div>
        </div>

        {pmiRows.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            Nessuna PMI ancora onboardata su Actify.<br/>
            <span style={{ fontSize: 12 }}>Una volta che le PMI si registrano, qui vedrai i tuoi guadagni.</span>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Azienda PMI', 'Piano Actify', 'Pagato dalla PMI', 'Share %', 'Tuo Share/mese', 'Tuo Share/anno'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pmiRows.map(({ pmi, listino, monthlyPaid, myShare, shareRate, position }) => {
                  const subTier  = (pmi.onboarded_company?.subscription_tier ?? 'trial').toLowerCase();
                  const tierName = TIERS.find(t => shareRate === t.share)?.name ?? '';
                  return (
                    <tr key={pmi.pmi_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--dim)', fontWeight: 600, width: 36 }}>
                        #{position}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{pmi.company_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{pmi.contact_email}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                          color: subTier === 'trial' ? '#f97316' : subTier === 'enterprise' ? '#06b6d4' : '#6C47FF',
                          background: subTier === 'trial' ? 'rgba(249,115,22,.1)' : subTier === 'enterprise' ? 'rgba(6,182,212,.1)' : 'rgba(108,71,255,.1)',
                          border: `1px solid ${subTier === 'trial' ? 'rgba(249,115,22,.25)' : subTier === 'enterprise' ? 'rgba(6,182,212,.25)' : 'rgba(108,71,255,.25)'}`,
                        }}>
                          {PLAN_LABEL[subTier] ?? subTier}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>
                        {monthlyPaid > 0
                          ? <><span style={{ color: 'var(--text)', fontWeight: 500 }}>{fmt(monthlyPaid)}/mese</span><br/><span style={{ fontSize: 10, color: 'var(--dim)' }}>listino {fmtInt(listino)} −20%</span></>
                          : <span style={{ color: 'var(--dim)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                          color: TIERS.find(t => t.share === shareRate)?.color ?? 'var(--muted)',
                          background: TIERS.find(t => t.share === shareRate)?.bg ?? 'transparent',
                        }}>
                          {shareRate}% <span style={{ fontSize: 10, fontWeight: 500, opacity: .7 }}>{tierName}</span>
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 15, fontWeight: 700, color: myShare > 0 ? '#16a34a' : 'var(--dim)' }}>
                        {myShare > 0 ? `+${fmt(myShare)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: myShare > 0 ? '#16a34a' : 'var(--dim)' }}>
                        {myShare > 0 ? `+${fmt(myShare * 12)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals row */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 32, padding: '16px 24px',
              borderTop: '2px solid var(--border)', background: 'rgba(22,163,74,.04)',
            }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>MRR Totale</div>
                <div style={{ fontWeight: 800, fontSize: 20, color: '#16a34a' }}>{fmt(totalMRR)}/mese</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ARR Potenziale</div>
                <div style={{ fontWeight: 800, fontSize: 20, color: '#6C47FF' }}>{fmtInt(totalARR)}/anno</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Info footer ─────────────────────────────────────────────────────── */}
      <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.7, padding: '0 4px' }}>
        * I valori sono stime basate sui piani Actify (Base €99/mese, Premium €149/mese, Enterprise €249/mese).
        Le PMI onboardate tramite referral partner pagano il 20% in meno sul listino.
        Le % di revenue share sono <strong>marginali per scaglione</strong>: PMI #1–5 → 20%, #6–20 → 25%, #21–50 → 30%, #51–100 → 35%, #101+ → 50%.
        Una PMI già onboardata non cambia aliquota al cambio tier — vale solo per le nuove PMI successive.
        Trial: €0 (nessuna commissione fino a conversione).
      </div>
    </>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '20px 22px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: accent, borderRadius: '14px 14px 0 0',
      }} />
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>{sub}</div>
    </div>
  );
}
