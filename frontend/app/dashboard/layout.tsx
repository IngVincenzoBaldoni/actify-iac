'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { isAuthenticated, doSignOut, getAuthClaims } from '@/lib/auth';
import { markSvg } from '@/lib/branding';
import { api } from '@/lib/api';

configureAmplify();

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'collaborator' | 'partner'>('collaborator');
  const [checking, setChecking] = useState(true);
  const [showSettingsBadge, setShowSettingsBadge] = useState(false);
  const [showInventoryBadge, setShowInventoryBadge] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isStarterOrAbove, setIsStarterOrAbove] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [walletOpen, setWalletOpen] = useState(true);
  const [isPastDue, setIsPastDue] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function check() {
      const ok = await isAuthenticated();
      if (!ok) { router.replace('/login'); return; }
      const claims = await getAuthClaims();
      if (claims) { setEmail(claims.email); setRole(claims.role); }
      setChecking(false);

      try {
        const [company, systems] = await Promise.all([
          api.company.get(),
          api.systems.list(),
        ]);
        const c = company as Record<string, unknown>;
        const subStatus = c?.subscription_status as string | undefined;
        if (subStatus === 'canceled' && claims?.role !== 'partner') {
          router.replace('/plan?expired=1');
          return;
        }
        if (subStatus === 'past_due' && claims?.role !== 'partner') {
          setIsPastDue(true);
        }
        setShowSettingsBadge(!c?.annual_revenue_range && !c?.annual_revenue_exact);
        setShowInventoryBadge((systems as unknown[]).length === 0);
        const tier = c?.subscription_tier as string ?? '';
        setIsPremium(['premium', 'enterprise'].includes(tier));
        setIsStarterOrAbove(['base', 'premium', 'enterprise'].includes(tier));
        if (c?.name) setCompanyName(String(c.name));
      } catch {
        // badges stay hidden on error
      }
    }
    check();
  }, [router]);

  async function handleSignOut() {
    await doSignOut();
    router.push('/login');
  }

  async function handleOpenPortal() {
    setPortalLoading(true);
    try {
      const { url } = await api.billing.createPortalSession();
      window.location.href = url;
    } catch {
      setPortalLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="db-loading">
        <div className="spin"></div>
      </div>
    );
  }

  const nav = [
    { href: '/dashboard/inventory',   label: 'AIPI - AI Passports Inventory', icon: '🛂', badge: showInventoryBadge, callout: 'Aggiungi i tuoi AI Passport', premium: false, starterOnly: false, adminOnly: false },
    { href: '/dashboard/fines',       label: 'FBE - Fine Estimation Board',   icon: '📈', badge: false, callout: '', premium: false, starterOnly: false, adminOnly: false },
    { href: '/dashboard/literacy',    label: 'AI Literacy',    icon: '🎓', badge: false, callout: '', premium: false, starterOnly: true,  adminOnly: false },
    { href: '/dashboard/documents',   label: 'Document Vault', icon: '⊟',  badge: false, callout: '', premium: false, starterOnly: true,  adminOnly: false },
    { href: '/dashboard/audit-trail', label: 'Audit Trail',    icon: '🔒', badge: false, callout: '', premium: false, starterOnly: false, adminOnly: false },
    { href: '/dashboard/ai-act',      label: 'Testo AI Act',   icon: '⚖️', badge: false, callout: '', premium: true,  starterOnly: false, adminOnly: false },
    { href: '/dashboard/settings',    label: 'Impostazioni',   icon: '⚙',  badge: showSettingsBadge, callout: 'Completa il profilo aziendale', premium: false, starterOnly: false, adminOnly: false },
  ];

  return (
    <div className="db-shell">
      <aside className="db-sidebar">
        {/* Logo */}
        <div className="db-sidebar-logo">
          <span dangerouslySetInnerHTML={{ __html: markSvg(40, 'green') }} />
          <span className="db-sidebar-brand">Actify</span>
        </div>

        {/* AI Wallet collapsible folder */}
        <div className="db-wallet">
          <button className="db-wallet-header" onClick={() => setWalletOpen(o => !o)}>
            <span className="db-wallet-icon">💼</span>
            <span className="db-wallet-name">
              {companyName ? `${companyName} AI Wallet` : 'AI Wallet'}
            </span>
            <span className={`db-wallet-chevron${walletOpen ? ' open' : ''}`}>›</span>
          </button>

          {walletOpen && (
            <nav className="db-nav-links">
              {nav.map(item => {
                const premiumLocked = item.premium && !isPremium;
                const starterLocked = item.starterOnly && !isStarterOrAbove;
                const adminLocked = item.adminOnly && role !== 'admin';
                const locked = premiumLocked || starterLocked;
                if (locked || adminLocked) return null;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`db-nav-link ${pathname?.startsWith(item.href) ? 'active' : ''}`}
                  >
                    <span className="db-nav-icon">{item.icon}</span>
                    <span className="db-nav-label">{item.label}</span>
                    {!locked && item.badge && (
                      <span className="nav-callout">
                        <span className="nav-callout-dot" />
                        {item.callout}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
          )}
        </div>

        {/* Footer — company name + email + badge + logout */}
        <div className="db-sidebar-footer">
          {companyName && (
            <div className="db-company-name">{companyName}</div>
          )}
          <div className="db-user-email">{email}</div>
          <div className="db-footer-actions">
            {role === 'admin' && <div className="db-role-badge">Admin</div>}
            <button className="db-signout-btn" onClick={handleSignOut}>Esci</button>
          </div>
        </div>
      </aside>
      <main className="db-main">
        {isPastDue && (
          <div style={{
            margin: '16px 28px 0',
            padding: '13px 18px',
            background: 'rgba(239,68,68,.10)',
            border: '1px solid rgba(239,68,68,.35)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="10" cy="10" r="9" stroke="rgba(239,68,68,.8)" strokeWidth="1.5"/>
                <path d="M10 6v5M10 14v.5" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>Pagamento fallito — </span>
                <span style={{ fontSize: 13, color: 'rgba(252,165,165,.8)' }}>aggiorna il metodo di pagamento per mantenere l&apos;accesso ad Actify.</span>
              </div>
            </div>
            <button
              onClick={handleOpenPortal}
              disabled={portalLoading}
              style={{
                padding: '8px 16px',
                background: 'rgba(239,68,68,.18)',
                border: '1px solid rgba(239,68,68,.4)',
                borderRadius: 8,
                color: '#fca5a5',
                fontSize: 13,
                fontWeight: 700,
                cursor: portalLoading ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {portalLoading ? 'Apertura…' : 'Aggiorna pagamento →'}
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
