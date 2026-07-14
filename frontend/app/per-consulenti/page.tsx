import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Actify per Studi Legali e Consulenti — Programma Partner AI Act',
  description: 'Porta la compliance AI Act ai tuoi clienti PMI. Revenue share ricorrente dal 20% al 50%, dashboard multi-cliente, assessment white-label. Programma partner per studi legali, commercialisti e consulenti.',
  alternates: { canonical: '/per-consulenti' },
  openGraph: {
    title: 'Actify Partner Program — Revenue share AI Act per consulenti',
    description: 'Gestisci la compliance AI Act di tutti i tuoi clienti PMI da un unico posto. Guadagna dal 20% al 50% su ogni abbonamento mensile.',
    url: 'https://official-actify.com/per-consulenti',
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://official-actify.com/' },
    { '@type': 'ListItem', position: 2, name: 'Per studi e consulenti', item: 'https://official-actify.com/per-consulenti' },
  ],
};

const TIERS = [
  { name: 'Affiliate',         range: '1–5 clienti',    share: 20, example: '5 PMI × €59,90 = €59,90/mese',   color: '#94a3b8' },
  { name: 'Associate Partner', range: '6–20 clienti',   share: 25, example: '10 PMI × €99,90 = €249,75/mese', color: '#818cf8' },
  { name: 'Partner',           range: '21–50 clienti',  share: 30, example: '30 PMI × €99,90 = €899,10/mese', color: '#38bdf8' },
  { name: 'Executive Partner', range: '51–100 clienti', share: 35, example: '70 PMI × €99,90 = €2.447,55/mese', color: '#fbbf24' },
  { name: 'Senior Partner',    range: '101+ clienti',   share: 50, example: '100 PMI × €99,90 = €4.995/mese', color: '#22d3ee' },
];

const STEPS = [
  {
    n: '01',
    title: 'Richiedi l\'accesso',
    body: 'Compila il form in 2 minuti: ragione sociale, tipo di studio, numero clienti PMI stimati. Il team Actify ti risponde entro 24 ore con le credenziali partner.',
  },
  {
    n: '02',
    title: 'Invita i tuoi clienti',
    body: 'Dal tuo portale partner generi un link di invito personalizzato. I tuoi clienti PMI ricevono un assessment AI Act white-label — vedono il tuo nome, non il nostro.',
  },
  {
    n: '03',
    title: 'Guadagni ogni mese',
    body: 'Ogni volta che un tuo cliente attiva un piano a pagamento, ricevi automaticamente la tua quota. La revenue share è ricorrente finché il cliente rimane abbonato.',
  },
];

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/></svg>
    ),
    title: 'Dashboard multi-cliente',
    body: 'Tutti i tuoi clienti PMI in un\'unica vista. Vedi lo stato compliance di ciascuno, i gap aperti, i documenti generati. Nessun accesso separato per ogni cliente.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 12h6M9 16h4M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: 'Assessment white-label',
    body: 'Il tuo cliente riceve il link di assessment con il nome del tuo studio. Compila il form da mobile o desktop, senza creare un account Actify. I dati arrivano direttamente nel tuo portale.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: 'AI Passport per ogni PMI',
    body: 'Per ogni cliente puoi avviare il censimento sistemi AI, il compliance check e la generazione dei documenti obbligatori — FRIA, Risk Assessment, Registro Sistemi AI — direttamente dal portale partner.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: 'Revenue analytics in tempo reale',
    body: 'Il portale mostra MRR aggregato, share per cliente, proiezione annuale e il tuo tier attuale. Sai sempre quanto stai guadagnando e quanti clienti mancano al livello successivo.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: 'Nessun costo di accesso',
    body: 'Il programma partner è gratuito. Nessun canone mensile, nessuna quota di iscrizione. Guadagni solo quando i tuoi clienti attivano un piano a pagamento.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: 'Supporto dedicato',
    body: 'I partner hanno un canale diretto con il team Actify. Domande su un cliente specifico, su un articolo dell\'AI Act, su come presentare la piattaforma — rispondiamo in giornata.',
  },
];

