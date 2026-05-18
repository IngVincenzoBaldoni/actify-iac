import { badgeSvg, markSvg } from '@/lib/branding';

export default function CompliancePage() {
  const badge = badgeSvg(120);
  const mark  = markSvg(28);

  return (
    <div className="comp-page">

      {/* ── Nav ── */}
      <nav className="comp-nav">
        <a href="/" className="comp-nav-logo" dangerouslySetInnerHTML={{ __html: mark + '<span>Actify</span>' }} />
        <span className="comp-nav-pill">AI Act Compliance</span>
        <a href="/login" className="comp-nav-login">Accedi</a>
      </nav>

      {/* ── Hero ── */}
      <section className="comp-hero">
        <div className="comp-hero-inner">
          <div className="comp-badge-wrap" dangerouslySetInnerHTML={{ __html: badge }} />
          <div className="comp-hero-text">
            <div className="comp-chip">
              <span className="comp-dot"></span>
              Conformità verificata — Reg. UE 2024/1689
            </div>
            <h1>Actify è conforme<br /><span className="comp-green">all'AI Act</span></h1>
            <p>
              Actify utilizza sistemi AI in modo responsabile, trasparente e conforme al Regolamento UE 2024/1689.
              Questa pagina documenta i nostri sistemi AI, la loro classificazione di rischio, gli articoli applicabili
              e tutti i documenti richiesti dalla normativa.
            </p>
            <div className="comp-hero-links">
              <a href="/compliance/dichiarazione" className="comp-link-btn">Dichiarazione di Conformità</a>
              <a href="/compliance/trasparenza"   className="comp-link-btn comp-link-sec">Informativa Art. 50</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Systems ── */}
      <section className="comp-section">
        <div className="comp-section-inner">
          <div className="comp-section-head">
            <div className="comp-label">Sistemi AI utilizzati</div>
            <h2>I sistemi AI che alimentano Actify</h2>
            <p>Actify usa due sistemi AI distinti per scopi diversi. Entrambi sono gestiti come <strong>deployer</strong> — non siamo provider di modelli AI.</p>
          </div>

          <div className="comp-ai-grid">

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
                <div className="comp-ai-row"><span className="comp-ai-k">Scopo</span><span>Generazione codice infrastruttura (IaC) — uso interno sviluppatori</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Utenti</span><span>Solo team tecnico interno Actify — nessuna esposizione ai clienti</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Decisioni auto.</span><span>No — tutto il codice generato è revisionato da un ingegnere umano prima del deploy</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Ruolo Actify</span><span>Deployer (Art. 3 §4) — Anthropic è il provider del modello</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Annex III</span><span>Non applicabile — strumento di sviluppo interno, nessun impatto su terzi</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Art. AI Act</span><span>Art. 4 (AI literacy) · Art. 26 (obblighi deployer)</span></div>
              </div>
            </div>

            <div className="comp-ai-card">
              <div className="comp-ai-header">
                <div className="comp-ai-icon comp-ai-icon-orange">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </div>
                <div>
                  <div className="comp-ai-name">Amazon Nova Pro (Bedrock)</div>
                  <div className="comp-ai-vendor">Amazon Web Services</div>
                </div>
                <div className="comp-risk-badge comp-risk-lim">Rischio Limitato</div>
              </div>
              <div className="comp-ai-body">
                <div className="comp-ai-row"><span className="comp-ai-k">Scopo</span><span>Analisi conformità AI Act dei sistemi tracciati dai clienti — genera compliance gap analysis</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Utenti</span><span>Clienti aziendali Actify (operatori economici che usano la piattaforma SaaS)</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Decisioni auto.</span><span>No — il report è advisory; il cliente rivede i gap e decide le azioni. Supervisione umana sempre presente.</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Ruolo Actify</span><span>Deployer (Art. 3 §4) — Amazon AWS è il provider del modello GPAI Nova Pro</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Annex III</span><span>Non classificabile come alto rischio — l'analisi compliance non rientra nelle 8 categorie Annex III</span></div>
                <div className="comp-ai-row"><span className="comp-ai-k">Art. AI Act</span><span>Art. 4 · Art. 26 · Art. 29 · Art. 50 (trasparenza output AI)</span></div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Risk Classification ── */}
      <section className="comp-section comp-section-alt">
        <div className="comp-section-inner">
          <div className="comp-section-head">
            <div className="comp-label">Classificazione rischio</div>
            <h2>Nessun sistema ad alto rischio</h2>
            <p>La classificazione è determinata dall'art. 6 + Allegato III del Reg. UE 2024/1689. Un sistema AI è ad alto rischio solo se rientra nelle 8 categorie dell'Annex III.</p>
          </div>

          <div className="comp-risk-table">
            <div className="comp-risk-row comp-risk-head">
              <span>Sistema AI</span><span>Categoria Annex III</span><span>Classificazione</span><span>Motivazione</span>
            </div>
            <div className="comp-risk-row">
              <span>Claude Code</span>
              <span className="comp-muted">Nessuna</span>
              <span><div className="comp-risk-badge comp-risk-min">Rischio Minimo</div></span>
              <span>Strumento di sviluppo interno. Non interagisce con terzi. Non prende decisioni su persone fisiche.</span>
            </div>
            <div className="comp-risk-row">
              <span>Amazon Nova Pro</span>
              <span className="comp-muted">Nessuna</span>
              <span><div className="comp-risk-badge comp-risk-lim">Rischio Limitato</div></span>
              <span>Genera analisi di compliance advisory. Non è in nessuna delle 8 categorie Annex III. Art. 50 si applica per la trasparenza.</span>
            </div>
            <div className="comp-risk-row">
              <span>Piattaforma Actify</span>
              <span className="comp-muted">Nessuna</span>
              <span><div className="comp-risk-badge comp-risk-lim">Rischio Limitato</div></span>
              <span>Servizio SaaS B2B di compliance. Output sempre advisory con supervisione umana. Non impatta persone fisiche in modo diretto o automatico.</span>
            </div>
          </div>

          <div className="comp-annex-note">
            <div className="comp-annex-icon">ℹ</div>
            <div>
              <strong>Le 8 categorie Annex III ad alto rischio sono:</strong> biometria e categorizzazione, infrastruttura critica, istruzione, occupazione e gestione lavoratori, accesso a servizi privati e pubblici essenziali, law enforcement, migrazione e controllo frontiere, amministrazione della giustizia. Nessuno dei sistemi AI di Actify rientra in alcuna di queste categorie.
            </div>
          </div>
        </div>
      </section>

      {/* ── Applicable Articles ── */}
      <section className="comp-section">
        <div className="comp-section-inner">
          <div className="comp-section-head">
            <div className="comp-label">Articoli applicabili</div>
            <h2>Come siamo compliant articolo per articolo</h2>
          </div>

          <div className="comp-art-table">
            <div className="comp-art-head">
              <span>Articolo</span><span>Titolo</span><span>Applicabilità</span><span>Stato</span>
            </div>

            <div className="comp-art-row">
              <span className="comp-art-num">Art. 4</span>
              <span>AI Literacy</span>
              <span>Il personale che usa sistemi AI deve avere adeguata alfabetizzazione AI</span>
              <span><div className="comp-status comp-status-ok">✓ Conforme</div></span>
            </div>
            <div className="comp-art-row">
              <span className="comp-art-num">Art. 5</span>
              <span>Pratiche vietate</span>
              <span>Nessuno dei sistemi AI di Actify implementa pratiche vietate (manipolazione, scoring sociale, biometria vietata, ecc.)</span>
              <span><div className="comp-status comp-status-ok">✓ Conforme</div></span>
            </div>
            <div className="comp-art-row">
              <span className="comp-art-num">Art. 6 + Annex III</span>
              <span>Classificazione alto rischio</span>
              <span>Applicabile solo ai provider di sistemi alto rischio Annex III — Actify è deployer di sistemi non-AR</span>
              <span><div className="comp-status comp-status-na">N/A</div></span>
            </div>
            <div className="comp-art-row">
              <span className="comp-art-num">Art. 8–15</span>
              <span>Requisiti tecnici sistemi AR</span>
              <span>Solo per provider di sistemi ad alto rischio — non applicabile ad Actify</span>
              <span><div className="comp-status comp-status-na">N/A</div></span>
            </div>
            <div className="comp-art-row">
              <span className="comp-art-num">Art. 16–25</span>
              <span>Obblighi provider sistemi AR</span>
              <span>Solo per provider di sistemi ad alto rischio — non applicabile ad Actify</span>
              <span><div className="comp-status comp-status-na">N/A</div></span>
            </div>
            <div className="comp-art-row">
              <span className="comp-art-num">Art. 26</span>
              <span>Obblighi deployer sistemi AR</span>
              <span>Limitato: Actify usa sistemi non-AR. Osserviamo comunque le istruzioni d'uso dei provider (Anthropic, AWS).</span>
              <span><div className="comp-status comp-status-ok">✓ Conforme</div></span>
            </div>
            <div className="comp-art-row">
              <span className="comp-art-num">Art. 29</span>
              <span>Obblighi deployer — uso conforme</span>
              <span>Actify usa i sistemi AI in conformità alle istruzioni d'uso dei provider e mantiene supervisione umana su tutti gli output</span>
              <span><div className="comp-status comp-status-ok">✓ Conforme</div></span>
            </div>
            <div className="comp-art-row">
              <span className="comp-art-num">Art. 49</span>
              <span>Registrazione EU AI Database</span>
              <span>Richiesta solo per provider/deployer di sistemi AR e GPAI con rischio sistemico — non applicabile</span>
              <span><div className="comp-status comp-status-na">N/A — vedi sotto</div></span>
            </div>
            <div className="comp-art-row">
              <span className="comp-art-num">Art. 50</span>
              <span>Obblighi di trasparenza</span>
              <span>Actify informa i clienti che il report di compliance è generato da un sistema AI. Output chiaramente identificati come AI-generated.</span>
              <span><div className="comp-status comp-status-ok">✓ Conforme</div></span>
            </div>
            <div className="comp-art-row">
              <span className="comp-art-num">Art. 51–56</span>
              <span>Obblighi modelli GPAI</span>
              <span>Applicabile ai provider di modelli GPAI (Anthropic, Amazon). Actify è deployer — obblighi a carico dei provider.</span>
              <span><div className="comp-status comp-status-na">N/A (provider)</div></span>
            </div>
            <div className="comp-art-row">
              <span className="comp-art-num">Art. 99–101</span>
              <span>Sanzioni</span>
              <span>Actify è conforme agli articoli applicabili — nessuna violazione rilevata. SME: riduzione Art. 100 applicabile.</span>
              <span><div className="comp-status comp-status-ok">✓ Nessuna violazione</div></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── EU AI Database ── */}
      <section className="comp-section comp-section-alt">
        <div className="comp-section-inner">
          <div className="comp-section-head">
            <div className="comp-label">EU AI Database (Art. 49)</div>
            <h2>Perché non siamo registrati nel database EU AI</h2>
          </div>
          <div className="comp-box">
            <div className="comp-box-icon">⚖</div>
            <div className="comp-box-body">
              <p>L'art. 49 del Reg. UE 2024/1689 impone la registrazione nell'EU AI Database nei seguenti casi:</p>
              <div className="comp-reg-cases">
                <div className="comp-reg-case comp-reg-no">
                  <span className="comp-reg-label">✗ Non ci riguarda</span>
                  <strong>Art. 49(1) — Provider di sistemi AI ad alto rischio</strong>
                  <p>Actify non è un provider di sistemi AI. Non sviluppiamo né commercializziamo modelli AI. Siamo deployer di sistemi terzi (Anthropic, AWS).</p>
                </div>
                <div className="comp-reg-case comp-reg-no">
                  <span className="comp-reg-label">✗ Non ci riguarda</span>
                  <strong>Art. 49(2) — Deployer di sistemi AR in contesti pubblici</strong>
                  <p>I sistemi AI che utilizziamo non sono classificati ad alto rischio (Annex III). Inoltre, operiamo in ambito privato B2B, non come autorità pubblica.</p>
                </div>
                <div className="comp-reg-case comp-reg-no">
                  <span className="comp-reg-label">✗ Non ci riguarda</span>
                  <strong>Art. 49(3) — Provider di modelli GPAI con rischio sistemico</strong>
                  <p>Actify non è provider di modelli GPAI. I modelli che utilizziamo (Nova Pro, Claude) sono di Anthropic e Amazon, che gestiscono i propri obblighi GPAI.</p>
                </div>
              </div>
              <div className="comp-reg-conclusion">
                <strong>Conclusione:</strong> Actify non ha obbligo di registrazione nell'EU AI Database ai sensi dell'art. 49 del Reg. UE 2024/1689. Questa valutazione sarà rivalutata ad ogni modifica significativa dei sistemi AI utilizzati o al raggiungimento di soglie che richiedano classificazione diversa.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Documents ── */}
      <section className="comp-section">
        <div className="comp-section-inner">
          <div className="comp-section-head">
            <div className="comp-label">Documenti ufficiali</div>
            <h2>Documentazione di conformità disponibile</h2>
            <p>Tutti i documenti possono essere scaricati o visualizzati. Sono aggiornati alla data indicata.</p>
          </div>

          <div className="comp-doc-grid">
            <a href="/compliance/dichiarazione" className="comp-doc-card">
              <div className="comp-doc-icon">📋</div>
              <div className="comp-doc-info">
                <div className="comp-doc-title">Dichiarazione di Conformità AI Act</div>
                <div className="comp-doc-desc">Dichiarazione formale di conformità al Reg. UE 2024/1689 con classificazione di rischio, articoli applicabili e misure adottate.</div>
                <div className="comp-doc-meta">Aggiornato: maggio 2026 · v1.0</div>
              </div>
              <div className="comp-doc-arrow">→</div>
            </a>

            <a href="/compliance/registro-ai" className="comp-doc-card">
              <div className="comp-doc-icon">🗂</div>
              <div className="comp-doc-info">
                <div className="comp-doc-title">Registro dei Sistemi AI</div>
                <div className="comp-doc-desc">Inventario completo di tutti i sistemi AI utilizzati da Actify, con scopo, provider, classificazione e misure di governance.</div>
                <div className="comp-doc-meta">Aggiornato: maggio 2026 · v1.0</div>
              </div>
              <div className="comp-doc-arrow">→</div>
            </a>

            <a href="/compliance/trasparenza" className="comp-doc-card">
              <div className="comp-doc-icon">👁</div>
              <div className="comp-doc-info">
                <div className="comp-doc-title">Informativa sull'Uso dell'AI (Art. 50)</div>
                <div className="comp-doc-desc">Informativa ai sensi dell'art. 50 AI Act: come e quando Actify utilizza AI nella generazione dei report di compliance.</div>
                <div className="comp-doc-meta">Aggiornato: maggio 2026 · v1.0</div>
              </div>
              <div className="comp-doc-arrow">→</div>
            </a>

            <a href="/compliance/disclaimer" className="comp-doc-card">
              <div className="comp-doc-icon">⚖</div>
              <div className="comp-doc-info">
                <div className="comp-doc-title">Disclaimer Utilizzo AI</div>
                <div className="comp-doc-desc">Limiti di responsabilità, natura advisory dell'analisi AI, obbligo di supervisione umana e non sostituzione di parere legale.</div>
                <div className="comp-doc-meta">Aggiornato: maggio 2026 · v1.0</div>
              </div>
              <div className="comp-doc-arrow">→</div>
            </a>
          </div>
        </div>
      </section>

      {/* ── Badge for clients ── */}
      <section className="comp-section comp-section-badge">
        <div className="comp-section-inner">
          <div className="comp-badge-cta-wrap">
            <div className="comp-badge-cta-left">
              <div dangerouslySetInnerHTML={{ __html: badgeSvg(100) }} />
            </div>
            <div className="comp-badge-cta-right">
              <div className="comp-label">Badge "Actify Verified Compliant"</div>
              <h2>Anche la tua azienda può ottenerlo</h2>
              <p>
                Il badge <strong>Actify Verified Compliant</strong> certifica che un'organizzazione ha censito e verificato tutti i propri sistemi AI con Actify, raggiungendo uno stato di conformità verificata con il Reg. UE 2024/1689.
              </p>
              <p>
                Quando tutti i tuoi sistemi AI nella dashboard Actify risultano <strong>Conformi</strong>, il badge viene sbloccato automaticamente e puoi esporlo sul tuo sito, nelle comunicazioni ai clienti e negli audit interni come prova documentata della tua compliance AI.
              </p>
              <div className="comp-badge-how">
                <div className="comp-bh-step"><div className="comp-bh-n">1</div><span>Registra tutti i tuoi sistemi AI nell'inventario Actify</span></div>
                <div className="comp-bh-step"><div className="comp-bh-n">2</div><span>Esegui il compliance check su ogni sistema</span></div>
                <div className="comp-bh-step"><div className="comp-bh-n">3</div><span>Risolvi i gap identificati con la roadmap personalizzata</span></div>
                <div className="comp-bh-step"><div className="comp-bh-n">4</div><span>Raggiungi lo stato "Conforme" su tutti i sistemi → badge sbloccato</span></div>
              </div>
              <a href="/register" className="comp-cta-btn">Inizia ora — è gratuito</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="comp-footer">
        <div className="comp-footer-inner">
          <div dangerouslySetInnerHTML={{ __html: markSvg(22) }} />
          <span>Actify — AI Act Compliance Platform</span>
          <span className="comp-footer-sep">·</span>
          <a href="/compliance/dichiarazione">Dichiarazione</a>
          <a href="/compliance/registro-ai">Registro AI</a>
          <a href="/compliance/trasparenza">Trasparenza</a>
          <a href="/compliance/disclaimer">Disclaimer</a>
          <span className="comp-footer-sep">·</span>
          <span className="comp-muted">Reg. UE 2024/1689 · Ultimo aggiornamento: maggio 2026</span>
        </div>
      </footer>
    </div>
  );
}
