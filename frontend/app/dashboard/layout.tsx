'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { isAuthenticated, doSignOut, getAuthClaims } from '@/lib/auth';
import { markSvg } from '@/lib/branding';

configureAmplify();

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const ok = await isAuthenticated();
      if (!ok) { router.replace('/login'); return; }
      const claims = await getAuthClaims();
      if (claims) { setEmail(claims.email); setRole(claims.role); }
      setChecking(false);
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
    { href: '/dashboard/inventory', label: 'AI Inventory', icon: '⬡' },
    { href: '/dashboard/roadmap', label: 'Compliance Roadmap', icon: '⊙' },
    { href: '/dashboard/settings', label: 'Impostazioni', icon: '⚙' },
  ];

  return (
    <div className="db-shell">
      <aside className="db-sidebar">
        <div className="db-sidebar-logo">
          <span dangerouslySetInnerHTML={{ __html: markSvg(24, 'green') }} />
          <span className="db-sidebar-brand">Actify</span>
        </div>
        <nav className="db-nav-links">
          {nav.map(item => (
            <a
              key={item.href}
              href={item.href}
              className={`db-nav-link ${pathname?.startsWith(item.href) ? 'active' : ''}`}
            >
              <span className="db-nav-icon">{item.icon}</span>
              {item.label}
            </a>
          ))}
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
