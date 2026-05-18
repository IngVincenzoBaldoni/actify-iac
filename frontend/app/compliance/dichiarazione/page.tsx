import { markSvg } from '@/lib/branding';

export default function DichiarazionePage() {
  return (
    <div className="doc-page">
      <nav className="doc-page-nav">
        <a href="/compliance" className="doc-back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          AI Act Compliance
        </a>
        <span className="doc-crumb">Dichiarazione di Conformità</span>
        <span dangerouslySetInnerHTML={{ __html: markSvg(28) }} />
      </nav>

      <div className="doc-body">
        <div className="doc-header">
          <div className="doc-tag">Documento ufficiale · v1.0 · maggio 2026</div>
          <h1 className="doc-title">Dichiarazione di Conformità AI Act</h1>
          <p className="doc-meta">
            <strong>Regolamento UE 2024/1689</strong> (AI Act) &mdash; Dichiarazione formale ai sensi del Capo VI<br />
            Soggetto dichiarante: <strong>Actify</strong> (piattaforma SaaS AI Act compliance)<br />
            Data di emissione: <strong>maggio 2026</strong> &mdash; Versione: <strong>1.0</strong><br />
            Revisione programmata: <strong>annuale o al verificarsi di modifiche significative ai sistemi AI</strong>
          </p>
        </div>

        <div className="doc-section">
          <h2>1. Identificazione del Soggetto</h2>
          <p>
            La presente dichiarazione è emessa da <strong>Actify</strong>, piattaforma SaaS dedicata alla conformità
            con il Regolamento UE 2024/1689 (AI Act). Actify opera in qualità di <strong>deployer</strong> di sistemi AI
            sviluppati da terze parti (Anthropic PBC e Amazon Web Services), ai sensi dell'art. 3(4) del Reg. UE 2024/1689.
          </p>
          <p>
            Actify <strong>non è un provider</strong> di sistemi AI ai sensi dell'art. 3(3): non sviluppa, non addestra
            e non commercializza modelli o sistemi AI propri. Utilizza API e servizi AI di terze parti come strumenti
            interni e come motore di analisi della propria piattaforma SaaS.
          </p>
        </div>

        <div className="doc-section">
          <h2>2. Sistemi AI utilizzati</h2>
          <p>Actify utilizza i seguenti sistemi AI alla data di emissione della presente dichiarazione:</p>

          <table className="doc-table">
            <thead>
              <tr>
                <th>Sistema AI</th>
                <th>Provider</th>
                <th>Scopo</th>
                <th>Utenti</th>
                <th>Ruolo Actify</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Claude Code</strong><br /><span style={{fontSize:'11px',color:'var(--muted)'}}>Anthropic PBC</span></td>
                <td>Anthropic PBC</td>
                <td>Generazione assistita di codice infrastruttura (IaC) — uso esclusivamente interno</td>
                <td>Solo team tecnico Actify</td>
                <td>Deployer</td>
              </tr>
              <tr>
                <td><strong>Amazon Nova Pro</strong><br /><span style={{fontSize:'11px',color:'var(--muted)'}}>Amazon Bedrock</span></td>
                <td>Amazon Web Services</td>
                <td>Analisi AI Act e generazione report di compliance gap analysis per i clienti della piattaforma</td>
                <td>Clienti aziendali Actify (B2B)</td>
                <td>Deployer</td>
              </tr>
            </tbody>
          </table>

          <p>
            Entrambi i sistemi sono modelli GPAI (General Purpose AI) classificati dai rispettivi provider.
            Actify non modifica i modelli né li ri-addestra. L&rsquo;uso avviene tramite API con i prompt
            definiti da Actify nel rispetto delle condizioni d&rsquo;uso dei provider.
          </p>
        </div>

        <div className="doc-section">
          <h2>3. Classificazione del rischio</h2>
          <p>
            La classificazione del rischio dei sistemi AI utilizzati da Actify è determinata ai sensi degli
            artt. 5, 6 e dell&rsquo;Allegato III del Reg. UE 2024/1689.
          </p>

          <table className="doc-table">
            <thead>
              <tr>
                <th>Sistema AI</th>
                <th>Classificazione</th>
                <th>Annex III</th>
                <th>Motivazione</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Claude Code</td>
                <td><span className="doc-status-ok">Rischio Minimo</span></td>
                <td>Nessuna categoria</td>
                <td>Strumento di sviluppo software interno. Non interagisce con persone fisiche esterne. Non prende decisioni automatizzate che impattano diritti o opportunità di terzi.</td>
              </tr>
              <tr>
                <td>Amazon Nova Pro (Bedrock)</td>
                <td><span className="doc-status-ok">Rischio Limitato</span></td>
                <td>Nessuna categoria</td>
                <td>Genera analisi di compliance AI Act a carattere advisory. Non rientra in nessuna delle 8 categorie dell&rsquo;Annex III. Art. 50 si applica per gli obblighi di trasparenza verso gli utenti dei report.</td>
              </tr>
              <tr>
                <td>Piattaforma Actify</td>
                <td><span className="doc-status-ok">Rischio Limitato</span></td>
                <td>Nessuna categoria</td>
                <td>Servizio SaaS B2B. Tutti gli output sono advisory con supervisione umana obbligatoria. Non impatta persone fisiche in modo diretto né prende decisioni automatizzate con effetti giuridici.</td>
              </tr>
            </tbody>
          </table>

          <div className="doc-highlight">
            <p>
              <strong>Nota:</strong> Le 8 categorie ad alto rischio dell&rsquo;Annex III riguardano: biometria e
              categorizzazione di persone fisiche, infrastrutture critiche, istruzione e formazione professionale,
              occupazione e gestione lavoratori, accesso a servizi privati e pubblici essenziali, applicazione della legge,
              migrazione e controllo frontiere, amministrazione della giustizia. <strong>Nessuno dei sistemi AI di
              Actify rientra in alcuna di queste categorie.</strong>
            </p>
          </div>
        </div>

        <div className="doc-section">
          <h2>4. Articoli del Reg. UE 2024/1689 applicabili</h2>

          <table className="doc-table">
            <thead>
              <tr>
                <th>Articolo</th>
                <th>Contenuto</th>
                <th>Applicabilità</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Art. 4</strong></td>
                <td>Alfabetizzazione AI (AI literacy)</td>
                <td>Tutto il personale che usa sistemi AI deve possedere adeguata alfabetizzazione AI</td>
                <td><span className="doc-status-ok">Conforme</span></td>
              </tr>
              <tr>
                <td><strong>Art. 5</strong></td>
                <td>Pratiche AI vietate</td>
                <td>Nessun sistema AI di Actify implementa manipolazione subliminale, social scoring, identificazione biometrica remota in tempo reale in spazi pubblici o altre pratiche vietate</td>
                <td><span className="doc-status-ok">Conforme</span></td>
              </tr>
              <tr>
                <td><strong>Art. 6 + Annex III</strong></td>
                <td>Classificazione sistemi AR</td>
                <td>Non applicabile — Actify è deployer di sistemi non ad alto rischio</td>
                <td><span className="doc-status-na">N/A</span></td>
              </tr>
              <tr>
                <td><strong>Art. 8–15</strong></td>
                <td>Requisiti tecnici sistemi AR</td>
                <td>Solo per provider di sistemi ad alto rischio</td>
                <td><span className="doc-status-na">N/A</span></td>
              </tr>
              <tr>
                <td><strong>Art. 16–25</strong></td>
                <td>Obblighi provider sistemi AR</td>
                <td>Solo per provider di sistemi ad alto rischio</td>
                <td><span className="doc-status-na">N/A</span></td>
              </tr>
              <tr>
                <td><strong>Art. 26</strong></td>
                <td>Obblighi deployer sistemi AR</td>
                <td>Parzialmente applicabile: pur non usando sistemi AR, Actify rispetta le istruzioni d&rsquo;uso dei provider</td>
                <td><span className="doc-status-ok">Conforme</span></td>
              </tr>
              <tr>
                <td><strong>Art. 29</strong></td>
                <td>Obblighi deployer — uso conforme</td>
                <td>Actify utilizza i sistemi AI conformemente alle istruzioni d&rsquo;uso e alle condizioni dei provider (Anthropic TOS, AWS Service Terms)</td>
                <td><span className="doc-status-ok">Conforme</span></td>
              </tr>
              <tr>
                <td><strong>Art. 49</strong></td>
                <td>Registrazione EU AI Database</td>
                <td>Non applicabile — Actify non è provider né deployer di sistemi AR; non è provider GPAI con rischio sistemico</td>
                <td><span className="doc-status-na">N/A</span></td>
              </tr>
              <tr>
                <td><strong>Art. 50</strong></td>
                <td>Obblighi trasparenza</td>
                <td>I clienti Actify sono informati che i report di compliance sono generati da un sistema AI. Gli output sono chiaramente marcati come AI-generated.</td>
                <td><span className="doc-status-ok">Conforme</span></td>
              </tr>
              <tr>
                <td><strong>Art. 51–56</strong></td>
                <td>Obblighi modelli GPAI</td>
                <td>A carico dei provider dei modelli (Anthropic, Amazon). Actify è deployer.</td>
                <td><span className="doc-status-na">N/A (carico provider)</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="doc-section">
          <h2>5. Misure di conformità adottate</h2>
          <h3>5.1 AI Literacy (Art. 4)</h3>
          <ul>
            <li>Formazione interna su AI Act e sue implicazioni per l&rsquo;uso di sistemi AI</li>
            <li>Documentazione interna sull&rsquo;uso corretto di Claude Code e Amazon Bedrock</li>
            <li>Review obbligatoria da parte di ingegneri umani di tutto il codice generato da AI prima del deploy</li>
          </ul>

          <h3>5.2 Uso conforme (Art. 26, 29)</h3>
          <ul>
            <li>Utilizzo di Claude Code esclusivamente per scopi di sviluppo interno, in conformità all&rsquo;Anthropic Usage Policy</li>
            <li>Utilizzo di Amazon Nova Pro tramite AWS Bedrock conformemente agli AWS Service Terms e alle AI Use Policies di Amazon</li>
            <li>Nessun utilizzo dei sistemi AI per scopi diversi da quelli dichiarati</li>
            <li>Nessun fine-tuning o addestramento dei modelli su dati di clienti</li>
          </ul>

          <h3>5.3 Trasparenza (Art. 50)</h3>
          <ul>
            <li>I report di compliance generati dalla piattaforma Actify contengono indicazione esplicita che l&rsquo;analisi è prodotta da un sistema AI</li>
            <li>Il disclaimer AI è visibile prima e durante la fruizione del servizio</li>
            <li>Informativa Art. 50 pubblicata e accessibile a tutti gli utenti</li>
          </ul>
        </div>

        <div className="doc-section">
          <h2>6. Supervisione umana</h2>
          <div className="doc-highlight">
            <p>
              <strong>Actify garantisce supervisione umana su tutti gli output dei sistemi AI.</strong> I report di
              compliance generati da Amazon Nova Pro sono sempre di natura advisory: il cliente riceve un&rsquo;analisi
              e una gap analysis, ma ogni decisione operativa, legale o organizzativa derivante dall&rsquo;analisi
              è di esclusiva responsabilità del cliente, assistito se necessario da professionisti qualificati.
              I report non sostituiscono in alcun caso la consulenza legale.
            </p>
          </div>
          <p>
            Internamente, tutto il codice infrastruttura generato da Claude Code è soggetto a revisione tecnica
            obbligatoria da parte di un ingegnere senior prima di qualsiasi deploy in ambienti di produzione.
            Non esistono pipeline di deployment automatico basate su codice AI non revisionato.
          </p>
        </div>

        <div className="doc-section">
          <h2>7. Registrazione EU AI Database</h2>
          <p>
            Actify non è obbligata alla registrazione nell&rsquo;EU AI Database ai sensi dell&rsquo;art. 49 del
            Reg. UE 2024/1689 per le seguenti ragioni:
          </p>
          <ul>
            <li><strong>Art. 49(1):</strong> Actify non è provider di sistemi AI ad alto rischio — non sviluppa né commercializza sistemi AI propri</li>
            <li><strong>Art. 49(2):</strong> Actify non usa sistemi AI classificati ad alto rischio (Annex III) né opera come autorità pubblica</li>
            <li><strong>Art. 49(3):</strong> Actify non è provider di modelli GPAI con rischio sistemico</li>
          </ul>
          <p>
            Questa valutazione verrà aggiornata qualora Actify dovesse sviluppare sistemi AI propri, adottare
            sistemi AI ad alto rischio, o raggiungere soglie rilevanti per la classificazione GPAI.
          </p>
        </div>

        <div className="doc-section">
          <h2>8. Impegno di aggiornamento</h2>
          <p>
            La presente dichiarazione sarà rivista:
          </p>
          <ul>
            <li>Almeno una volta all&rsquo;anno (revisione annuale programmata)</li>
            <li>Al verificarsi di modifiche significative ai sistemi AI utilizzati (nuovo modello, nuovo fornitore, nuovo use case)</li>
            <li>A seguito di aggiornamenti normativi rilevanti al Reg. UE 2024/1689 o alle linee guida delle autorità competenti</li>
            <li>In caso di incidenti o segnalazioni che richiedano rivalutazione della classificazione di rischio</li>
          </ul>
        </div>

        <div className="doc-sig">
          <strong>Dichiarazione emessa da Actify</strong>
          Piattaforma SaaS AI Act Compliance &mdash; actify.io<br />
          Data: maggio 2026 &mdash; Versione documento: 1.0<br />
          <br />
          Documenti correlati:{' '}
          <a href="/compliance/registro-ai" style={{color:'var(--green)'}}>Registro dei Sistemi AI</a>
          {' · '}
          <a href="/compliance/trasparenza" style={{color:'var(--green)'}}>Informativa Art. 50</a>
          {' · '}
          <a href="/compliance/disclaimer" style={{color:'var(--green)'}}>Disclaimer AI</a>
          {' · '}
          <a href="/compliance" style={{color:'var(--green)'}}>AI Compliance Hub</a>
        </div>
      </div>
    </div>
  );
}
