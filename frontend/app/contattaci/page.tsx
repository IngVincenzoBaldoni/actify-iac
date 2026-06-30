import type { Metadata } from 'next';
import { markSvg } from '@/lib/branding';

export const metadata: Metadata = {
  title: 'Contattaci — Actify',
  description: 'Hai domande sulla compliance AI Act o su Actify? Scrivici a officialactify@gmail.com — ti rispondiamo entro 24 ore.',
  alternates: { canonical: '/contattaci' },
  openGraph: {
    title: 'Contattaci — Actify',
    description: 'Hai domande sulla compliance AI Act o su Actify? Scrivici, ti rispondiamo entro 24 ore.',
    url: 'https://official-actify.com/contattaci',
  },
};

export default function ContattaciPage() {
  const mark = markSvg(28);
  return (
    <div className="doc-page">
      <nav className="doc-page-nav">
        <a href="/" className="doc-back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Home
        </a>
        <span dangerouslySetInnerHTML={{ __html: mark }} />
      </nav>

      <div className="doc-body" style={{ maxWidth: 720 }}>

        {/* Hero */}
        <div className="doc-header">
          <div className="doc-tag">Supporto &amp; Contatti</div>
          <h1 className="doc-title" style={{ fontSize: 'clamp(28px, 5vw, 52px)', letterSpacing: '-2px', fontWeight: 900 }}>
            Parlaci.
          </h1>
          <p className="doc-meta" style={{ fontSize: 16, maxWidth: 540 }}>
            Che tu abbia una domanda tecnica sulla compliance AI Act, voglia sapere se Actify fa al caso tuo,
            o stia cercando una demo — siamo qui. Nessun bot, nessuna coda interminabile.
          </p>
        </div>

        {/* Email principale */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,.08) 0%, rgba(16,185,129,.04) 100%)',
          border: '1px solid rgba(34,197,94,.25)',
          borderRadius: 20,
          padding: '40px 48px',
          textAlign: 'center',
          marginBottom: 56,
        }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>✉️</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 14 }}>
            Scrivi al team Actify
          </div>
          <a
            href="mailto:officialactify@gmail.com"
            style={{ display: 'inline-block', fontSize: 22, fontWeight: 800, color: '#fff', textDecoration: 'none' }}
          >
            officialactify@gmail.com
          </a>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 12, marginBottom: 0 }}>
            Rispondiamo a ogni messaggio entro <strong style={{ color: 'rgba(255,255,255,.75)' }}>24 ore lavorative</strong>.
          </p>
        </div>

        {/* Quando scriverci */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 18 }}>
          Quando puoi scriverci
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 52 }}>
          {[
            { icon: '🔍', title: 'Valutazione e demo',      body: 'Vuoi capire se Actify si adatta alla tua realtà? Ti guidiamo attraverso le funzionalità e costruiamo insieme un piano di adozione.' },
            { icon: '⚖️', title: "Domande sull'AI Act",     body: 'Hai dubbi su obblighi, scadenze, classificazione del rischio o requisiti specifici per la tua azienda? Possiamo aiutarti a fare chiarezza.' },
            { icon: '🛠️', title: 'Supporto tecnico',        body: 'Problema con la piattaforma o il flusso di generazione documenti? Descrivi il contesto e ti aiutiamo a risolverlo.' },
            { icon: '🤝', title: 'Partnership',              body: 'Sei uno studio di consulenza e vuoi portare Actify ai tuoi clienti? Parliamoci — il programma partner è aperto.' },
            { icon: '💬', title: 'Feedback e suggerimenti', body: "Hai un'idea per migliorare Actify o una funzionalità che ti manca? Il feedback degli utenti guida la nostra roadmap." },
            { icon: '📰', title: 'Press e media',           body: 'Giornalista o analista? Siamo disponibili per commenti, interviste e dati sul mercato AI compliance in Italia.' },
          ].map(c => (
            <div key={c.title} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>{c.title}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.42)', lineHeight: 1.7 }}>{c.body}</div>
            </div>
          ))}
        </div>

        {/* CTA finale */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.42)', marginBottom: 18 }}>
            Pronto a iniziare? Puoi censire il tuo primo sistema AI gratuitamente, senza carta di credito.
          </p>
          <a href="/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 30px',
            background: 'linear-gradient(135deg, #059669, #34d399)',
            boxShadow: '0 0 0 1px rgba(34,197,94,.3), 0 4px 20px rgba(5,150,105,.4)',
            color: '#fff', textDecoration: 'none',
            borderRadius: 12, fontWeight: 700, fontSize: 15,
          }}>
            Inizia gratis →
          </a>
        </div>

      </div>
    </div>
  );
}
