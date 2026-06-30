'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { doSignOut, doSignIn, setSessionCookie } from '@/lib/auth';
import { api } from '@/lib/api';
import { markSvg } from '@/lib/branding';

configureAmplify();

type Stage = 'loading' | 'form' | 'success' | 'error';

function PartnerAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t   = searchParams.get('t') ?? '';
  const rid = searchParams.get('rid') ?? '';

  const [stage, setStage]               = useState<Stage>('loading');
  const [email, setEmail]               = useState('');
  const [ragioneSociale, setRagioneSociale] = useState('');
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPwd, setShowPwd]           = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');

  useEffect(() => {
    if (!t || !rid) { setErrorMsg('Link non valido.'); setStage('error'); return; }
    api.partner.getRegistrationInfo(t, rid)
      .then(data => {
        setEmail(data.email);
        setRagioneSociale(data.ragione_sociale);
        setStage('form');
      })
      .catch((err: { message?: string; statusCode?: number }) => {
        setErrorMsg(err.message ?? 'Link non valido o scaduto.');
        setStage('error');
      });
  }, [t, rid]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setErrorMsg('Le password non coincidono.'); return; }
    if (password.length < 8)  { setErrorMsg('La password deve essere almeno 8 caratteri.'); return; }
    setErrorMsg('');
    setSubmitting(true);
    try {
      await api.partner.completeRegistration({ rid, token: t, password });
      await doSignOut().catch(() => {});
      const result = await doSignIn(email, password);
      if (result.isSignedIn) {
        setSessionCookie();
        router.push('/partner');
      } else {
        setStage('success');
      }
    } catch (err: unknown) {
      setErrorMsg((err as { message?: string }).message ?? 'Errore. Riprova.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(5,150,105,.18) 0%, transparent 65%), #080f17',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, justifyContent: 'center' }}>
          <span dangerouslySetInnerHTML={{ __html: markSvg(32, 'green') }} />
          <span style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: '-.5px' }}>Actify</span>
        </div>

        <div style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,.055) 0%, rgba(255,255,255,.018) 100%)',
          border: '1px solid rgba(255,255,255,.09)',
          borderTop: '1.5px solid rgba(255,255,255,.22)',
          boxShadow: '0 0 0 1px rgba(255,255,255,.03) inset, 0 24px 64px rgba(0,0,0,.6)',
          borderRadius: 20,
          padding: '40px 36px',
        }}>

          {stage === 'loading' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div className="spin" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>Verifica link…</p>
            </div>
          )}

          {stage === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ color: '#f8fafc', fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>Link non valido</h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>{errorMsg}</p>
              <a href="/login" style={{ color: '#34d399', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Torna al login →
              </a>
            </div>
          )}

          {stage === 'form' && (
            <>
              <h1 style={{ color: '#f8fafc', fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-.4px' }}>
                Attiva il tuo account Partner
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 28px', lineHeight: 1.5 }}>
                Benvenuto su Actify, <strong style={{ color: 'var(--text2)' }}>{ragioneSociale}</strong>.<br/>
                Scegli la tua password per completare la registrazione.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '11px 14px', borderRadius: 9,
                      background: 'rgba(255,255,255,.04)',
                      border: '1px solid rgba(255,255,255,.08)',
                      color: 'var(--dim)', fontSize: 14,
                      cursor: 'not-allowed',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Almeno 8 caratteri"
                      autoFocus
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '11px 44px 11px 14px', borderRadius: 9,
                        background: 'rgba(255,255,255,.06)',
                        border: '1px solid rgba(255,255,255,.12)',
                        color: '#f8fafc', fontSize: 14,
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: 13 }}
                    >
                      {showPwd ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>
                    Conferma Password
                  </label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Ripeti la password"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '11px 14px', borderRadius: 9,
                      background: 'rgba(255,255,255,.06)',
                      border: `1px solid ${confirm && confirm !== password ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.12)'}`,
                      color: '#f8fafc', fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  {confirm && confirm !== password && (
                    <p style={{ margin: '5px 0 0', fontSize: 12, color: '#f87171' }}>Le password non coincidono.</p>
                  )}
                </div>

                {errorMsg && (
                  <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !password || password !== confirm}
                  style={{
                    marginTop: 4,
                    padding: '13px',
                    borderRadius: 10,
                    border: 'none',
                    background: submitting || !password || password !== confirm
                      ? 'rgba(255,255,255,.08)'
                      : 'linear-gradient(135deg, #059669, #34d399)',
                    color: submitting || !password || password !== confirm ? 'var(--dim)' : '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: submitting || !password || password !== confirm ? 'not-allowed' : 'pointer',
                    transition: 'all .2s',
                    letterSpacing: '-.2px',
                  }}
                >
                  {submitting ? 'Attivazione account…' : 'Attiva il mio account →'}
                </button>
              </form>
            </>
          )}

          {stage === 'success' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(34,197,94,.12)', border: '1.5px solid rgba(34,197,94,.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: 24,
              }}>✓</div>
              <h2 style={{ color: '#f8fafc', fontSize: 22, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-.4px' }}>
                Account attivato!
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
                Benvenuto su Actify Partner Portal. Accedi ora con la tua email.
              </p>
              <a
                href="/login"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #059669, #34d399)',
                  color: '#fff', textDecoration: 'none',
                  padding: '13px 32px', borderRadius: 10,
                  fontWeight: 700, fontSize: 15,
                }}
              >
                Accedi →
              </a>
            </div>
          )}

        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,.22)' }}>
          © Actify · EU AI Act Compliance Platform
        </p>
      </div>
    </div>
  );
}

export default function PartnerAcceptPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080f17', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spin" />
      </div>
    }>
      <PartnerAcceptContent />
    </Suspense>
  );
}
