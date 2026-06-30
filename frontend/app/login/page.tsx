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
  const [showPwd, setShowPwd] = useState(false);

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
            <div className="auth-input-wrap">
              <svg className="auth-input-icon" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 7l7.293 5.121a1.25 1.25 0 001.414 0L18 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                className="auth-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="mario@azienda.it" required autoComplete="email"
              />
            </div>
          </div>
          <div className="field" style={{ marginTop: 4 }}>
            <label>Password</label>
            <div className="auth-input-wrap">
              <svg className="auth-input-icon" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="8" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="10" cy="13" r="1.5" fill="currentColor"/>
              </svg>
              <input
                className="auth-input" type={showPwd ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
              />
              <button type="button" className="auth-pwd-toggle" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                {showPwd
                  ? <svg viewBox="0 0 20 20" fill="none"><path d="M3 10s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5"/><line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  : <svg viewBox="0 0 20 20" fill="none"><path d="M3 10s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>
                }
              </button>
            </div>
          </div>
          {error && <div className="auth-error" style={{ marginTop: 16 }}>{error}</div>}
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