export default function PerConsulentiPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div style={{ background: '#020817', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* ── Nav ── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 32px',
          background: 'rgba(2,8,23,.92)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,.07)',
        }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#f1f5f9', fontWeight: 700, fontSize: 16 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 12V22H4V12" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 7H2v5h20V7z" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5H12M12 7h4.5a2.5 2.5 0 000-5H12" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Actify
          </a>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a href="/" style={{ fontSize: 13, color: 'rgba(148,163,184,.7)', textDecoration: 'none' }}>← Torna alla home</a>
            <a href="/register?type=partner" style={{ fontSize: 13, fontWeight: 700, color: '#000', textDecoration: 'none', background: '#22C55E', borderRadius: 9999, padding: '8px 20px', whiteSpace: 'nowrap' }}>
              Diventa Partner
            </a>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '88px 32px 72px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 9999, padding: '5px 16px', fontSize: 12, fontWeight: 700, color: '#22C55E', letterSpacing: .8, textTransform: 'uppercase', marginBottom: 28 }}>
            Programma Partner — Revenue Share
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-2px', margin: '0 0 24px' }}>
            Porta la compliance AI Act<br />
            <span style={{ color: '#22C55E' }}>ai tuoi clienti.</span><br />
            Guadagna ogni mese.
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(148,163,184,.85)', lineHeight: 1.65, maxWidth: 660, margin: '0 auto 40px' }}>
            Actify è già usato da studi legali, commercialisti e consulenti manageriali per gestire la compliance all&rsquo;AI Act dei propri clienti PMI.
            Dashboard multi-cliente, assessment white-label, revenue share ricorrente. Nessun costo di accesso.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/register?type=partner" style={{ fontSize: 15, fontWeight: 700, color: '#000', textDecoration: 'none', background: '#22C55E', borderRadius: 9999, padding: '14px 32px', boxShadow: '0 4px 24px rgba(34,197,94,.3)' }}>
              Richiedi l&rsquo;accesso →
            </a>
            <a href="#come-funziona" style={{ fontSize: 15, fontWeight: 500, color: 'rgba(148,163,184,.9)', textDecoration: 'none', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9999, padding: '14px 32px' }}>
              Come funziona
            </a>
          </div>

          {/* Social proof tags */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 40 }}>
            {['Studi Legali', 'Commercialisti', 'DPO', 'Consulenti Manageriali', 'IT / Cybersecurity'].map(t => (
              <span key={t} style={{ fontSize: 12, color: 'rgba(148,163,184,.6)', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 6, padding: '4px 12px' }}>{t}</span>
            ))}
          </div>
        </section>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent)', margin: '0 32px' }} />

        {/* ── Features grid ── */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-1px', margin: '0 0 14px' }}>
              Tutto quello che ti serve, già pronto
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(148,163,184,.7)', maxWidth: 520, margin: '0 auto' }}>
              Il portale partner è lo stesso prodotto che usi per la compliance interna — configurato per la gestione multi-cliente.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.02) 100%)',
                border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: '28px 28px 24px',
              }}>
                <div style={{ color: '#22C55E', marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13.5, color: 'rgba(148,163,184,.8)', lineHeight: 1.7 }}>{f.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Come funziona ── */}
        <section id="come-funziona" style={{ background: 'rgba(255,255,255,.025)', borderTop: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-1px', margin: '0 0 12px' }}>
                Come funziona
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(148,163,184,.7)', maxWidth: 460, margin: '0 auto' }}>
                Dall&rsquo;accesso al primo cliente onboardato: meno di 48 ore.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 28 }}>
              {STEPS.map(s => (
                <div key={s.n} style={{ position: 'relative', paddingTop: 12 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: 'rgba(34,197,94,.15)', lineHeight: 1, marginBottom: 16, letterSpacing: '-2px' }}>{s.n}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>{s.title}</div>
                  <div style={{ fontSize: 14, color: 'rgba(148,163,184,.75)', lineHeight: 1.7 }}>{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Revenue tiers ── */}
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-1px', margin: '0 0 14px' }}>
              Più clienti onboardi, più guadagni
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(148,163,184,.7)', maxWidth: 520, margin: '0 auto' }}>
              La revenue share cresce automaticamente al crescere del portafoglio clienti. Ricorrente ogni mese, finché il cliente rimane abbonato.
            </p>
          </div>

          {/* Mobile-friendly tier cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 32 }}>
            {TIERS.map((t, i) => (
              <div key={t.name} style={{
                background: i === 4
                  ? 'linear-gradient(145deg, rgba(34,211,238,.12) 0%, rgba(34,211,238,.04) 100%)'
                  : 'linear-gradient(145deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.02) 100%)',
                border: `1px solid ${i === 4 ? 'rgba(34,211,238,.3)' : 'rgba(255,255,255,.1)'}`,
                borderRadius: 14, padding: '22px 18px', textAlign: 'center', position: 'relative',
              }}>
                {i === 4 && (
                  <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 800, color: '#020817', background: '#22d3ee', borderRadius: 9999, padding: '3px 10px', letterSpacing: .6, whiteSpace: 'nowrap' }}>
                    MASSIMO
                  </div>
                )}
                <div style={{ fontSize: 30, fontWeight: 900, color: t.color, marginBottom: 4 }}>{t.share}%</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(148,163,184,.6)', marginBottom: 14 }}>{t.range}</div>
                <div style={{ fontSize: 11, color: 'rgba(148,163,184,.5)', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 12 }}>{t.example}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: 'rgba(100,116,139,.6)', textAlign: 'center' }}>
            Esempi calcolati sul piano Professional (€99,90/mese). I guadagni variano in base al piano scelto dai tuoi clienti (Trial €19,90 · Starter €59,90 · Professional €99,90 · Enterprise €249).
          </p>
        </section>

        {/* ── CTA finale ── */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,.08) 0%, rgba(2,8,23,0) 60%)',
          borderTop: '1px solid rgba(34,197,94,.12)',
        }}>
          <div style={{ maxWidth: 700, margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-1px', margin: '0 0 16px' }}>
              Pronto a portare l&rsquo;AI Act ai tuoi clienti?
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(148,163,184,.75)', lineHeight: 1.65, maxWidth: 500, margin: '0 auto 36px' }}>
              Compila il form di richiesta in 2 minuti. Il team Actify valuta la candidatura e ti risponde entro 24 ore con le credenziali partner.
            </p>
            <a href="/register?type=partner" style={{ display: 'inline-block', fontSize: 16, fontWeight: 700, color: '#000', textDecoration: 'none', background: '#22C55E', borderRadius: 9999, padding: '16px 40px', boxShadow: '0 6px 32px rgba(34,197,94,.35)' }}>
              Richiedi accesso al programma →
            </a>
            <p style={{ fontSize: 12, color: 'rgba(100,116,139,.6)', marginTop: 18 }}>
              Gratuito · Nessuna carta di credito · Risposta entro 24 ore
            </p>
          </div>
        </section>

        {/* ── Footer minimale ── */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(100,116,139,.6)' }}>© {new Date().getFullYear()} BD TR S.R.L. — Actify</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['/', 'Home'], ['/faq', 'FAQ'], ['/contattaci', 'Contattaci'], ['/privacy', 'Privacy']].map(([h, l]) => (
              <a key={h} href={h} style={{ fontSize: 12, color: 'rgba(100,116,139,.6)', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}
