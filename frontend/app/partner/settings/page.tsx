'use client';

import { useEffect, useState } from 'react';
import { configureAmplify } from '@/lib/amplify';
import { api } from '@/lib/api';
import type { Partner, PartnerPMI } from '@/lib/types';

configureAmplify();

const TIERS = [
  { name: 'Affiliate',         min: 0,   max: 5,        revenue_share: 20, icon: '⭐',  color: '#94a3b8', bg: 'rgba(148,163,184,.12)' },
  { name: 'Associate Partner', min: 6,   max: 20,       revenue_share: 25, icon: '⭐⭐', color: '#818cf8', bg: 'rgba(129,140,248,.12)' },
  { name: 'Partner',           min: 21,  max: 50,       revenue_share: 30, icon: '🥈',  color: '#38bdf8', bg: 'rgba(56,189,248,.12)'  },
  { name: 'Executive Partner', min: 51,  max: 100,      revenue_share: 35, icon: '🥇',  color: '#fbbf24', bg: 'rgba(251,191,36,.12)'  },
  { name: 'Senior Partner',    min: 101, max: Infinity, revenue_share: 50, icon: '💎',  color: '#22d3ee', bg: 'rgba(34,211,238,.12)'  },
];

const glassCard: React.CSSProperties = {
  background: 'linear-gradient(145deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.025) 100%)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 20,
  position: 'relative',
  overflow: 'hidden',
};

function GlassHighlight() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)', pointerEvents: 'none' }} />
  );
}

function getCurrentTier(count: number) {
  return TIERS.find(t => count >= t.min && count <= t.max) ?? TIERS[0];
}

