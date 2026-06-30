'use client';
import { useEffect, useRef, useState } from 'react';

const CASES = [
  {
    period: '2025',
    company: 'Replika (Luka Inc.)',
    violation: 'Nessuna base giuridica per il trattamento, nessuna verifica dell\'età degli utenti, informativa carente.',
    value: 5,
    decimals: 0,
    type: 'fine' as const,
    accent: '#f87171',
    accentBg: 'rgba(239,68,68,.08)',
    accentBorder: 'rgba(239,68,68,.2)',
  },
  {
    period: 'Marzo 2026',
    company: 'Intesa Sanpaolo · Isybank',
    violation: 'Profilazione illecita di 2,4 milioni di clienti retail senza base giuridica idonea.',
    value: 17.6,
    decimals: 1,
    type: 'fine' as const,
    accent: '#f87171',
    accentBg: 'rgba(239,68,68,.08)',
    accentBorder: 'rgba(239,68,68,.2)',
  },
  {
    period: '2022 · confermato in appello',
    company: 'Clearview AI',
    violation: 'Raccolta massiva di immagini biometriche e riconoscimento facciale senza base giuridica.',
    value: 20,
    decimals: 0,
    type: 'fine' as const,
    accent: '#f87171',
    accentBg: 'rgba(239,68,68,.08)',
    accentBorder: 'rgba(239,68,68,.2)',
  },
  {
    period: 'Febbraio 2026',
    company: 'Amazon Italia — Logistica',
    violation: 'Videosorveglianza pervasiva e schedatura di dati sindacali su oltre 1.800 lavoratori.',
    value: null,
    decimals: 0,
    type: 'block' as const,
    accent: '#fbbf24',
    accentBg: 'rgba(251,191,36,.08)',
    accentBorder: 'rgba(251,191,36,.2)',
  },
  {
    period: 'Luglio 2023',
    company: 'OpenAI (ChatGPT)',
    violation: 'Raccolta dati senza base giuridica, mancata verifica età minori, informativa non trasparente.',
    value: null,
    decimals: 0,
    type: 'block' as const,
    accent: '#fbbf24',
    accentBg: 'rgba(251,191,36,.08)',
    accentBorder: 'rgba(251,191,36,.2)',
  },
];

function Counter({ target, decimals, running }: { target: number; decimals: number; running: boolean }) {
  const [display, setDisplay] = useState(decimals > 0 ? (0).toFixed(decimals) : '0');
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const DURATION = 2800;

  useEffect(() => {
    if (!running) return;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startRef.current) / DURATION, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const val = ease * target;
      setDisplay(decimals > 0 ? val.toFixed(decimals) : String(Math.round(val)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplay(decimals > 0 ? target.toFixed(decimals) : String(target));
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, target, decimals]);

  return <>{display}</>;
}

function CaseCard({ c, running }: { c: typeof CASES[number]; running: boolean }) {
  return (
    <div style={{
      width: 320,
      flexShrink: 0,
      marginRight: 16,
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${c.accentBorder}`,
      borderRadius: 16,
      padding: '24px 26px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, transparent, ${c.accent}55, transparent)` }} />

      <div style={{ fontSize: 10.5, fontWeight: 700, color: c.accent, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 12 }}>
        {c.period}
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 10, lineHeight: 1.3 }}>
        {c.company}
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />

      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, flex: 1, marginBottom: 20 }}>
        {c.violation}
      </div>

      <div style={{ background: c.accentBg, border: `1px solid ${c.accentBorder}`, borderRadius: 10, padding: '14px 18px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: c.accent, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 }}>
          Esito del provvedimento
        </div>
        {c.type === 'fine' && c.value !== null ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
              <Counter target={c.value} decimals={c.decimals} running={running} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>milioni €</span>
          </div>
        ) : (
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
            {c.company.includes('OpenAI') ? 'Stop temporaneo · Rientrato' : 'Blocco del trattamento'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CasiReali() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRunning(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const doubled = [...CASES, ...CASES];

  return (
    <section ref={sectionRef} style={{ padding: '88px 0 72px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes casi-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .casi-track { overflow: hidden; mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); }
        .casi-inner { display: flex; animation: casi-marquee 38s linear infinite; width: max-content; }
        .casi-track:hover .casi-inner { animation-play-state: paused; }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '40%', left: '50%', width: 700, height: 300, background: 'radial-gradient(ellipse, rgba(239,68,68,0.06) 0%, transparent 70%)', filter: 'blur(50px)', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48, padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '.12em', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.22)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Casi reali · Provvedimenti ufficiali
        </div>
        <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 50px)', fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          L&rsquo;enforcement è già iniziato
        </h2>
        <p style={{ fontSize: 16, color: '#64748B', maxWidth: 500, margin: '0 auto', lineHeight: 1.8 }}>
          Garante e autorità europee hanno già comminato sanzioni concrete per uso di AI e dati senza
          le adeguate garanzie. I casi qui sotto sono pubblici e verificabili.
        </p>
      </div>

      {/* Marquee */}
      <div className="casi-track">
        <div className="casi-inner">
          {doubled.map((c, i) => (
            <CaseCard key={i} c={c} running={running} />
          ))}
        </div>
      </div>

      {/* Source note */}
      <div style={{ textAlign: 'center', marginTop: 28, fontSize: 11.5, color: '#334155', padding: '0 24px' }}>
        Provvedimenti ufficiali del Garante per la Protezione dei Dati Personali e delle autorità europee. Alcuni provvedimenti possono essere oggetto di ricorso.{' '}
        <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" style={{ color: '#475569', fontWeight: 600, textDecoration: 'none' }}>
          Fonte: garanteprivacy.it →
        </a>
      </div>
    </section>
  );
}
