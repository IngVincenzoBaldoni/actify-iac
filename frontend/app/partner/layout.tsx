'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { getAuthClaims, doSignOut } from '@/lib/auth';
import { markSvg } from '@/lib/branding';
import { api } from '@/lib/api';

configureAmplify();

interface PMISummary {
  pmi_id: string;
  company_name: string;
  system_count: number;
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [email, setEmail]         = useState('');
  const [pmiList, setPmiList]     = useState<PMISummary[]>([]);
  const [activePmiId, setActivePmiId] = useState('');

  // Track active PMI from URL search params — safe client-side read
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setActivePmiId(params.get('pmi') ?? '');
    }
  }, [pathname]);

  useEffect(() => {
    getAuthClaims().then(claims => {
      if (!claims || claims.role !== 'partner') {
        router.replace('/login');
        return;
      }
      setEmail(claims.email);

      api.partnerInventory.getOverview()
        .then(data => {
          const withSystems = (data as unknown as PMISummary[]).filter(p => p.system_count > 0);
          setPmiList(withSystems);
        })
        .catch(() => {});
    });
  }, [router]);

  async function handleSignOut() {
    await doSignOut();
    router.push('/login');
  }

  const inventoryActive = pathname.startsWith('/partner/inventory');

  function navToPMI(pmiId: string) {
    setActivePmiId(pmiId);
    router.push(`/partner/inventory?pmi=${pmiId}`);
  }

  return (
    <div className="partner-layout">
      <aside className="partner-sidebar">
        <div className="partner-sidebar-logo">
          <span dangerouslySetInnerHTML={{ __html: markSvg(28) }} />
          <span className="partner-sidebar-logo-name">Actify Partner</span>
        </div>

        {/* Discovery Dashboard */}
        <a href="/partner" className={`partner-nav-item${pathname === '/partner' ? ' active' : ''}`}>
          <span>🏠</span>Discovery Dashboard
        </a>

        {/* AI Inventory */}
        <button
          className="partner-nav-item"
          style={{
            background: inventoryActive ? 'rgba(108,71,255,.12)' : undefined,
            color: inventoryActive ? 'var(--text)' : undefined,
            fontWeight: inventoryActive ? 600 : undefined,
          }}
          onClick={() => { setActivePmiId(''); router.push('/partner/inventory'); }}
        >
          <span>📊</span>AI Inventory
        </button>

        {/* PMI sub-items — client-side via router.push */}
        {pmiList.length > 0 && (
          <div className="pnav-sub">
            {pmiList.map(pmi => (
              <button
                key={pmi.pmi_id}
                className={`pnav-sub-item${activePmiId === pmi.pmi_id ? ' active' : ''}`}
                onClick={() => navToPMI(pmi.pmi_id)}
                title={pmi.company_name}
              >
                <span style={{ flexShrink: 0 }}>🏢</span>
                {pmi.company_name}
              </button>
            ))}
          </div>
        )}

        {/* AI Act Reader */}
        <a href="/partner/ai-act" className={`partner-nav-item${pathname === '/partner/ai-act' ? ' active' : ''}`}>
          <span>⚖️</span>Testo AI Act
        </a>

        {/* Revenue Share */}
        <a href="/partner/revenue" className={`partner-nav-item${pathname === '/partner/revenue' ? ' active' : ''}`}>
          <span>💰</span>Revenue Share
        </a>

        {/* Impostazioni */}
        <a href="/partner/settings" className={`partner-nav-item${pathname === '/partner/settings' ? ' active' : ''}`}>
          <span>⚙️</span>Impostazioni
        </a>

        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, wordBreak: 'break-all' }}>{email}</div>
          <button className="partner-nav-item" onClick={handleSignOut} style={{ color: 'var(--red)', padding: '8px 0' }}>
            Esci
          </button>
        </div>
      </aside>

      <main className="partner-main">
        {children}
      </main>
    </div>
  );
}
