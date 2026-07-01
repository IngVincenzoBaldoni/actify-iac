'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { configureAmplify } from '@/lib/amplify';
import { markSvg } from '@/lib/branding';

configureAmplify();

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard/inventory');
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg, #0a0f1a)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: 'var(--font-sans, system-ui)',
    }}>
      <div style={{ marginBottom: 32 }} dangerouslySetInnerHTML={{ __html: markSvg(40, 'green') }} />

      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'rgba(34,197,94,.12)',
        border: '2px solid rgba(34,197,94,.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <svg viewBox="0 0 24 24" fill="none" width="36" height="36">
          <path d="M5 12l5 5L19 7" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: '0 0 12px', textAlign: 'center' }}>
        Pagamento completato!
      </h1>
      <p style={{ fontSize: 16, color: '#94a3b8', margin: '0 0 32px', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
        Il tuo abbonamento è attivo. Stai per essere reindirizzato alla dashboard{dots}
      </p>

      <button
        onClick={() => router.push('/dashboard/inventory')}
        style={{
          padding: '12px 28px',
          background: 'rgba(34,197,94,.15)',
          border: '1px solid rgba(34,197,94,.3)',
          borderRadius: 10,
          color: '#22C55E',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Vai alla dashboard →
      </button>

      {sessionId && (
        <p style={{ fontSize: 11, color: '#475569', marginTop: 32 }}>
          ID sessione: {sessionId}
        </p>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1a' }}>
        <div className="spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
