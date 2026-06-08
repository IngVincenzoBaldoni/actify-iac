'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { doSignIn, setSessionCookie, isAuthenticated, getAuthClaims } from '@/lib/auth';
import { markSvg, logoSvg } from '@/lib/branding';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    configureAmplify();
    isAuthenticated().then(async ok => {
      if (ok) {
        const claims = await getAuthClaims();
        router.replace(claims?.role === 'partner' ? '/partner' : '/dashboard');
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await doSignIn(email, password);
      if (result.isSignedIn) {
        setSessionCookie();
        const claims = await getAuthClaims();
        router.push(claims?.role === 'partner' ? '/partner' : '/dashboard');
      } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        router.push(`/login/new-password?email=${encodeURIComponent(email)}`);
      }
    } catch (err: unknown) {
      const e = err as { message?: string; name?: string };
      if (e.name === 'NotAuthorizedException') setError('Email o password non corretta.');
      else if (e.name === 'UserNotFoundException') setError('Nessun account trovato con questa email.');
      else setError(e.message ?? 'Errore durante il login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span dangerouslySetInnerHTML={{ __html: markSvg(40) }} />
          <span dangerouslySetInnerHTML={{ __html: logoSvg(180, 50) }} />
        </div>
        <h1 className="auth-h1">Accedi al tuo account</h1>
        <p className="auth-sub">Monitora la tua AI Act compliance</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="mario@azienda.it" required autoComplete="email"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password"
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Accesso in corso…' : 'Accedi'}
          </button>
        </form>
        <p className="auth-link">
          Non hai un account?{' '}
          <a href="/register">Registra la tua azienda</a>
        </p>
        <p className="auth-comp-footer">
          <a href="/compliance">Actify &egrave; conforme al Reg. UE 2024/1689 (AI Act)</a>
          {' · '}
          <a href="/compliance/trasparenza">Informativa AI</a>
        </p>
      </div>
    </div>
  );
}