function TierWidget({ count }: { count: number }) {
  const current  = getCurrentTier(count);
  const tierIdx  = TIERS.indexOf(current);
  const next     = TIERS[tierIdx + 1] ?? null;
  const progress = next ? Math.min(100, Math.round(((count - current.min) / (current.max - current.min + 1)) * 100)) : 100;

  return (
    <div style={{ ...glassCard, padding: '28px 32px', marginBottom: 24 }}>
      <GlassHighlight />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#059669,#34d399,transparent)', borderRadius: '20px 20px 0 0' }} />

      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, marginBottom: 20, letterSpacing: '-.01em' }}>
        Programma Partner — Livello Attuale
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
        {/* Current tier badge */}
        <div style={{ textAlign: 'center', minWidth: 90 }}>
          <div style={{ fontSize: 40, marginBottom: 6, filter: 'drop-shadow(0 0 12px rgba(34,197,94,.4))' }}>{current.icon}</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: current.color }}>{current.name}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{count} PMI onboarded</div>
        </div>

        {/* Progress bar */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 8 }}>
            <span>{current.min} PMI</span>
            <span>{next ? `${current.max} PMI` : '∞'}</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${current.color},${next?.color ?? current.color})`, borderRadius: 99, transition: 'width .5s', boxShadow: `0 0 10px ${current.color}88` }} />
          </div>
          {next && (
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              {next.min - count} PMI al prossimo livello: <strong style={{ color: next.color }}>{next.name}</strong>
            </div>
          )}
        </div>

        {/* Revenue Share badge */}
        <div style={{
          textAlign: 'center',
          background: 'rgba(34,197,94,.08)', border: '1.5px solid rgba(34,197,94,.25)',
          borderRadius: 14, padding: '16px 24px',
          boxShadow: '0 0 20px rgba(34,197,94,.1)',
        }}>
          <div style={{ fontSize: 10, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700, marginBottom: 4 }}>Revenue Share</div>
          <div style={{ fontWeight: 900, fontSize: 32, color: '#4ade80', letterSpacing: '-1px', lineHeight: 1 }}>{current.revenue_share}%</div>
        </div>
      </div>

      {/* Tier grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {TIERS.map((t, i) => {
          const isActive = t === current;
          const isPast   = i < tierIdx;
          return (
            <div key={t.name} style={{
              background: isActive ? t.bg : isPast ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.02)',
              border: `1px solid ${isActive ? t.color + '55' : isPast ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.06)'}`,
              borderRadius: 12, padding: '12px 14px',
              opacity: !isActive && !isPast ? 0.45 : 1,
              transition: 'all .2s',
            }}>
              <div style={{ fontSize: 18, marginBottom: 5 }}>{t.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: isActive ? t.color : isPast ? '#94a3b8' : '#475569' }}>{t.name}</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{t.min === 0 ? '0' : t.min}–{t.max === Infinity ? '∞' : t.max} PMI</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? t.color : '#4ade80', marginTop: 4 }}>{t.revenue_share}% share</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionCard({ title, children, accentColor }: { title: string; children: React.ReactNode; accentColor?: string }) {
  return (
    <div style={{ ...glassCard, padding: '24px 26px' }}>
      <GlassHighlight />
      {accentColor && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${accentColor},${accentColor}44,transparent)`, borderRadius: '20px 20px 0 0' }} />
      )}
      <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,.08)', letterSpacing: '-.01em' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function PartnerSettings() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [onboardedCount, setOnboardedCount] = useState(0);
  const [form, setForm] = useState({
    ragione_sociale: '',
    sender_name: '',
    reply_to: '',
    primary_color: '#6C47FF',
    logo_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    Promise.all([
      api.partner.getMe(),
      api.partner.listPMI(),
    ]).then(([p, pmiList]) => {
      const partner = p as unknown as Partner;
      const pmis = pmiList as unknown as PartnerPMI[];
      setPartner(partner);
      setOnboardedCount(pmis.filter(pmi => pmi.status === 'onboarded').length);
      setForm({
        ragione_sociale: partner.ragione_sociale ?? '',
        sender_name:     partner.sender_name ?? '',
        reply_to:        partner.reply_to ?? partner.email ?? '',
        primary_color:   partner.primary_color ?? '#6C47FF',
        logo_url:        partner.logo_url ?? '',
      });
    }).finally(() => setLoading(false));
  }, []);

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.partner.updateMe({
        ragione_sociale: form.ragione_sociale || undefined,
        sender_name:     form.sender_name || undefined,
        reply_to:        form.reply_to || undefined,
        primary_color:   form.primary_color,
        logo_url:        form.logo_url || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 48, color: 'var(--muted)' }}>Caricamento…</div>;

  return (
    <>
      <div className="partner-topbar">
        <div>
          <div className="partner-h1">Impostazioni Account</div>
          <div className="partner-sub">Personalizza il tuo profilo partner e il white-label</div>
        </div>
      </div>

      {partner && <TierWidget count={onboardedCount} />}

      <form onSubmit={handleSave} className="auth-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Colonna sinistra ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <SectionCard title="Profilo Studio" accentColor="#818cf8">
            <div className="field">
              <label>Ragione Sociale</label>
              <input type="text" value={form.ragione_sociale}
                onChange={e => update('ragione_sociale', e.target.value)}
                placeholder="Studio Rossi & Associati" />
            </div>
          </SectionCard>

          <SectionCard title="White-Label — Email Assessment" accentColor="#38bdf8">
            <div className="field">
              <label>Nome mittente (visualizzato nelle email)</label>
              <input type="text" value={form.sender_name}
                onChange={e => update('sender_name', e.target.value)}
                placeholder="Studio Rossi — AI Compliance" />
              <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                Default: ragione sociale se non specificato
              </div>
            </div>
            <div className="field">
              <label>Reply-to email (risposte dei clienti)</label>
              <input type="email" value={form.reply_to}
                onChange={e => update('reply_to', e.target.value)}
                placeholder="mario@studiorossi.it" />
            </div>
          </SectionCard>

        </div>

        {/* ── Colonna destra ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <SectionCard title="Branding Questionario" accentColor="#fbbf24">
            <div className="field">
              <label>Colore principale</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={e => update('primary_color', e.target.value)}
                  style={{ width: 48, height: 42, padding: 2, borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
                />
                <input type="text" value={form.primary_color}
                  onChange={e => update('primary_color', e.target.value)}
                  style={{ flex: 1 }} placeholder="#6C47FF" />
              </div>
            </div>
            <div className="field">
              <label>URL Logo (link diretto all&apos;immagine)</label>
              <input type="url" value={form.logo_url}
                onChange={e => update('logo_url', e.target.value)}
                placeholder="https://studiorossi.it/logo.png" />
              {form.logo_url && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.logo_url} alt="logo preview" style={{ height: 40, objectFit: 'contain', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: 4, background: 'rgba(255,255,255,.04)' }} />
                  <span style={{ fontSize: 12, color: '#64748b' }}>Anteprima logo</span>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Info Account">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Email',           value: partner?.email,          color: '#e2e8f0' },
                { label: 'Tipo',            value: partner?.tipo_studio,    color: '#e2e8f0' },
                { label: 'Codice Referral', value: partner?.referral_code,  color: '#818cf8', mono: true },
                { label: 'Account dal',     value: partner?.created_at ? new Date(partner.created_at).toLocaleDateString('it-IT') : 'N/D', color: '#e2e8f0' },
              ].filter(r => r.value).map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '10px 14px', background: 'rgba(255,255,255,.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)' }}>
                  <span style={{ fontSize: 12, color: '#475569', fontWeight: 600, minWidth: 130 }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: row.color, fontWeight: row.mono ? 700 : 400, fontFamily: row.mono ? 'monospace' : 'inherit', letterSpacing: row.mono ? '.05em' : 0 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {error && <div className="auth-error">{error}</div>}
          {saved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 10, color: '#4ade80', fontSize: 13, fontWeight: 600 }}>
              ✓ Impostazioni salvate con successo
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="inv-btn" disabled={saving}>
              {saving ? 'Salvataggio…' : 'Salva impostazioni'}
            </button>
          </div>

        </div>
      </form>
    </>
  );
}
