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
  const [role, setRole] = useState<'admin' | 'member' | 'partner'>('member');
  const [checking, setChecking] = useState(true);
  const [showSettingsBadge, setShowSettingsBadge] = useState(false);
  const [showInventoryBadge, setShowInventoryBadge] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

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
        setIsPremium(['premium', 'enterprise'].includes(c?.subscription_tier as string));
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
    { href: '/dashboard/inventory',  label: 'AI Inventory',    icon: '⬡',  badge: showInventoryBadge, callout: 'Aggiungi i tuoi strumenti AI', premium: false },
    { href: '/dashboard/literacy',   label: 'AI Literacy',     icon: '🎓', badge: false, callout: '', premium: false },
    { href: '/dashboard/documents',  label: 'Document Vault',  icon: '⊟',  badge: false, callout: '', premium: false },
    { href: '/dashboard/fines',      label: 'Fine Board',      icon: '📈', badge: false, callout: '', premium: false },
    { href: '/dashboard/audit-trail', label: 'Audit Trail',    icon: '🔒', badge: false, callout: '', premium: false },
    { href: '/dashboard/ai-act',     label: 'Testo AI Act',    icon: '⚖️', badge: false, callout: '', premium: true },
    { href: '/dashboard/settings',   label: 'Impostazioni',    icon: '⚙',  badge: showSettingsBadge, callout: 'Completa il profilo aziendale', premium: false },
  ];

  return (
    <div className="db-shell">
      <aside className="db-sidebar">
        <div className="db-sidebar-logo">
          <span dangerouslySetInnerHTML={{ __html: markSvg(24, 'green') }} />
          <span className="db-sidebar-brand">Actify</span>
        </div>
        <nav className="db-nav-links">
          {nav.map(item => {
            const locked = item.premium && !isPremium;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`db-nav-link ${pathname?.startsWith(item.href) ? 'active' : ''}`}
                style={locked ? { opacity: 0.55 } : undefined}
              >
                <span className="db-nav-icon">{item.icon}</span>
                <span className="db-nav-label">{item.label}</span>
                {locked && (
                  <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: 'rgba(250,204,21,0.15)', color: '#CA8A04', border: '1px solid rgba(250,204,21,0.3)', letterSpacing: 0.3 }}>
                    PREMIUM
                  </span>
                )}
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
        <div className="db-sidebar-footer">
          <div className="db-user-email">{email}</div>
          {role === 'admin' && <div className="db-role-badge">Admin</div>}
          <button className="db-signout-btn" onClick={handleSignOut}>Esci</button>
        </div>
      </aside>
      <main className="db-main">
        {children}
      </main>
    </div>
  );
}
