import type { Metadata } from 'next';
import { markSvg } from '@/lib/branding';

export const metadata: Metadata = {
  title: 'Registro Sistemi AI di Actify — Art. 6 Reg. UE 2024/1689',
  description: "Registro pubblico dei sistemi AI usati da Actify, con classificazione del rischio ai sensi dell'Art. 6 e Allegato III del Reg. UE 2024/1689. Claude Code (Rischio Minimo), Amazon Nova Pro (Rischio Limitato).",
  alternates: { canonical: '/compliance/registro-ai' },
  openGraph: {
    title: 'Registro Sistemi AI di Actify — Classificazione pubblica per livello di rischio',
    description: "Tutti i sistemi AI usati da Actify, con classificazione Art. 6 AI Act, articoli applicabili e score di conformità.",
    url: 'https://official-actify.com/compliance/registro-ai',
  },
};

export default function RegistroAIPage() {
  return (
    <div className="doc-page">
      <nav className="doc-page-nav">
        <a href="/compliance" className="doc-back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          AI Act Compliance
        </a>
        <span className="doc-crumb">Registro dei Sistemi AI</span>
        <span dangerouslySetInnerHTML={{ __html: markSvg(28) }} />
      </nav>

      <div className="doc-body">
        <div className="doc-header">
          <div className="doc-tag">Inventario ufficiale · v1.0 · maggio 2026</div>
          <h1 className="doc-title">Registro dei Sistemi AI</h1>
          <p className="doc-meta">
            <strong>Reg. UE 2024/1689 (AI Act)</strong> — Inventario completo dei sistemi AI utilizzati da Actify<br />
            Organizzazione: <strong>Actify</strong> (piattaforma SaaS AI Act compliance)<br />
            Data di emissione: <strong>maggio 2026</strong> — Versione: <strong>1.0</strong><br />
            Ruolo organizzativo: <strong>Deployer</strong> (art. 3§4) — non provider di modelli AI
          </p>
        </div>

        <div className="doc-section">
          <h2>Introduzione e scopo del registro</h2>
          <p>
            Il presente registro è redatto in conformità alle buone pratiche raccomandate per i deployer di sistemi
            AI ai sensi del Reg. UE 2024/1689. Pur non essendo obbligatorio per deployer di sistemi non ad alto rischio,
            Actify mantiene questo inventario come parte del proprio programma di governance AI e come strumento di
            trasparenza verso clienti e stakeholder.
          </p>
          <p>
            Il registro documenta tutti i sistemi AI attualmente in uso da parte di Actify, con le relative
            informazioni di classificazione, governance e misure di controllo. Viene aggiornato ad ogni
            modifica significativa dei sistemi adottati.
          </p>
        </div>

        <div className="doc-section">
          <h2>Sistema AI #1 — Claude Code</h2>
          <table className="doc-table">
            <tbody>
              <tr><td style={{width:'200px'}}><strong>Nome sistema</strong></td><td>Claude Code</td></tr>
              <tr><td><strong>Provider</strong></td><td>Anthropic PBC (San Francisco, CA, USA)</td></tr>
              <tr><td><strong>Versione / Modello</strong></td><td>claude-sonnet-4-6 (e versioni successive nella stessa famiglia)</td></tr>
              <tr><td><strong>Accesso</strong></td><td>CLI tool (Claude Code CLI) tramite subscription Anthropic</td></tr>
              <tr><td><strong>Data prima adozione</strong></td><td>2025</td></tr>
              <tr><td><strong>Scopo e use case</strong></td><td>Assistenza nella generazione e revisione di codice infrastruttura (Infrastructure as Code — IaC): Terraform, CloudFormation, script di deploy AWS. Uso esclusivamente interno al team di sviluppo Actify.</td></tr>
              <tr><td><strong>Utenti del sistema</strong></td><td>Solo ingegneri del team tecnico interno Actify. Nessun accesso da parte di clienti o utenti finali.</td></tr>
              <tr><td><strong>Input del sistema</strong></td><td>Prompt testuali con descrizione di requisiti infrastrutturali, frammenti di codice, domande tecniche</td></tr>
              <tr><td><strong>Output del sistema</strong></td><td>Codice sorgente (HCL, YAML, JSON, TypeScript, Python), spiegazioni tecniche testuali, suggerimenti di architettura</td></tr>
              <tr><td><strong>Decisioni automatizzate</strong></td><td>No — tutto il codice generato viene revisionato da un ingegnere senior prima di qualsiasi utilizzo. Nessun deploy automatico di codice AI-generated.</td></tr>
              <tr><td><strong>Dati personali elaborati</strong></td><td>Nessuno. I prompt non contengono dati personali di clienti o utenti finali. Solo informazioni tecniche sull&rsquo;infrastruttura.</td></tr>
              <tr><td><strong>Classificazione rischio AI Act</strong></td><td><span className="doc-status-ok">Rischio Minimo</span></td></tr>
              <tr><td><strong>Categoria Annex III</strong></td><td>Nessuna — strumento di sviluppo software interno</td></tr>
              <tr><td><strong>Ruolo Actify</strong></td><td>Deployer (art. 3§4) — Anthropic è il provider del modello</td></tr>
              <tr><td><strong>Articoli applicabili</strong></td><td>Art. 4 (AI literacy) · Art. 26 (obblighi deployer) · Art. 29 (uso conforme)</td></tr>
              <tr><td><strong>Misure di governance</strong></td><td>
                <ul style={{paddingLeft:'16px',marginTop:'4px',display:'flex',flexDirection:'column',gap:'4px'}}>
                  <li>Revisione obbligatoria del codice generato da ingegnere senior</li>
                  <li>Utilizzo conforme all&rsquo;Anthropic Usage Policy</li>
                  <li>Nessun uso per scopi diversi dallo sviluppo interno</li>
                  <li>Formazione interna sull&rsquo;uso responsabile degli strumenti AI</li>
                </ul>
              </td></tr>
              <tr><td><strong>Ultima revisione voce</strong></td><td>Maggio 2026</td></tr>
            </tbody>
          </table>
        </div>

        <div className="doc-section">
          <h2>Sistema AI #2 — Amazon Nova Pro (via Amazon Bedrock)</h2>
          <table className="doc-table">
            <tbody>
              <tr><td style={{width:'200px'}}><strong>Nome sistema</strong></td><td>Amazon Nova Pro</td></tr>
              <tr><td><strong>Provider</strong></td><td>Amazon Web Services Inc. (modello GPAI sviluppato da Amazon)</td></tr>
              <tr><td><strong>Versione / Modello ID</strong></td><td>eu.amazon.nova-pro-v1:0 (regione eu-central-1, Frankfurt)</td></tr>
              <tr><td><strong>Accesso</strong></td><td>Amazon Bedrock API (InvokeModel) tramite AWS SDK v3 con chiamata asincrona (self-invoke Lambda pattern)</td></tr>
              <tr><td><strong>Data prima adozione</strong></td><td>2025</td></tr>
              <tr><td><strong>Scopo e use case</strong></td><td>
                Analisi della conformità AI Act per i sistemi AI registrati dai clienti nella piattaforma Actify.
                Il sistema riceve in input la descrizione di un sistema AI (nome, categoria, use case, utenti, dati elaborati, ecc.)
                e genera una gap analysis strutturata che identifica i requisiti AI Act applicabili, lo stato di conformità
                e le azioni correttive raccomandate.
              </td></tr>
              <tr><td><strong>Utenti del sistema</strong></td><td>Clienti aziendali B2B di Actify (operatori economici che usano la piattaforma SaaS per monitorare la propria compliance AI)</td></tr>
              <tr><td><strong>Input del sistema</strong></td><td>
                Dati inseriti dal cliente relativi al proprio sistema AI: nome, descrizione tecnica, categoria di rischio dichiarata,
                use case, tipologia di utenti, dati elaborati, ruolo (provider/deployer). Nessun dato personale di persone fisiche identificabili.
              </td></tr>
              <tr><td><strong>Output del sistema</strong></td><td>
                Report strutturato JSON/testo con: classificazione di rischio AI Act, lista dei gap di conformità per articolo,
                score di compliance, azioni correttive raccomandate con priorità e timeline, stima della sanzione potenziale (Art. 99).
                L&rsquo;output è sempre di natura advisory.
              </td></tr>
              <tr><td><strong>Decisioni automatizzate</strong></td><td>
                No — il report generato è esclusivamente advisory. Il cliente riceve un&rsquo;analisi ma ogni decisione operativa,
                legale o organizzativa è di sua responsabilità. Supervisione umana sempre presente nel processo.
              </td></tr>
              <tr><td><strong>Dati personali elaborati</strong></td><td>
                Nessun dato personale di persone fisiche identificabili. Il modello elabora solo descrizioni tecniche di sistemi AI
                aziendali inserite dal cliente. I dati sono trattati in conformità alla Privacy Policy di Actify e alla DPA con AWS.
              </td></tr>
              <tr><td><strong>Classificazione rischio AI Act</strong></td><td><span className="doc-status-ok">Rischio Limitato</span></td></tr>
              <tr><td><strong>Categoria Annex III</strong></td><td>Nessuna — analisi di compliance B2B non rientra nelle 8 categorie ad alto rischio</td></tr>
              <tr><td><strong>Ruolo Actify</strong></td><td>Deployer (art. 3§4) — Amazon AWS è il provider del modello GPAI Nova Pro</td></tr>
              <tr><td><strong>Articoli applicabili</strong></td><td>Art. 4 · Art. 26 · Art. 29 · Art. 50 (trasparenza output AI verso clienti)</td></tr>
              <tr><td><strong>Misure di governance</strong></td><td>
                <ul style={{paddingLeft:'16px',marginTop:'4px',display:'flex',flexDirection:'column',gap:'4px'}}>
                  <li>Disclaimer AI visibile nell&rsquo;interfaccia prima della visualizzazione del report</li>
                  <li>Informativa Art. 50 accessibile a tutti gli utenti della piattaforma</li>
                  <li>Output sempre marcato come &ldquo;Analisi generata da sistema AI — carattere advisory&rdquo;</li>
                  <li>Nessun fine-tuning su dati dei clienti</li>
                  <li>Dati elaborati in AWS eu-central-1 (Frankfurt) — conformità GDPR</li>
                  <li>DPA (Data Processing Agreement) con AWS in vigore</li>
                  <li>Utilizzo conforme agli AWS Service Terms e all&rsquo;Amazon AI Use Policy</li>
                  <li>Monitoraggio in CloudWatch delle chiamate API con logging degli errori</li>
                </ul>
              </td></tr>
              <tr><td><strong>Ultima revisione voce</strong></td><td>Maggio 2026</td></tr>
            </tbody>
          </table>
        </div>

        <div className="doc-section">
          <h2>Sistemi AI in valutazione o dismessi</h2>
          <div className="doc-warn">
            <p>
              <strong>Nessun sistema AI dismesso o in valutazione</strong> alla data di emissione del presente registro.
              Eventuali nuovi sistemi AI in fase di valutazione saranno aggiunti a questo registro prima dell&rsquo;adozione
              formale, con classificazione preliminare del rischio.
            </p>
          </div>
        </div>

        <div className="doc-section">
          <h2>Processi di governance del registro</h2>
          <h3>Responsabilità</h3>
          <p>
            Il presente registro è di responsabilità del team di compliance di Actify. Qualsiasi modifica ai sistemi
            AI (adozione di nuovi sistemi, dismissione, cambio di modello, cambio di provider, cambio di use case)
            deve essere comunicata al responsabile compliance per l&rsquo;aggiornamento del registro.
          </p>
          <h3>Frequenza di aggiornamento</h3>
          <ul>
            <li><strong>Revisione annuale</strong> obbligatoria entro il 31 dicembre di ogni anno</li>
            <li><strong>Aggiornamento immediato</strong> ad ogni modifica significativa dei sistemi in uso</li>
            <li><strong>Revisione straordinaria</strong> in caso di incidenti o notifiche dalle autorità competenti</li>
          </ul>
          <h3>Criteri per &ldquo;modifica significativa&rdquo;</h3>
          <ul>
            <li>Adozione di un nuovo sistema AI non precedentemente registrato</li>
            <li>Cambio di provider o modello base per un sistema esistente</li>
            <li>Estensione dell&rsquo;uso a nuove categorie di utenti o dati</li>
            <li>Cambio del ruolo di Actify (da deployer a provider, o viceversa)</li>
            <li>Classificazione diversa assegnata da autorità competente</li>
          </ul>
        </div>

        <div className="doc-sig">
          <strong>Registro emesso da Actify</strong>
          Piattaforma SaaS AI Act Compliance — actify.io<br />
          Data: maggio 2026 — Versione documento: 1.0<br />
          <br />
          Documenti correlati:{' '}
          <a href="/compliance/dichiarazione" style={{color:'var(--green)'}}>Dichiarazione di Conformità</a>
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
