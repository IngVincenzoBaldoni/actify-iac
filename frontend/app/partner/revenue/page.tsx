'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { api } from '@/lib/api';
import type { Partner, PartnerPMI } from '@/lib/types';

configureAmplify();

// ─── Pricing ─────────────────────────────────────────────────────────────────

const PLAN_PRICE: Record<string, number> = {
  trial:      19.9,
  base:       59.9,
  premium:    99.9,
  enterprise: 249,
};

const PLAN_LABEL: Record<string, string> = {
  trial:      'Trial (€19,90/mese)',
  base:       'Starter (€59,90/mese)',
  premium:    'Professional (€99,90/mese)',
  enterprise: 'Enterprise (€249/mese)',
};

// ─── Tier gamification ────────────────────────────────────────────────────────

const TIERS = [
  { name: 'Affiliate',         min: 0,   max: 5,        share: 20, icon: '⭐',  color: '#94a3b8', bg: 'rgba(148,163,184,.12)' },
  { name: 'Associate Partner', min: 6,   max: 20,       share: 25, icon: '🌟', color: '#818cf8', bg: 'rgba(129,140,248,.12)'  },
  { name: 'Partner',           min: 21,  max: 50,       share: 30, icon: '🥈',  color: '#38bdf8', bg: 'rgba(56,189,248,.12)'  },
  { name: 'Executive Partner', min: 51,  max: 100,      share: 35, icon: '🥇',  color: '#fbbf24', bg: 'rgba(251,191,36,.12)'  },
  { name: 'Senior Partner',    min: 101, max: Infinity, share: 50, icon: '💎',  color: '#22d3ee', bg: 'rgba(34,211,238,.12)'   },
];

function getTier(count: number) {
  return TIERS.find(t => count >= t.min && count <= t.max) ?? TIERS[0];
}

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

