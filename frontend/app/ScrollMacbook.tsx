'use client';

import { useEffect, useRef } from 'react';

const PILLS = [
  { icon: '🗂️', label: 'AI Inventory',    desc: 'Censimento sistemi AI' },
  { icon: '🔍', label: 'Gap Analysis',     desc: 'Articolo per articolo' },
  { icon: '⚖️', label: 'Fine Estimation',  desc: 'Sanzioni in tempo reale' },
  { icon: '📄', label: 'Document Vault',   desc: 'Documenti audit-ready' },
  { icon: '🎓', label: 'AI Literacy',      desc: 'Formazione Art. 4' },
  { icon: '🔏', label: 'Audit Trail',      desc: 'Log immutabile' },
  { icon: '🧠', label: 'Compliance Check', desc: 'AI engine automatico' },
  { icon: '🤝', label: 'Partner Portal',   desc: 'Per consulenti' },
];

const SYSTEMS = [
  { n: 'CRM Predittivo',   r: 'ALTO RISCHIO', rBg:'rgba(239,68,68,.14)',  rC:'#FCA5A5', rBr:'rgba(239,68,68,.35)',  p:78,  pC:'#EF4444' },
  { n: 'Chatbot Supporto', r: 'LIMITATO',     rBg:'rgba(34,197,94,.13)',  rC:'#86EFAC', rBr:'rgba(34,197,94,.35)',  p:96,  pC:'#22C55E' },
  { n: 'Analytics HR',     r: 'ALTO RISCHIO', rBg:'rgba(249,115,22,.13)', rC:'#FDBA74', rBr:'rgba(249,115,22,.35)', p:65,  pC:'#F97316' },
  { n: 'Selezione CV AI',  r: 'IN REVISIONE', rBg:'rgba(234,179,8,.12)',  rC:'#FDE68A', rBr:'rgba(234,179,8,.35)',  p:52,  pC:'#EAB308' },
];

const KPIS = [
  { n:'7',  l:'Sistemi AI',      c:'#F8FAFC' },
  { n:'2',  l:'Rischio Alto',    c:'#F87171' },
  { n:'3',  l:'Gap Aperti',      c:'#FCD34D' },
  { n:'11', l:'Art. verificati', c:'#4ADE80' },
  { n:'€0', l:'Stima sanzione',  c:'#60A5FA' },
];

const ACTIONS = [
  { t:'Documentazione tecnica CRM — Art. 11', warn:true  },
  { t:'Registro EUDB operatori — Art. 49',    warn:true  },
  { t:'Human oversight — Art. 14',            warn:false },
  { t:'Trasparenza verso utenti — Art. 13',   warn:false },
];

