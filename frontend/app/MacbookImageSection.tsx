'use client';

import { useEffect, useRef, useState } from 'react';

type CardId = 'aipi' | 'feb' | 'literacy' | 'docvault' | 'audit' | 'testo';

const ALL_PILLS: { id: CardId; label: string; desc: string; detail: string | null }[] = [
  {
    id: 'aipi',
    label: 'AIPI',
    desc: 'AI Passports Inventory & Gap Analysis',
    detail: 'Permette di censire tramite form strutturato tutti i sistemi AI in uso in azienda — con ruoli distinti per Provider e Deployer. Per ogni tool genera un AI Passport completo: classificazione del livello di rischio, gap analysis sui requisiti normativi aperti e piano di remediation prioritizzato per impatto sanzionatorio.',
  },
  {
    id: 'feb',
    label: 'Fine Estimation Board',
    desc: 'Esposizione sanzionatoria Art. 99–100',
    detail: 'Calcola in tempo reale l\'esposizione sanzionatoria AI Act (Art. 99–100) su ogni sistema censito — in euro, per articolo, per gap aperto. Identifica il Next Best Action: l\'intervento singolo che abbatte di più il rischio e mostra quanto si risparmia chiudendo quel gap prima degli altri.',
  },
  {
    id: 'literacy',
    label: 'AI Literacy Tracker',
    desc: 'Formazione Art. 4 AI Act',
    detail: 'Gestisce la formazione AI per ogni sistema censito, con profili distinti per ruolo — Provider e Deployer. Traccia certificazioni esterne e training interni come evidenze. Quando le evidenze coprono almeno l\'80% del personale attivo, il sistema marca il profilo come Conforme e genera il Report Art. 4 da salvare nel Document Vault come prova ispettiva.',
  },
  {
    id: 'docvault',
    label: 'Document Vault',
    desc: 'Documentazione audit-ready',
    detail: 'Archivia automaticamente ogni documento generato da Actify — Report Art. 4, Attestati Consolidati, Audit Trail, piani di monitoraggio. Il Vault è immutabile: i documenti non possono essere eliminati, garantendo l\'integrità della catena probatoria in caso di ispezione. Disponibili in formato Word .docx per consentire integrazioni e personalizzazioni prima della presentazione alle autorità di vigilanza.',
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    desc: 'Log immutabile degli eventi',
    detail: 'Registra automaticamente ogni azione eseguita su Actify — chi ha agito, cosa ha fatto, quando, con timestamp UTC certificato. Il registro è immutabile: nessun record può essere modificato o cancellato, nemmeno dagli amministratori. In caso di ispezione, costituisce prova documentale di diligenza organizzativa e può fare la differenza tra la sanzione massima e quella minima.',
  },
  {
    id: 'testo',
    label: 'Testo AI Act',
    desc: 'Aggiornato e navigabile',
    detail: 'Il testo integrale del Regolamento UE 2024/1689 navigabile per articolo, con sidebar strutturata per Capi e indice rapido degli articoli più rilevanti per la compliance. Integrato con la knowledge base normativa di Actify: ogni articolo è leggibile in contesto, con la timeline di applicazione aggiornata al Digital Omnibus.',
  },
];

const IMAGE_MAP: Record<string, string> = {
  default:  '/images/macbook-dashboard.jpeg',
  feb:      '/images/macbook-feb.jpeg',
  literacy: '/images/macbook-literacy.jpeg',
  docvault: '/images/macbook-docvault.jpeg',
  audit:    '/images/macbook-audit.jpeg',
  testo:    '/images/macbook-testo.jpeg',
};

const ICON_MAP: Record<CardId, string> = {
  aipi:     '🗂️',
  feb:      '⚖️',
  literacy: '🎓',
  docvault: '📄',
  audit:    '🔏',
  testo:    '📖',
};

