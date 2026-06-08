'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import AiActReader from '../../partner/ai-act/_content';

export default function DashboardAiActPage() {
  const [tier, setTier]       = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.company.get()
      .then(c => setTier((c as Record<string, unknown>).subscription_tier as string ?? 'base'))
      .catch(() => setTier('base'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="db-loading"><div className="spin"></div></div>;

  const isPremium = tier === 'premium' || tier === 'enterprise';

  if (isPremium) return <AiActReader />;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>⚖️</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>
          Testo AI Act — Feature Premium
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 28 }}>
          Accedi al testo ufficiale del Regolamento UE 2024/1689, navigabile articolo per articolo
          e collegato direttamente alla Gap Analysis dei tuoi sistemi AI.
          Disponibile per gli account <strong style={{ color: 'var(--text2)' }}>Premium</strong> e <strong style={{ color: 'var(--text2)' }}>Enterprise</strong>.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32, textAlign: 'left' }}>
          {[
            { icon: '📖', text: 'Testo integrale AI Act per capitolo e articolo' },
            { icon: '🔗', text: 'Link diretto dalla Gap Analysis agli articoli violati' },
            { icon: '⚖️', text: 'Art. 99 e 100 sulle sanzioni sempre a portata di mano' },
            { icon: '🔍', text: 'Navigazione rapida tra i 100+ articoli del Regolamento' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{f.text}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <a
            href="/dashboard/settings"
            style={{ display: 'inline-block', padding: '12px 32px', background: 'var(--green)', color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none', cursor: 'pointer' }}>
            Passa a Premium — €149/mese
          </a>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Upgrade immediato · Nessun vincolo</span>
        </div>
      </div>
    </div>
  );
}
