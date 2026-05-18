import { markSvg } from '@/lib/branding';

export default function TrasparenzaPage() {
  return (
    <div className="doc-page">
      <nav className="doc-page-nav">
        <a href="/compliance" className="doc-back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          AI Act Compliance
        </a>
        <span className="doc-crumb">Informativa sull&rsquo;Uso dell&rsquo;AI</span>
        <span dangerouslySetInnerHTML={{ __html: markSvg(28) }} />
      </nav>

      <div className="doc-body">
        <div className="doc-header">
          <div className="doc-tag">Art. 50 Reg. UE 2024/1689 · v1.0 · maggio 2026</div>
          <h1 className="doc-title">Informativa sull&rsquo;Uso dell&rsquo;AI</h1>
          <p className="doc-meta">
            <strong>Ai sensi dell&rsquo;art. 50 del Reg. UE 2024/1689 (AI Act)</strong><br />
            Emessa da: <strong>Actify</strong> (piattaforma SaaS AI Act compliance)<br />
            Destinatari: tutti i clienti e utenti della piattaforma Actify<br />
            Data di emissione: <strong>maggio 2026</strong> — Versione: <strong>1.0</strong>
          </p>
        </div>

        <div className="doc-section">
          <h2>1. Perché questa informativa</h2>
          <p>
            L&rsquo;art. 50 del Reg. UE 2024/1689 (AI Act) impone agli operatori di sistemi AI di informare le
            persone fisiche quando interagiscono con un sistema AI o quando un contenuto o un&rsquo;analisi è stata
            generata da un sistema AI.
          </p>
          <p>
            Actify adempie a questo obbligo con la presente informativa, che spiega <strong>quando, come e perché</strong>
            utilizziamo sistemi AI nell&rsquo;erogazione del servizio, e quali diritti hai come utente.
          </p>
          <div className="doc-highlight">
            <p>
              <strong>In sintesi:</strong> I report di compliance AI Act generati dalla piattaforma Actify sono prodotti
              con il supporto di un sistema AI (Amazon Nova Pro tramite Amazon Bedrock). Actify è trasparente su questo
              e i report sono sempre chiaramente identificati come analisi generate da AI con carattere advisory.
            </p>
          </div>
        </div>

        <div className="doc-section">
          <h2>2. Quali sistemi AI usa Actify e per cosa</h2>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Sistema AI</th>
                <th>Quando viene usato</th>
                <th>Cosa genera</th>
                <th>Visibile all&rsquo;utente?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Amazon Nova Pro</strong><br />(Amazon Bedrock)</td>
                <td>Quando l&rsquo;utente esegue un &ldquo;compliance check&rdquo; su un sistema AI registrato nella dashboard</td>
                <td>Report di gap analysis AI Act: classificazione rischio, lista gap, score, azioni correttive, stima sanzione potenziale</td>
                <td>Sì — il risultato è il report che l&rsquo;utente visualizza nella dashboard</td>
              </tr>
              <tr>
                <td><strong>Claude Code</strong><br />(Anthropic)</td>
                <td>Solo internamente, durante lo sviluppo della piattaforma da parte del team tecnico Actify</td>
                <td>Codice infrastruttura (uso interno sviluppatori)</td>
                <td>No — uso esclusivamente interno, non visibile agli utenti del servizio</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="doc-section">
          <h2>3. Come funziona il compliance check AI</h2>
          <p>
            Quando esegui un compliance check su un sistema AI nella dashboard Actify, ecco cosa succede:
          </p>
          <ol>
            <li>I dati che hai inserito sul sistema AI (nome, categoria, use case, utenti, dati elaborati, ecc.) vengono inviati in forma strutturata al modello AI Amazon Nova Pro tramite Amazon Bedrock</li>
            <li>Il modello analizza le informazioni e genera una gap analysis rispetto ai requisiti del Reg. UE 2024/1689 applicabili al tuo sistema</li>
            <li>Il risultato viene strutturato, salvato nella piattaforma e visualizzato nel tuo report</li>
            <li>L&rsquo;intera operazione avviene in modo asincrono (tipicamente entro 30–90 secondi)</li>
          </ol>
          <p>
            L&rsquo;analisi prodotta dal sistema AI è di <strong>natura puramente advisory</strong>. Non costituisce
            un giudizio legalmente vincolante sulla conformità del tuo sistema AI. Il report è uno strumento di supporto
            decisionale che richiede sempre la valutazione critica da parte di una persona competente.
          </p>
        </div>

        <div className="doc-section">
          <h2>4. Quali dati vengono inviati al sistema AI</h2>
          <p>
            Quando esegui un compliance check, i seguenti dati vengono inviati ad Amazon Nova Pro (tramite Amazon Bedrock):
          </p>
          <ul>
            <li>Nome del sistema AI (come inserito da te)</li>
            <li>Descrizione del sistema AI (categoria, use case, funzionalità)</li>
            <li>Informazioni sull&rsquo;impatto: chi usa il sistema, quali decisioni supporta, su chi ha effetto</li>
            <li>Dati tecnici: tipologia di input/output, presenza di supervisione umana, dati elaborati</li>
            <li>Il tuo ruolo (provider, deployer o entrambi)</li>
          </ul>
          <div className="doc-warn">
            <p>
              <strong>Importante:</strong> Non inviare dati personali di persone fisiche identificabili (clienti,
              dipendenti, ecc.) nei campi di descrizione del sistema AI. I dati inviati al modello AI dovrebbero
              essere informazioni tecniche e organizzative, non dati personali di terzi.
            </p>
          </div>
          <p>
            I dati vengono elaborati da Amazon Web Services nella regione <strong>eu-central-1 (Frankfurt)</strong>,
            in conformità al GDPR e all&rsquo;accordo di trattamento dati (DPA) in vigore tra Actify e AWS.
            Amazon non utilizza i dati inviati tramite Bedrock API per addestrare i modelli AI (salvo consenso esplicito).
          </p>
        </div>

        <div className="doc-section">
          <h2>5. Come siamo trasparenti con te</h2>
          <p>Actify adempie agli obblighi di trasparenza dell&rsquo;art. 50 AI Act nei seguenti modi:</p>
          <ul>
            <li><strong>Etichettatura degli output:</strong> Ogni report di compliance generato dalla piattaforma è marcato come &ldquo;Analisi generata da sistema AI&rdquo;</li>
            <li><strong>Questa informativa:</strong> Accessibile pubblicamente prima di effettuare qualsiasi accesso al servizio</li>
            <li><strong>Disclaimer nell&rsquo;interfaccia:</strong> Avviso visibile nella dashboard prima di eseguire un compliance check</li>
            <li><strong>Natura advisory:</strong> I report indicano esplicitamente che l&rsquo;analisi non sostituisce la consulenza legale</li>
            <li><strong>Registro AI:</strong> Inventario completo dei sistemi AI in uso, pubblicamente accessibile</li>
          </ul>
        </div>

        <div className="doc-section">
          <h2>6. I tuoi diritti come utente</h2>
          <p>
            In relazione all&rsquo;uso di sistemi AI da parte di Actify, hai diritto a:
          </p>
          <ul>
            <li><strong>Essere informato:</strong> Hai sempre il diritto di sapere quando stai interagendo con output generati da un sistema AI (questo è il suo scopo)</li>
            <li><strong>Revisione umana:</strong> Puoi richiedere che un professionista umano (es. consulente legale specializzato in AI Act) riveda l&rsquo;analisi prodotta dal sistema AI prima di basare decisioni rilevanti su di essa</li>
            <li><strong>Non accettare le conclusioni:</strong> L&rsquo;analisi AI è advisory — sei libero di non concordare con le valutazioni e di farle rivedere</li>
            <li><strong>Esercitare i tuoi diritti GDPR:</strong> Per i dati personali trattati dalla piattaforma, vedi la Privacy Policy di Actify</li>
            <li><strong>Contattarci:</strong> Per domande sull&rsquo;uso dei sistemi AI o per segnalare problemi, contatta il nostro responsabile compliance</li>
          </ul>
        </div>

        <div className="doc-section">
          <h2>7. Limitazioni del sistema AI e supervisione umana</h2>
          <p>
            Il sistema AI Amazon Nova Pro, come tutti i modelli GPAI, ha limitazioni intrinseche che devi considerare:
          </p>
          <ul>
            <li>Può produrre analisi non aggiornate rispetto agli ultimi orientamenti delle autorità competenti (la normativa AI Act è in evoluzione)</li>
            <li>Può non cogliere sfumature specifiche del tuo contesto aziendale, settore o giurisdizione</li>
            <li>La stima delle sanzioni è puramente indicativa e non costituisce una valutazione legale vincolante</li>
            <li>L&rsquo;interpretazione degli articoli AI Act può differire da quella di un legale specializzato</li>
          </ul>
          <p>
            <strong>Actify raccomanda sempre</strong> di affiancare all&rsquo;analisi della piattaforma la revisione
            di un professionista legale qualificato, specialmente per sistemi AI ad alto rischio (Annex III) o
            per decisioni aziendali di rilevanza significativa.
          </p>
        </div>

        <div className="doc-section">
          <h2>8. Aggiornamenti a questa informativa</h2>
          <p>
            Questa informativa sarà aggiornata ogni volta che modificheremo significativamente l&rsquo;uso dei sistemi
            AI nella piattaforma. La data e versione in cima al documento indicano l&rsquo;ultima revisione.
            Ti notificheremo delle modifiche rilevanti attraverso l&rsquo;interfaccia della piattaforma.
          </p>
        </div>

        <div className="doc-section">
          <h2>9. Contatti</h2>
          <p>
            Per domande relative a questa informativa, all&rsquo;uso dei sistemi AI da parte di Actify,
            o per esercitare i tuoi diritti, contatta il team compliance di Actify tramite l&rsquo;interfaccia
            della piattaforma o all&rsquo;indirizzo indicato nella Privacy Policy.
          </p>
        </div>

        <div className="doc-sig">
          <strong>Informativa emessa da Actify</strong>
          Piattaforma SaaS AI Act Compliance — actify.io<br />
          Data: maggio 2026 — Versione documento: 1.0<br />
          <br />
          Documenti correlati:{' '}
          <a href="/compliance/dichiarazione" style={{color:'var(--green)'}}>Dichiarazione di Conformità</a>
          {' · '}
          <a href="/compliance/registro-ai" style={{color:'var(--green)'}}>Registro AI</a>
          {' · '}
          <a href="/compliance/disclaimer" style={{color:'var(--green)'}}>Disclaimer AI</a>
          {' · '}
          <a href="/compliance" style={{color:'var(--green)'}}>AI Compliance Hub</a>
        </div>
      </div>
    </div>
  );
}
