import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scadenze AI Act 2025–2028 — Tabella aggiornata (Reg. UE 2024/1689)',
  description: 'Tabella completa e aggiornata delle scadenze AI Act: febbraio 2025 (Art. 4 + Art. 5), agosto 2025 (GPAI), agosto 2026 (Art. 50), dicembre 2026 (Digital Omnibus), dicembre 2027 (Allegato III), agosto 2028 (Allegato I).',
  alternates: { canonical: '/scadenze-ai-act' },
  openGraph: {
    title: 'Scadenze AI Act aggiornate 2025–2028 — Reg. UE 2024/1689',
    description: 'La tabella completa delle scadenze AI Act con le correzioni post-Digital Omnibus. Fonte primaria: Art. 113 Reg. UE 2024/1689.',
    url: 'https://official-actify.com/scadenze-ai-act',
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://official-actify.com/' },
    { '@type': 'ListItem', position: 2, name: 'Scadenze AI Act aggiornate', item: 'https://official-actify.com/scadenze-ai-act' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: "Quando entra in vigore l'AI Act?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Il Reg. UE 2024/1689 (AI Act) è entrato in vigore il 1° agosto 2024. L'applicazione è però scaglionata: Capitoli I e II (incluso Art. 4 AI Literacy e Art. 5 pratiche vietate) dal 2 febbraio 2025; obblighi GPAI dal 2 agosto 2025; Art. 50 trasparenza dal 2 agosto 2026; sistemi ad alto rischio Allegato III dal 2 dicembre 2027 (dopo il rinvio Digital Omnibus).",
      },
    },
    {
      '@type': 'Question',
      name: "Quando scattano gli obblighi per i sistemi AI ad alto rischio?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Dipende dalla categoria. Per i sistemi ad alto rischio autonomi (Allegato III — HR, scoring creditizio, infrastrutture critiche, ecc.) gli obblighi scattano il 2 dicembre 2027, dopo il rinvio introdotto dal pacchetto Digital Omnibus (maggio 2026). Per i sistemi AI integrati in prodotti già regolati da direttive europee (Allegato I — dispositivi medici, automotive, aeronautica) la scadenza è il 2 agosto 2028.",
      },
    },
    {
      '@type': 'Question',
      name: "L'AI Act è stato rinviato al 2027 per tutti?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No. Il Digital Omnibus (maggio 2026) ha rinviato solo gli obblighi specifici per sistemi ad alto rischio Allegato III al 2 dicembre 2027 e Allegato I al 2 agosto 2028. Non sono stati rinviati: Art. 5 pratiche vietate (in vigore dal 2 febbraio 2025), Art. 4 AI Literacy (in vigore dal 2 febbraio 2025, Capitolo I del Regolamento), Art. 50 trasparenza chatbot e contenuti AI (2 agosto 2026), obblighi GPAI (2 agosto 2025).",
      },
    },
    {
      '@type': 'Question',
      name: "Cosa obbliga l'Art. 4 AI Literacy e da quando?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "L'Art. 4 del Reg. UE 2024/1689 obbliga tutti i Provider e Deployer di sistemi AI a garantire che il proprio personale abbia un livello sufficiente di competenza AI (AI literacy): conoscenza delle capacità e limitazioni del sistema, consapevolezza dei rischi, capacità di supervisione. È in vigore dal 2 febbraio 2025 (Art. 113(2)(a): Capitolo I applicabile anticipatamente insieme ad Art. 5). Non è stato rinviato dal Digital Omnibus.",
      },
    },
    {
      '@type': 'Question',
      name: "Cosa obbliga l'Art. 50 e da quando?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "L'Art. 50 del Reg. UE 2024/1689 impone obblighi di trasparenza per sistemi AI specifici: i chatbot devono dichiarare di essere AI; i contenuti generati artificialmente (immagini, audio, video, testo) devono essere etichettati come tali; i sistemi di riconoscimento delle emozioni e biometrico devono informare le persone sottoposte. In vigore dal 2 agosto 2026.",
      },
    },
  ],
};

