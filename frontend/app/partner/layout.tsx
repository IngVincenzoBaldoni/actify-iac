'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { getAuthClaims, doSignOut } from '@/lib/auth';
import { markSvg } from '@/lib/branding';
import { api } from '@/lib/api';
import type { Partner } from '@/lib/types';

configureAmplify();

interface PMISummary {
  pmi_id: string;
  company_name: string;
  system_count: number;
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [email, setEmail]             = useState('');
  const [studioName, setStudioName]   = useState('');
  const [pmiList, setPmiList]         = useState<PMISummary[]>([]);
  const [activePmiId, setActivePmiId] = useState('');

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

      api.partner.getMe().then(p => {
        const partner = p as unknown as Partner;
        if (partner?.ragione_sociale) setStudioName(partner.ragione_sociale);
      }).catch(() => {});

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

        {/* Logo */}
        <div className="partner-sidebar-logo">
          <span dangerouslySetInnerHTML={{ __html: markSvg(28, 'green') }} />
          <span className="partner-sidebar-logo-name">Actify Partner</span>
        </div>

        {/* Discovery Dashboard */}
        <a href="/partner" className={`partner-nav-item${pathname === '/partner' ? ' active' : ''}`}>
          <NavIcon type="home" />
          Discovery Dashboard
        </a>

        {/* AI Inventory */}
        <button
          className={`partner-nav-item${inventoryActive ? ' active' : ''}`}
          onClick={() => { setActivePmiId(''); router.push('/partner/inventory'); }}
        >
          <NavIcon type="inventory" />
          AI Inventory
        </button>

        {pmiList.length > 0 && (
          <div className="pnav-sub">
            {pmiList.map(pmi => (
              <button
                key={pmi.pmi_id}
                className={`pnav-sub-item${activePmiId === pmi.pmi_id ? ' active' : ''}`}
                onClick={() => navToPMI(pmi.pmi_id)}
                title={pmi.company_name}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" style={{ flexShrink: 0, opacity: .4, borderRadius: 2 }}>
                  <rect width="8" height="8" rx="1.5"/>
                </svg>
                {pmi.company_name}
              </button>
            ))}
          </div>
        )}

        {/* Testo AI Act */}
        <a href="/partner/ai-act" className={`partner-nav-item${pathname.startsWith('/partner/ai-act') ? ' active' : ''}`}>
          <NavIcon type="law" />
          Testo AI Act
        </a>

        {/* Revenue Share */}
        <a href="/partner/revenue" className={`partner-nav-item${pathname.startsWith('/partner/revenue') ? ' active' : ''}`}>
          <NavIcon type="revenue" />
          Revenue Share
        </a>

        {/* Impostazioni */}
        <a href="/partner/settings" className={`partner-nav-item${pathname.startsWith('/partner/settings') ? ' active' : ''}`}>
          <NavIcon type="settings" />
          Impostazioni
        </a>

        {/* Footer */}
        <div className="partner-sidebar-footer">
          {studioName && <div className="partner-sidebar-footer-name">{studioName}</div>}
          <div className="partner-sidebar-footer-email">{email}</div>
          <button
            onClick={handleSignOut}
            style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
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

// ─── Nav icons ────────────────────────────────────────────────────────────────

function NavIcon({ type }: { type: string }) {
  const base = { width: 15, height: 15, flexShrink: 0 } as const;
  if (type === 'home') return (
    <svg {...base} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7.5L8 2l6 5.5V14a.5.5 0 01-.5.5h-4V10H6.5v4.5h-4A.5.5 0 012 14V7.5z"/>
    </svg>
  );
  if (type === 'inventory') return (
    <svg {...base} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1"/>
      <rect x="9.5" y="1.5" width="5" height="5" rx="1"/>
      <rect x="1.5" y="9.5" width="5" height="5" rx="1"/>
      <rect x="9.5" y="9.5" width="5" height="5" rx="1"/>
    </svg>
  );
  if (type === 'law') return (
    <svg {...base} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v12"/>
      <path d="M3 5l5-3 5 3"/>
      <path d="M1.5 10.5l3-5M14.5 10.5l-3-5"/>
      <path d="M.5 12h5M10.5 12h5"/>
    </svg>
  );
  if (type === 'revenue') return (
    <svg {...base} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,12 4.5,7.5 7.5,9.5 11,4.5 14.5,7"/>
      <line x1="1" y1="14.5" x2="15" y2="14.5"/>
    </svg>
  );
  if (type === 'settings') return (
    <svg {...base} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5"/>
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"/>
    </svg>
  );
  return null;
}
