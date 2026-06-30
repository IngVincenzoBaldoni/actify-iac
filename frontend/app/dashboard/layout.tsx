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

  if (checking) {
    return (
      <div className="db-loading">
        <div className="spin"></div>
      </div>
    );
  }

  const nav = [
    { href: '/dashboard/inventory',   label: 'AIPI - AI Passports Inventory', icon: '🛂', badge: showInventoryBadge, callout: 'Aggiungi i tuoi AI Passport', premium: false, starterOnly: false },
    { href: '/dashboard/fines',       label: 'FBE - Fine Estimation Board',   icon: '📈', badge: false, callout: '', premium: false, starterOnly: false },
    { href: '/dashboard/literacy',    label: 'AI Literacy',    icon: '🎓', badge: false, callout: '', premium: false, starterOnly: true },
    { href: '/dashboard/documents',   label: 'Document Vault', icon: '⊟',  badge: false, callout: '', premium: false, starterOnly: true },
    { href: '/dashboard/audit-trail', label: 'Audit Trail',    icon: '🔒', badge: false, callout: '', premium: false, starterOnly: false },
    { href: '/dashboard/ai-act',      label: 'Testo AI Act',   icon: '⚖️', badge: false, callout: '', premium: true,  starterOnly: false },
    { href: '/dashboard/settings',    label: 'Impostazioni',   icon: '⚙',  badge: showSettingsBadge, callout: 'Completa il profilo aziendale', premium: false, starterOnly: false },
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
                const locked = premiumLocked || starterLocked;
                if (locked) return null;
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
        {children}
      </main>
    </div>
  );
}
