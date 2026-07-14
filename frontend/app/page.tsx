'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { logoSvg, markSvg, badgeSvg } from '@/lib/branding';
import AiComplianceBadge from './AiComplianceBadge';
import CasiReali from './CasiReali';
import MacbookImageSection from './MacbookImageSection';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const w = (fn: string) => () => { (window as unknown as Record<string, () => void>)[fn]?.(); };

type DemoTab = 'inventory' | 'compliance' | 'literacy' | 'report';

/* ─── Video Section ───────────────────────────────────────────────────────── */
// Per attivare: carica il file su S3 poi imposta VIDEO_SRC = '/media/actify-demo.mp4'
const VIDEO_SRC = '/media/actify-demo.mov';

function VideoSection() {
  const isReady = !!VIDEO_SRC;
  return (
    <div id="video" data-reveal className="video-outer" style={{ scrollMarginTop: 72, maxWidth: 1100, margin: '0 auto', padding: '96px 40px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '.1em', background: 'rgba(34,197,94,.09)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg>
          Demo prodotto
        </div>
        <h2 style={{ fontSize: 'clamp(32px, 4vw, 54px)', fontWeight: 900, color: '#fff', margin: '0 0 18px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Vedi Actify<br/>
          <span style={{ color: '#22C55E' }}>in azione</span>
        </h2>
        <p style={{ fontSize: 17, color: '#64748B', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
          Dall&apos;inventario AI alla gap analysis, dalla stima sanzionatoria alla documentazione — tutto in meno di 5 minuti.
        </p>
      </div>

      {/* Video container */}
      <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto' }}>
        {/* Glow esterno */}
        <div style={{ position: 'absolute', inset: -1, borderRadius: 24, background: 'linear-gradient(135deg, rgba(34,197,94,.35) 0%, rgba(34,197,94,.05) 50%, rgba(34,197,94,.15) 100%)', filter: 'blur(1px)', zIndex: 0 }} />
        {/* Frame */}
        <div style={{ position: 'relative', zIndex: 1, borderRadius: 22, overflow: 'hidden', background: '#0C1014', border: '1px solid rgba(34,197,94,.22)', boxShadow: '0 0 0 1px rgba(255,255,255,.06) inset, 0 32px 80px rgba(0,0,0,.7), 0 0 60px rgba(34,197,94,.08)' }}>
          {/* Barra titolo stile macOS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#FEBC2E' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#28C840' }} />
            <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.28)', letterSpacing: 0.3 }}>official-actify.com — demo</div>
          </div>
          {/* Ratio 16:9 */}
          <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#080C0F' }}>
            {isReady ? (
              <video
                src={VIDEO_SRC}
                poster="/media/actify-poster.png"
                controls
                playsInline
                preload="metadata"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#22C55E"><path d="M8 5v14l11-7L8 5z"/></svg>
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', margin: 0 }}>Video in arrivo</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

/* ─── Dashboard Demo sub-components ──────────────────────────────────────── */

function InventoryDemo() {
  const systems = [
    { name: 'HireVue', vendor: 'HireVue Inc.', cat: 'Recruiting AI', risk: 'Alto Rischio', rc: '#FB923C', rb: 'rgba(234,88,12,.12)', score: '87%', sc: '#22C55E' },
    { name: 'ChatGPT API', vendor: 'OpenAI', cat: 'LLM / AI Generativa', risk: 'Rischio Limitato', rc: '#FCD34D', rb: 'rgba(202,138,4,.12)', score: '94%', sc: '#22C55E' },
    { name: 'Salesforce Einstein', vendor: 'Salesforce', cat: 'CRM AI', risk: 'Rischio Minimo', rc: '#4ADE80', rb: 'rgba(34,197,94,.12)', score: '100%', sc: '#22C55E' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F1F5F9' }}>AI Inventory</h3>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#475569' }}>3 sistemi AI censiti · Ultimo check: oggi</p>
        </div>
        <button style={{ fontSize: 12, fontWeight: 700, color: '#000', background: '#22C55E', border: 'none', borderRadius: 7, padding: '7px 14px', cursor: 'pointer' }}>+ Nuovo Sistema</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {systems.map(s => (
          <div key={s.name} style={{
            background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.07)',
            borderLeft: `3px solid ${s.rc}`, borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', marginBottom: 2 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: '#475569' }}>{s.vendor} · {s.cat}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: s.rc, background: s.rb, border: `1px solid ${s.rc}33`, borderRadius: 5, padding: '2px 9px', whiteSpace: 'nowrap' }}>{s.risk}</span>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: s.sc, lineHeight: 1 }}>{s.score}</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>compliance</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplianceDemo() {
  const gaps = [
    { art: 'Art. 9', label: 'Risk Management', s: 'ok', c: '#22C55E' },
    { art: 'Art. 13', label: 'Trasparenza', s: 'gap', c: '#EF4444' },
    { art: 'Art. 14', label: 'Human Oversight', s: 'partial', c: '#F59E0B' },
    { art: 'Art. 17', label: 'Quality Management', s: 'ok', c: '#22C55E' },
    { art: 'Art. 27', label: 'FRIA', s: 'gap', c: '#EF4444' },
    { art: 'Art. 4', label: 'AI Literacy', s: 'ok', c: '#22C55E' },
  ];
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F1F5F9' }}>Compliance Check — HireVue</h3>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#475569' }}>Ultimo check: 2 ore fa · Alto Rischio · Annex III</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {gaps.map(g => (
          <div key={g.art} style={{
            background: 'rgba(255,255,255,.03)', border: `1px solid ${g.c}1A`,
            borderRadius: 9, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: g.c, flexShrink: 0, boxShadow: `0 0 5px ${g.c}` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#F1F5F9' }}>{g.art}</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{g.label}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: g.c, background: `${g.c}18`, borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
              {g.s === 'ok' ? '✓ OK' : g.s === 'gap' ? 'Gap' : '~ Parziale'}
            </span>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.22)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#22C55E', lineHeight: 1, flexShrink: 0 }}>87%</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>Compliance Score</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>2 gap identificati · Roadmap disponibile</div>
        </div>
        <button style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 7, padding: '7px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>📄 Genera Report</button>
      </div>
    </div>
  );
}

function LiteracyDemo() {
  const systems = [
    { name: 'HireVue', role: 'Deployer', status: 'in_progress', profiles: [{ l: 'Operational Users', c: 8, t: 12, col: '#F59E0B' }, { l: 'Supervisors', c: 4, t: 4, col: '#22C55E' }] },
    { name: 'ChatGPT API', role: 'Deployer', status: 'compliant', profiles: [{ l: 'Operational Users', c: 15, t: 15, col: '#22C55E' }, { l: 'Supervisors', c: 3, t: 3, col: '#22C55E' }] },
  ];
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F1F5F9' }}>AI Literacy Tracker — Art. 4</h3>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#475569' }}>2 sistemi · 1 conforme · 1 in corso</p>
      </div>
      {systems.map(sys => (
        <div key={sys.name} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: sys.status === 'compliant' ? '#22C55E' : '#F59E0B', boxShadow: `0 0 5px ${sys.status === 'compliant' ? '#22C55E' : '#F59E0B'}`, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#F1F5F9' }}>{sys.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#38BDF8', background: 'rgba(14,165,233,.1)', borderRadius: 4, padding: '2px 7px' }}>{sys.role}</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: sys.status === 'compliant' ? '#22C55E' : '#F59E0B', background: sys.status === 'compliant' ? 'rgba(34,197,94,.1)' : 'rgba(245,158,11,.1)', borderRadius: 5, padding: '2px 8px', whiteSpace: 'nowrap' }}>
              {sys.status === 'compliant' ? '✓ Conforme' : '⟳ In corso'}
            </span>
          </div>
          {sys.profiles.map(p => (
            <div key={p.l} style={{ marginBottom: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 4 }}>
                <span>{p.l}</span>
                <span style={{ color: p.col, fontWeight: 700 }}>{p.c}/{p.t} coperti</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: p.col, width: `${Math.round((p.c / p.t) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ReportDemo() {
  const docs = [
    { icon: '📋', title: 'Risk Assessment Report — HireVue', type: 'Compliance Report', date: '22 giu 2026', size: '1.2 MB', c: '#F59E0B' },
    { icon: '🎓', title: 'Attestato AI Literacy Art. 4 — ChatGPT API', type: 'Literacy Certificate', date: '20 giu 2026', size: '0.8 MB', c: '#22C55E' },
    { icon: '📊', title: 'Audit Trail Export — Q2 2026', type: 'Audit Export', date: '18 giu 2026', size: '2.1 MB', c: '#818CF8' },
  ];
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F1F5F9' }}>Document Vault</h3>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#475569' }}>3 documenti · Tutti audit-ready · Firmati digitalmente</p>
      </div>
      {docs.map(doc => (
        <div key={doc.title} style={{
          background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>{doc.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>{doc.type} · {doc.date} · {doc.size}</div>
          </div>
          <button style={{ fontSize: 11, fontWeight: 700, color: doc.c, background: `${doc.c}15`, border: `1px solid ${doc.c}30`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>↓ PDF</button>
        </div>
      ))}
    </div>
  );
}

/* ─── Hero logo marquee brands ───────────────────────────────────────────── */
const MARQUEE_BRANDS = [
  { name: 'ChatGPT Enterprise', icon: '🤖' },
  { name: 'Salesforce Einstein', icon: '⚡' },
  { name: 'HireVue',             icon: '👥' },
  { name: 'Microsoft Copilot',   icon: '🧩' },
  { name: 'Mistral AI',          icon: '🌪️' },
  { name: 'Google Gemini',       icon: '💎' },
  { name: 'SAP AI',              icon: '🏗️' },
  { name: 'Workday AI',          icon: '📊' },
  { name: 'Claude API',          icon: '🔮' },
  { name: 'OpenAI GPT-4o',       icon: '✨' },
  { name: 'HubSpot AI',          icon: '🎯' },
  { name: 'Notion AI',           icon: '📝' },
];

/* ─── Main component ──────────────────────────────────────────────────────── */

export default function Page() {
  const [activeTab, setActiveTab] = useState<DemoTab>('inventory');
  const [openEnforcement, setOpenEnforcement] = useState(false);
  const [openMarket, setOpenMarket] = useState(false);
  const [pieTriggered, setPieTriggered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pieRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pieRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setPieTriggered(true); obs.disconnect(); } },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Smooth fade at loop boundary so the restart isn't jarring
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const BASE = 0.6;
    const onTime = () => {
      if (!vid.duration) return;
      const rem = vid.duration - vid.currentTime;
      if (rem < 0.9)                  vid.style.opacity = String(Math.max(0, (rem / 0.9) * BASE));
      else if (vid.currentTime < 0.9) vid.style.opacity = String(Math.min(BASE, (vid.currentTime / 0.9) * BASE));
      else                            vid.style.opacity = String(BASE);
    };
    vid.addEventListener('timeupdate', onTime);
    return () => vid.removeEventListener('timeupdate', onTime);
  }, []);

  useEffect(() => {
    // ── 1. Scroll reveal ─────────────────────────────────────────────────
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('is-visible'); }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    const revealEls = document.querySelectorAll('[data-reveal]');
    revealEls.forEach(el => obs.observe(el));
    // On large screens everything may already be in the viewport — mark visible immediately
    requestAnimationFrame(() => {
      revealEls.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          (el as HTMLElement).classList.add('is-visible');
          el.querySelectorAll('.tl-line-fill,.tl-r-line-fill,.tl-node,.tl-r-node').forEach(c => {
            (c as HTMLElement).classList.add('ready');
          });
        }
      });
    });

    // ── 2. Cursor glow (RAF lerp) ────────────────────────────────────────
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let gx = mx, gy = my;
    let rafId = 0;
    const glow = document.getElementById('cursor-glow') as HTMLElement | null;
    const mouseMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener('mousemove', mouseMove);
    const tick = () => {
      gx += (mx - gx) * 0.07;
      gy += (my - gy) * 0.07;
      if (glow) glow.style.transform = `translate(${gx - 320}px, ${gy - 320}px)`;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    // ── 3. Counting animation ───────────────────────────────────────────
    const countObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const target = parseFloat(el.dataset.count || '0');
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const dur = 1800;
        const t0 = Date.now();
        const step = () => {
          const p = Math.min((Date.now() - t0) / dur, 1);
          const e2 = 1 - Math.pow(1 - p, 4);
          const v = target >= 1 ? Math.round(e2 * target) : Math.round(e2 * target * 10) / 10;
          el.textContent = prefix + v + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        countObs.unobserve(el);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-count]').forEach(el => countObs.observe(el));

    // ── 4. 3-D card tilt ────────────────────────────────────────────────
    const tiltCleanups: Array<() => void> = [];
    document.querySelectorAll<HTMLElement>('[data-tilt]').forEach(card => {
      const onMove = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transition = 'transform .08s ease';
        card.style.transform = `perspective(700px) rotateY(${x * 11}deg) rotateX(${-y * 11}deg) translateZ(10px)`;
      };
      const onLeave = () => {
        card.style.transition = 'transform .55s ease';
        card.style.transform = '';
      };
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      tiltCleanups.push(() => {
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
      });
    });

    // ── 5. Magnetic CTA ─────────────────────────────────────────────────
    const magCleanups: Array<() => void> = [];
    document.querySelectorAll<HTMLElement>('.cta-main').forEach(btn => {
      const onMove = (e: MouseEvent) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px) scale(1.04)`;
        btn.style.transition = 'transform .12s ease';
      };
      const onLeave = () => {
        btn.style.transform = '';
        btn.style.transition = 'transform .5s ease';
      };
      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
      magCleanups.push(() => {
        btn.removeEventListener('mousemove', onMove);
        btn.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => {
      obs.disconnect();
      countObs.disconnect();
      window.removeEventListener('mousemove', mouseMove);
      cancelAnimationFrame(rafId);
      tiltCleanups.forEach(fn => fn());
      magCleanups.forEach(fn => fn());
    };
  }, []);

  return (
    <>
      {/* ─── Keyframes & reveal CSS ─────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `

        /* ── Particles ── */
        @keyframes particle-rise {
          0%   { opacity:0; transform:translateY(0) scale(1); }
          8%   { opacity:.55; }
          85%  { opacity:.45; }
          100% { opacity:0; transform:translateY(-72vh) scale(.25) rotate(180deg); }
        }

        /* ── Cursor glow ── */
        #cursor-glow { will-change:transform; }

        /* ── Text ── */
        @keyframes blink-dot { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes gradient-move { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes slide-up { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fade-in  { from{opacity:0} to{opacity:1} }

        /* ── CTA glow ── */
        @keyframes glow-pulse {
          0%,100% { box-shadow:0 0 18px rgba(34,197,94,.28), 0 4px 18px rgba(0,0,0,.4); }
          50%     { box-shadow:0 0 48px rgba(34,197,94,.6),  0 8px 32px rgba(0,0,0,.4); }
        }

        /* ── Marquee ── */
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

        /* ── Shimmer on reveal ── */
        @keyframes shimmer-in {
          0%   { transform:translateX(-100%) skewX(-20deg); opacity:0; }
          30%  { opacity:.6; }
          100% { transform:translateX(250%) skewX(-20deg); opacity:0; }
        }

        /* ── Dashboard scan beam ── */
        @keyframes scan-beam {
          0%   { transform:translateY(0); opacity:0; }
          4%   { opacity:1; }
          96%  { opacity:1; }
          100% { transform:translateY(430px); opacity:0; }
        }

        /* ── Aurora gradient border ── */
        @keyframes aurora-border { 0%{background-position:0% 50%} 50%{background-position:200% 50%} 100%{background-position:0% 50%} }
        .aurora-card {
          background-image:
            linear-gradient(#0d0d18, #0d0d18),
            linear-gradient(90deg, #22C55E, #818CF8, #38BDF8, #22C55E);
          background-origin: border-box;
          background-clip: padding-box, border-box;
          border: 1.5px solid transparent !important;
          background-size: auto, 300% 100%;
          animation: aurora-border 4s linear infinite;
        }

        /* ── Metric card float ── */
        @keyframes metric-float {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-5px); }
        }

        /* ── Reveal system ── */
        [data-reveal]{opacity:0;transform:translateY(22px);transition:opacity .7s ease,transform .7s ease}
        [data-reveal].is-visible{opacity:1;transform:translateY(0)}
        [data-reveal][data-d="1"]{transition-delay:.1s}
        [data-reveal][data-d="2"]{transition-delay:.22s}
        [data-reveal][data-d="3"]{transition-delay:.34s}
        [data-reveal][data-d="4"]{transition-delay:.46s}

        /* ── Shimmer overlay on reveal cards ── */
        [data-shimmer]{position:relative;overflow:hidden}
        [data-shimmer].is-visible::after{
          content:'';position:absolute;top:0;bottom:0;width:60%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent);
          animation:shimmer-in .9s ease both;
          pointer-events:none;
        }

        /* ── Hero animate helpers ── */
        .hero-animate-1{animation:slide-up .7s ease both .05s}
        .hero-animate-2{animation:slide-up .7s ease both .18s}
        .hero-animate-3{animation:slide-up .7s ease both .32s}
        .hero-animate-4{animation:fade-in .8s ease both .46s}
        .hero-animate-5{animation:slide-up .8s ease both .6s}

        /* ── Hover helpers ── */
        .ghost-btn:hover{background:rgba(255,255,255,.1)!important;border-color:rgba(255,255,255,.22)!important}
        .nav-link:hover{color:#F1F5F9!important}
        .new-nav-link:hover{color:#22C55E!important;text-shadow:0 0 12px rgba(34,197,94,.5)}
        .cta-arrow-icon{transition:transform .2s ease}
        .cta-main:hover .cta-arrow-icon{transform:translateX(5px)}
        .demo-tab-btn:hover{background:rgba(255,255,255,.07)!important}
        .metric-card:hover{transform:translateY(-4px) scale(1.03)!important;transition:transform .25s ease,box-shadow .25s ease!important;box-shadow:0 12px 32px rgba(0,0,0,.5)!important}

        /* ── Shine sweep on headline ── */
        @keyframes shine-sweep { 0%{background-position:-150% center} 100%{background-position:150% center} }

        /* ── Hero marquee ── */
        @keyframes hero-marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .hero-marquee-inner{display:flex;animation:hero-marquee 36s linear infinite;width:max-content}
        .hero-marquee-track:hover .hero-marquee-inner{animation-play-state:paused}

        /* ── Liquid glass (CodeNest exact spec) ── */
        .liquid-glass{
          background:rgba(255,255,255,0.01);
          background-blend-mode:luminosity;
          backdrop-filter:blur(4px);
          -webkit-backdrop-filter:blur(4px);
          box-shadow:inset 0 1px 1px rgba(255,255,255,0.1);
          border:none;
          position:relative;overflow:hidden;
        }
        .liquid-glass::before{
          content:"";position:absolute;inset:0;padding:1.4px;border-radius:inherit;
          background:linear-gradient(180deg,rgba(255,255,255,.45) 0%,rgba(255,255,255,.15) 20%,rgba(255,255,255,0) 40%,rgba(255,255,255,0) 60%,rgba(255,255,255,.15) 80%,rgba(255,255,255,.45) 100%);
          -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
          -webkit-mask-composite:xor;
          mask-composite:exclude;
          pointer-events:none;
        }

        /* ══════════════════════════════════════════════════
           MOBILE — max-width: 768px
           ═════════════════════════════════════════════════ */
        @media (max-width: 768px) {

          /* NAV */
          .site-nav  { padding: 10px 16px !important; }
          .nav-pill  { display: none !important; }
          .nav-ctas a:first-child { display: none !important; }

          /* HERO */
          .hero-content { padding: 88px 20px 48px !important; }

          /* SECTION CONTAINERS */
          .section-wide { padding-left: 20px !important; padding-right: 20px !important; }

          /* PROBLEM GRID — 2 cols → 1 */
          .problem-grid { grid-template-columns: 1fr !important; }

          /* HIW "COME FUNZIONA" */
          .hiw-track   { display: none !important; }
          .hiw-mark    { display: none !important; }
          .hiw-cards-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .hiw-node      { display: none !important; }
          .hiw-connector { display: none !important; }
          .hiw-cards-grid > div { padding-top: 24px !important; }

          /* TRUST STATS — 4 cols → 2×2 */
          .trust-stats-grid {
            grid-template-columns: 1fr 1fr !important;
            overflow: visible !important;
            border-radius: 14px !important;
          }
          .trust-stats-grid > div {
            padding: 20px 16px !important;
            border-right: 1px solid rgba(255,255,255,0.07) !important;
            border-bottom: 1px solid rgba(255,255,255,0.07) !important;
          }
          .trust-stats-grid > div:nth-child(even) { border-right: none !important; }
          .trust-stats-grid > div:nth-last-child(-n+2) { border-bottom: none !important; }
          .trust-stats-grid > div span[data-count] { font-size: 34px !important; letter-spacing: -1px !important; }

          /* TRUST LAYOUT — 2 cols → 1 */
          .trust-two-col { grid-template-columns: 1fr !important; }

          /* TRUST TABLE — collapse fixed-width columns */
          .trust-table-header { display: none !important; }
          .trust-table-grid { grid-template-columns: 1fr !important; }
          .trust-table-grid > div:not(:first-child) { display: none !important; }

          /* VIDEO */
          .video-outer { padding: 56px 20px !important; }

          /* FOOTER */
          .footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
      `}} />

      {/* ═══ LANDING ═══ */}
      <section id="landing" style={{ background: '#000000', display: 'block' }}>

        {/* ─── HERO (full-screen video) ─────────────────────────────────── */}

        {/* Cursor glow — fixed, always on top */}
        <div id="cursor-glow" style={{ position: 'fixed', top: 0, left: 0, width: 640, height: 640, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,.07) 0%, rgba(129,140,248,.04) 45%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 1 }} />

        {/* Fixed nav */}
        <nav className="site-nav" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 36px',
          background: 'rgba(0,0,0,.55)',
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(255,255,255,.05)',
        }}>
          {/* Logo — tutto a sinistra */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span dangerouslySetInnerHTML={{ __html: markSvg(30) }} />
            <span dangerouslySetInnerHTML={{ __html: logoSvg(130, 34) }} />
          </div>

          {/* Pill nav — centro */}
          <div className="nav-pill" style={{
            border: '1px solid rgba(55,65,81,.85)',
            borderRadius: 9999,
            padding: '9px 36px',
            display: 'flex', alignItems: 'center', gap: 40,
            background: 'rgba(0,0,0,.15)',
          }}>
            {[
              ['Il problema',          '/#problema'],
              ['Casi reali',           '/#casi-reali'],
              ['Come funziona',        '/#come-funziona'],
              ['Le features',          '/#features'],
              ['Perché fidarti',       '/#perche-fidarti'],
              ['FAQ',                  '/faq'],
              ['Contattaci',           '/contattaci'],
            ].map(([l, h]) => (
              <a key={l} href={h} className="new-nav-link" style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,.7)', textDecoration: 'none', transition: 'color .2s', whiteSpace: 'nowrap' }}>{l}</a>
            ))}
          </div>

          {/* Right CTAs — tutto a destra */}
          <div className="nav-ctas" style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <a href="/login" style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.6)', textDecoration: 'none' }}>Accedi</a>
            <a href="/register" style={{ fontSize: 13, fontWeight: 700, color: '#000', textDecoration: 'none', background: '#22C55E', borderRadius: 9999, padding: '8px 22px', whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(34,197,94,.28)' }}>Registrati</a>
          </div>
        </nav>

        {/* Full-screen hero — DesignPro */}
        <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#000' }}>

          {/* Background video — 60% opacity (CodeNest spec) */}
          <video
            ref={videoRef}
            autoPlay muted loop playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity .35s ease' }}
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4"
          />

          {/* Dark tint globale — video leggibile su tutto lo schermo */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,6,3,.45)', pointerEvents: 'none' }} />

          {/* Glow verde atmosferico — strato 1: banda orizzontale top */}
          <div aria-hidden style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: '100%', height: 320, background: 'radial-gradient(ellipse 80% 180px at 50% 0%, rgba(34,197,94,.22) 0%, rgba(34,197,94,.06) 60%, transparent 100%)', pointerEvents: 'none', zIndex: 2 }} />
          {/* Glow verde — strato 2: alone centrale più ampio */}
          <div aria-hidden style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', width: '70%', height: 200, background: 'radial-gradient(ellipse 60% 100px at 50% 0%, rgba(74,222,128,.14) 0%, transparent 80%)', pointerEvents: 'none', zIndex: 2 }} />

          {/* Griglia verticale + orizzontale */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
            {/* Verticali */}
            {[25, 50, 75].map(p => (
              <div key={`v${p}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${p}%`, width: 1, background: p === 50 ? 'rgba(34,197,94,.13)' : 'rgba(255,255,255,.1)' }} />
            ))}
            {/* Orizzontali */}
            {[28, 54, 78].map(p => (
              <div key={`h${p}`} style={{ position: 'absolute', left: 0, right: 0, top: `${p}%`, height: 1, background: 'rgba(34,197,94,.08)' }} />
            ))}
            {/* Dot agli incroci centrali */}
            {[[25,28],[50,28],[75,28],[25,54],[50,54],[75,54],[25,78],[50,78],[75,78]].map(([x,y]) => (
              <div key={`${x}${y}`} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 4, height: 4, borderRadius: '50%', background: 'rgba(34,197,94,.25)', transform: 'translate(-50%, -50%)' }} />
            ))}
          </div>

          {/* Bottom fade into page */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 240, background: 'linear-gradient(to bottom, transparent, #000 92%)', pointerEvents: 'none' }} />

          {/* Hero content — centrato, full screen */}
          <div className="hero-content" style={{
            flex: 1, position: 'relative', zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center',
            padding: '100px 40px 60px',
          }}>

            {/* Eyebrow */}
            <p className="hero-animate-1" style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '.15em', margin: '0 0 22px' }}>
              AI Act Enforcement &nbsp;·&nbsp; Sanzioni attive dall&apos;agosto 2025
            </p>

            {/* H1 */}
            <h1 className="hero-animate-2" style={{
              fontFamily: "inherit",
              fontSize: 'clamp(38px, 5.8vw, 76px)',
              fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.03em',
              margin: '0 0 22px', maxWidth: 820,
            }}>
              <span style={{ color: '#ffffff' }}>L&rsquo;AI è il tuo vantaggio.</span><br />
              <span style={{ color: '#22C55E' }}>La compliance AI Act non deve frenarlo.</span>
            </h1>

            {/* Description */}
            <p className="hero-animate-3" style={{ fontSize: 18, color: 'rgba(255,255,255,.62)', maxWidth: 600, margin: '0 0 40px', lineHeight: 1.72, fontWeight: 400 }}>
              <strong style={{ color: '#F8FAFC', fontWeight: 700 }}>Il Primo Sistema Operativo per la Compliance AI.</strong> Actify centralizza censimento dei sistemi, documentazione obbligatoria, formazione Art. 4 e audit trail immutabile in un&rsquo;unica piattaforma &mdash; progettata per <span style={{ color: '#86EFAC', fontWeight: 700 }}>PMI ed Enterprise</span> che vogliono trasformare il Regolamento UE 2024/1689 da rischio normativo in vantaggio competitivo.
            </p>

            {/* CTA unico — grande e professionale */}
            <div className="hero-animate-4" style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              {/* Free tier label */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 9999, padding: '6px 14px' }}>
                <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="7" fill="rgba(34,197,94,.18)"/><path d="M4.5 7.5l2 2 4-4" stroke="#22C55E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '.02em' }}>Censisci il tuo primo sistema AI <strong style={{ color: '#86EFAC', fontWeight: 700 }}>gratuitamente</strong> — nessuna carta richiesta</span>
              </div>
              <button onClick={w('startWizard')} className="cta-main" style={{
                display: 'inline-flex', alignItems: 'center', gap: 14,
                fontSize: 17, fontWeight: 700, color: '#000',
                background: 'linear-gradient(135deg, #22C55E 0%, #16a34a 100%)',
                border: 'none', borderRadius: 9999,
                padding: '18px 44px', cursor: 'pointer',
                boxShadow: '0 0 0 1px rgba(34,197,94,.3), 0 8px 32px rgba(34,197,94,.35), 0 2px 8px rgba(0,0,0,.4)',
                letterSpacing: '-0.01em',
                fontFamily: "inherit",
              }}>
                Scopri la tua esposizione AI Act — gratis
                <span className="cta-arrow-icon" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0,0,0,.15)', borderRadius: '50%', width: 30, height: 30, justifyContent: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </button>
            </div>

            {/* Trust badges — centrate */}
            <div className="hero-animate-4" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Gratuito', '~10 minuti', 'Report PDF immediato', 'Nessuna registrazione'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'rgba(255,255,255,.42)' }}>
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="7" fill="rgba(34,197,94,.13)"/><path d="M4.5 7.5l2 2 4-4" stroke="#22C55E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Logo marquee — pinned to bottom of hero */}
          <div style={{ position: 'relative', zIndex: 10, paddingBottom: 56 }}>
            {/* Label leggibile con linee decorative */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ height: 1, width: 60, background: 'linear-gradient(to right, transparent, rgba(34,197,94,.35))' }} />
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)' }}>
                Conformità AI per ogni sistema che usi
              </p>
              <div style={{ height: 1, width: 60, background: 'linear-gradient(to left, transparent, rgba(34,197,94,.35))' }} />
            </div>
            <div className="hero-marquee-track" style={{
              overflow: 'hidden',
              maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            }}>
              <div className="hero-marquee-inner">
                {[...MARQUEE_BRANDS, ...MARQUEE_BRANDS].map((b, i) => (
                  <div key={i} style={{
                    flexShrink: 0, marginRight: 14,
                    padding: '12px 22px', borderRadius: 14,
                    display: 'flex', alignItems: 'center', gap: 11,
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.1)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}>
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{b.icon}</span>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: 'rgba(255,255,255,.82)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ─── PROBLEM ──────────────────────────────────────────────────── */}
        <div id="problema" style={{ scrollMarginTop: 72 }} />
        <style>{`
          @keyframes prob-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
            60% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
          }
          @keyframes lq1 {
            0%,100% { transform: translateX(-50%) translate(0px,0px) scale(1); }
            30%     { transform: translateX(-50%) translate(-90px,70px) scale(1.2); }
            65%     { transform: translateX(-50%) translate(70px,-50px) scale(0.85); }
          }
          @keyframes lq2 {
            0%,100% { transform: translate(0px,0px) scale(1); }
            35%     { transform: translate(100px,-80px) scale(1.25); }
            68%     { transform: translate(-60px,90px) scale(0.8); }
          }
          @keyframes lq3 {
            0%,100% { transform: translate(0px,0px) scale(1); }
            40%     { transform: translate(-90px,70px) scale(0.82); }
            72%     { transform: translate(60px,-100px) scale(1.22); }
          }
          @keyframes lq4 {
            0%,100% { transform: translate(0px,0px) scale(1); }
            45%     { transform: translate(80px,-60px) scale(1.18); }
            78%     { transform: translate(-70px,50px) scale(0.88); }
          }
          @keyframes stat-line-grow {
            from { transform: scaleX(0); transform-origin: left; }
            to   { transform: scaleX(1); transform-origin: left; }
          }
          [data-reveal].is-visible .stat-line { animation: stat-line-grow 0.9s cubic-bezier(0.4,0,0.2,1) forwards; }
          .prob-toggle-btn { background: none; border: none; padding: 0; cursor: pointer; width: 100%; }
          .prob-toggle-btn:hover .prob-toggle-label { color: rgba(255,255,255,0.7) !important; }

          /* Right panel timeline (amber) */
          .tl-line-base { position: absolute; top: 5px; left: 5px; right: 5px; height: 1px; background: rgba(255,255,255,0.18); }
          .tl-line-fill { position: absolute; top: 5px; left: 5px; right: 5px; height: 1px; background: linear-gradient(to right, rgba(255,255,255,0.35) 0%, rgba(245,158,11,0.85) 100%); transform: scaleX(0); transform-origin: left center; transition: transform 1.5s cubic-bezier(0.4,0,0.2,1) 0.3s; }
          .tl-line-fill.ready { transform: scaleX(1); }
          [data-reveal].is-visible .tl-line-fill { transform: scaleX(1); }
          .tl-node { opacity: 0; transform: translateY(6px); }
          .tl-node.ready { opacity: 1; transform: translateY(0); }
          .tl-node-0 { transition: opacity 0.42s ease 0.35s, transform 0.42s ease 0.35s; }
          .tl-node-1 { transition: opacity 0.42s ease 0.55s, transform 0.42s ease 0.55s; }
          .tl-node-2 { transition: opacity 0.42s ease 0.75s, transform 0.42s ease 0.75s; }
          .tl-node-3 { transition: opacity 0.42s ease 0.95s, transform 0.42s ease 0.95s; }
          [data-reveal].is-visible .tl-node { opacity: 1; transform: translateY(0); }
          /* Left panel timeline (red) */
          .tl-r-line-fill { position: absolute; top: 5px; left: 5px; right: 5px; height: 1px; background: linear-gradient(to right, rgba(255,255,255,0.30) 0%, rgba(239,68,68,0.85) 100%); transform: scaleX(0); transform-origin: left center; transition: transform 1.5s cubic-bezier(0.4,0,0.2,1) 0.3s; }
          .tl-r-line-fill.ready { transform: scaleX(1); }
          [data-reveal].is-visible .tl-r-line-fill { transform: scaleX(1); }
          .tl-r-node { opacity: 0; transform: translateY(6px); }
          .tl-r-node.ready { opacity: 1; transform: translateY(0); }
          .tl-r-node-0 { transition: opacity 0.42s ease 0.35s, transform 0.42s ease 0.35s; }
          .tl-r-node-1 { transition: opacity 0.42s ease 0.55s, transform 0.42s ease 0.55s; }
          .tl-r-node-2 { transition: opacity 0.42s ease 0.75s, transform 0.42s ease 0.75s; }
          .tl-r-node-3 { transition: opacity 0.42s ease 0.95s, transform 0.42s ease 0.95s; }
          [data-reveal].is-visible .tl-r-node { opacity: 1; transform: translateY(0); }
        `}</style>
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Liquid animated blobs */}
          <div style={{ position: 'absolute', top: 0, left: '50%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 55%)', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0, animation: 'lq1 32s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '5%', left: '0%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.16) 0%, transparent 55%)', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0, animation: 'lq2 40s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '5%', right: '0%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 55%)', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0, animation: 'lq3 36s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '5%', left: '30%', width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 58%)', filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0, animation: 'lq4 44s ease-in-out infinite' }} />

          {/* Grid overlay — stessa struttura dell'hero */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
            {[25, 50, 75].map(p => (
              <div key={`pv${p}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${p}%`, width: 1, background: p === 50 ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)' }} />
            ))}
            {[33, 66].map(p => (
              <div key={`ph${p}`} style={{ position: 'absolute', left: 0, right: 0, top: `${p}%`, height: 1, background: 'rgba(255,255,255,0.05)' }} />
            ))}
            {[[25,33],[50,33],[75,33],[25,66],[50,66],[75,66]].map(([x,y]) => (
              <div key={`pd${x}${y}`} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 3, height: 3, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', transform: 'translate(-50%,-50%)' }} />
            ))}
          </div>
        <div className="section-wide" style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 40px 80px', position: 'relative', zIndex: 1 }}>

          {/* Section header */}
          <div data-reveal style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, color: '#F87171', textTransform: 'uppercase', letterSpacing: '.1em', background: 'rgba(220,38,38,.09)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 20, padding: '5px 14px', marginBottom: 24 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Il Problema
            </div>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 54px)', fontWeight: 900, color: '#F1F5F9', margin: '0 0 20px', letterSpacing: '-2px', lineHeight: 1.08, fontFamily: "inherit" }}>
              Due rischi che si muovono in parallelo.
            </h2>
            <p style={{ fontSize: 17, color: '#64748B', maxWidth: 580, margin: '0 auto', lineHeight: 1.78 }}>
              L&rsquo;AI Act non è solo un problema di multa. È anche un problema di accesso al mercato — e le due pressioni si stanno intensificando insieme.
            </p>
          </div>

          {/* Two Apple-style panels */}
          <div className="problem-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* ── Panel 1: Rischio Normativo ── */}
            <div data-reveal data-d="1" style={{ background: 'rgba(10,10,12,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderTop: '2px solid rgba(239,68,68,0.6)', borderRadius: 24, padding: '36px 36px 0', display: 'flex', flexDirection: 'column' }}>

              {/* Badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0, animation: 'prob-pulse 2.3s ease-in-out infinite' }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(239,68,68,0.7)', textTransform: 'uppercase', letterSpacing: '.18em' }}>Rischio Normativo &nbsp;·&nbsp; Sanzioni operative</span>
              </div>

              {/* Big stat — donut chart */}
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '176px 1fr', gap: 28, alignItems: 'center', marginBottom: 32 }}>
                  {/* Donut */}
                  <div ref={pieRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(() => {
                      const R = 68; const C = 2 * Math.PI * R;
                      return (
                        <svg viewBox="0 0 176 176" width="176" height="176" style={{ overflow: 'visible' }}>
                          <defs>
                            <linearGradient id="pieGradRed" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#EF4444" />
                              <stop offset="70%" stopColor="#F87171" />
                              <stop offset="100%" stopColor="#FCA5A5" />
                            </linearGradient>
                            <filter id="pieGlow">
                              <feGaussianBlur stdDeviation="3" result="blur" />
                              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                          </defs>
                          {/* Track */}
                          <circle cx="88" cy="88" r={R} fill="none" stroke="rgba(239,68,68,0.10)" strokeWidth="14" />
                          {/* Animated arc — SVG-native transform avoids CSS transformOrigin inconsistencies across browsers/DPI */}
                          <circle
                            cx="88" cy="88" r={R}
                            fill="none"
                            stroke="url(#pieGradRed)"
                            strokeWidth="14"
                            strokeLinecap="round"
                            strokeDasharray={`${C}`}
                            strokeDashoffset={pieTriggered ? 0 : C}
                            filter="url(#pieGlow)"
                            transform="rotate(-90 88 88)"
                            style={{
                              transition: pieTriggered ? 'stroke-dashoffset 2.6s cubic-bezier(0.16,1,0.3,1)' : 'none',
                            }}
                          />
                          {/* Center labels — anchored to (88,88) so text is always centered in the ring */}
                          <g transform="translate(88, 88)" textAnchor="middle">
                            <text y="-21" dominantBaseline="central" fontSize="10" fontWeight="700" fill="rgba(239,68,68,0.5)" letterSpacing="0.08em">fino a</text>
                            <text y="0" dominantBaseline="central" fontSize="32" fontWeight="900" fill="#F8FAFC" letterSpacing="-1.5">€35M</text>
                            <text y="21" dominantBaseline="central" fontSize="8" fontWeight="600" fill="rgba(255,255,255,0.2)" letterSpacing="1.5">SANZIONE MAX</text>
                          </g>
                        </svg>
                      );
                    })()}
                  </div>
                  {/* Text */}
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>o 7% del fatturato globale annuo — il valore più alto</div>
                    <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.82, margin: 0, maxWidth: 380 }}>
                      La sanzione massima per violazioni gravi (Art.&nbsp;99 AI Act). Già applicabile ai sistemi ad alto rischio. Violazioni minori: fino a €15M o 3% del fatturato. E il GDPR ci insegna che le sanzioni crescono nel tempo.
                    </p>
                  </div>
                </div>

                {/* Timeline: GDPR fines history as precedent */}
                <div style={{ position: 'relative', paddingTop: 2 }}>
                  <div style={{ position: 'absolute', top: 5, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.20)', borderRadius: 1, zIndex: 0 }} />
                  <div style={{ position: 'absolute', top: 5, left: 0, right: 0, height: 2, background: 'linear-gradient(to right, rgba(255,255,255,0.35) 0%, rgba(239,68,68,0.9) 100%)', borderRadius: 1, zIndex: 1, transformOrigin: 'left center' }} className="tl-r-line-fill" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', position: 'relative', zIndex: 2 }}>
                    {[
                      { year: '2019', fine: '€50M', who: 'Google (FR)', note: 'Prima multa GDPR significativa. Il mercato si sveglia.', dotSize: 8, glow: false, align: 'flex-start' as const },
                      { year: '2021', fine: '€225M', who: 'WhatsApp (IE)', note: 'L\'enforcement accelera. Le aziende tech nel mirino.', dotSize: 9, glow: false, align: 'center' as const },
                      { year: '2023', fine: '€1.2B', who: 'Meta (IE)', note: 'Record mondiale. La scala delle sanzioni esplode.', dotSize: 11, glow: true, align: 'center' as const },
                      { year: '2025+', fine: '?', who: 'AI Act — ACN', note: 'Il copione si ripete. Chi sarà il primo?', dotSize: 10, glow: true, isLast: true, align: 'flex-end' as const },
                    ].map((e, i) => (
                      <div key={i} className={`tl-r-node tl-r-node-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: e.align }}>
                        <div style={{ width: e.dotSize, height: e.dotSize, borderRadius: '50%', marginBottom: 10, flexShrink: 0, background: e.isLast ? '#EF4444' : 'rgba(239,68,68,0.55)', border: '1px solid rgba(239,68,68,0.35)', boxShadow: e.glow ? '0 0 14px rgba(239,68,68,0.45)' : 'none', animation: e.isLast ? 'prob-pulse 2.3s ease-in-out infinite' : 'none' }} />
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.65)', marginBottom: 2, letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>{e.year}</div>
                        <div style={{ fontSize: 12, fontWeight: 900, color: e.isLast ? '#F87171' : 'rgba(239,68,68,0.9)', marginBottom: 2, letterSpacing: '-0.5px', fontFamily: "inherit" }}>{e.fine}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>{e.who}</div>
                        <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.48)', lineHeight: 1.5, maxWidth: 95 }}>{e.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 0, marginTop: 28 }} />

              {/* Accordion toggle */}
              <button className="prob-toggle-btn" onClick={() => setOpenEnforcement(v => !v)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0' }}>
                  <span className="prob-toggle-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', color: 'rgba(255,255,255,0.65)', transition: 'color 0.2s' }}>Chi può ispezionarti</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openEnforcement ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.38s cubic-bezier(0.4,0,0.2,1)', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </button>

              {/* Accordion content */}
              <div style={{ maxHeight: openEnforcement ? '820px' : '0px', overflow: 'hidden', transition: 'max-height 0.48s cubic-bezier(0.4,0,0.2,1)' }}>
                <div style={{ paddingBottom: 28, borderTop: '1px solid rgba(255,255,255,0.06)' }}>

                  {/* Chi controlla */}
                  <div style={{ paddingTop: 18, marginBottom: 18 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.16em', marginBottom: 10 }}>Chi controlla</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { flag: '🇮🇹', name: 'ACN Italia', sub: 'NCA italiana', desc: 'Agenzia per la Cybersicurezza Nazionale — supervisore nazionale per il Reg. UE 2024/1689. Conduce ispezioni, emette sanzioni.', primary: true },
                        { flag: '🇪🇺', name: 'EU AI Office', sub: 'Cross-border', desc: 'Gestisce i casi che coinvolgono più stati membri e i modelli AI di grandi dimensioni (GPAI).', primary: false },
                      ].map(a => (
                        <div key={a.name} style={{ background: a.primary ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${a.primary ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 14 }}>{a.flag}</span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: a.primary ? '#fca5a5' : '#F8FAFC' }}>{a.name}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: a.primary ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.4)', background: a.primary ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${a.primary ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 20, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>{a.sub}</span>
                          </div>
                          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.65 }}>{a.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cosa scatta un'ispezione */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.16em', marginBottom: 10 }}>Cosa fa scattare un'ispezione</div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '0 0 10px', lineHeight: 1.6 }}>Non aspettarti un'ispezione a freddo. I controlli partono da trigger precisi:</p>
                    {[
                      { n: '1', title: 'Un incidente documentato', desc: 'Candidato discriminato, credito negato, decisione medica errata. Chi subisce il danno reclama — l\'autorità ti chiede la documentazione.' },
                      { n: '2', title: 'Un reclamo di terzi', desc: 'Dipendente, concorrente, associazione consumatori. Basta una segnalazione formale per aprire un\'istruttoria.' },
                      { n: '3', title: 'Sweep settoriali', desc: 'Campagne tematiche su settori ad alto rischio — come il Garante dopo il GDPR. HR, fintech e healthcare saranno i primi.' },
                      { n: '4', title: 'Verifica database EU', desc: 'Per i sistemi ad alto rischio la registrazione è obbligatoria. L\'autorità la controlla in autonomia, senza incidenti.' },
                    ].map(t => (
                      <div key={t.n} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)', alignItems: 'flex-start' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, fontWeight: 800, color: 'rgba(239,68,68,0.8)', marginTop: 1 }}>{t.n}</div>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.88)', display: 'block', marginBottom: 2 }}>{t.title}</span>
                          <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{t.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quando */}
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.16em', marginBottom: 10 }}>Quando</div>
                    {[
                      { period: '2025 – 2026', color: 'rgba(255,255,255,0.7)', dot: 'rgba(255,255,255,0.3)', label: 'Le autorità si organizzano. Prime linee guida, nessuna sanzione pesante.' },
                      { period: '2026 – 2027', color: '#F59E0B', dot: '#F59E0B', label: 'Primi incidenti → prime istruttorie → prime sanzioni sui casi più evidenti.' },
                      { period: '2027 – 2028', color: '#F87171', dot: '#EF4444', label: 'Enforcement sistematico. Sweep settoriali. Sanzioni routinarie.' },
                    ].map(r => (
                      <div key={r.period} style={{ display: 'flex', gap: 10, padding: '7px 0', borderTop: '1px solid rgba(255,255,255,0.05)', alignItems: 'flex-start' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.dot, flexShrink: 0, marginTop: 4 }} />
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: r.color, whiteSpace: 'nowrap' }}>{r.period}</span>
                          <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.58)', lineHeight: 1.6 }}>{r.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </div>

            {/* ── Panel 2: Rischio Mercato ── */}
            <div data-reveal data-d="2" style={{ background: 'rgba(10,10,12,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderTop: '2px solid rgba(245,158,11,0.55)', borderRadius: 24, padding: '36px 36px 0', display: 'flex', flexDirection: 'column' }}>

              {/* Badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(245,158,11,0.75)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(245,158,11,0.7)', textTransform: 'uppercase', letterSpacing: '.18em' }}>Rischio Mercato &nbsp;·&nbsp; In accelerazione</span>
              </div>

              {/* Big stat */}
              <div style={{ marginBottom: 36 }}>
                <div data-count="2018" data-prefix="" data-suffix="" style={{ fontSize: 76, fontWeight: 900, letterSpacing: '-5px', lineHeight: 1, color: '#F8FAFC', marginBottom: 10, fontFamily: "inherit" }}>2018</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>È già successo con il GDPR</div>
                <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.82, margin: '0 0 32px', maxWidth: 420 }}>
                  Dopo il 25 maggio 2018, la compliance GDPR è diventata un prerequisito implicito in ogni contratto B2B, gara pubblica e processo di due diligence. L&rsquo;AI Act sta seguendo la stessa traiettoria — con tempi più compressi.
                </p>

                {/* Dynamic timeline 2018 → 2026 */}
                <div style={{ position: 'relative', paddingTop: 2 }}>
                  <div style={{ position: 'absolute', top: 5, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.20)', borderRadius: 1, zIndex: 0 }} />
                  <div style={{ position: 'absolute', top: 5, left: 0, right: 0, height: 2, background: 'linear-gradient(to right, rgba(255,255,255,0.35) 0%, rgba(245,158,11,0.9) 100%)', borderRadius: 1, zIndex: 1, transformOrigin: 'left center' }} className="tl-line-fill" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', position: 'relative', zIndex: 2, paddingTop: 0 }}>
                    {[
                      { year: '2018', label: 'GDPR in vigore', note: 'Il mercato non era pronto. Il panico dura 12 mesi.', past: true, align: 'flex-start' as const },
                      { year: '2020', label: 'Standard B2B', note: 'GDPR clausola implicita in ogni contratto enterprise.', past: true, align: 'center' as const },
                      { year: '2025', label: 'AI Act operativo', note: 'Prime sanzioni. Lo stesso copione ricomincia.', past: false, align: 'center' as const },
                      { year: '2026 →', label: 'AI = nuovo GDPR', note: 'AI compliance diventa requisito di mercato.', past: false, align: 'flex-end' as const },
                    ].map((e, i) => (
                      <div key={i} className={`tl-node tl-node-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: e.align }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', marginBottom: 10, flexShrink: 0, background: e.past ? 'rgba(255,255,255,0.18)' : '#F59E0B', border: e.past ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(245,158,11,0.5)', boxShadow: e.past ? 'none' : '0 0 14px rgba(245,158,11,0.5)' }} />
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: e.past ? 'rgba(255,255,255,0.65)' : '#F59E0B', marginBottom: 4, letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>{e.year}</div>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: e.past ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.88)', marginBottom: 4, lineHeight: 1.3 }}>{e.label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, maxWidth: 95 }}>{e.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 0, marginTop: 28 }} />

              {/* Accordion toggle */}
              <button className="prob-toggle-btn" onClick={() => setOpenMarket(v => !v)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0' }}>
                  <span className="prob-toggle-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', color: 'rgba(255,255,255,0.65)', transition: 'color 0.2s' }}>Dove la compliance diventa requisito</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openMarket ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.38s cubic-bezier(0.4,0,0.2,1)', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </button>

              {/* Accordion content */}
              <div style={{ maxHeight: openMarket ? '600px' : '0px', overflow: 'hidden', transition: 'max-height 0.48s cubic-bezier(0.4,0,0.2,1)' }}>
                <div style={{ paddingBottom: 28 }}>
                  {[
                    { title: 'Contratti Enterprise e Supply Chain', desc: 'Le grandi aziende richiedono attestazioni di compliance AI Act ai fornitori — come già avviene per ISO 27001 e GDPR. Senza documentazione non si passa il vendor assessment.', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
                    { title: 'Gare Pubbliche e Bandi PNRR', desc: 'La PA introduce criteri di conformità AI Act negli appalti tech. Non essere compliant significa essere esclusi — incluse le gare finanziate dal PNRR.', icon: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></> },
                    { title: 'Due Diligence Investor e M&A', desc: 'Fondi VC e PE valutano la governance AI nel processo di investimento. Un gap normativo è un red flag che abbassa la valutazione o blocca il deal.', icon: <><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></> },
                    { title: 'ISO 42001 e Copertura Assicurativa', desc: 'Lo standard ISO 42001 (AI Management System) emerge come benchmark. Le polizze cyber iniziano a richiedere prove di governance AI per mantenere la copertura.', icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></> },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,158,11,0.45)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>{item.icon}</svg>
                      <div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.88)', display: 'block', marginBottom: 2 }}>{item.title}</span>
                        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.58)', lineHeight: 1.58 }}>{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom stats — 3 animated cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { count: 82, prefix: '', suffix: '%', color: '#F8FAFC', bar: '#22C55E', label: 'delle PMI italiane usa almeno un sistema AI', sub: 'Fonte: Osservatorio AI — Politecnico di Milano, 2025', barW: '82%' },
              { count: 20, prefix: '<', suffix: '%', color: '#F8FAFC', bar: '#EF4444', label: 'ha avviato un percorso strutturato di compliance AI', sub: 'Il gap normativo è aperto e si allarga ogni mese', barW: '20%' },
              { count: 50, prefix: '€', suffix: 'K+', color: '#F8FAFC', bar: '#F59E0B', label: 'il costo medio di una consulenza AI Act per PMI', sub: 'Budget fuori portata senza uno strumento dedicato', barW: '70%' },
            ].map((s, i) => (
              <div key={i} data-reveal data-d={String(i + 1)} style={{ background: 'rgba(10,10,12,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '28px 28px 24px', display: 'flex', flexDirection: 'column' }}>
                {/* Number */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color, marginRight: 3, letterSpacing: '.02em' }}>{s.prefix}</span>
                  <span data-count={s.count} data-suffix={s.suffix} style={{ fontSize: 50, fontWeight: 900, color: s.color, letterSpacing: '-3px', lineHeight: 1, fontFamily: "inherit" }}>0{s.suffix}</span>
                </div>
                {/* Animated bar */}
                <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                  <div className="stat-line" style={{ height: '100%', width: s.barW, background: s.bar, borderRadius: 2, transform: 'scaleX(0)', transformOrigin: 'left', animationDelay: `${i * 0.15}s`, animationFillMode: 'forwards' }} />
                </div>
                {/* Label */}
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', marginTop: 'auto' }}>{s.sub}</div>
              </div>
            ))}
          </div>

        </div>
        </div>{/* /problem relative wrapper */}

        {/* ─── AURORA DIVIDER ────────────────────────────────────────────── */}
        <div style={{ position: 'relative', height: 80, overflow: 'hidden', pointerEvents: 'none', marginTop: -20 }}>
          <div style={{ position: 'absolute', top: '30%', left: '30%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.13) 0%, transparent 65%)', filter: 'blur(40px)', transform: 'translate(-50%, -50%)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '60%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)', filter: 'blur(50px)', transform: 'translate(-50%, -50%)' }} />
          <div style={{ position: 'absolute', top: '20%', left: '50%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)', filter: 'blur(30px)', transform: 'translate(-50%, -50%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, #000 100%)' }} />
        </div>

        {/* ─── CASI REALI ───────────────────────────────────────────────── */}
        <div id="casi-reali" style={{ scrollMarginTop: 72 }} />
        <CasiReali />

        {/* ─── HOW IT WORKS ─────────────────────────────────────────────── */}
        <div id="come-funziona" style={{ scrollMarginTop: 72 }} />
        <style>{`
          @keyframes hiw-travel {

            0%, 24%  { left: 16.67%; opacity: 1; }
            31%, 56% { left: 50%;    opacity: 1; }
            63%, 88% { left: 83.33%; opacity: 1; }
            92%      { left: 83.33%; opacity: 0; }
            93%      { left: 16.67%; opacity: 0; }
            100%     { left: 16.67%; opacity: 1; }
          }
          @keyframes hiw-trail {
            0%, 24%  { width: 0%;      opacity: 1; }
            31%, 56% { width: 33.33%;  opacity: 1; }
            63%, 88% { width: 66.67%;  opacity: 1; }
            92%      { width: 66.67%;  opacity: 0; }
            93%      { width: 0%;      opacity: 0; }
            100%     { width: 0%;      opacity: 1; }
          }
          @keyframes hiw-mark-glow {
            0%, 49%  { box-shadow: 0 0 0 5px rgba(34,197,94,0.18), 0 0 28px rgba(34,197,94,0.55); }
            50%, 100% { box-shadow: 0 0 0 8px rgba(34,197,94,0.1), 0 0 40px rgba(34,197,94,0.35); }
          }
          @keyframes hiw-node-1 {
            0%, 27%   { background: #22C55E; box-shadow: 0 0 0 5px rgba(34,197,94,0.2), 0 0 18px rgba(34,197,94,0.5); }
            33%, 100% { background: rgba(255,255,255,0.12); box-shadow: none; }
          }
          @keyframes hiw-node-2 {
            0%, 29%   { background: rgba(255,255,255,0.12); box-shadow: none; }
            31%, 58%  { background: #22C55E; box-shadow: 0 0 0 5px rgba(34,197,94,0.2), 0 0 18px rgba(34,197,94,0.5); }
            64%, 100% { background: rgba(255,255,255,0.12); box-shadow: none; }
          }
          @keyframes hiw-node-3 {
            0%, 61%  { background: rgba(255,255,255,0.12); box-shadow: none; }
            63%, 90% { background: #22C55E; box-shadow: 0 0 0 5px rgba(34,197,94,0.2), 0 0 18px rgba(34,197,94,0.5); }
            96%, 100% { background: rgba(255,255,255,0.12); box-shadow: none; }
          }
          @keyframes hiw-card-1 {
            0%, 24% {
              opacity: 1; transform: scale(1.04) translateY(-8px);
              background: linear-gradient(160deg, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0.04) 100%);
              border-color: rgba(34,197,94,0.55);
              box-shadow: 0 0 0 1px rgba(34,197,94,0.2), 0 0 120px rgba(34,197,94,0.3), 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(34,197,94,0.2);
            }
            31%, 100% {
              opacity: 0.3; transform: scale(0.96);
              background: rgba(12,12,14,0.9); border-color: rgba(255,255,255,0.05); box-shadow: none;
            }
          }
          @keyframes hiw-card-2 {
            0%, 29% {
              opacity: 0.3; transform: scale(0.96);
              background: rgba(12,12,14,0.9); border-color: rgba(255,255,255,0.05); box-shadow: none;
            }
            31%, 56% {
              opacity: 1; transform: scale(1.04) translateY(-8px);
              background: linear-gradient(160deg, rgba(99,102,241,0.16) 0%, rgba(99,102,241,0.04) 100%);
              border-color: rgba(129,140,248,0.55);
              box-shadow: 0 0 0 1px rgba(129,140,248,0.2), 0 0 120px rgba(99,102,241,0.3), 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(129,140,248,0.2);
            }
            63%, 100% {
              opacity: 0.3; transform: scale(0.96);
              background: rgba(12,12,14,0.9); border-color: rgba(255,255,255,0.05); box-shadow: none;
            }
          }
          @keyframes hiw-card-3 {
            0%, 61% {
              opacity: 0.3; transform: scale(0.96);
              background: rgba(12,12,14,0.9); border-color: rgba(255,255,255,0.05); box-shadow: none;
            }
            63%, 88% {
              opacity: 1; transform: scale(1.04) translateY(-8px);
              background: linear-gradient(160deg, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0.04) 100%);
              border-color: rgba(34,197,94,0.55);
              box-shadow: 0 0 0 1px rgba(34,197,94,0.2), 0 0 120px rgba(34,197,94,0.3), 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(34,197,94,0.2);
            }
            94%, 100% {
              opacity: 0.3; transform: scale(0.96);
              background: rgba(12,12,14,0.9); border-color: rgba(255,255,255,0.05); box-shadow: none;
            }
          }
          @keyframes hiw-desc-1 {
            0%, 22%   { opacity: 1; }
            29%, 100% { opacity: 0; }
          }
          @keyframes hiw-desc-2 {
            0%, 29%   { opacity: 0; }
            31%, 56%  { opacity: 1; }
            63%, 100% { opacity: 0; }
          }
          @keyframes hiw-desc-3 {
            0%, 61%   { opacity: 0; }
            63%, 88%  { opacity: 1; }
            94%, 100% { opacity: 0; }
          }
        `}</style>
        <div data-reveal className="section-wide hiw-outer" style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 40px 80px' }}>
          <div style={{ position: 'relative' }}>
          {/* Grid overlay — vertical lines aligned to the 3 steps */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
            {([16.67, 50, 83.33] as number[]).map(p => (
              <div key={`hiwv${p}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${p}%`, width: 1, background: p === 50 ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)' }} />
            ))}
            {([33, 66] as number[]).map(p => (
              <div key={`hiwh${p}`} style={{ position: 'absolute', left: 0, right: 0, top: `${p}%`, height: 1, background: 'rgba(255,255,255,0.04)' }} />
            ))}
            {([[16.67,33],[50,33],[83.33,33],[16.67,66],[50,66],[83.33,66]] as [number,number][]).map(([x,y]) => (
              <div key={`hiwd${x}${y}`} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 3, height: 3, borderRadius: '50%', background: 'rgba(34,197,94,0.18)', transform: 'translate(-50%,-50%)' }} />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginBottom: 72, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '.1em', background: 'rgba(34,197,94,.09)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
              Come Funziona Actify
            </div>
            <h2 style={{ fontSize: 'clamp(36px, 4.2vw, 62px)', fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.08, fontFamily: "inherit" }}>
              Actify fa il lavoro duro{' '}
              <span style={{ backgroundImage: 'linear-gradient(135deg, #22C55E, #818CF8)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>per te</span>
            </h2>
            <p style={{ fontSize: 17, color: '#64748B', maxWidth: 560, margin: '0 auto', lineHeight: 1.75 }}>
              Tre passi per trasformare la complessità dell&rsquo;AI Act in conformità documentata e audit-ready.
            </p>
            <AiComplianceBadge />
          </div>

          {/* ── Unified track + cards ─────────────────────────────── */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Horizontal track — sits at node height (top: 28px of each card) */}
            <div className="hiw-track" style={{ position: 'absolute', top: 28, left: 'calc(16.67%)', right: 'calc(16.67%)', height: 1, background: 'rgba(255,255,255,0.07)', zIndex: 0 }} />
            <div className="hiw-track" style={{ position: 'absolute', top: 28, left: 'calc(16.67%)', height: 1, background: 'linear-gradient(to right, #22C55E, rgba(34,197,94,0.2))', animation: 'hiw-trail 20s ease-in-out infinite', width: 0, zIndex: 1 }} />

            {/* Moving Actify mark */}
            <div className="hiw-mark" style={{ position: 'absolute', top: 28, left: '16.67%', transform: 'translate(-50%, -50%)', zIndex: 10, animation: 'hiw-travel 20s ease-in-out infinite', filter: 'drop-shadow(0 0 12px rgba(34,197,94,0.8))' }}>
              <svg width="40" height="40" viewBox="0 0 126 126" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                <circle cx="63" cy="63" r="60" fill="rgba(6,6,8,1)" stroke="#22C55E" strokeWidth="6"/>
                <g fill="none" stroke="#22C55E" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23,81 36,95 81,25"/>
                  <line x1="81" y1="25" x2="99" y2="89"/>
                  <line x1="59" y1="60" x2="91" y2="60"/>
                </g>
              </svg>
            </div>

            {/* Cards grid — nodes at top connect to track */}
            <div className="hiw-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {([
                {
                  n: '01', anim: 'hiw-card-1', nodeAnim: 'hiw-node-1', descAnim: 'hiw-desc-1',
                  title: 'Censisci i tuoi sistemi AI',
                  desc: 'Registra ogni sistema AI dell\'organizzazione nell\'AI Passport Inventory — come Provider o Deployer — tramite un form guidato. 5 minuti per tool, mappa completa dell\'intera infrastruttura AI.',
                  icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
                },
                {
                  n: '02', anim: 'hiw-card-2', nodeAnim: 'hiw-node-2', descAnim: 'hiw-desc-2',
                  title: 'Actify analizza e classifica',
                  desc: 'Per ogni tool censito, il software proprietario di Actify mappa il sistema e il suo utilizzo reale contro tutti gli articoli dell\'AI Act rilevanti, identifica i gap aperti e stima l\'esposizione sanzionatoria — visibile nella Fine Estimation Board.',
                  icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
                },
                {
                  n: '03', anim: 'hiw-card-3', nodeAnim: 'hiw-node-3', descAnim: 'hiw-desc-3',
                  title: 'Chiudi ogni gap, documenta la compliance',
                  desc: 'Actify guida la risoluzione di ogni gap tramite AI Literacy Tracker, Audit Trail e Document Vault. In parallelo, automatizza la generazione di diversi documenti obbligatori — tra cui Registro dei Sistemi AI, FRIA, Valutazione del Rischio, Piano di Conformità, Report Art. 4 e Dichiarazione di Trasparenza — per accelerare l\'intero percorso di compliance.',
                  icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
                },
              ] as Array<{ n: string; anim: string; nodeAnim: string; descAnim: string; title: string; desc: string; icon: React.ReactNode }>).map((s, i) => (
                <div key={s.n} data-reveal data-d={String(i + 1)} style={{ position: 'relative', zIndex: 2, animation: `${s.anim} 20s ease-in-out infinite`, border: '1px solid', borderRadius: 24, padding: '48px 28px 28px' }}>

                  {/* Node */}
                  <div className="hiw-node" style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: '50%', animation: `${s.nodeAnim} 20s ease-in-out infinite`, zIndex: 3 }} />
                  {/* Connector */}
                  <div className="hiw-connector" style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 1, height: 36, background: 'rgba(255,255,255,0.06)' }} />

                  {/* Step label + icon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '.18em', textTransform: 'uppercase' }}>Passo {s.n}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }}>{s.icon}</div>
                  </div>

                  {/* Title — always visible */}
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: '-.4px', lineHeight: 1.25 }}>{s.title}</h3>

                  {/* Collapsible: separator + description */}
                  <div style={{ animation: `${s.descAnim} 20s ease-in-out infinite`, marginTop: 16, minHeight: 130, overflow: 'hidden' }}>
                    <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 12 }} />
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', lineHeight: 1.78, margin: 0 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>{/* /hiw-grid-wrapper */}
        </div>

        {/* ─── VIDEO SECTION ─────────────────────────────────────────────── */}
        <VideoSection />

        {/* ─── MACBOOK IMAGE SECTION ─────────────────────────────────────── */}
        <div id="features" style={{ scrollMarginTop: 72 }} />
        <MacbookImageSection />

        {/* ─── TRUST ─────────────────────────────────────────────────────── */}
        <div id="perche-fidarti" style={{ scrollMarginTop: 72 }} />
        <style>{`
          .trust-sys-row { transition: background 0.18s; }
          .trust-sys-row:hover { background: rgba(255,255,255,0.025) !important; }
          @keyframes trust-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
            60% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
          }
        `}</style>
        <div data-reveal className="section-wide" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 40px 80px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '.1em', background: 'rgba(34,197,94,.09)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
              Perché puoi fidarti
            </div>
            <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 60px)', fontWeight: 800, color: '#fff', margin: '0 0 18px', letterSpacing: '-0.03em', lineHeight: 1.08, fontFamily: "inherit" }}>
              Siamo i nostri <em style={{ fontStyle: 'italic', color: '#22C55E' }}>primi clienti</em>
            </h2>
            <p style={{ fontSize: 17, color: '#64748B', maxWidth: 520, margin: '0 auto', lineHeight: 1.75 }}>
              Prima di chiederti di usare Actify, lo abbiamo usato su noi stessi. Ogni sistema AI della piattaforma è censito, classificato e verificato con il nostro stesso strumento.
            </p>
          </div>

          {/* Stats strip */}
          <div className="trust-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden', marginBottom: 20 }}>
            {([
              { n: 0, suffix: '', label: 'Violazioni AI Act', color: '#22C55E', sub: 'conformità totale' },
              { n: 11, suffix: '', label: 'Articoli verificati', color: '#818CF8', sub: 'copertura Art. 1–50' },
              { n: 2, suffix: '', label: 'Sistemi AI censiti', color: '#22C55E', sub: '100% documentati' },
              { n: 100, suffix: '%', label: 'Score conformità', color: '#22C55E', sub: 'audit-ready' },
            ] as Array<{ n: number; suffix: string; label: string; color: string; sub: string }>).map((s, i) => (
              <div key={s.label} style={{ padding: '32px 28px', background: 'rgba(10,10,12,0.98)', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color === '#818CF8' ? 'rgba(129,140,248,0.45)' : 'rgba(34,197,94,0.4)' }} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 1, marginBottom: 8 }}>
                  <span data-count={s.n} data-suffix={s.suffix} style={{ fontSize: 52, fontWeight: 900, color: s.color, letterSpacing: '-3px', lineHeight: 1, fontFamily: "inherit" }}>{s.n}{s.suffix}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Two-panel layout */}
          <div className="trust-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1.72fr', gap: 20 }}>

            {/* Left — Certificate panel */}
            <div style={{ background: 'rgba(10,10,12,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(to right, rgba(34,197,94,0.7), rgba(34,197,94,0.1))' }} />
              <div style={{ position: 'absolute', top: 80, left: '50%', width: 180, height: 180, transform: 'translate(-50%, -50%)', background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

              <span dangerouslySetInnerHTML={{ __html: badgeSvg(96) }} />

              <div style={{ marginTop: 18, fontSize: 10.5, fontWeight: 800, letterSpacing: '.22em', textTransform: 'uppercase', color: '#22C55E' }}>
                Actify Verified Compliant
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.22)', marginTop: 4, marginBottom: 28 }}>
                Reg. UE 2024/1689 · AI Act
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {([
                  { label: 'Ambito', value: 'Actify SaaS Platform' },
                  { label: 'Emissione', value: 'Maggio 2026' },
                  { label: 'Articoli verificati', value: '11 / 11' },
                  { label: 'Non conformità', value: '0 rilevate' },
                ] as Array<{ label: string; value: string }>).map((row, i, arr) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>{row.label}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 9999, padding: '7px 16px', fontSize: 11, fontWeight: 700, color: '#4ADE80' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', animation: 'trust-pulse 2.5s ease-in-out infinite' }} />
                Certificazione attiva
              </div>
            </div>

            {/* Right — AI Inventory table */}
            <div style={{ background: 'rgba(10,10,12,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', height: 2 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(129,140,248,0.5), rgba(34,197,94,0.3))' }} />
              </div>

              {/* Table header */}
              <div className="trust-table-header" style={{ display: 'grid', gridTemplateColumns: '1fr 110px 130px', gap: 12, padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', letterSpacing: '.2em' }}>Sistema AI</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', letterSpacing: '.2em', textAlign: 'center' }}>Conformità</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', letterSpacing: '.2em', textAlign: 'right' }}>Rischio</div>
              </div>

              {/* System rows */}
              {([
                {
                  name: 'Claude Code', vendor: 'Anthropic', usage: 'Uso interno — sviluppatori',
                  risk: 'Rischio Minimo', rc: '#22C55E', rb: 'rgba(34,197,94,.07)', dot: '#22C55E',
                  score: 100, articles: ['Art. 13', 'Art. 14', 'Art. 52'],
                },
                {
                  name: 'Amazon Nova Pro', vendor: 'AWS Bedrock', usage: 'Generazione report e documenti',
                  risk: 'Rischio Limitato', rc: '#FCD34D', rb: 'rgba(202,138,4,.07)', dot: '#F59E0B',
                  score: 98, articles: ['Art. 52', 'Art. 13'],
                },
              ] as Array<{ name: string; vendor: string; usage: string; risk: string; rc: string; rb: string; dot: string; score: number; articles: string[] }>).map((sys, i, arr) => (
                <div key={sys.name} className="trust-sys-row" style={{ padding: '24px 28px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: 'transparent' }}>
                  <div className="trust-table-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 110px 130px', gap: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sys.dot, boxShadow: `0 0 10px ${sys.dot}99`, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#F1F5F9' }}>{sys.name}</div>
                        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{sys.vendor} · {sys.usage}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#22C55E', lineHeight: 1, fontFamily: "inherit" }}>{sys.score}%</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 2 }}>compliance</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sys.rc, background: sys.rb, border: `1px solid ${sys.rc}30`, borderRadius: 7, padding: '5px 12px', whiteSpace: 'nowrap' }}>{sys.risk}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 14, paddingLeft: 21 }}>
                    {sys.articles.map(a => (
                      <span key={a} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '3px 8px' }}>{a}</span>
                    ))}
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 5, padding: '3px 8px' }}>✓ Verificato</span>
                  </div>
                </div>
              ))}

              {/* Footer */}
              <div style={{ marginTop: 'auto', padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.18)' }}>2 sistemi · 0 violazioni · ultima verifica maggio 2026</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <a href="/perche-fidarti" style={{ fontSize: 12.5, fontWeight: 700, color: '#22C55E', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>Scopri di più →</a>
                  <a href="/compliance" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>Documentazione</a>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ─── FINAL CTA ─────────────────────────────────────────────────── */}
        <div data-reveal style={{ padding: '80px 40px 110px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 900, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,.07) 0%, transparent 68%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', position: 'relative' }}>

            {/* Free-tier pill */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 9999, padding: '7px 16px', marginBottom: 28 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>
                Censisci il tuo primo sistema AI <strong style={{ color: '#86EFAC', fontWeight: 700 }}>gratuitamente</strong> — nessuna carta richiesta
              </span>
            </div>

            <h2 style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900, color: '#F1F5F9', margin: '0 0 20px', letterSpacing: '-2px', lineHeight: 1.08 }}>
              Scopri la tua esposizione<br />
              <span style={{ color: '#22C55E' }}>sanzionatoria in 10 minuti</span>
            </h2>
            <p style={{ fontSize: 17.5, color: '#64748B', margin: '0 0 40px', lineHeight: 1.75 }}>
              Assessment gratuito. Nessuna registrazione. Report PDF immediatamente dopo.
            </p>
            <button onClick={w('startWizard')} className="cta-main" style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              fontSize: 17, fontWeight: 800, color: '#0A0A0A',
              background: '#22C55E', border: 'none', borderRadius: 14,
              padding: '18px 40px', cursor: 'pointer',
              animation: 'glow-pulse 3.5s ease-in-out infinite',
              transition: 'transform .2s, box-shadow .2s',
            }}>
              <svg width="22" height="22" viewBox="0 0 126 126" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="63" cy="63" r="60" fill="rgba(0,0,0,.12)" stroke="rgba(0,0,0,.35)" strokeWidth="5.5"/>
                <g stroke="black" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23,81 36,95 81,25"/>
                  <line x1="81" y1="25" x2="99" y2="89"/>
                  <line x1="59" y1="60" x2="91" y2="60"/>
                </g>
              </svg>
              Analizza l&rsquo;esposizione AI Act — gratis
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 20, flexWrap: 'wrap' }}>
              {['Gratuito', '~10 minuti', 'Report PDF immediato', 'Nessuna registrazione'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="7" fill="rgba(34,197,94,.12)"/><path d="M4.5 7.5l2 2 4-4" stroke="#22C55E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,.055)', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span dangerouslySetInnerHTML={{ __html: markSvg(22) }} />
            <span style={{ fontSize: 12.5, color: '#334155' }}>&copy; 2026 Actify &middot; Reg. UE 2024/1689</span>
          </div>
          <div style={{ display: 'flex', gap: 22 }}>
            {[['Privacy', '/privacy'], ['Termini', '/terms'], ['FAQ', '/faq'], ['Contattaci', '/contattaci']].map(([l, h]) => (
              <a key={l} href={h} style={{ fontSize: 12.5, color: '#334155', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </div>

      </section>


      {/* ═══ WIZARD ═══ */}
      <div id="app">
        <nav className="w-nav">
          <div className="w-logo"><span dangerouslySetInnerHTML={{ __html: logoSvg(162, 45) }} /></div>
          <div className="w-step-info" id="stepInfo">Step 1 di 5</div>
          <button className="w-exit" onClick={w('exitWizard')}>&#8592; Esci</button>
        </nav>
        <div className="stepper" id="stepper"></div>
        <div className="w-body">

          {/* Step 1 */}
          <div id="step1" className="step-panel">
            <div className="panel-head">
              <h2>Profilo Azienda</h2>
              <p>Iniziamo con le informazioni di base sulla tua organizzazione.</p>
            </div>
            <div className="disclaimer">
              <div className="disc-icon">&#9888;</div>
              <div>
                <strong>Nota per il compilatore &mdash; Garbage In, Garbage Out</strong><br />
                Come in ogni sistema tecnologico, la qualit&agrave; del tuo report dipende direttamente dalla precisione delle informazioni che fornisci. Essere vago o impreciso produrr&agrave; un report generico e poco utile. <em>Pi&ugrave; sei specifico</em> sui sistemi AI in uso, i processi decisionali e il contesto aziendale, pi&ugrave; l&rsquo;analisi sar&agrave; coerentemente veritiera e azionabile per la tua compliance.
              </div>
            </div>
            <div className="fcard">
              <div className="field">
                <label>Nome Azienda *</label>
                <input type="text" id="companyName" placeholder="Es. Acme S.r.l." />
              </div>
              <div className="field">
                <label>Email per ricevere il report *</label>
                <div className="email-input-wrap">
                  <svg className="email-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="4" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M2 7l7.293 5.121a1.25 1.25 0 001.414 0L18 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input className="email-input" type="email" id="contactEmail" placeholder="mario@azienda.it" autoComplete="email" />
                  <span className="email-badge">PDF gratis</span>
                </div>
                <div className="locked-note" style={{marginTop:8}}>Il PDF del report verrà inviato a questo indirizzo. Nessun account richiesto.</div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Settore *</label>
                  <select id="companySector" onChange={e => {
                    const el = document.getElementById('companySectorCustom') as HTMLElement | null;
                    if (el) el.style.display = e.target.value === 'Altro - specifica' ? 'block' : 'none';
                  }}>
                    <option value="">&#8212; Seleziona settore &#8212;</option>
                    <option>Risorse Umane / Recruiting</option>
                    <option>Servizi Finanziari / Banca</option>
                    <option>Assicurazioni</option>
                    <option>Sanit&agrave; / Life Sciences</option>
                    <option>Istruzione / EdTech</option>
                    <option>Manifatturiero / Industria</option>
                    <option>Tecnologia / SaaS</option>
                    <option>Retail / E-commerce</option>
                    <option>Pubblica Amministrazione</option>
                    <option>Legale / Compliance</option>
                    <option>Marketing / Media</option>
                    <option>Logistica / Supply Chain</option>
                    <option>Energia / Utilities</option>
                    <option>Immobiliare / PropTech</option>
                    <option>Trasporti / Mobilit&agrave;</option>
                    <option>Costruzioni / Edilizia</option>
                    <option>Turismo / Hospitality</option>
                    <option>Telecomunicazioni</option>
                    <option>Agricoltura / Agritech</option>
                    <option>Altro - specifica</option>
                  </select>
                  <input
                    type="text"
                    id="companySectorCustom"
                    style={{ display: 'none', marginTop: 8 }}
                    placeholder="Es. Agroalimentare, Moda, Sport&hellip;"
                  />
                </div>
                <div className="field">
                  <label>Dimensione *</label>
                  <select id="companySize">
                    <option value="">&#8212; N&deg; dipendenti &#8212;</option>
                    <option value="1-10">1&ndash;10 (Micro)</option>
                    <option value="11-50">11&ndash;50 (Piccola)</option>
                    <option value="51-250">51&ndash;250 (Media)</option>
                    <option value="251-1000">251&ndash;1.000 (Grande)</option>
                    <option value="1000+">1.000+ (Enterprise)</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Sede Legale *</label>
                  <select id="companySede">
                    <option value="">&#8212; Seleziona &#8212;</option>
                    <option value="Italia">&#127470;&#127481; Italia</option>
                    <option value="EU">&#127466;&#127482; Unione Europea (altro paese EU)</option>
                    <option value="Rest of World">&#127760; Rest of World</option>
                  </select>
                </div>
                <div className="field">
                  <label>Fatturato annuo (opzionale)</label>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input
                      type="number"
                      id="revenueExact"
                      placeholder="Es. 4500000"
                      min="0"
                      style={{flex:1}}
                      onChange={e => {
                        const rangeEl = document.getElementById('revenueRange') as HTMLSelectElement | null;
                        if (rangeEl) rangeEl.disabled = !!e.target.value;
                        if (rangeEl) rangeEl.style.opacity = e.target.value ? '0.45' : '1';
                      }}
                    />
                    <span style={{fontSize:12,color:'var(--dim)',whiteSpace:'nowrap'}}>EUR / anno</span>
                  </div>
                  <select id="revenueRange" style={{marginTop:8}}>
                    <option value="">&#8212; Oppure seleziona un range &#8212;</option>
                    <option value="under_100k">Meno di &euro;100K</option>
                    <option value="100k_500k">&euro;100K &ndash; &euro;500K</option>
                    <option value="500k_1m">&euro;500K &ndash; &euro;1M</option>
                    <option value="1m_3m">&euro;1M &ndash; &euro;3M</option>
                    <option value="3m_10m">&euro;3M &ndash; &euro;10M</option>
                    <option value="10m_30m">&euro;10M &ndash; &euro;30M</option>
                    <option value="30m_100m">&euro;30M &ndash; &euro;100M</option>
                    <option value="100m_500m">&euro;100M &ndash; &euro;500M</option>
                    <option value="500m_1b">&euro;500M &ndash; &euro;1B</option>
                    <option value="over_1b">Oltre &euro;1B</option>
                  </select>
                  <div className="locked-note" style={{marginTop:6}}>
                    Usato esclusivamente per stimare le sanzioni economiche Art. 99 AI Act nel report. Il fatturato esatto ha priorità sul range. Nessun dato condiviso con terze parti.
                  </div>
                </div>
              </div>
            </div>
            <div id="emailError" style={{display:'none',color:'#DC2626',fontSize:13,marginTop:12,padding:'10px 14px',background:'rgba(220,38,38,0.08)',borderRadius:8,border:'1px solid rgba(220,38,38,0.25)'}}></div>
          </div>

          {/* Step 2 */}
          <div id="step2" className="step-panel" style={{display:'none'}}>
            <div className="panel-head">
              <h2>Ruolo &amp; Sistemi AI</h2>
              <p>Seleziona il tuo ruolo rispetto all&rsquo;AI Act e inserisci i sistemi AI della tua organizzazione.</p>
            </div>
            <div className="fcard">
              <h3>Il tuo ruolo rispetto ai sistemi AI *</h3>
              <p>Puoi selezionare entrambi se sei sia Provider che Deployer di sistemi AI diversi.</p>
              <div className="check-cards">
                <label className="check-card">
                  <input type="checkbox" id="isProvider" onChange={w('toggleRole')} />
                  <div>
                    <div className="cc-title">Provider (Fornitore)</div>
                    <div className="cc-desc">Sviluppi, commercializzi o metti sul mercato sistemi AI con il tuo marchio, anche come componente di un servizio SaaS pi&ugrave; ampio</div>
                  </div>
                </label>
                <label className="check-card">
                  <input type="checkbox" id="isDeployer" onChange={w('toggleRole')} />
                  <div>
                    <div className="cc-title">Deployer (Utilizzatore)</div>
                    <div className="cc-desc">Usi nella tua attivit&agrave; sistemi AI sviluppati da terzi: API, SaaS, strumenti LLM, software specializzati</div>
                  </div>
                </label>
              </div>
            </div>
            <div id="toolLimitNotice" style={{display:'none'}} className="fcard" aria-live="polite">
              <div style={{display:'flex',alignItems:'flex-start',gap:'12px',background:'#FFF7ED',border:'1px solid #FED7AA',borderLeft:'4px solid #EA580C',borderRadius:'8px',padding:'14px 16px'}}>
                <span style={{fontSize:'20px',flexShrink:0}}>🔒</span>
                <div>
                  <div style={{fontWeight:700,fontSize:'14px',color:'#9A3412',marginBottom:'4px'}}>Form gratuito: 1 sistema AI</div>
                  <div style={{fontSize:'13px',color:'#92400E',lineHeight:'1.6'}}>
                    Hai già aggiunto il sistema AI per questo assessment gratuito. Per censire più tool e ottenere un&rsquo;analisi completa del tuo inventario AI, <a href="/register" style={{color:'#EA580C',fontWeight:600}}>crea un account Actify</a>.
                  </div>
                </div>
              </div>
            </div>
            <div id="providerSection" style={{display:'none'}}>
              <div className="fcard">
                <div className="rs-head">
                  <div className="rs-head-title">Sistemi AI Proprietari</div>
                  <span className="rs-badge">Provider</span>
                </div>
                <p>Inserisci i sistemi AI che la tua azienda ha sviluppato e mette sul mercato o integra nei propri servizi.</p>
                <div id="providerList"></div>
                <button className="btn-add" onClick={w('addProviderSystem')}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Aggiungi Sistema AI Proprietario
                </button>
              </div>
            </div>
            <div id="deployerSection" style={{display:'none'}}>
              <div className="fcard">
                <div className="rs-head">
                  <div className="rs-head-title">Sistemi AI in Uso</div>
                  <span className="rs-badge dep">Deployer</span>
                </div>
                <h3 style={{marginBottom:'10px'}}>A. LLM / AI Generativa &mdash; Strumenti Standard</h3>
                <p>Seleziona l&rsquo;LLM che la tua organizzazione utilizza.</p>
                <div className="llm-grid" id="llmGrid"></div>
                <div id="llmDetails"></div>
              </div>
              <div className="fcard">
                <h3>B. Sistemi AI Specializzati</h3>
                <p>Sistema AI verticale per funzioni specifiche (recruiting AI, credit scoring, diagnostica, ecc.).</p>
                <div id="depSpecList"></div>
                <button className="btn-add" onClick={w('addDeployerSpecialized')}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Aggiungi Sistema Specializzato
                </button>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div id="step3" className="step-panel" style={{display:'none'}}>
            <div className="panel-head">
              <h2>AI Readiness</h2>
              <p>Valuta il livello di presidio gi&agrave; in atto nella tua organizzazione rispetto agli obblighi dell&rsquo;AI Act.</p>
            </div>
            <div className="fcard">
              <h3>Responsabile Protezione Dati (DPO)</h3>
              <div className="radio-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
                <label className="radio-card"><input type="radio" name="dpoStatus" value="inhouse" /><div className="rc-row"><div className="rc-title">In-house</div><div className="rc-dot"></div></div><div className="rc-desc">DPO designato come dipendente o figura interna dell&rsquo;organizzazione</div></label>
                <label className="radio-card"><input type="radio" name="dpoStatus" value="service" /><div className="rc-row"><div className="rc-title">As a Service</div><div className="rc-dot"></div></div><div className="rc-desc">DPO esterno: consulente, studio legale o servizio DPO-as-a-service</div></label>
                <label className="radio-card"><input type="radio" name="dpoStatus" value="none" /><div className="rc-row"><div className="rc-title">Non presente</div><div className="rc-dot"></div></div><div className="rc-desc">Nessun DPO formalmente designato al momento</div></label>
              </div>
            </div>
            <div className="fcard">
              <h3>Presidi di Conformit&agrave; AI</h3>
              <div className="check-cards">
                <label className="check-card"><input type="checkbox" id="hasInventory" /><div><div className="cc-title">Inventario AI formalizzato</div><div className="cc-desc">Registro documentato di tutti i sistemi AI in uso: scopi, vendor, responsabili e data di adozione</div></div></label>
                <label className="check-card"><input type="checkbox" id="hasImpact" /><div><div className="cc-title">Valutazione d&rsquo;impatto AI condotta (FRIA / DPIA)</div><div className="cc-desc">AI Act Art. 27 (FRIA) e GDPR Art. 35 (DPIA) &mdash; obbligatoria per sistemi ad alto rischio</div></div></label>
                <label className="check-card"><input type="checkbox" id="hasIncident" /><div><div className="cc-title">Procedura di gestione incidenti AI documentata</div><div className="cc-desc">Processo definito per segnalare, tracciare e gestire malfunzionamenti o danni causati da AI</div></div></label>
                <label className="check-card"><input type="checkbox" id="hasAiPolicy" /><div><div className="cc-title">Policy interna sull&rsquo;uso dell&rsquo;AI</div><div className="cc-desc">Documento formale che definisce regole, responsabilit&agrave; e limiti nell&rsquo;adozione di strumenti AI in azienda</div></div></label>
                <label className="check-card"><input type="checkbox" id="hasTraining" /><div><div className="cc-title">Formazione del personale sull&rsquo;AI</div><div className="cc-desc">Dipendenti e responsabili hanno ricevuto formazione specifica sull&rsquo;uso sicuro e consapevole dell&rsquo;AI</div></div></label>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div id="step4" className="step-panel" style={{display:'none'}}>
            <div className="panel-head">
              <h2>Contesto &amp; Note</h2>
              <p>Questo campo viene analizzato direttamente dall&rsquo;AI. Pi&ugrave; dettagli fornisci, pi&ugrave; il report sar&agrave; preciso.</p>
            </div>
            <div className="fcard">
              <div className="hint">
                <span className="hint-icon">&#127919;</span>
                <span>Descrivi come usi esattamente i sistemi AI, chi ne &egrave; impattato, aspetti critici del tuo settore, dubbi specifici sulla compliance. Spesso questo campo rivela rischi non catturati dalle checkbox precedenti. <strong>Ricorda: garbage in, garbage out.</strong></span>
              </div>
              <div className="field" style={{marginBottom:0}}>
                <label>Note Libere &mdash; Contesto Specifico</label>
                <textarea id="contextNotes" rows={7} placeholder="Es: Usiamo HireVue per lo screening iniziale di tutti i candidati. Il sistema produce un punteggio 0-100 e chi scende sotto 60 non viene mai contattato. Operiamo nel settore bancario..."></textarea>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div id="step5" className="step-panel" style={{display:'none'}}>
            <div className="panel-head">
              <h2>Riepilogo e Generazione</h2>
              <p>Verifica i dati inseriti prima di generare il tuo report di compliance AI Act personalizzato.</p>
            </div>
            <div className="fcard">
              <div id="reviewContent"></div>
            </div>
            <div className="alert-err" id="errorAlert"></div>
          </div>

        </div>

        <div className="w-footer" id="wFooter">
          <button className="btn-back" id="btnBack" onClick={w('goBack')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Indietro
          </button>
          <button className="btn-next" id="btnNext" onClick={w('goNext')}>
            Avanti
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 11l4-4-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="btn-submit" id="btnSubmit" style={{display:'none'}} onClick={w('submitForm')}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 7.5h11M9 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Genera Report PDF
          </button>
        </div>
      </div>


      {/* ═══ LOADING ═══ */}
      <div id="loading">
        <div className="ld-card">
          <div className="ld-logo"><span dangerouslySetInnerHTML={{ __html: markSvg(56) }} /></div>
          <div className="spin"></div>
          <div className="ld-steps">
            <div className="ld-step active" id="ls1"><div className="ld-dot"></div><span>Analizzando il profilo aziendale&hellip;</span></div>
            <div className="ld-step" id="ls2"><div className="ld-dot"></div><span>Classificando i sistemi AI per livello di rischio&hellip;</span></div>
            <div className="ld-step" id="ls3"><div className="ld-dot"></div><span>Applicando framework AI Act Reg. 2024/1689&hellip;</span></div>
            <div className="ld-step" id="ls4"><div className="ld-dot"></div><span>Generando report PDF personalizzato&hellip;</span></div>
          </div>
          <div className="ld-note">Operazione tipicamente di 15&ndash;20 secondi</div>
        </div>
      </div>


      {/* ═══ SUCCESS ═══ */}
      <div id="success">
        <div className="sc-card">
          <div className="sc-icon"><span dangerouslySetInnerHTML={{ __html: markSvg(68) }} /></div>
          <h2>Report in Arrivo!</h2>
          <p>Il tuo report di compliance AI Act &egrave; stato generato e inviato via email a:</p>
          <div id="successEmail" style={{fontWeight:700,fontSize:18,color:'var(--green)',margin:'12px 0',letterSpacing:'-0.3px'}}></div>
          <p style={{fontSize:13,color:'var(--muted)'}}>Controlla la tua casella (e la cartella spam). Il link nel report &egrave; valido per <strong>24 ore</strong>.</p>
          <div id="successRegisterCta" style={{display:'none',textAlign:'center',marginTop:8}}></div>
          <a href="/" className="btn-restart" style={{display:'inline-block',textDecoration:'none',textAlign:'center',marginTop:16}}>Torna alla home</a>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,.07)',
        background: 'rgba(0,0,0,.35)',
        backdropFilter: 'blur(12px)',
        padding: '56px 24px 32px',
        marginTop: 0,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Top grid */}
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.4fr', gap: '40px 48px', marginBottom: 52 }}>

            {/* Col 1 — Brand */}
            <div>
              <div style={{ marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: logoSvg(110, 31) }} />
              <p style={{ fontSize: 13, color: 'rgba(148,163,184,.7)', lineHeight: 1.75, maxWidth: 260, margin: '0 0 20px' }}>
                La piattaforma italiana per la compliance all&apos;AI Act europeo.<br />
                Analisi AI-powered, documentazione automatica, audit trail immutabile.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(34,197,94,.8)', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 6, padding: '3px 10px', letterSpacing: .5 }}>EU AI Act 2024/1689</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(99,102,241,.9)', background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.2)', borderRadius: 6, padding: '3px 10px', letterSpacing: .5 }}>AWS eu-central-1</span>
              </div>
              <a
                href="https://www.instagram.com/official_actify"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(148,163,184,.75)', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,.75)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="currentColor" strokeWidth="1.8"/>
                  <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
                  <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>
                </svg>
                @official_actify
              </a>
            </div>

            {/* Col 2 — Navigazione */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18 }}>Piattaforma</div>
              {[
                { href: '/#come-funziona', label: 'Come funziona' },
                { href: '/plan', label: 'Prezzi' },
                { href: '/faq', label: 'FAQ' },
                { href: '/perche-fidarti', label: 'Perché fidarti' },
              ].map(l => (
                <a key={l.href} href={l.href} style={{ display: 'block', fontSize: 13, color: 'rgba(148,163,184,.75)', textDecoration: 'none', marginBottom: 11, transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,.75)')}>
                  {l.label}
                </a>
              ))}
            </div>

            {/* Col 3 — Legale */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18 }}>Legale</div>
              {[
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/terms', label: 'Termini di Servizio' },
                { href: '/security', label: 'Sicurezza & Trust' },
              ].map(l => (
                <a key={l.href} href={l.href} style={{ display: 'block', fontSize: 13, color: 'rgba(148,163,184,.75)', textDecoration: 'none', marginBottom: 11, transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,.75)')}>
                  {l.label}
                </a>
              ))}
            </div>

            {/* Col 4 — Contatti */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18 }}>Contatti</div>
              <a href="mailto:info@official-actify.com" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(148,163,184,.75)', textDecoration: 'none', marginBottom: 12 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,.75)')}>
                <span style={{ fontSize: 14 }}>✉</span> info@official-actify.com
              </a>
              <div style={{ fontSize: 12, color: 'rgba(100,116,139,.8)', lineHeight: 1.8 }}>
                BD TR S.R.L.<br />
                Via Santa Tecla 4, 20122<br />
                Milano, Italia<br />
                P.IVA 14777710964
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,.06)', marginBottom: 28 }} />

          {/* Bottom bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'rgba(100,116,139,.7)', margin: 0 }}>
              © {new Date().getFullYear()} BD TR S.R.L. — Actify è un marchio registrato. Tutti i diritti riservati.
            </p>
            <p style={{ fontSize: 11, color: 'rgba(100,116,139,.5)', margin: 0 }}>
              Made in Italy · AWS eu-central-1 · GDPR compliant
            </p>
          </div>
        </div>
      </footer>

      {/* Inject API URL before wizard.js loads */}
      <script dangerouslySetInnerHTML={{ __html: `window.ACTIFY_API_URL='${API_URL}';` }} />
      <Script src="/wizard.js" strategy="afterInteractive" />
    </>
  );
}