export default function ScrollMacbook() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lidRef    = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const darkRef   = useRef<HTMLDivElement>(null);
  const glowRef   = useRef<HTMLDivElement>(null);
  const pillRefs  = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let ctx: { revert(): void } | null = null;

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger);

        ctx = gsap.context(() => {
          // Start: lid completamente chiuso (piatto sulla tastiera)
          gsap.set(lidRef.current,    { rotateX: -165 });
          gsap.set(screenRef.current, { opacity: 0, scale: 0.97 });
          gsap.set(darkRef.current,   { opacity: 1 });
          gsap.set(glowRef.current,   { opacity: 0, scale: 0.9 });
          pillRefs.current.forEach(p => p && gsap.set(p, { opacity: 0, x: -50, filter: 'blur(6px)' }));

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: scrollRef.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 2,
            },
          });

          // 0→60%: lid si apre da chiuso (-165°) a completamente aperto (-15°)
          tl.to(lidRef.current, { rotateX: -15, ease: 'power2.inOut', duration: 0.60 }, 0);
          // 40→65%: schermo si illumina
          tl.to(darkRef.current,   { opacity: 0, ease: 'power2.in',  duration: 0.25 }, 0.40);
          tl.to(screenRef.current, { opacity: 1, scale: 1, ease: 'power2.out', duration: 0.25 }, 0.50);
          // 45→72%: glow sotto
          tl.to(glowRef.current, { opacity: 1, scale: 1, ease: 'power2.out', duration: 0.27 }, 0.45);
          // 60%+: pill entrano a cascata
          pillRefs.current.forEach((pill, i) => {
            if (!pill) return;
            tl.to(pill, { opacity: 1, x: 0, filter: 'blur(0px)', ease: 'power3.out', duration: 0.09 }, 0.62 + i * 0.05);
          });
        });
      },
    );

    return () => { ctx?.revert(); };
  }, []);

  const W = 680;   // base width
  const LW = 640;  // lid width (leggermente più stretto)
  const LH = 420;  // lid height (ratio 16:10)

  return (
    <div style={{ background: '#050508' }}>
      <div ref={scrollRef} style={{ height: '300vh', position: 'relative' }}>

        <div style={{
          position: 'sticky', top: 0, height: '100vh',
          overflow: 'hidden',
          /* subtle radial glow in bg — like Apple */
          background:
            'radial-gradient(ellipse 70% 60% at 60% 55%, rgba(15,15,22,1) 0%, #050508 100%)',
        }}>

          {/* Ambient background gradients */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 55% 50% at 62% 52%, rgba(34,197,94,.025) 0%, transparent 65%),' +
              'radial-gradient(ellipse 40% 40% at 12% 72%, rgba(99,102,241,.03) 0%, transparent 60%)',
          }} />

          {/* ══ MACBOOK — centrato, prospettiva frontale ══ */}
          <div style={{
            position: 'absolute',
            top: '52%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}>

            {/* Ground glow */}
            <div ref={glowRef} style={{
              position: 'absolute', bottom: -60, left: '50%',
              transform: 'translateX(-50%)',
              width: W + 80, height: 200,
              pointerEvents: 'none', zIndex: 0, opacity: 0,
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 55% at 50% 90%, rgba(34,197,94,.28) 0%, transparent 65%)', filter: 'blur(40px)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 38% at 50% 100%, rgba(99,102,241,.1) 0%, transparent 70%)', filter: 'blur(55px)' }} />
            </div>

            {/* prospettiva frontale, leggermente dal basso */}
            <div style={{ perspective: 1800, perspectiveOrigin: '50% 80%', position: 'relative', zIndex: 1 }}>
              <div style={{
                transformStyle: 'preserve-3d',
                transform: 'rotateX(6deg)',
                width: W,
                position: 'relative',
              }}>

                {/* ── LID — parte chiuso (-165°), si apre a -15° ── */}
                <div ref={lidRef} style={{
                  width: LW, height: LH,
                  marginLeft: (W - LW) / 2,
                  position: 'relative',
                  transformOrigin: 'bottom center',
                  transformStyle: 'preserve-3d',
                  transform: 'rotateX(-165deg)',
                }}>

                  {/* Screen face */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(160deg, #323234 0%, #1d1d1f 55%, #272729 100%)',
                    borderRadius: '22px 22px 5px 5px',
                    border: '1px solid rgba(255,255,255,.08)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    padding: 16,
                    display: 'flex', flexDirection: 'column',
                    boxShadow:
                      '0 70px 160px rgba(0,0,0,.98),' +
                      'inset 0 0 0 0.5px rgba(255,255,255,.055),' +
                      'inset 0 1px 0 rgba(255,255,255,.1)',
                  }}>
                    {/* Camera */}
                    <div style={{ height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'radial-gradient(circle, #3a3a3c 0%, #1e1e20 100%)', boxShadow: 'inset 0 0 3px rgba(0,0,0,.6)' }} />
                    </div>

                    {/* Bezel */}
                    <div style={{ flex: 1, background: '#040407', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>

                      {/* Dark state */}
                      <div ref={darkRef} style={{
                        position: 'absolute', inset: 0, zIndex: 2,
                        background: 'radial-gradient(ellipse 95% 75% at 50% 50%, #16161e 0%, #04040a 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ opacity: 0.12, textAlign: 'center' }}>
                          <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(34,197,94,.22)', border: '1.5px solid rgba(34,197,94,.3)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(34,197,94,.9)' }} />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.5)', letterSpacing: 2.5 }}>ACTIFY</div>
                        </div>
                      </div>

                      {/* Dashboard */}
                      <div ref={screenRef} style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

                        <div style={{ background: '#0e0e11', borderBottom: '1px solid rgba(255,255,255,.055)', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 10 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 7px rgba(34,197,94,.8)' }} />
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: -.3 }}>Actify</span>
                          </div>
                          {['Dashboard', 'AI Inventory', 'Doc Vault', 'Literacy', 'Audit'].map((item, i) => (
                            <span key={item} style={{ fontSize: 8.5, color: i === 0 ? '#22C55E' : '#374151', padding: '2px 9px', borderRadius: 5, background: i === 0 ? 'rgba(34,197,94,.09)' : 'transparent', fontWeight: i === 0 ? 700 : 500, border: i === 0 ? '1px solid rgba(34,197,94,.15)' : 'none', whiteSpace: 'nowrap' }}>{item}</span>
                          ))}
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, fontSize: 7.5, color: '#22C55E', background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.18)', padding: '2px 9px', borderRadius: 100, flexShrink: 0 }}>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 5px #22C55E' }} />Live
                          </div>
                        </div>

                        <div style={{ flex: 1, padding: '12px 16px', overflow: 'hidden', background: '#08080b' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#F1F5F9', letterSpacing: -.4, marginBottom: 3 }}>AI Act Compliance Dashboard</div>
                              <div style={{ fontSize: 8.5, color: '#4B5563' }}>22 giu 2026 · 7 sistemi · 3 azioni</div>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,.22) 0%, rgba(34,197,94,.07) 100%)', border: '1.5px solid rgba(34,197,94,.38)', borderRadius: 12, padding: '8px 15px', textAlign: 'center', flexShrink: 0, boxShadow: '0 0 32px rgba(34,197,94,.16)' }}>
                              <div style={{ fontSize: 26, fontWeight: 900, color: '#22C55E', lineHeight: 1 }}>94%</div>
                              <div style={{ fontSize: 7, fontWeight: 700, color: '#86EFAC', letterSpacing: 1, marginTop: 2 }}>CONFORME</div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 12 }}>
                            {KPIS.map(k => (
                              <div key={k.l} style={{ background: 'rgba(255,255,255,.024)', border: '1px solid rgba(255,255,255,.055)', borderRadius: 8, padding: '7px 10px' }}>
                                <div style={{ fontSize: 16, fontWeight: 900, color: k.c, lineHeight: 1 }}>{k.n}</div>
                                <div style={{ fontSize: 8, color: '#4B5563', marginTop: 3 }}>{k.l}</div>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#374151', marginBottom: 6 }}>SISTEMI AI</div>
                              <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 9, overflow: 'hidden' }}>
                                {SYSTEMS.map((s, i) => (
                                  <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderBottom: i < 3 ? '1px solid rgba(255,255,255,.035)' : 'none' }}>
                                    <div style={{ fontSize: 10, fontWeight: 600, color: '#CBD5E1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.n}</div>
                                    <div style={{ fontSize: 6, fontWeight: 700, padding: '2px 5px', borderRadius: 100, background: s.rBg, color: s.rC, border: `1px solid ${s.rBr}`, flexShrink: 0, whiteSpace: 'nowrap' }}>{s.r}</div>
                                    <div style={{ flex: '0 0 48px', height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
                                      <div style={{ width: `${s.p}%`, height: '100%', background: s.pC, borderRadius: 2 }} />
                                    </div>
                                    <div style={{ fontSize: 9, color: '#6B7280', width: 24, textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>{s.p}%</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#374151', marginBottom: 6 }}>AZIONI</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                                {ACTIONS.map((a, i) => (
                                  <div key={i} style={{ fontSize: 9.5, padding: '6px 10px', borderRadius: 7, lineHeight: 1.4, background: a.warn ? 'rgba(234,179,8,.05)' : 'rgba(34,197,94,.05)', color: a.warn ? '#FCD34D' : '#86EFAC', border: `1px solid ${a.warn ? 'rgba(234,179,8,.13)' : 'rgba(34,197,94,.13)'}`, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                    <span style={{ flexShrink: 0 }}>{a.warn ? '⚠' : '✓'}</span>{a.t}
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#374151', marginBottom: 5 }}>VAULT</div>
                              {[
                                { name: 'Disclosure Notice — LegalAssist Pro', ready: true  },
                                { name: 'Piano Monitoraggio — CRM Predittivo',  ready: false },
                              ].map((d, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: 9, color: '#9CA3AF', background: 'rgba(255,255,255,.018)', border: '1px solid rgba(255,255,255,.045)', borderRadius: 7, padding: '6px 10px', marginBottom: i === 0 ? 4 : 0 }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {d.name}</span>
                                  <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 6px', borderRadius: 4, flexShrink: 0, background: d.ready ? 'rgba(34,197,94,.12)' : 'rgba(202,138,4,.1)', color: d.ready ? '#86EFAC' : '#FDE68A', border: `1px solid ${d.ready ? 'rgba(34,197,94,.22)' : 'rgba(202,138,4,.22)'}` }}>{d.ready ? 'READY' : 'BOZZA'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aluminum back */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(148deg, #2e2e31 0%, #1c1c1f 42%, #272729 100%)',
                    borderRadius: '18px 18px 4px 4px',
                    transform: 'rotateX(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }} />
                </div>

                {/* ── KEYBOARD BASE ── */}
                <div style={{
                  width: W,
                  height: 140,
                  background: 'linear-gradient(180deg, #2a2a2c 0%, #1e1e20 60%, #1a1a1c 100%)',
                  borderRadius: '0 0 18px 18px',
                  border: '1px solid rgba(255,255,255,.06)',
                  borderTop: '1px solid rgba(255,255,255,.04)',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 40px 100px rgba(0,0,0,.95)',
                }}>
                  {/* hinge shadow */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(180deg, rgba(0,0,0,.7) 0%, transparent 100%)' }} />

                  {/* Keys — 3 righe */}
                  <div style={{ padding: '14px 28px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Row 1: Q row — 12 tasti */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} style={{ width: 28, height: 22, background: '#2a2a2e', border: '1px solid #3a3a3e', borderRadius: 4, boxShadow: 'inset 0 -1px rgba(0,0,0,.5), inset 0 1px rgba(255,255,255,.07)' }} />
                      ))}
                    </div>
                    {/* Row 2: A row — 11 tasti */}
                    <div style={{ display: 'flex', gap: 4, paddingLeft: 14 }}>
                      {Array.from({ length: 11 }).map((_, i) => (
                        <div key={i} style={{ width: 28, height: 22, background: '#2a2a2e', border: '1px solid #3a3a3e', borderRadius: 4, boxShadow: 'inset 0 -1px rgba(0,0,0,.5), inset 0 1px rgba(255,255,255,.07)' }} />
                      ))}
                    </div>
                    {/* Row 3: Z row — 10 tasti */}
                    <div style={{ display: 'flex', gap: 4, paddingLeft: 28 }}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} style={{ width: 28, height: 22, background: '#2a2a2e', border: '1px solid #3a3a3e', borderRadius: 4, boxShadow: 'inset 0 -1px rgba(0,0,0,.5), inset 0 1px rgba(255,255,255,.07)' }} />
                      ))}
                    </div>
                    {/* Spacebar row */}
                    <div style={{ display: 'flex', gap: 4, paddingLeft: 14 }}>
                      {[28, 28, 180, 28, 28, 28].map((w, i) => (
                        <div key={i} style={{ width: w, height: 22, background: i === 2 ? '#323236' : '#2a2a2e', border: '1px solid #3a3a3e', borderRadius: 4, boxShadow: 'inset 0 -1px rgba(0,0,0,.5), inset 0 1px rgba(255,255,255,.07)' }} />
                      ))}
                    </div>
                  </div>

                  {/* Trackpad */}
                  <div style={{
                    position: 'absolute',
                    bottom: 10, left: '50%', transform: 'translateX(-50%)',
                    width: 160, height: 18,
                    background: 'rgba(255,255,255,.025)',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,.04)',
                  }} />
                </div>

              </div>
            </div>
          </div>

          {/* ══ PILLS — left overlay ══ */}
          <div style={{
            position: 'absolute',
            left: 44, top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: 272,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(34,197,94,.6)', letterSpacing: 2.8, textTransform: 'uppercase', marginBottom: 14, paddingLeft: 2 }}>
              Tutto in una piattaforma
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {PILLS.map((pill, i) => (
                <div
                  key={i}
                  ref={el => { pillRefs.current[i] = el; }}
                  style={{
                    background: 'rgba(8,8,18,.75)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,.085)',
                    borderRadius: 999,
                    padding: '9px 17px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{pill.icon}</span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, overflow: 'hidden', minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#F1F5F9', letterSpacing: -.15, whiteSpace: 'nowrap' }}>{pill.label}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', whiteSpace: 'nowrap' }}>{pill.desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