const TIMELINE = [
  {
    date: '1° agosto 2024',
    status: 'passato',
    label: 'In vigore',
    title: 'AI Act in vigore ufficialmente',
    articles: 'Tutto il Regolamento',
    body: 'Il Reg. UE 2024/1689 è pubblicato sulla Gazzetta Ufficiale dell\'UE ed entra in vigore. Inizia il conto alla rovescia per le scadenze di applicazione.',
    forWho: 'Tutti',
  },
  {
    date: '2 febbraio 2025',
    status: 'passato',
    label: 'Applicabile',
    title: 'Art. 4 AI Literacy + Art. 5 Pratiche vietate',
    articles: 'Capitoli I e II — Art. 1–5',
    body: 'I Capitoli I (disposizioni generali, incluso Art. 4 AI Literacy) e II (pratiche AI vietate, Art. 5) diventano applicabili. Da questa data è obbligatorio garantire la competenza AI del personale e sono vietati sistemi come il social scoring, la manipolazione subliminale, l\'identificazione biometrica in tempo reale in spazi pubblici.',
    forWho: 'Tutti i Provider e Deployer',
    highlight: true,
  },
  {
    date: '2 agosto 2025',
    status: 'passato',
    label: 'Applicabile',
    title: 'Obblighi modelli AI per uso generico (GPAI)',
    articles: 'Art. 51–68',
    body: 'Entrano in vigore gli obblighi per i fornitori di modelli AI per uso generico (GPAI): documentazione tecnica, politiche di utilizzo accettabile, copyright. Per i modelli con rischio sistemico (parametri > 10²⁵ FLOPs) obblighi aggiuntivi: valutazione avversariale, notifica incidenti all\'EU AI Office, misure di cybersecurity.',
    forWho: 'Provider di modelli GPAI (OpenAI, Anthropic, Google, Meta, ecc.)',
  },
  {
    date: '2 agosto 2026',
    status: 'futuro-prossimo',
    label: 'In arrivo',
    title: 'Art. 50 Trasparenza + infrastrutture critiche',
    articles: 'Art. 50, Art. 26 (infrastrutture)',
    body: 'Obbligo di dichiarare che un chatbot è un\'AI, etichettare i contenuti generati artificialmente (immagini, video, audio, testo), informare le persone sottoposte a sistemi di riconoscimento delle emozioni o biometrico. Entrano anche in vigore gli obblighi per i componenti AI in infrastrutture critiche.',
    forWho: 'Chiunque operi chatbot, generi contenuti AI, o gestisca infrastrutture critiche',
  },
  {
    date: '2 dicembre 2026',
    status: 'futuro',
    label: 'In arrivo',
    title: 'Nuovi divieti Art. 5 (Digital Omnibus)',
    articles: 'Art. 5 §1 lett. g–h',
    body: 'Il pacchetto Digital Omnibus (maggio 2026) ha introdotto due nuovi divieti che entreranno in vigore in questa data: sistemi AI per inferire opinioni politiche, religiose o filosofiche da dati biometrici; sistemi AI per valutare il rischio di criminalità basandosi su profili biometrici.',
    forWho: 'Provider di sistemi biometrici e di profilazione',
  },
  {
    date: '2 dicembre 2027',
    status: 'futuro',
    label: 'In arrivo',
    title: 'Sistemi ad alto rischio autonomi (Allegato III)',
    articles: 'Art. 9–27 per sistemi Allegato III',
    body: 'Obblighi completi per i sistemi AI ad alto rischio che non rientrano in prodotti già regolati: sistemi HR (screening CV, valutazione performance), scoring creditizio, rilevamento frodi, sistemi educativi, gestione migrazione, polizia predittiva. Rinviati di un anno dal Digital Omnibus (erano previsti ad agosto 2026).',
    forWho: 'Provider e Deployer di sistemi AI in categorie Allegato III',
    highlight: true,
  },
  {
    date: '2 agosto 2028',
    status: 'futuro',
    label: 'In arrivo',
    title: 'AI in prodotti regolati (Allegato I)',
    articles: 'Art. 6(1) e obblighi correlati',
    body: 'Obblighi per i sistemi AI integrati in prodotti già soggetti a normative UE: dispositivi medici, macchinari, veicoli a motore, attrezzature aviation, prodotti a radio. La conformità all\'AI Act deve essere inclusa nelle procedure di marcatura CE esistenti.',
    forWho: 'Provider di AI in dispositivi medici, automotive, aeronautica, macchinari',
  },
];

