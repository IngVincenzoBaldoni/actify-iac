import { markSvg } from '@/lib/branding';

const tags1 = ['AWS', 'AI/ML', 'Serverless', 'IaC', 'Python', 'TypeScript', 'Terraform'];
const tags2 = ['AI Strategy', 'PMI', 'AI Act', 'Business Dev', 'Operations', 'Retail', 'HR Tech'];

export default function ChiSiamoPage() {
  return (
    <div className="doc-page">
      <nav className="doc-page-nav">
        <a href="/" className="doc-back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Home
        </a>
        <span className="doc-crumb">Chi siamo</span>
        <span dangerouslySetInnerHTML={{ __html: markSvg(28) }} />
      </nav>

      <div className="cs-page">

        {/* Hero */}
        <div className="cs-hero">
          <div className="cs-hero-inner">
            <div className="doc-tag" style={{margin:'0 auto 20px',display:'inline-flex'}}>Il team</div>
            <h1 className="cs-title">Due persone,<br /><span className="comp-green">un&rsquo;ossessione</span></h1>
            <p className="cs-sub">
              Abbiamo costruito Actify perch&eacute; nessuno dei due voleva pi&ugrave; spiegare agli stessi clienti
              le stesse cose sull&rsquo;AI Act. Uno conosce la macchina dall&rsquo;interno.
              L&rsquo;altro sa esattamente dove portarla.
            </p>
          </div>
        </div>

        {/* Team cards */}
        <div className="cs-team-wrap">
          <div className="cs-team-grid">

            {/* CTO */}
            <div className="cs-card">
              <div className="cs-card-top">
                <div className="cs-avatar-wrap">
                  <div className="cs-avatar-ring">
                    <div className="cs-avatar-circle">
                      <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
                        <circle cx="34" cy="24" r="14" fill="white" fillOpacity="0.13"/>
                        <path d="M6 65C6 49.54 19.43 37 34 37C48.57 37 62 49.54 62 65" stroke="white" strokeOpacity="0.09" strokeWidth="2.5" fill="none"/>
                      </svg>
                    </div>
                  </div>
                  <div className="cs-avatar-badge">CTO</div>
                </div>
                <div className="cs-card-intro">
                  <h2 className="cs-name">Co-Founder &amp; CTO</h2>
                  <div className="cs-role">Ingegnere Cloud AI &middot; AWS Specialist</div>
                  <div className="cs-exp-badge">5+ anni consulenza cloud</div>
                </div>
              </div>

              <div className="cs-bio-section">
                <h3>Il background</h3>
                <p>
                  Cinque anni passati nelle trincee dell&rsquo;IT consulting su AWS &mdash; dalla progettazione di
                  pipeline dati per istituti finanziari, all&rsquo;architettura di sistemi AI generativi per scale-up
                  europee. Ha visto cosa succede quando il codice scritto dall&rsquo;AI va in produzione senza un
                  layer di governance: niente di buono.
                </p>
                <p>
                  Specializzato in infrastruttura serverless, Infrastructure as Code e sicurezza cloud.
                  Il suo ambiente naturale &egrave; un terminale con CloudWatch aperto su uno schermo e un
                  diagramma architetturale sull&rsquo;altro.
                </p>
              </div>

              <div className="cs-bio-section">
                <h3>Perch&eacute; Actify</h3>
                <p>
                  &ldquo;Ho visto troppi clienti usare LLM in produzione senza sapere cosa stessero rischiando
                  normativamente. L&rsquo;AI Act non &egrave; burocazia &mdash; &egrave; l&rsquo;unico modo per
                  rendere l&rsquo;AI sostenibile nel tempo. Actify &egrave; lo strumento che avrei voluto avere
                  quando lavoravo in consulenza.&rdquo;
                </p>
              </div>

              <div className="cs-bio-section">
                <h3>In Actify si occupa di</h3>
                <ul>
                  <li>Architettura dell&rsquo;infrastruttura AWS (Lambda, DynamoDB, Cognito, Bedrock)</li>
                  <li>Integrazione dei modelli AI e prompt engineering per l&rsquo;analisi compliance</li>
                  <li>Sicurezza, affidabilit&agrave; e scalabilit&agrave; della piattaforma</li>
                  <li>Conformit&agrave; tecnica dei sistemi AI interni (chi controlla il controllore)</li>
                </ul>
              </div>

              <div className="cs-tags">
                {tags1.map(t => <span key={t} className="l-team-tag">{t}</span>)}
              </div>
            </div>

            {/* CEO */}
            <div className="cs-card">
              <div className="cs-card-top">
                <div className="cs-avatar-wrap">
                  <div className="cs-avatar-ring">
                    <div className="cs-avatar-circle">
                      <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
                        <circle cx="34" cy="24" r="14" fill="white" fillOpacity="0.13"/>
                        <path d="M6 65C6 49.54 19.43 37 34 37C48.57 37 62 49.54 62 65" stroke="white" strokeOpacity="0.09" strokeWidth="2.5" fill="none"/>
                      </svg>
                    </div>
                  </div>
                  <div className="cs-avatar-badge">CEO</div>
                </div>
                <div className="cs-card-intro">
                  <h2 className="cs-name">Co-Founder &amp; CEO</h2>
                  <div className="cs-role">AI Strategy &middot; PMI Specialist</div>
                  <div className="cs-exp-badge">10+ anni AI nelle PMI</div>
                </div>
              </div>

              <div className="cs-bio-section">
                <h3>Il background</h3>
                <p>
                  Dieci anni ad accompagnare le PMI italiane ed europee nell&rsquo;adozione dell&rsquo;AI &mdash;
                  quando ancora si chiamava &ldquo;machine learning&rdquo; e nessuno sapeva bene cosa fosse.
                  Ha lavorato con aziende in retail, logistica, HR, manifatturiero e servizi professionali,
                  aiutandole a trasformare processi operativi grazie all&rsquo;intelligenza artificiale.
                </p>
                <p>
                  Il suo contributo pi&ugrave; frequente: tradurre la complessit&agrave; tecnica e normativa
                  in linguaggio che il CFO capisce al primo tentativo. E convincere il CDA che il rischio
                  di non fare nulla &egrave; pi&ugrave; alto del rischio di innovare.
                </p>
              </div>

              <div className="cs-bio-section">
                <h3>Perch&eacute; Actify</h3>
                <p>
                  &ldquo;Ho visto le stesse PMI che stavano finalmente abbracciando l&rsquo;AI bloccarsi di fronte
                  all&rsquo;AI Act &mdash; non perch&eacute; fosse impossibile, ma perch&eacute; gli strumenti
                  giusti non esistevano. Il mercato era pieno di consulenti da &euro;50K e vuoto di soluzioni
                  accessibili. Actify colma quel vuoto.&rdquo;
                </p>
              </div>

              <div className="cs-bio-section">
                <h3>In Actify si occupa di</h3>
                <ul>
                  <li>Strategia di prodotto e roadmap funzionale</li>
                  <li>Relazioni con clienti e partner commerciali</li>
                  <li>Posizionamento sul mercato delle PMI italiane ed europee</li>
                  <li>AI Act knowledge &mdash; mantiene aggiornato il motore di analisi normativa</li>
                </ul>
              </div>

              <div className="cs-tags">
                {tags2.map(t => <span key={t} className="l-team-tag">{t}</span>)}
              </div>
            </div>

          </div>
        </div>

        {/* Mission */}
        <div className="cs-mission">
          <div className="cs-mission-inner">
            <div className="doc-tag" style={{margin:'0 auto 20px',display:'inline-flex'}}>La nostra missione</div>
            <h2>Ogni PMI europea dovrebbe poter<br />essere conforme all&rsquo;AI Act</h2>
            <p>
              Non solo le grandi corporation con team legali interni e budget a sei cifre.
              Actify esiste perch&eacute; crediamo che la compliance non debba essere un vantaggio competitivo
              di chi ha pi&ugrave; risorse &mdash; deve essere accessibile a chiunque usi AI in modo responsabile.
            </p>
            <div className="cs-mission-cta">
              <a href="/register" className="comp-cta-btn">Provalo gratuitamente</a>
              <a href="/perche-fidarti" className="btn-ss" style={{display:'inline-flex',padding:'12px 24px',fontSize:'14px'}}>Perch&eacute; puoi fidarti &rarr;</a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
