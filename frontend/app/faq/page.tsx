import type { Metadata } from 'next';
import { markSvg } from '@/lib/branding';

export const metadata: Metadata = {
  title: 'FAQ — Domande Frequenti su AI Act e Actify',
  description: "Risposte alle domande più comuni su chi controlla l'AI Act in Italia, quando scattano le sanzioni, cosa verificano le autorità e perché non basta ChatGPT per valutare la compliance.",
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'FAQ — Domande Frequenti su AI Act e Actify',
    description: "Chi controlla l'AI Act in Italia? Quando arrivano le ispezioni? Cosa devo avere pronto? Risposte dirette alle domande che ci fanno sempre.",
    url: 'https://official-actify.com/faq',
  },
};

function FaqItem({
  num, question, children,
}: {
  num: string;
  question: string;
  children: React.ReactNode;
}) {
  return (
    <details className="faq-acc-item">
      <summary className="faq-acc-q">
        <span className="faq-acc-q-num">{num}</span>
        <span className="faq-acc-q-text">{question}</span>
        <span className="faq-acc-icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4.5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </summary>
      <div className="faq-acc-body-wrap">
        <div className="faq-acc-body">
          {children}
        </div>
      </div>
    </details>
  );
}

export default function FaqPage() {
  const mark = markSvg(28);
  return (
    <div className="doc-page">
      <nav className="doc-page-nav">
        <a href="/" className="doc-back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Home
        </a>
        <span className="doc-crumb">FAQ</span>
        <span dangerouslySetInnerHTML={{ __html: mark }} />
      </nav>

      <div className="doc-body" style={{ maxWidth: '760px' }}>
        <div className="doc-header">
          <div className="doc-tag">Domande frequenti</div>
          <h1 className="doc-title">FAQ &mdash; AI Act e Actify</h1>
          <p className="doc-meta">
            Le domande che ci fanno sempre &mdash; con le risposte vere, non quelle di circostanza.
            Aggiornate con l&rsquo;entrata in vigore del Reg. UE 2024/1689.
          </p>
        </div>

        <div className="faq-acc-list">

          {/* ── Q 01 ─────────────────────────────────────────────── */}
          <FaqItem num="Q 01" question="Chi controlla la compliance all'AI Act in Italia e quando?">

            <div className="faq-lead">
              <p>
                Domanda legittima. La risposta breve: <strong>non domani, ma prima di quanto pensi</strong> &mdash;
                e quando succede, trovi la documentazione o paghi.
              </p>
            </div>

            <div className="doc-section">
              <h2>Chi controlla</h2>
              <p>
                Ogni stato membro deve designare una <strong>National Competent Authority (NCA)</strong>. In Italia
                l&rsquo;autorit&agrave; competente designata &egrave; l&rsquo;<strong>ACN &mdash; Agenzia per la
                Cybersicurezza Nazionale</strong>, che svolge il ruolo di supervisore nazionale per il Reg. UE 2024/1689.
                A livello europeo c&rsquo;&egrave; l&rsquo;<strong>EU AI Office</strong>, che gestisce i casi
                cross-border e i modelli AI pi&ugrave; grandi.
              </p>
              <div className="faq-auth-grid">
                <div className="faq-auth-card">
                  <div className="faq-auth-flag">&#127470;&#127481;</div>
                  <div className="faq-auth-body">
                    <div className="faq-auth-name">ACN Italia</div>
                    <div className="faq-auth-status faq-auth-status-ok">Designata</div>
                    <p>Agenzia per la Cybersicurezza Nazionale &mdash; NCA italiana per il Reg. UE 2024/1689. Controllo su tutti i sistemi AI operativi nel territorio italiano.</p>
                  </div>
                </div>
                <div className="faq-auth-card">
                  <div className="faq-auth-flag">&#127466;&#127482;</div>
                  <div className="faq-auth-body">
                    <div className="faq-auth-name">EU AI Office</div>
                    <div className="faq-auth-status faq-auth-status-ok">Operativo</div>
                    <p>Casi cross-border, modelli GPAI con rischio sistemico, coordinamento tra NCA nazionali.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-section">
              <h2>Cosa fa scattare un controllo</h2>
              <p>Non aspettarti un&rsquo;ispezione a freddo. I controlli partono da <strong>quattro trigger concreti</strong>:</p>
              <div className="faq-triggers">
                <div className="faq-trigger">
                  <div className="faq-trigger-n">1</div>
                  <div className="faq-trigger-body">
                    <strong>Un incidente documentato</strong>
                    <p>Un candidato discriminato da un algoritmo di selezione, un credito negato ingiustamente, una decisione medica errata. Chi subisce il danno fa un reclamo, l&rsquo;autorit&agrave; apre un&rsquo;istruttoria e ti chiede la documentazione.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">2</div>
                  <div className="faq-trigger-body">
                    <strong>Un reclamo di terzi</strong>
                    <p>Un dipendente, un concorrente, un&rsquo;associazione di consumatori. Non lo controlli tu, e basta una segnalazione formale per far partire un&rsquo;ispezione.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">3</div>
                  <div className="faq-trigger-body">
                    <strong>Un sweep settoriale</strong>
                    <p>Le autorit&agrave; faranno campagne tematiche su settori ad alto rischio, esattamente come ha fatto il Garante Privacy dopo il GDPR. <strong>HR, fintech, healthcare</strong> saranno i primi.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">4</div>
                  <div className="faq-trigger-body">
                    <strong>Una verifica del database EU</strong>
                    <p>Per i sistemi ad alto rischio la registrazione &egrave; obbligatoria. L&rsquo;autorit&agrave; pu&ograve; verificarla in autonomia, senza bisogno di incidenti.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-section">
              <h2>Quando</h2>
              <p>Guarda cosa &egrave; successo con il GDPR: entrato in vigore nel 2018, prime sanzioni pesanti nel 2019&ndash;2020, enforcement sistematico dal 2022. L&rsquo;AI Act seguir&agrave; lo stesso schema.</p>
              <table className="doc-table">
                <thead>
                  <tr><th>Periodo</th><th>Cosa aspettarsi</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{whiteSpace:'nowrap',fontWeight:700,color:'var(--text)'}}>2025&ndash;2026</td>
                    <td>Le autorit&agrave; si organizzano. Prime linee guida, nessuna sanzione pesante.</td>
                  </tr>
                  <tr>
                    <td style={{whiteSpace:'nowrap',fontWeight:700,color:'var(--orange)'}}>2026&ndash;2027</td>
                    <td>Primi incidenti &rarr; prime istruttorie &rarr; prime sanzioni sui casi pi&ugrave; evidenti.</td>
                  </tr>
                  <tr>
                    <td style={{whiteSpace:'nowrap',fontWeight:700,color:'var(--red)'}}>2027&ndash;2028</td>
                    <td>Enforcement sistematico. Sweep settoriali. Sanzioni routinarie.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="doc-section" style={{marginBottom:0}}>
              <h2>La cosa che fa davvero la differenza</h2>
              <div className="faq-highlight-box">
                <p>
                  Non &egrave; avere un sistema perfettamente conforme &mdash; &egrave; avere la
                  <strong> documentazione che dimostra che ci hai provato</strong>. Davanti all&rsquo;autorit&agrave;,
                  la <strong>buona fede documentata</strong> &egrave; la difesa legale pi&ugrave; forte che esiste.
                  Riduce drasticamente la sanzione, spesso la trasforma in un warning. Chi non ha nulla da mostrare non ha questa opzione.
                </p>
              </div>
              <div className="faq-cta-row">
                <a href="/register" className="comp-cta-btn">Fai il tuo primo check &rarr;</a>
                <a href="/compliance" style={{fontSize:'13px',color:'var(--muted)',textDecoration:'none'}}>Vedi come lo facciamo noi su noi stessi</a>
              </div>
            </div>

          </FaqItem>

          {/* ── Q 02 ─────────────────────────────────────────────── */}
          <FaqItem num="Q 02" question="Sì ma tanto da me non ci vengono mai a controllare.">

            <div className="faq-lead">
              <p>
                Probabilmente hai ragione. Il Garante non busser&agrave; alla tua porta domani mattina.
                Il problema &egrave; che <strong>il Garante &egrave; l&rsquo;ultimo anello della catena</strong>.
                Prima di lui arrivano quattro cose che non controlli tu.
              </p>
            </div>

            <div className="doc-section">
              <h2>Le quattro cose che arrivano prima del Garante</h2>
              <div className="faq-triggers">
                <div className="faq-trigger">
                  <div className="faq-trigger-n">1</div>
                  <div className="faq-trigger-body">
                    <strong>Un dipendente o un candidato scontento</strong>
                    <p>Chi viene scartato da un algoritmo di selezione, o monitorato da un sistema AI sul lavoro, pu&ograve; fare un esposto con un click. Non serve un&rsquo;ispezione proattiva &mdash; basta una segnalazione.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">2</div>
                  <div className="faq-trigger-body">
                    <strong>I tuoi clienti enterprise</strong>
                    <p>Le grandi aziende stanno gi&agrave; inserendo clausole di AI compliance nei contratti con i fornitori. Se vendi a una banca, a una compagnia assicurativa, a un gruppo industriale &mdash; tra 12&ndash;18 mesi ti arriver&agrave; un questionario sulla tua AI governance. Chi non risponde perde il contratto.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">3</div>
                  <div className="faq-trigger-body">
                    <strong>La tua banca e la tua assicurazione</strong>
                    <p>Le assicurazioni cyber e le banche stanno iniziando a valutare il rischio AI dei clienti nei processi di underwriting e credito. Nessuna documentazione significa rischio pi&ugrave; alto &mdash; premio assicurativo pi&ugrave; alto, o credito pi&ugrave; difficile.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">4</div>
                  <div className="faq-trigger-body">
                    <strong>Un incidente interno</strong>
                    <p>Un sistema AI che prende una decisione sbagliata su un cliente o un dipendente. Non serve il Garante: basta una causa civile o la notizia che esce. In quel momento non avere documentazione &egrave; la cosa peggiore che ti possa capitare.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-section">
              <div className="faq-highlight-box">
                <p>Actify non ti vende protezione dal Garante. Ti vende <strong>protezione da tutto il resto</strong>.</p>
              </div>
            </div>

            <div className="doc-section" style={{marginBottom:0}}>
              <h2>Una nota sul GDPR</h2>
              <p>Nel 2018 le PMI dicevano esattamente la stessa cosa. <em>&ldquo;Tanto da me non ci vengono.&rdquo;</em> Poi sono arrivate le prime sanzioni &mdash; non per violazioni gravi, ma perch&eacute; qualcuno aveva fatto un esposto o un cliente enterprise aveva chiesto la documentazione e non c&rsquo;era.</p>
              <p>L&rsquo;AI Act seguir&agrave; lo stesso schema. Con il GDPR le PMI hanno avuto anni per adeguarsi prima dell&rsquo;enforcement serio. Con l&rsquo;AI Act <strong>quella finestra si sta chiudendo adesso</strong>.</p>
              <div className="faq-cta-row">
                <a href="/register" className="comp-cta-btn">Fai il tuo primo check &rarr;</a>
              </div>
            </div>

          </FaqItem>

          {/* ── Q 03 ─────────────────────────────────────────────── */}
          <FaqItem num="Q 03" question="Non posso chiedere a ChatGPT se sono conforme all'AI Act?">

            <div className="faq-lead">
              <p>
                Prova adesso: apri ChatGPT e scrivi <em>&ldquo;sono conforme all&rsquo;AI Act?&rdquo;</em>
              </p>
              <p>
                Non sa nulla di te. Non sa quali sistemi AI usi, come li usi, chi li usa in azienda, se sei
                fornitore o deployer, quali categorie di rischio li riguardano. Ti risponder&agrave; con
                informazioni generiche sull&rsquo;AI Act &mdash; le stesse che trovi su Google.
              </p>
            </div>

            <div className="doc-section">
              <h2>Il problema non &egrave; la risposta. &Egrave; la domanda.</h2>
              <p>Per ottenere una valutazione seria devi sapere esattamente cosa chiedere: distinguere tra <strong>provider e deployer</strong>, identificare correttamente la <strong>categoria di rischio</strong> del tuo sistema, capire se sei escluso dall&rsquo;ambito applicativo, quali obblighi scattano e quando. Questa &egrave; competenza specialistica, non prompting.</p>
            </div>

            <div className="doc-section">
              <h2>Actify fa una cosa diversa</h2>
              <div className="faq-triggers">
                <div className="faq-trigger">
                  <div className="faq-trigger-n">1</div>
                  <div className="faq-trigger-body">
                    <strong>Ti guida con un form strutturato e preciso</strong>
                    <p>Discrimina ogni sistema AI che usi &mdash; non &ldquo;usi AI s&igrave;/no&rdquo;, ma quale, come, per cosa, su chi. Il risultato &egrave; un profilo d&rsquo;uso reale, non una risposta generica.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">2</div>
                  <div className="faq-trigger-body">
                    <strong>Fa il matching preciso tra te e l&rsquo;AI Act</strong>
                    <p>Mappa il tuo profilo d&rsquo;uso sugli obblighi specifici del Regolamento, incluse le <strong>sanzioni applicabili</strong> &mdash; fino al 3&ndash;7% del fatturato globale &mdash; per ogni gap trovato.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">3</div>
                  <div className="faq-trigger-body">
                    <strong>Non si ferma alla diagnosi: genera i documenti</strong>
                    <p>Produce automaticamente i documenti mancanti: registri, valutazioni di conformit&agrave;, politiche d&rsquo;uso, informative di trasparenza. Quello che un consulente ti fattura a giorni/uomo, Actify lo genera in secondi.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">4</div>
                  <div className="faq-trigger-body">
                    <strong>Mantiene aggiornato il tuo AI Inventory</strong>
                    <p>Un asset che ti serve non solo per il Garante &mdash; ma per audit interni, questionari da clienti enterprise, banche, assicurazioni, e ogni futuro aggiornamento normativo.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-section" style={{marginBottom:0}}>
              <div className="faq-highlight-box">
                <p><strong>ChatGPT ti spiega l&rsquo;AI Act.</strong><br/>Actify ti dice se e come ti riguarda, la tua esposizione in termini di sanzioni e cosa pu&ograve; automatizzare &mdash; <strong>e tutto ci&ograve; che pu&ograve; automatizzare, lo automatizza</strong>.</p>
              </div>
              <div className="faq-cta-row">
                <a href="/register" className="comp-cta-btn">Provalo gratuitamente &rarr;</a>
              </div>
            </div>

          </FaqItem>

          {/* ── Q 04 ─────────────────────────────────────────────── */}
          <FaqItem num="Q 04" question="Quali sistemi AI rientrano nell'AI Act? Il mio è coinvolto?">

            <div className="faq-lead">
              <p>
                La domanda giusta. L&rsquo;AI Act non parla di &ldquo;intelligenza artificiale&rdquo; in senso
                generico: definisce un perimetro preciso. Molte aziende che pensano di non essere coinvolte
                lo sono &mdash; e viceversa.
              </p>
            </div>

            <div className="doc-section">
              <h2>La definizione tecnica del Regolamento</h2>
              <p>
                L&rsquo;AI Act si applica a qualsiasi <strong>sistema basato su machine learning, logica e metodi statistici</strong>
                che genera output &mdash; predizioni, decisioni, raccomandazioni, contenuti &mdash; in grado di influenzare
                ambienti reali o virtuali. Non serve che il sistema sia &ldquo;intelligente&rdquo; nel senso comune del termine.
              </p>
            </div>

            <div className="doc-section">
              <h2>Esempi concreti di sistemi che rientrano nel perimetro</h2>
              <div className="faq-triggers">
                <div className="faq-trigger">
                  <div className="faq-trigger-n" style={{background:'rgba(239,68,68,.15)',color:'#f87171',borderColor:'rgba(239,68,68,.2)'}}>!</div>
                  <div className="faq-trigger-body">
                    <strong>HR &amp; Recruiting</strong>
                    <p>Tool di screening CV, scoring dei candidati, sistemi di valutazione delle performance, rilevamento presenze con analisi comportamentale. <strong>Categoria: alto rischio.</strong> Obblighi pesanti.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n" style={{background:'rgba(239,68,68,.15)',color:'#f87171',borderColor:'rgba(239,68,68,.2)'}}>!</div>
                  <div className="faq-trigger-body">
                    <strong>Credito &amp; Finanza</strong>
                    <p>Scoring creditizio, valutazione del rischio assicurativo, rilevamento frodi basato su ML, raccomandazioni di investimento automatizzate. <strong>Categoria: alto rischio.</strong></p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n" style={{background:'rgba(251,191,36,.12)',color:'#fbbf24',borderColor:'rgba(251,191,36,.2)'}}>~</div>
                  <div className="faq-trigger-body">
                    <strong>Chatbot &amp; Customer Service AI</strong>
                    <p>Assistenti virtuali che interagiscono con clienti. Se non dichiarano di essere AI rischiano violazioni di trasparenza (Art. 50). Categoria: rischio limitato &mdash; obblighi di disclosure.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n" style={{background:'rgba(251,191,36,.12)',color:'#fbbf24',borderColor:'rgba(251,191,36,.2)'}}>~</div>
                  <div className="faq-trigger-body">
                    <strong>Marketing &amp; Personalizzazione</strong>
                    <p>Sistemi che profilano utenti per personalizzare offerte o contenuti. A seconda delle categorie di dati usate e dell&rsquo;impatto sulle decisioni, possono rientrare in categorie di rischio significativo.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-section" style={{marginBottom:0}}>
              <h2>Cosa fare adesso</h2>
              <div className="faq-highlight-box">
                <p>
                  Non puoi sapere se sei coinvolto finch&eacute; non mappi cosa usi e come lo usi.
                  Il primo passo &egrave; un <strong>AI Inventory</strong>: censire ogni sistema AI dell&rsquo;azienda,
                  classificarlo per ruolo (provider/deployer) e livello di rischio. Actify lo fa guidandoti
                  passo dopo passo, in meno di un&rsquo;ora per la prima mappatura.
                </p>
              </div>
              <div className="faq-cta-row">
                <a href="/register" className="comp-cta-btn">Inizia il tuo AI Inventory &rarr;</a>
              </div>
            </div>

          </FaqItem>

          {/* ── Q 05 ─────────────────────────────────────────────── */}
          <FaqItem num="Q 05" question="Cosa significa essere 'Provider' o 'Deployer'? Cambia qualcosa per me?">

            <div className="faq-lead">
              <p>
                S&igrave;, cambia moltissimo. &Egrave; una delle distinzioni pi&ugrave; importanti dell&rsquo;AI Act
                &mdash; e quella che genera pi&ugrave; confusione nelle aziende.
              </p>
            </div>

            <div className="doc-section">
              <h2>La differenza in una frase</h2>
              <table className="doc-table">
                <thead>
                  <tr><th>Ruolo</th><th>Chi sei</th><th>Esempio</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{fontWeight:700,color:'#818CF8'}}>Provider</td>
                    <td>Sviluppi e commercializzi il sistema AI</td>
                    <td>Costruisci un tool di screening CV che vendi alle HR</td>
                  </tr>
                  <tr>
                    <td style={{fontWeight:700,color:'#34d399'}}>Deployer</td>
                    <td>Usi un sistema AI sviluppato da altri nel tuo contesto operativo</td>
                    <td>Usi ChatGPT, un CRM con AI, un tool di scoring acquistato</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="doc-section">
              <h2>Perch&eacute; cambia</h2>
              <div className="faq-triggers">
                <div className="faq-trigger">
                  <div className="faq-trigger-n">P</div>
                  <div className="faq-trigger-body">
                    <strong>Obblighi del Provider (i pi&ugrave; pesanti)</strong>
                    <p>Documentazione tecnica completa del sistema, gestione dei rischi, registrazione nel database EU per sistemi ad alto rischio, marcatura CE, supervisione post-mercato, notifica incidenti all&rsquo;autorit&agrave;. Se sei Provider di un sistema ad alto rischio, hai gli obblighi pi&ugrave; onerosi del Regolamento.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">D</div>
                  <div className="faq-trigger-body">
                    <strong>Obblighi del Deployer (pi&ugrave; limitati, ma non zero)</strong>
                    <p>Supervisione umana, uso conforme alle istruzioni del provider, formazione del personale (Art. 4 &mdash; AI Literacy), non modificare il sistema in modi non previsti, comunicare incidenti al provider. Meno documentazione tecnica, ma responsabilit&agrave; operative concrete.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-section" style={{marginBottom:0}}>
              <h2>Il caso pi&ugrave; comune nelle PMI</h2>
              <p>
                La maggior parte delle PMI italiane sono <strong>Deployer</strong>: usano tool AI di terzi
                (OpenAI, Google, Salesforce AI, strumenti HR, chatbot acquistati). Non hanno l&rsquo;onere
                della documentazione tecnica del sistema, ma hanno l&rsquo;obbligo di formare il personale,
                garantire supervisione umana e documentare l&rsquo;uso conforme.
              </p>
              <div className="faq-highlight-box">
                <p>
                  Actify classifica automaticamente ogni sistema censito come Provider o Deployer
                  e mostra gli obblighi specifici per ciascun ruolo. Non devi interpretare
                  tu il Regolamento: il sistema lo fa per te, articolo per articolo.
                </p>
              </div>
              <div className="faq-cta-row">
                <a href="/register" className="comp-cta-btn">Scopri il tuo ruolo &rarr;</a>
              </div>
            </div>

          </FaqItem>

          {/* ── Q 06 ─────────────────────────────────────────────── */}
          <FaqItem num="Q 06" question="Quanto costano davvero le sanzioni? Sono rischi reali per una PMI?">

            <div className="faq-lead">
              <p>
                Le cifre nel Regolamento fanno effetto, ma la domanda giusta non &egrave; &ldquo;quanto &egrave; il massimo?&rdquo;
                &mdash; &egrave; <strong>&ldquo;qual &egrave; la mia esposizione realistica?&rdquo;</strong>
              </p>
            </div>

            <div className="doc-section">
              <h2>Le sanzioni previste dal Reg. UE 2024/1689</h2>
              <table className="doc-table">
                <thead>
                  <tr><th>Violazione</th><th>Sanzione massima</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Sistemi AI vietati (Art. 5) &mdash; es. social scoring, manipolazione subliminale</td>
                    <td style={{fontWeight:700,color:'#f87171'}}>35 M€ o 7% fatturato globale</td>
                  </tr>
                  <tr>
                    <td>Obblighi per sistemi ad alto rischio non rispettati</td>
                    <td style={{fontWeight:700,color:'#fb923c'}}>15 M€ o 3% fatturato globale</td>
                  </tr>
                  <tr>
                    <td>Informazioni false o incomplete all&rsquo;autorit&agrave;</td>
                    <td style={{fontWeight:700,color:'#fbbf24'}}>7,5 M€ o 1% fatturato globale</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="doc-section">
              <h2>La realt&agrave; per una PMI</h2>
              <p>
                Le sanzioni massime riguardano le grandi violazioni sistemiche. Per una PMI che usa AI di terzi in modo
                non documentato, i rischi concreti sono diversi:
              </p>
              <div className="faq-triggers">
                <div className="faq-trigger">
                  <div className="faq-trigger-n" style={{fontSize:'13px'}}>€</div>
                  <div className="faq-trigger-body">
                    <strong>Warning + obbligo di adeguamento</strong>
                    <p>Il caso pi&ugrave; frequente per chi non ha documentazione ma non ha causato danni. Hai 30&ndash;60 giorni per metterti in regola. Se non lo fai, arriva la sanzione.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n" style={{fontSize:'13px',background:'rgba(251,146,60,.1)',color:'#fb923c',borderColor:'rgba(251,146,60,.2)'}}>€€</div>
                  <div className="faq-trigger-body">
                    <strong>Sanzione proporzionata al fatturato</strong>
                    <p>Per una PMI da 5 M€ di fatturato, il 3% significa 150.000€. Non &egrave; il massimo, ma &egrave; reale &mdash; specialmente se c&rsquo;&egrave; stato un incidente o un reclamo formale.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n" style={{fontSize:'13px',background:'rgba(239,68,68,.1)',color:'#f87171',borderColor:'rgba(239,68,68,.2)'}}>€€€</div>
                  <div className="faq-trigger-body">
                    <strong>Il costo reale: reputazione + clienti enterprise</strong>
                    <p>Pi&ugrave; della sanzione, il rischio concreto &egrave; perdere contratti con grandi clienti che richiedono documentazione AI governance, e il danno reputazionale da un incidente pubblico.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-section" style={{marginBottom:0}}>
              <div className="faq-highlight-box">
                <p>
                  La <strong>Fine Estimation Board</strong> di Actify calcola la tua esposizione sanzionatoria reale
                  articolo per articolo, basandosi sul tuo profilo aziendale e sui sistemi AI censiti.
                  Non sono numeri astratti: sono cifre specifiche per la tua situazione.
                </p>
              </div>
              <div className="faq-cta-row">
                <a href="/register" className="comp-cta-btn">Calcola la tua esposizione &rarr;</a>
              </div>
            </div>

          </FaqItem>

          {/* ── Q 07 ─────────────────────────────────────────────── */}
          <FaqItem num="Q 07" question="Actify sostituisce un avvocato o un consulente specializzato in AI Act?">

            <div className="faq-lead">
              <p>
                No &mdash; e saremmo disonesti a dirlo. Actify &egrave; uno strumento operativo, non un servizio
                di consulenza legale. La distinzione &egrave; importante, ed &egrave; giusto chiarirla.
              </p>
            </div>

            <div className="doc-section">
              <h2>Cosa fa Actify (e cosa non fa)</h2>
              <table className="doc-table">
                <thead>
                  <tr><th>Actify fa</th><th>Actify non fa</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Censisce e classifica i tuoi sistemi AI per livello di rischio</td>
                    <td>Fornire pareri legali vincolanti su casi specifici</td>
                  </tr>
                  <tr>
                    <td>Mappa i gap rispetto agli obblighi dell&rsquo;AI Act</td>
                    <td>Rappresentarti davanti all&rsquo;autorit&agrave; in caso di istruttoria</td>
                  </tr>
                  <tr>
                    <td>Genera automaticamente i documenti di compliance</td>
                    <td>Interpretare il Regolamento in casi legalmente ambigui</td>
                  </tr>
                  <tr>
                    <td>Calcola l&rsquo;esposizione sanzionatoria estimata</td>
                    <td>Sostituire la due diligence legale in operazioni M&amp;A</td>
                  </tr>
                  <tr>
                    <td>Traccia la formazione del personale (Art. 4)</td>
                    <td>Garantire l&rsquo;esito di un procedimento sanzionatorio</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="doc-section">
              <h2>Come si usano insieme</h2>
              <p>
                Il modello pi&ugrave; efficace che vediamo nelle aziende che si stanno attrezzando seriamente:
              </p>
              <div className="faq-triggers">
                <div className="faq-trigger">
                  <div className="faq-trigger-n">1</div>
                  <div className="faq-trigger-body">
                    <strong>Actify fa il lavoro operativo</strong>
                    <p>Inventory, classificazione, gap analysis, generazione documenti, monitoraggio continuo. Tutto ci&ograve; che &egrave; sistematico e ripetibile. Questo &egrave; il 90% del lavoro.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">2</div>
                  <div className="faq-trigger-body">
                    <strong>Il consulente interviene sui casi critici</strong>
                    <p>Sistemi ad alto rischio con ambiguit&agrave; classificatorie, contratti con clienti enterprise che richiedono garanzie legali, situazioni al confine con pratiche vietate. Il consulente lavora su casi specifici ad alto valore, non sul lavoro di base.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-section" style={{marginBottom:0}}>
              <div className="faq-highlight-box">
                <p>
                  Usare Actify <strong>riduce il costo della consulenza legale</strong>, non la elimina.
                  Arrivare dal consulente con un inventory gi&agrave; fatto, i gap identificati e i
                  documenti generati significa pagare ore di analisi strategica, non ore di data collection.
                </p>
              </div>
              <div className="faq-cta-row">
                <a href="/register" className="comp-cta-btn">Inizia l&rsquo;inventory &rarr;</a>
                <a href="/contattaci" style={{fontSize:'13px',color:'var(--muted)',textDecoration:'none'}}>Hai domande specifiche? Scrivici</a>
              </div>
            </div>

          </FaqItem>

          {/* ── Q 08 ─────────────────────────────────────────────── */}
          <FaqItem num="Q 08" question="Ho letto che l'AI Act è stato rinviato al 2027: posso aspettare?">

            <div className="faq-lead">
              <p>
                No. Questa &egrave; la cosa pi&ugrave; pericolosa che circola in questo momento.
                Il rinvio <strong>esiste</strong>, ma riguarda una parte specifica degli obblighi &mdash;
                non il Regolamento nel suo complesso.
              </p>
            </div>

            <div className="doc-section">
              <h2>Cosa prevede il &ldquo;Digital Omnibus&rdquo;</h2>
              <p>
                Il pacchetto <strong>Digital Omnibus</strong>, concordato a maggio 2026 e in via di adozione formale,
                sposta <strong>solo</strong> gli obblighi pi&ugrave; pesanti sui sistemi ad alto rischio:
              </p>
              <table className="doc-table">
                <thead>
                  <tr><th>Cosa</th><th>Nuova scadenza</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Obblighi per sistemi AI autonomi ad alto rischio (Allegato III)</td>
                    <td style={{fontWeight:700,color:'var(--orange)'}}>2 dicembre 2027</td>
                  </tr>
                  <tr>
                    <td>Obblighi per AI integrata in prodotti regolati (Allegato I &mdash; es. dispositivi medici, automotive)</td>
                    <td style={{fontWeight:700,color:'var(--orange)'}}>2 agosto 2028</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="doc-section">
              <h2>Cosa NON &egrave; stato rinviato</h2>
              <div className="faq-triggers">
                <div className="faq-trigger">
                  <div className="faq-trigger-n" style={{background:'rgba(239,68,68,.15)',color:'#f87171',borderColor:'rgba(239,68,68,.2)'}}>!</div>
                  <div className="faq-trigger-body">
                    <strong>Art. 5 &mdash; Pratiche AI vietate</strong>
                    <p>In vigore dal <strong>2 febbraio 2025</strong>. Social scoring, manipolazione subliminale, riconoscimento biometrico in tempo reale in spazi pubblici. Due nuovi divieti entrano in vigore il <strong>2 dicembre 2026</strong>.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n" style={{background:'rgba(239,68,68,.15)',color:'#f87171',borderColor:'rgba(239,68,68,.2)'}}>!</div>
                  <div className="faq-trigger-body">
                    <strong>Art. 4 &mdash; AI Literacy (formazione del personale)</strong>
                    <p>In vigore dal <strong>2 agosto 2026</strong>. Ogni azienda che usa AI deve garantire che il personale abbia una competenza adeguata. Obbligo attivo tra poche settimane, non nel 2027.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n" style={{background:'rgba(239,68,68,.15)',color:'#f87171',borderColor:'rgba(239,68,68,.2)'}}>!</div>
                  <div className="faq-trigger-body">
                    <strong>Art. 50 &mdash; Obblighi di trasparenza</strong>
                    <p>In vigore dal <strong>2 agosto 2026</strong>. Dichiarare che un chatbot &egrave; un&rsquo;AI, etichettare i contenuti generati artificialmente (immagini, video, audio). Se hai un assistente virtuale sul sito, questo obbligo ti riguarda gi&agrave;.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-section" style={{marginBottom:0}}>
              <div className="faq-highlight-box">
                <p>
                  Per una PMI che usa AI di terzi, <strong>gli obblighi che ti riguardano non sono stati rinviati</strong>.
                  Il rinvio al 2027&ndash;2028 riguarda chi sviluppa sistemi ad alto rischio.
                  Chi usa ChatGPT, tool HR, CRM con AI, chatbot &mdash; ha scadenze attive nel 2026.
                </p>
              </div>
              <div className="faq-cta-row">
                <a href="/register" className="comp-cta-btn">Verifica le tue scadenze &rarr;</a>
              </div>
            </div>

          </FaqItem>

          {/* ── Q 09 ─────────────────────────────────────────────── */}
          <FaqItem num="Q 09" question="Actify è una garanzia contro le sanzioni?">

            <div className="faq-lead">
              <p>
                No &mdash; e diffida di chi te lo promette. Actify non &egrave; uno studio legale
                e non pu&ograve; garantire l&rsquo;esito di un procedimento sanzionatorio.
                Ma pu&ograve; cambiare radicalmente la tua posizione se dovesse succedere qualcosa.
              </p>
            </div>

            <div className="doc-section">
              <h2>Cosa fa concretamente Actify per la tua difesa</h2>
              <div className="faq-triggers">
                <div className="faq-trigger">
                  <div className="faq-trigger-n">1</div>
                  <div className="faq-trigger-body">
                    <strong>Costruisce il tuo fascicolo documentale</strong>
                    <p>Inventario dei sistemi AI, classificazioni motivate articolo per articolo, evidenze di formazione del personale, log degli aggiornamenti. Davanti all&rsquo;autorit&agrave;, questo &egrave; la prova tangibile della buona fede.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">2</div>
                  <div className="faq-trigger-body">
                    <strong>Ti prepara le evidenze da esibire</strong>
                    <p>Attestati di compliance, dichiarazioni di trasparenza, piano di gestione dei rischi, report Art. 4 sulla literacy del personale. Documenti formali, strutturati, pronti per essere consegnati all&rsquo;autorit&agrave; o a un cliente enterprise.</p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">3</div>
                  <div className="faq-trigger-body">
                    <strong>Monitora i gap aperti e ti avvisa</strong>
                    <p>La compliance non &egrave; un evento una tantum &mdash; &egrave; uno stato continuativo. Actify tiene traccia di cosa hai chiuso e cosa resta aperto, cos&igrave; non ti fai trovare impreparato.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-section" style={{marginBottom:0}}>
              <h2>Quando serve un legale</h2>
              <p>
                Ci sono situazioni in cui Actify da solo non basta e un professionista qualificato &egrave; necessario:
                sistemi ad alto rischio con classificazioni ambigue, procedimenti sanzionatori gi&agrave; aperti,
                contratti enterprise che richiedono garanzie legali, operazioni di M&amp;A con due diligence AI.
                In questi casi lo diciamo esplicitamente &mdash; non promettiamo ci&ograve; che non possiamo dare.
              </p>
              <div className="faq-highlight-box">
                <p>
                  La differenza tra chi subisce una sanzione pesante e chi riceve un warning spesso
                  non &egrave; la gravit&agrave; della violazione &mdash; &egrave; <strong>quanto hai da
                  mostrare</strong>. Actify si assicura che tu abbia sempre qualcosa da mettere sul tavolo.
                </p>
              </div>
              <div className="faq-cta-row">
                <a href="/register" className="comp-cta-btn">Inizia a costruire il tuo fascicolo &rarr;</a>
                <a href="/contattaci" style={{fontSize:'13px',color:'var(--muted)',textDecoration:'none'}}>Hai un caso specifico? Scrivici</a>
              </div>
            </div>

          </FaqItem>

        </div>{/* /faq-acc-list */}

        <div className="faq-more-note">
          Hai altre domande? <a href="/contattaci">Scrivici a info@official-actify.com</a> &mdash; rispondiamo a tutti entro 24 ore lavorative.
        </div>
      </div>
    </div>
  );
}