const statusStyle: Record<string, { dot: string; badge: string; badgeText: string }> = {
  passato: { dot: '#64748b', badge: 'rgba(100,116,139,.15)', badgeText: '#94a3b8' },
  'futuro-prossimo': { dot: '#f59e0b', badge: 'rgba(245,158,11,.15)', badgeText: '#fbbf24' },
  futuro: { dot: '#22C55E', badge: 'rgba(34,197,94,.12)', badgeText: '#4ade80' },
};

export default function ScadenzeAIActPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="doc-page">
        <nav className="doc-page-nav">
          <a href="/" className="doc-back">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Home
          </a>
          <a href="/faq" className="doc-back" style={{ marginLeft: 'auto' }}>FAQ AI Act →</a>
        </nav>

        <style>{`
          .timeline-entry { display: grid; grid-template-columns: 180px 1fr; gap: 0 32px; padding: 36px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
          .timeline-date { padding-top: 4px; }
          .timeline-date-text { font-size: 13px; font-weight: 700; color: #f1f5f9; line-height: 1.4; margin-bottom: 8px; }
          .timeline-badge { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; padding: 3px 10px; border-radius: 9999px; }
          .timeline-title { font-size: 18px; font-weight: 800; color: #f1f5f9; margin: 0 0 6px; letter-spacing: -.3px; }
          .timeline-articles { font-size: 12px; color: rgba(100,116,139,.9); font-family: monospace; margin-bottom: 12px; }
          .timeline-body { font-size: 14px; color: rgba(148,163,184,.85); line-height: 1.75; margin-bottom: 12px; }
          .timeline-forwho { font-size: 12px; color: rgba(34,197,94,.9); font-weight: 600; }
          .highlight-entry { background: rgba(34,197,94,.04); border-radius: 12px; padding: 36px 20px; margin: 0 -20px; border: 1px solid rgba(34,197,94,.1) !important; border-bottom: 1px solid rgba(34,197,94,.1) !important; }
          @media (max-width: 640px) {
            .timeline-entry { grid-template-columns: 1fr; gap: 8px 0; }
            .timeline-date { display: flex; align-items: center; gap: 12px; }
          }
          .correction-box { background: rgba(239,68,68,.07); border: 1px solid rgba(239,68,68,.2); border-radius: 10px; padding: 16px 20px; margin-bottom: 40px; }
          .correction-box p { font-size: 13px; color: rgba(252,165,165,.9); line-height: 1.7; margin: 0; }
          .correction-box strong { color: #fca5a5; }
        `}</style>

        <div className="doc-section">
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(34,197,94,.8)', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 6, padding: '3px 10px', letterSpacing: .5 }}>
              Aggiornato luglio 2026 · Post Digital Omnibus
            </span>
          </div>
          <h1 className="doc-title">Scadenze AI Act<br /><span style={{ color: '#22C55E' }}>aggiornate</span></h1>
          <p className="doc-lead">
            Tabella completa e verificata delle scadenze di applicazione del Reg. UE 2024/1689 (AI Act).
            Fonte primaria: Art. 113 del Regolamento e pacchetto Digital Omnibus (maggio 2026).
          </p>

          {/* Box correzione errore comune */}
          <div className="correction-box">
            <p>
              <strong>Errore comune circolante online:</strong> molte fonti (creator, studi legali, newsletter) riportano che &ldquo;gli obblighi AI Act scattano ad agosto 2026&rdquo; oppure che &ldquo;Art. 4 AI Literacy entra in vigore ad agosto 2026&rdquo;. Entrambe sono <strong>inesatte</strong>.
              Il Digital Omnibus (maggio 2026) ha rinviato solo gli obblighi Allegato III al <strong>dicembre 2027</strong>. L&rsquo;Art. 4 AI Literacy è applicabile dal <strong>2 febbraio 2025</strong> (Capitolo I, Art. 113(2)(a)).
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="doc-section" style={{ marginBottom: 0 }}>
          {TIMELINE.map((entry) => {
            const s = statusStyle[entry.status];
            return (
              <div key={entry.date} className={`timeline-entry${entry.highlight ? ' highlight-entry' : ''}`}>
                <div className="timeline-date">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, flexShrink: 0, boxShadow: entry.status !== 'passato' ? `0 0 8px ${s.dot}` : 'none' }} />
                    <div className="timeline-date-text">{entry.date}</div>
                  </div>
                  <span className="timeline-badge" style={{ background: s.badge, color: s.badgeText }}>{entry.label}</span>
                </div>
                <div>
                  <h2 className="timeline-title">{entry.title}</h2>
                  <div className="timeline-articles">{entry.articles}</div>
                  <p className="timeline-body">{entry.body}</p>
                  <div className="timeline-forwho">↳ {entry.forWho}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nota sanzioni */}
        <div className="doc-section" style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 16 }}>Sanzioni — Art. 99</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { amount: '€35 milioni o 7%', detail: 'del fatturato globale annuo (il maggiore dei due)', what: 'Pratiche AI vietate (Art. 5) + mancata cooperazione con EU AI Office', color: '#ef4444' },
              { amount: '€15 milioni o 3%', detail: 'del fatturato globale annuo', what: 'Violazioni obblighi sistemi ad alto rischio (Art. 9–27), inosservanza obblighi Deployer (Art. 26), violazioni obblighi GPAI', color: '#f59e0b' },
              { amount: '€7,5 milioni o 1%', detail: 'del fatturato globale annuo', what: 'Fornitura di informazioni inesatte, incomplete o fuorvianti alle autorità (Art. 99 §5)', color: '#94a3b8' },
            ].map(s => (
              <div key={s.amount} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '0 20px', padding: '16px 20px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: s.color, marginBottom: 2 }}>{s.amount}</div>
                  <div style={{ fontSize: 11, color: 'rgba(100,116,139,.8)' }}>{s.detail}</div>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(148,163,184,.8)', lineHeight: 1.6 }}>{s.what}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(100,116,139,.6)', marginTop: 14 }}>
            Fonte: Art. 99 Reg. UE 2024/1689. Le sanzioni si applicano prendendo il maggiore tra importo fisso e percentuale del fatturato. Per le PMI le autorità nazionali possono applicare limiti proporzionati.
          </p>
        </div>

        {/* CTA */}
        <div className="doc-section">
          <div style={{ background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.15)', borderRadius: 14, padding: '32px 28px', textAlign: 'center' }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px' }}>Verifica la tua posizione rispetto a queste scadenze</h3>
            <p style={{ fontSize: 14, color: 'rgba(148,163,184,.8)', margin: '0 0 22px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
              Actify censisce i tuoi sistemi AI, li classifica per livello di rischio e calcola in automatico quali obblighi ti riguardano e quando.
            </p>
            <a href="/register" style={{ display: 'inline-block', fontSize: 14, fontWeight: 700, color: '#000', textDecoration: 'none', background: '#22C55E', borderRadius: 9999, padding: '12px 28px', boxShadow: '0 4px 20px rgba(34,197,94,.25)' }}>
              Inizia gratis — primo sistema AI →
            </a>
          </div>
        </div>

        {/* Footer nav */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 24, marginTop: 8, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[['/', 'Home'], ['/faq', 'FAQ'], ['/compliance', 'Compliance Actify'], ['/per-consulenti', 'Per gli studi']].map(([h, l]) => (
            <a key={h} href={h} style={{ fontSize: 12, color: 'rgba(100,116,139,.7)', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </div>
    </>
  );
}
