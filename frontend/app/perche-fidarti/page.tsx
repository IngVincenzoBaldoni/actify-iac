import { badgeSvg, markSvg } from '@/lib/branding';

export default function PercheFildartiPage() {
  return (
    <div className="doc-page">
      <nav className="doc-page-nav">
        <a href="/" className="doc-back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Home
        </a>
        <span className="doc-crumb">Perché puoi fidarti</span>
        <span dangerouslySetInnerHTML={{ __html: markSvg(28) }} />
      </nav>

      <div className="doc-body" style={{maxWidth:'900px'}}>

        {/* Hero */}
        <div className="pf-hero">
          <div className="pf-hero-text">
            <div className="doc-tag">Trasparenza totale</div>
            <h1 className="pf-title">Siamo i nostri<br /><span className="comp-green">primi clienti</span></h1>
            <p className="pf-sub">
              Prima di chiederti di usare Actify per la compliance AI, lo usiamo su noi stessi. Ogni sistema AI
              che alimenta la nostra piattaforma &egrave; censito, classificato e verificato con il nostro stesso
              strumento. Questa pagina documenta tutto &mdash; senza omissioni.
            </p>
          </div>
          <div className="pf-hero-badge">
            <div dangerouslySetInnerHTML={{ __html: badgeSvg(150) }} />
            <div className="pf-verified-row">
              <span className="l-trust-v-chip">&#10003; Actify Verified Compliant</span>
              <span className="l-trust-v-date">Reg. UE 2024/1689 &middot; maggio 2026</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="pf-stats">
          <div className="pf-stat"><div className="pf-stat-n">0</div><div className="pf-stat-l">Violazioni AI Act</div></div>
          <div className="pf-stat"><div className="pf-stat-n">11</div><div className="pf-stat-l">Articoli verificati</div></div>
          <div className="pf-stat"><div className="pf-stat-n">2</div><div className="pf-stat-l">Sistemi AI censiti</div></div>
          <div className="pf-stat"><div className="pf-stat-n">100%</div><div className="pf-stat-l">Score conformit&agrave;</div></div>
          <div className="pf-stat"><div className="pf-stat-n">N/A</div><div className="pf-stat-l">EU AI Database</div></div>
        </div>

        {/* Why trust us - narrative */}
        <div className="doc-section">
          <h2>Perché la trasparenza &egrave; il nostro prodotto</h2>
          <p>
            Actify aiuta le aziende a navigare l&rsquo;AI Act. Perch&eacute; qualcuno dovrebbe fidarsi di uno strumento
            di compliance che non dimostra la propria? Non avrebbe senso. Per questo abbiamo deciso fin dall&rsquo;inizio
            che la nostra conformit&agrave; sarebbe stata pubblica, documentata e verificabile da chiunque.
          </p>
          <p>
            Non &egrave; un esercizio di marketing: &egrave; la stessa disciplina che chiediamo ai nostri clienti.
            Se la nostra piattaforma non supera il suo stesso test, non ha il diritto di aiutare te a superare il tuo.
          </p>
          <div className="doc-highlight">
            <p>
              <strong>Il principio:</strong> usiamo Actify su Actify. Il nostro registro AI &egrave; pubblico.
              La nostra classificazione di rischio &egrave; pubblica. I nostri articoli applicabili sono pubblici.
              Il gap &egrave; sempre zero &mdash; altrimenti lo diremo esplicitamente.
            </p>
          </div>
        </div>

        {/* AI Systems */}
        <div className="doc-section">
          <h2>I sistemi AI che alimentano Actify</h2>
          <p>Utilizziamo due sistemi AI distinti per scopi diversi. In entrambi i casi il nostro ruolo &egrave; quello di <strong>deployer</strong> — non sviluppiamo n&eacute; commercializziamo modelli AI.</p>

          <div className="comp-ai-grid" style={{marginTop:'20px'}}>
            <div className="comp-ai-card">
              <div className="comp-ai-header">
                <div className="comp-ai-icon comp-ai-icon-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                </div>
                <div>
                  <div className="comp-ai-name">Claude Code</div>
                  <div className="comp-ai-vendor">Anthropic PBC</div>
                </div>
                <div className="comp-risk-badge comp-risk-min">Rischio Minimo</div>
              </div>
              <div className="comp-ai-body">
                <div className="comp-ai-row"><span className="comp-ai-k">Scopo</span><span>Generazione codice infrastruttura IaC &mdash; uso esclusivamente interno</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Utenti</span><span>Solo team tecnico Actify &mdash; nessuna esposizione ai clienti</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Supervisione</span><span>Revisione umana obbligatoria prima di ogni deploy</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Annex III</span><span>Non applicabile</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Articoli</span><span>Art. 4 &middot; Art. 26 &middot; Art. 29</span></div>
              </div>
            </div>

            <div className="comp-ai-card">
              <div className="comp-ai-header">
                <div className="comp-ai-icon comp-ai-icon-orange">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </div>
                <div>
                  <div className="comp-ai-name">Amazon Nova Pro</div>
                  <div className="comp-ai-vendor">Amazon Bedrock · AWS</div>
                </div>
                <div className="comp-risk-badge comp-risk-lim">Rischio Limitato</div>
              </div>
              <div className="comp-ai-body">
                <div className="comp-ai-row"><span className="comp-ai-k">Scopo</span><span>Genera i report di compliance AI Act per i clienti della piattaforma</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Utenti</span><span>Clienti aziendali B2B di Actify</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Supervisione</span><span>Output sempre advisory &mdash; decisioni sempre a carico del cliente</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Annex III</span><span>Non applicabile &mdash; analisi compliance B2B non &egrave; categoria AR</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Articoli</span><span>Art. 4 &middot; Art. 26 &middot; Art. 29 &middot; Art. 50</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Articles */}
        <div className="doc-section">
          <h2>Articolo per articolo &mdash; la nostra conformit&agrave;</h2>
          <div className="comp-art-table">
            <div className="comp-art-head"><span>Articolo</span><span>Titolo</span><span>Applicabilit&agrave;</span><span>Stato</span></div>
            <div className="comp-art-row"><span className="comp-art-num">Art. 4</span><span>AI Literacy</span><span>Formazione interna su AI Act per tutto il team che usa sistemi AI</span><span><div className="comp-status comp-status-ok">&#10003; Conforme</div></span></div>
            <div className="comp-art-row"><span className="comp-art-num">Art. 5</span><span>Pratiche vietate</span><span>Nessun sistema di Actify implementa manipolazione, scoring sociale o biometria vietata</span><span><div className="comp-status comp-status-ok">&#10003; Conforme</div></span></div>
            <div className="comp-art-row"><span className="comp-art-num">Art. 6 + Annex III</span><span>Classificazione alto rischio</span><span>Actify &egrave; deployer di sistemi non-AR &mdash; non applicabile come provider</span><span><div className="comp-status comp-status-na">N/A</div></span></div>
            <div className="comp-art-row"><span className="comp-art-num">Art. 8&ndash;15</span><span>Requisiti tecnici AR</span><span>Solo per provider di sistemi ad alto rischio</span><span><div className="comp-status comp-status-na">N/A</div></span></div>
            <div className="comp-art-row"><span className="comp-art-num">Art. 16&ndash;25</span><span>Obblighi provider AR</span><span>Solo per provider di sistemi ad alto rischio</span><span><div className="comp-status comp-status-na">N/A</div></span></div>
            <div className="comp-art-row"><span className="comp-art-num">Art. 26</span><span>Obblighi deployer AR</span><span>Rispettiamo le istruzioni d&rsquo;uso di Anthropic e AWS anche se non obbligatorio</span><span><div className="comp-status comp-status-ok">&#10003; Conforme</div></span></div>
            <div className="comp-art-row"><span className="comp-art-num">Art. 29</span><span>Uso conforme deployer</span><span>Utilizziamo i sistemi AI in conformit&agrave; ai ToS dei provider e manteniamo supervisione umana</span><span><div className="comp-status comp-status-ok">&#10003; Conforme</div></span></div>
            <div className="comp-art-row"><span className="comp-art-num">Art. 49</span><span>EU AI Database</span><span>Non siamo provider n&eacute; deployer di sistemi AR &mdash; registrazione non richiesta</span><span><div className="comp-status comp-status-na">N/A &mdash; vedi sotto</div></span></div>
            <div className="comp-art-row"><span className="comp-art-num">Art. 50</span><span>Trasparenza AI</span><span>I report sono sempre marcati come AI-generated &mdash; informativa Art. 50 pubblicata</span><span><div className="comp-status comp-status-ok">&#10003; Conforme</div></span></div>
            <div className="comp-art-row"><span className="comp-art-num">Art. 51&ndash;56</span><span>Modelli GPAI</span><span>A carico di Anthropic e Amazon &mdash; Actify &egrave; deployer</span><span><div className="comp-status comp-status-na">N/A (provider)</div></span></div>
            <div className="comp-art-row"><span className="comp-art-num">Art. 99&ndash;101</span><span>Sanzioni</span><span>Nessuna violazione rilevata. Art. 100 (riduzione PMI) applicabile.</span><span><div className="comp-status comp-status-ok">&#10003; 0 violazioni</div></span></div>
          </div>
        </div>

        {/* EU AI Database */}
        <div className="doc-section">
          <h2>Perché non siamo nel registro EU AI Database</h2>
          <p>
            L&rsquo;art. 49 del Reg. UE 2024/1689 impone la registrazione nell&rsquo;EU AI Database in tre casi specifici.
            Nessuno di questi si applica ad Actify:
          </p>
          <div className="comp-reg-cases">
            <div className="comp-reg-case comp-reg-no">
              <span className="comp-reg-label">&#10005; Non ci riguarda</span>
              <strong>Art. 49(1) &mdash; Provider di sistemi AI ad alto rischio</strong>
              <p>Non sviluppiamo n&eacute; commercializziamo modelli AI. Siamo deployer di sistemi terzi (Anthropic, AWS).</p>
            </div>
            <div className="comp-reg-case comp-reg-no">
              <span className="comp-reg-label">&#10005; Non ci riguarda</span>
              <strong>Art. 49(2) &mdash; Deployer di sistemi AR in contesti pubblici</strong>
              <p>I sistemi che utilizziamo non sono classificati ad alto rischio. Operiamo in ambito privato B2B.</p>
            </div>
            <div className="comp-reg-case comp-reg-no">
              <span className="comp-reg-label">&#10005; Non ci riguarda</span>
              <strong>Art. 49(3) &mdash; Provider di modelli GPAI con rischio sistemico</strong>
              <p>Non siamo provider di modelli GPAI. I modelli Nova Pro e Claude sono di Amazon e Anthropic.</p>
            </div>
          </div>
          <div className="comp-reg-conclusion">
            <strong>Conclusione:</strong> Actify non ha obbligo di registrazione nell&rsquo;EU AI Database. La valutazione sar&agrave; rivalutata ad ogni modifica significativa dei sistemi AI o al superamento di soglie rilevanti.
          </div>
        </div>

        {/* Badge for clients */}
        <div className="doc-section">
          <h2>Anche il tuo badge &egrave; a portata di mano</h2>
          <p>
            Il badge <strong>Actify Verified Compliant</strong> non &egrave; solo nostro &mdash; &egrave; il traguardo che aiutiamo i nostri clienti a raggiungere.
            Quando tutti i tuoi sistemi AI risultano conformi nella dashboard Actify, il badge viene sbloccato automaticamente
            e puoi esporlo sul tuo sito, nelle comunicazioni ai clienti e negli audit come prova documentata della tua compliance AI.
          </p>
          <div style={{textAlign:'center',marginTop:'28px',display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
            <div dangerouslySetInnerHTML={{ __html: badgeSvg(110) }} />
            <a href="/register" className="comp-cta-btn">Inizia ora &mdash; &egrave; gratuito</a>
          </div>
        </div>

        {/* Documents */}
        <div className="doc-section">
          <h2>Documentazione pubblica completa</h2>
          <div className="comp-doc-grid">
            <a href="/compliance/dichiarazione" className="comp-doc-card">
              <div className="comp-doc-icon">&#128203;</div>
              <div className="comp-doc-info">
                <div className="comp-doc-title">Dichiarazione di Conformit&agrave; AI Act</div>
                <div className="comp-doc-desc">Dichiarazione formale con classificazione di rischio, articoli e misure adottate.</div>
                <div className="comp-doc-meta">v1.0 &middot; maggio 2026</div>
              </div>
              <div className="comp-doc-arrow">&rarr;</div>
            </a>
            <a href="/compliance/registro-ai" className="comp-doc-card">
              <div className="comp-doc-icon">&#128194;</div>
              <div className="comp-doc-info">
                <div className="comp-doc-title">Registro dei Sistemi AI</div>
                <div className="comp-doc-desc">Inventario completo di tutti i sistemi AI con schede tecniche e governance.</div>
                <div className="comp-doc-meta">v1.0 &middot; maggio 2026</div>
              </div>
              <div className="comp-doc-arrow">&rarr;</div>
            </a>
            <a href="/compliance/trasparenza" className="comp-doc-card">
              <div className="comp-doc-icon">&#128065;</div>
              <div className="comp-doc-info">
                <div className="comp-doc-title">Informativa AI (Art. 50)</div>
                <div className="comp-doc-desc">Come e quando utilizziamo AI nei report &mdash; obblighi di trasparenza.</div>
                <div className="comp-doc-meta">v1.0 &middot; maggio 2026</div>
              </div>
              <div className="comp-doc-arrow">&rarr;</div>
            </a>
            <a href="/compliance/disclaimer" className="comp-doc-card">
              <div className="comp-doc-icon">&#9878;</div>
              <div className="comp-doc-info">
                <div className="comp-doc-title">Disclaimer Utilizzo AI</div>
                <div className="comp-doc-desc">Natura advisory, limitazioni responsabilit&agrave;, supervisione umana.</div>
                <div className="comp-doc-meta">v1.0 &middot; maggio 2026</div>
              </div>
              <div className="comp-doc-arrow">&rarr;</div>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