function CircleIcon({ selected }: { selected: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="8.5"
        stroke={selected ? '#22C55E' : 'rgba(255,255,255,0.3)'}
        strokeWidth="1.25"
      />
      {selected ? (
        <path d="M7 10l2.2 2.2L13.5 7.5"
          stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        />
      ) : (
        <path d="M10 6.5v7M6.5 10h7"
          stroke="rgba(255,255,255,0.35)" strokeWidth="1.25" strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export default function MacbookImageSection() {
  const imgRef    = useRef<HTMLDivElement>(null);
  const pillRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const headerRef = useRef<HTMLDivElement>(null);
  const pillsRef  = useRef<HTMLDivElement>(null);

  const [activeCard, setActiveCard] = useState<CardId | null>(null);

  const selectedPill = activeCard ? ALL_PILLS.find(p => p.id === activeCard) ?? null : null;
  const activeImage  =
    activeCard === 'feb'      ? 'feb'      :
    activeCard === 'literacy' ? 'literacy' :
    activeCard === 'docvault' ? 'docvault' :
    activeCard === 'audit'    ? 'audit'    :
    activeCard === 'testo'    ? 'testo'    : 'default';

  useEffect(() => {
    let ctx: { revert(): void } | null = null;

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger);

        if (headerRef.current) gsap.set(headerRef.current, { opacity: 0, y: 24 });
        if (imgRef.current)    gsap.set(imgRef.current,    { opacity: 0, scale: 0.92, y: 40 });
        pillRefs.current.forEach(p => p && gsap.set(p, { opacity: 0, y: 20 }));

        ctx = gsap.context(() => {
          gsap.to(headerRef.current,
            { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out',
              scrollTrigger: { trigger: headerRef.current, start: 'top 85%', once: true } });

          pillRefs.current.forEach((pill, i) => {
            if (!pill) return;
            gsap.to(pill, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out',
              delay: i * 0.07,
              scrollTrigger: { trigger: pillsRef.current, start: 'top 85%', once: true } });
          });

          gsap.to(imgRef.current,
            { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: 'power3.out',
              scrollTrigger: { trigger: imgRef.current, start: 'top 88%', once: true } });
        });
      }
    );
    return () => { ctx?.revert(); };
  }, []);

  function handleCardClick(id: CardId) {
    setActiveCard(prev => prev === id ? null : id);
  }

  function PillCard({ p, idx }: { p: (typeof ALL_PILLS)[number]; idx: number }) {
    const selected  = activeCard === p.id;
    const hasDetail = !!p.detail;

    return (
      <div
        ref={el => { pillRefs.current[idx] = el; }}
        onClick={() => hasDetail && handleCardClick(p.id)}
        role={hasDetail ? 'button' : undefined}
        tabIndex={hasDetail ? 0 : undefined}
        onKeyDown={hasDetail ? (e) => { if (e.key === 'Enter') handleCardClick(p.id); } : undefined}
        style={{
          background: selected ? 'rgba(34,197,94,0.1)' : 'rgba(28,28,30,1)',
          border: selected ? '1px solid rgba(34,197,94,0.38)' : '1px solid rgba(255,255,255,0.08)',
          borderRadius: 9999,
          padding: '15px 24px 15px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: hasDetail ? 'pointer' : 'default',
          transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
          boxShadow: selected ? '0 0 20px rgba(34,197,94,.12)' : 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <CircleIcon selected={selected} />
        <span style={{
          fontSize: 16, fontWeight: 500,
          color: selected ? '#86EFAC' : 'rgba(255,255,255,0.88)',
          fontFamily: 'inherit',
          lineHeight: 1,
        }}>
          {p.label}
        </span>
      </div>
    );
  }

  return (
    <section className="macbook-section" style={{ background: '#000', padding: '90px 0 130px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 768px) {
          .macbook-detail-inner { flex-wrap: wrap !important; gap: 16px !important; }
          .macbook-detail-icon  { display: none !important; }
          .macbook-detail-divider { display: none !important; }
          .macbook-section-padding { padding: 0 20px !important; }
          .macbook-section { padding: 60px 0 80px !important; }
        }
      `}</style>

      {/* Glow ambientale */}
      <div aria-hidden style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '140%', height: '100%',
        background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(34,197,94,.15) 0%, rgba(34,197,94,.05) 40%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div ref={headerRef} style={{ textAlign: 'center', marginBottom: 40, position: 'relative', zIndex: 2 }}>
        <div style={{
          display: 'inline-block',
          fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.75)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 9999, padding: '5px 14px', marginBottom: 22,
          fontFamily: 'inherit',
        }}>
          Features
        </div>
        <h2 style={{
          fontSize: 'clamp(36px, 4.2vw, 62px)', fontWeight: 800, color: '#fff',
          letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 18px',
          fontFamily: "inherit",
        }}>
          Tutto quello che ti serve per la{' '}
          <span style={{ backgroundImage: 'linear-gradient(135deg, #22C55E, #818CF8)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>compliance AI</span>
        </h2>
        <p style={{
          fontSize: 17, color: 'rgba(255,255,255,.45)', margin: 0,
          lineHeight: 1.65, fontFamily: 'inherit', fontWeight: 400,
        }}>
          Un&rsquo;unica piattaforma copre tutti gli obblighi AI Act —<br />dall&rsquo;inventario alla reportistica.
        </p>
      </div>

      {/* Pills row — sopra il MacBook */}
      <div ref={pillsRef} style={{
        maxWidth: 860, margin: '0 auto 36px', padding: '0 24px',
        display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center',
        position: 'relative', zIndex: 2,
      }}>
        {ALL_PILLS.map((p, i) => <PillCard key={p.id} p={p} idx={i} />)}
      </div>

      {/* Detail panel — si apre tra le pills e il MacBook */}
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '0 24px',
        position: 'relative', zIndex: 3,
        overflow: 'hidden',
        maxHeight: selectedPill?.detail ? 500 : 0,
        opacity: selectedPill?.detail ? 1 : 0,
        marginBottom: selectedPill?.detail ? 28 : 0,
        transition: 'max-height 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, margin-bottom 0.4s ease',
      }}>
        <div className="macbook-detail-inner" style={{
          background: 'rgba(22,22,24,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: '22px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          <div className="macbook-detail-icon" style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>
            {activeCard ? ICON_MAP[activeCard] : null}
          </div>
          <div className="macbook-detail-divider" style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.1)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', fontFamily: 'inherit' }}>
                {selectedPill?.label}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', fontFamily: 'inherit', letterSpacing: '0.06em' }}>
                {selectedPill?.desc}
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.55)', lineHeight: 1.75, margin: 0, fontFamily: 'inherit' }}>
              {selectedPill?.detail}
            </p>
          </div>
          <button
            onClick={() => setActiveCard(null)}
            style={{
              background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 9999, width: 30, height: 30, cursor: 'pointer',
              color: 'rgba(255,255,255,.4)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0, fontSize: 12,
              transition: 'background 0.2s',
            }}
            aria-label="Chiudi"
          >✕</button>
        </div>
      </div>

      {/* MacBook */}
      <div className="macbook-section-padding" style={{ maxWidth: 1300, margin: '0 auto', padding: '0 40px', position: 'relative', zIndex: 2 }}>
        <div ref={imgRef} style={{ position: 'relative' }}>
          <div aria-hidden style={{
            position: 'absolute',
            top: '8%', bottom: '4%', left: '-4%', right: '-4%',
            background: 'radial-gradient(ellipse 85% 65% at 50% 52%, rgba(34,197,94,.26) 0%, rgba(34,197,94,.08) 50%, transparent 75%)',
            filter: 'blur(36px)',
            pointerEvents: 'none', zIndex: 0,
          }} />
          <div aria-hidden style={{
            position: 'absolute',
            bottom: '-10%', left: '12%', right: '12%', height: '22%',
            background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(34,197,94,.2) 0%, transparent 80%)',
            filter: 'blur(24px)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          <div style={{
            position: 'relative', zIndex: 1,
            WebkitMaskImage: 'radial-gradient(ellipse 88% 82% at 50% 46%, black 48%, transparent 100%)',
            maskImage:        'radial-gradient(ellipse 88% 82% at 50% 46%, black 48%, transparent 100%)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMAGE_MAP.default} alt="Actify Dashboard"
              style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 4,
                mixBlendMode: 'screen' as const,
                opacity: activeImage === 'default' ? 1 : 0, transition: 'opacity 0.5s ease' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMAGE_MAP.feb} alt="Actify FEB"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', display: 'block', borderRadius: 4,
                mixBlendMode: 'screen' as const,
                opacity: activeImage === 'feb' ? 1 : 0, transition: 'opacity 0.5s ease',
                pointerEvents: activeImage === 'feb' ? 'auto' : 'none' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMAGE_MAP.literacy} alt="Actify AI Literacy Tracker"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', display: 'block', borderRadius: 4,
                mixBlendMode: 'screen' as const,
                opacity: activeImage === 'literacy' ? 1 : 0, transition: 'opacity 0.5s ease',
                pointerEvents: activeImage === 'literacy' ? 'auto' : 'none' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMAGE_MAP.docvault} alt="Actify Document Vault"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', display: 'block', borderRadius: 4,
                mixBlendMode: 'screen' as const,
                opacity: activeImage === 'docvault' ? 1 : 0, transition: 'opacity 0.5s ease',
                pointerEvents: activeImage === 'docvault' ? 'auto' : 'none' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMAGE_MAP.audit} alt="Actify Audit Trail"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', display: 'block', borderRadius: 4,
                mixBlendMode: 'screen' as const,
                opacity: activeImage === 'audit' ? 1 : 0, transition: 'opacity 0.5s ease',
                pointerEvents: activeImage === 'audit' ? 'auto' : 'none' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMAGE_MAP.testo} alt="Actify Testo AI Act"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', display: 'block', borderRadius: 4,
                mixBlendMode: 'screen' as const,
                opacity: activeImage === 'testo' ? 1 : 0, transition: 'opacity 0.5s ease',
                pointerEvents: activeImage === 'testo' ? 'auto' : 'none' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
