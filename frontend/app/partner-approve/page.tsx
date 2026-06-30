'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { markSvg } from '@/lib/branding';

type Stage = 'loading' | 'success' | 'error';

function PartnerApproveContent() {
  const searchParams = useSearchParams();
  const rid = searchParams.get('rid') ?? '';
  const key = searchParams.get('key') ?? '';

  const [stage, setStage]     = useState<Stage>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!rid || !key) {
      setErrorMsg('Parametri mancanti. Il link non è valido.');
      setStage('error');
      return;
    }
    api.partner.approveRequest({ rid, key })
      .then(() => setStage('success'))
      .catch((err: { message?: string; statusCode?: number }) => {
        setErrorMsg(err.message ?? 'Errore durante l\'approvazione.');
        setStage('error');
      });
  }, [rid, key]);

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
          textAlign: 'center',
        }}>
          {stage === 'loading' && (
            <>
              <div className="spin" style={{ margin: '0 auto 20px' }} />
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>Approvazione in corso…</p>
            </>
          )}

          {stage === 'success' && (
            <>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(34,197,94,.12)', border: '1.5px solid rgba(34,197,94,.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: 24,
              }}>✓</div>
              <h2 style={{ color: '#f8fafc', fontSize: 22, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-.4px' }}>
                Partner approvato!
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, margin: '0 0 28px' }}>
                Il link di registrazione è stato inviato allo studio via email.<br/>
                Può completare la registrazione entro <strong style={{ color: 'var(--text2)' }}>7 giorni</strong>.
              </p>
              <a
                href="/"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #059669, #34d399)',
                  color: '#fff', textDecoration: 'none',
                  padding: '12px 28px', borderRadius: 9,
                  fontWeight: 700, fontSize: 14,
                }}
              >
                Torna alla home →
              </a>
            </>
          )}

          {stage === 'error' && (
            <>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ color: '#f8fafc', fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>Errore</h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>{errorMsg}</p>
              <a href="/" style={{ color: '#34d399', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Torna alla home →
              </a>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,.22)' }}>
          © Actify · Admin Portal
        </p>
      </div>
    </div>
  );
}

export default function PartnerApprovePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080f17', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spin" />
      </div>
    }>
      <PartnerApproveContent />
    </Suspense>
  );
}
