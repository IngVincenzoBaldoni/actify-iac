'use client';

import { useEffect, useState } from 'react';
import { configureAmplify } from '@/lib/amplify';
import { api } from '@/lib/api';
import type { Partner, PartnerPMI } from '@/lib/types';

configureAmplify();

const TIERS = [
  { name: 'Affiliate',         min: 0,   max: 5,        revenue_share: 20, icon: '⭐' },
  { name: 'Associate Partner', min: 6,   max: 20,       revenue_share: 25, icon: '⭐⭐' },
  { name: 'Partner',           min: 21,  max: 50,       revenue_share: 30, icon: '🥈' },
  { name: 'Executive Partner', min: 51,  max: 100,      revenue_share: 35, icon: '🥇' },
  { name: 'Senior Partner',    min: 101, max: Infinity, revenue_share: 50, icon: '💎' },
];

function getCurrentTier(count: number) {
  return TIERS.find(t => count >= t.min && count <= t.max) ?? TIERS[0];
}

function TierWidget({ count }: { count: number }) {
  const current   = getCurrentTier(count);
  const tierIdx   = TIERS.indexOf(current);
  const next      = TIERS[tierIdx + 1] ?? null;
  const progress  = next ? Math.min(100, Math.round(((count - current.min) / (current.max - current.min + 1)) * 100)) : 100;

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(108,71,255,.08), rgba(79,53,204,.04))', border: '1px solid rgba(108,71,255,.25)', borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, marginBottom: 16 }}>
        Programma Partner — Livello Attuale
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>{current.icon}</div>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#6C47FF', marginTop: 4 }}>{current.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{count} PMI onboarded</div>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
            <span>{current.min} PMI</span>
            <span>{next ? `${current.max} PMI` : '∞'}</span>
          </div>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6C47FF, #4F35CC)', borderRadius: 4, transition: 'width .4s' }} />
          </div>
          {next && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              {next.min - count} PMI al prossimo livello: <strong style={{ color: 'var(--text)' }}>{next.name}</strong>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Revenue Share</div>
          <div style={{ fontWeight: 800, fontSize: 28, color: '#16a34a' }}>{current.revenue_share}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {TIERS.map((t, i) => {
          const isActive = t === current;
          const isPast   = i < tierIdx;
          return (
            <div key={t.name} style={{
              background: isActive ? 'rgba(108,71,255,.12)' : isPast ? 'rgba(34,197,94,.06)' : 'var(--surface)',
              border: `1px solid ${isActive ? 'rgba(108,71,255,.4)' : isPast ? 'rgba(34,197,94,.2)' : 'var(--border)'}`,
              borderRadius: 10, padding: '10px 12px', opacity: !isActive && !isPast ? 0.6 : 1,
            }}>
              <div style={{ fontSize: 16, marginBottom: 3 }}>{t.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 12, color: isActive ? '#6C47FF' : 'var(--text)' }}>{t.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.min === 0 ? '0' : t.min}–{t.max === Infinity ? '∞' : t.max} PMI</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>{t.revenue_share}% share</div>
            </div>
          );
        })}
      </div>
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

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

  if (loading) {
    return <div style={{ padding: 48, color: 'var(--muted)' }}>Caricamento…</div>;
  }

  return (
    <>
      <div className="partner-topbar">
        <div>
          <div className="partner-h1">Impostazioni Account</div>
          <div className="partner-sub">Personalizza il tuo profilo partner e il white-label</div>
        </div>
      </div>

      <div style={{ maxWidth: 680 }}>
        {partner && <TierWidget count={onboardedCount} />}
        <form onSubmit={handleSave} className="auth-form" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>

          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 16, fontSize: 15 }}>
            Profilo Studio
          </div>

          <div className="field">
            <label>Ragione Sociale</label>
            <input type="text" value={form.ragione_sociale}
              onChange={e => update('ragione_sociale', e.target.value)}
              placeholder="Studio Rossi & Associati" />
          </div>

          <div style={{ fontWeight: 700, color: 'var(--text)', margin: '24px 0 16px', fontSize: 15 }}>
            White-Label — Email Assessment
          </div>

          <div className="field">
            <label>Nome mittente (visualizzato nelle email)</label>
            <input type="text" value={form.sender_name}
              onChange={e => update('sender_name', e.target.value)}
              placeholder="Studio Rossi — AI Compliance" />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Default: ragione sociale se non specificato
            </div>
          </div>

          <div className="field">
            <label>Reply-to email (risposte dei clienti)</label>
            <input type="email" value={form.reply_to}
              onChange={e => update('reply_to', e.target.value)}
              placeholder="mario@studiorossi.it" />
          </div>

          <div style={{ fontWeight: 700, color: 'var(--text)', margin: '24px 0 16px', fontSize: 15 }}>
            Branding Questionario
          </div>

          <div className="field-row">
            <div className="field">
              <label>Colore principale</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={e => update('primary_color', e.target.value)}
                  style={{ width: 48, height: 40, padding: 2, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', cursor: 'pointer' }}
                />
                <input type="text" value={form.primary_color}
                  onChange={e => update('primary_color', e.target.value)}
                  style={{ flex: 1 }} placeholder="#6C47FF" />
              </div>
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
                <img src={form.logo_url} alt="logo preview" style={{ height: 40, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 6, padding: 4 }} />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Anteprima logo</span>
              </div>
            )}
          </div>

          {error && <div className="auth-error">{error}</div>}
          {saved && <div style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>✓ Impostazioni salvate</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="submit" className="inv-btn" disabled={saving}>
              {saving ? 'Salvataggio…' : 'Salva impostazioni'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontSize: 15 }}>Info Account</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
            <div>Email: <span style={{ color: 'var(--text)' }}>{partner?.email}</span></div>
            <div>Tipo: <span style={{ color: 'var(--text)' }}>{partner?.tipo_studio}</span></div>
            {partner?.referral_code && (
              <div>Codice Referral: <span style={{ color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 700 }}>{partner.referral_code}</span></div>
            )}
            <div>Account dal: <span style={{ color: 'var(--text)' }}>
              {partner?.created_at ? new Date(partner.created_at).toLocaleDateString('it-IT') : 'N/D'}
            </span></div>
          </div>
        </div>
      </div>
    </>
  );
}