// ─── Shared card style ────────────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background: 'linear-gradient(145deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.025) 100%)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 20,
  position: 'relative',
  overflow: 'hidden',
};

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

  const onboarded = pmiList.filter(p => p.status === 'onboarded');
  const count     = onboarded.length;
  const tier      = getTier(count);
  const tierIdx   = TIERS.indexOf(tier);
  const nextTier  = TIERS[tierIdx + 1] ?? null;
  const progress  = nextTier
    ? Math.min(100, Math.round(((count - tier.min) / (tier.max - tier.min + 1)) * 100))
    : 100;

  const REFERRAL_DISCOUNT = 0.20;

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <KpiCard label="MRR STIMATO"     value={fmt(totalMRR)}           sub="Incasso mensile attuale"                                                         accent="#4ade80" icon="💶" />
        <KpiCard label="ARR POTENZIALE"  value={fmtInt(totalARR)}        sub="Se tutte le PMI rinnovano"                                                        accent="#38bdf8" icon="📈" />
        <KpiCard label="PROSSIMA PMI"    value={`${nextPMIShareRate}%`}  sub={`${fmt(nextPMIEarning)}/mese stimati`}                                            accent={tier.color} icon="🎯" />
        <KpiCard label="PMI ONBOARDATE"  value={String(count)}           sub={nextTier ? `${nextTier.min - count} al prossimo livello` : 'Livello massimo'}    accent="#818cf8" icon="✅" />
      </div>

      {/* ─── Tier progress ───────────────────────────────────────────────────── */}
      <div style={{ ...glassCard, padding: '28px 32px', marginBottom: 20 }}>
        {/* glass highlight */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)', pointerEvents: 'none' }} />

        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 28, color: '#f1f5f9', letterSpacing: '-.01em' }}>
          Avanzamento Tier Partner
        </div>

        {/* Tier steps */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 22, left: '10%', right: '10%', height: 2, background: 'rgba(255,255,255,.08)', zIndex: 0 }} />
          {TIERS.map((t, i) => {
            const isActive = t.name === tier.name;
            const isPast   = i < tierIdx;
            const isFuture = i > tierIdx;
            return (
              <div key={t.name} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', margin: '0 auto 10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  background: isPast ? t.bg : isActive ? t.bg : 'rgba(255,255,255,.04)',
                  border: `2px solid ${isPast || isActive ? t.color : 'rgba(255,255,255,.1)'}`,
                  boxShadow: isActive ? `0 0 0 5px ${t.bg}, 0 0 20px ${t.color}44` : 'none',
                  transition: 'all .3s',
                }}>
                  <span style={{ filter: isFuture ? 'grayscale(1) opacity(.4)' : 'none' }}>
                    {isPast ? '✓' : t.icon}
                  </span>
                </div>
                <div style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? t.color : isFuture ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.5)' }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>
                  {t.share}% share
                </div>
                {isActive && (
                  <div style={{ fontSize: 10, color: t.color, fontWeight: 700, marginTop: 3 }}>← sei qui</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        {nextTier && (
          <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
              <span style={{ color: '#94a3b8', fontWeight: 500 }}>{count} PMI onboardate</span>
              <span style={{ color: nextTier.color, fontWeight: 600 }}>Obiettivo: {nextTier.min} PMI → {nextTier.name} ({nextTier.share}%)</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: `linear-gradient(90deg, ${tier.color}, ${nextTier.color})`,
                borderRadius: 99, transition: 'width .6s ease',
                boxShadow: `0 0 10px ${tier.color}88`,
              }} />
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 10, lineHeight: 1.6 }}>
              Dalla <strong style={{ color: '#f1f5f9' }}>{nextTier.min}a PMI in poi</strong> guadagnerai il{' '}
              <strong style={{ color: nextTier.color }}>{nextTier.share}%</strong> su ogni nuova PMI onboardata
              {' '}— le prime {tier.max} rimangono al {tier.share}%.
            </div>
          </div>
        )}
        {!nextTier && (
          <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 14, color: tier.color, fontWeight: 700 }}>
            💎 Hai raggiunto il livello massimo — {tier.share}% su ogni PMI
          </div>
        )}
      </div>

      {/* ─── PMI table ───────────────────────────────────────────────────────── */}
      <div style={{ ...glassCard, marginBottom: 24 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)', pointerEvents: 'none' }} />

        <div style={{ padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>PMI Onboardate — Dettaglio Guadagni</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>% calcolata per scaglione di posizione</div>
        </div>

        {pmiRows.length === 0 ? (
          <div style={{ padding: '48px 28px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            Nessuna PMI ancora onboardata su Actify.<br/>
            <span style={{ fontSize: 12 }}>Una volta che le PMI si registrano, qui vedrai i tuoi guadagni.</span>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  {['#', 'Azienda PMI', 'Piano Actify', 'Pagato dalla PMI', 'Share %', 'Tuo Share/mese', 'Tuo Share/anno'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', fontSize: 10, fontWeight: 700, color: '#475569', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.09em', background: 'rgba(0,0,0,.15)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pmiRows.map(({ pmi, listino, monthlyPaid, myShare, shareRate, position }, rowIdx) => {
                  const subTier  = (pmi.onboarded_company?.subscription_tier ?? 'trial').toLowerCase();
                  const tierName = TIERS.find(t => shareRate === t.share)?.name ?? '';
                  const tierColor = TIERS.find(t => t.share === shareRate)?.color ?? '#94a3b8';
                  const tierBg    = TIERS.find(t => t.share === shareRate)?.bg    ?? 'transparent';
                  return (
                    <tr key={pmi.pmi_id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)', background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                      <td style={{ padding: '14px 20px', fontSize: 12, color: '#475569', fontWeight: 700, width: 40 }}>
                        #{position}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#e2e8f0' }}>{pmi.company_name}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{pmi.contact_email}</div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 7,
                          color: subTier === 'trial' ? '#fb923c' : subTier === 'enterprise' ? '#22d3ee' : '#818cf8',
                          background: subTier === 'trial' ? 'rgba(249,115,22,.12)' : subTier === 'enterprise' ? 'rgba(34,211,238,.12)' : 'rgba(129,140,248,.12)',
                          border: `1px solid ${subTier === 'trial' ? 'rgba(249,115,22,.25)' : subTier === 'enterprise' ? 'rgba(34,211,238,.25)' : 'rgba(129,140,248,.25)'}`,
                        }}>
                          {PLAN_LABEL[subTier] ?? subTier}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13 }}>
                        {monthlyPaid > 0
                          ? <>
                              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{fmt(monthlyPaid)}/mese</span>
                              <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>listino {fmtInt(listino)} −20%</div>
                            </>
                          : <span style={{ color: '#334155' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 6, color: tierColor, background: tierBg }}>
                          {shareRate}%{' '}
                          <span style={{ fontSize: 10, fontWeight: 500, opacity: .7 }}>{tierName}</span>
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: myShare > 0 ? '#4ade80' : '#334155' }}>
                          {myShare > 0 ? `+${fmt(myShare)}` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: myShare > 0 ? '#86efac' : '#334155' }}>
                        {myShare > 0 ? `+${fmt(myShare * 12)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals row */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 40, padding: '20px 28px',
              borderTop: '1px solid rgba(255,255,255,.08)',
              background: 'linear-gradient(90deg,transparent,rgba(34,197,94,.05))',
            }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>MRR Totale</div>
                <div style={{ fontWeight: 900, fontSize: 24, color: '#4ade80', letterSpacing: '-.5px' }}>{fmt(totalMRR)}<span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>/mese</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>ARR Potenziale</div>
                <div style={{ fontWeight: 900, fontSize: 24, color: '#38bdf8', letterSpacing: '-.5px' }}>{fmtInt(totalARR)}<span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>/anno</span></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── Info footer ─────────────────────────────────────────────────────── */}
      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, padding: '0 4px' }}>
        * I valori sono stime basate sui piani Actify attualmente disponibili: Trial (€19,90/mese), Starter (€59,90/mese), Professional (€99,90/mese).
        Le PMI onboardate tramite referral partner pagano il 20% in meno sul listino.
        Le % di revenue share sono <strong style={{ color: '#94a3b8' }}>marginali per scaglione</strong>: PMI #1–5 → 20%, #6–20 → 25%, #21–50
        → 30%, #51–100 → 35%, #101+ → 50%. Una PMI già onboardata non cambia aliquota al cambio tier — vale solo per le nuove PMI successive.
        Enterprise: in arrivo.
      </div>
    </>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, icon }: { label: string; value: string; sub: string; accent: string; icon: string }) {
  return (
    <div style={{
      background: 'linear-gradient(145deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.025) 100%)',
      border: '1px solid rgba(255,255,255,.12)',
      borderRadius: 18, padding: '26px 26px 22px', position: 'relative', overflow: 'hidden',
    }}>
      {/* top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${accent},${accent}44)`, borderRadius: '18px 18px 0 0' }} />
      {/* glow blob */}
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: accent, opacity: .07, filter: 'blur(28px)', pointerEvents: 'none' }} />
      {/* glass highlight */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)', pointerEvents: 'none' }} />

      <div style={{ fontSize: 22, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: accent, lineHeight: 1, letterSpacing: '-.5px', marginBottom: 8 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}
