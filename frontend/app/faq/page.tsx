'use client';

import { useRef, useState } from 'react';
import { markSvg } from '@/lib/branding';

function FaqItem({
  num, question, children,
}: {
  num: string;
  question: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`faq-acc-item${open ? ' faq-acc-open' : ''}`}>
      <button className="faq-acc-q" onClick={() => setOpen(o => !o)}>
        <span className="faq-acc-q-num">{num}</span>
        <span className="faq-acc-q-text">{question}</span>
        <span className="faq-acc-icon">
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transition: 'transform .3s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <path d="M2 4.5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      <div
        className="faq-acc-body-wrap"
        style={{ maxHeight: open ? `${bodyRef.current?.scrollHeight ?? 9999}px` : '0' }}
      >
        <div className="faq-acc-body" ref={bodyRef}>
          {children}
        </div>
      </div>
    </div>
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
          <h1 className="doc-title">FAQ</h1>
          <p className="doc-meta">Le domande che ci fanno sempre &mdash; con le risposte vere, non quelle di circostanza.</p>
        </div>

        <div className="faq-acc-list">

          <FaqItem num="Q 01" question="Sì ma chi dovrebbe venirmi a controllare e quando?">

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
                non &egrave; ancora stato annunciato l&rsquo;organo definitivo &mdash; i candidati pi&ugrave;
                probabili sono <strong>AgID</strong> o un&rsquo;estensione del <strong>Garante Privacy</strong>.
                A livello europeo c&rsquo;&egrave; l&rsquo;<strong>EU AI Office</strong>, che gestisce i casi
                cross-border e i modelli AI pi&ugrave; grandi.
              </p>
              <div className="faq-auth-grid">
                <div className="faq-auth-card">
                  <div className="faq-auth-flag">&#127470;&#127481;</div>
                  <div className="faq-auth-body">
                    <div className="faq-auth-name">NCA Italia</div>
                    <div className="faq-auth-status">In definizione</div>
                    <p>AgID o Garante Privacy. Controllo su tutti i sistemi AI operativi nel territorio italiano.</p>
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
              <p>
                Non aspettarti un&rsquo;ispezione a freddo. I controlli partono da <strong>quattro trigger concreti</strong>:
              </p>
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
              <p>
                Guarda cosa &egrave; successo con il GDPR: entrato in vigore nel 2018, prime sanzioni pesanti
                nel 2019&ndash;2020, enforcement sistematico dal 2022. L&rsquo;AI Act seguir&agrave; lo stesso schema.
              </p>
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

            <div className="doc-section">
              <h2>Cosa controllano quando bussano</h2>
              <p>In ordine di priorit&agrave;:</p>
              <div className="faq-checklist">
                <div className="faq-check-item"><span className="faq-check-n">1</span><span>Documentazione tecnica del sistema AI</span></div>
                <div className="faq-check-item"><span className="faq-check-n">2</span><span>Piano di gestione dei rischi</span></div>
                <div className="faq-check-item"><span className="faq-check-n">3</span><span>Log conservati</span></div>
                <div className="faq-check-item"><span className="faq-check-n">4</span><span>Procedura di supervisione umana</span></div>
                <div className="faq-check-item"><span className="faq-check-n">5</span><span>Trasparenza verso gli utenti</span></div>
                <div className="faq-check-item"><span className="faq-check-n">6</span><span>Registrazione nel database EU (se applicabile)</span></div>
              </div>
              <p style={{marginTop:'16px'}}>
                Se hai tutto questo ricevi un warning e tempo per correggere.
                Se non hai niente, la sanzione &egrave; diretta.
              </p>
            </div>

            <div className="doc-section" style={{marginBottom:0}}>
              <h2>La cosa che fa davvero la differenza</h2>
              <div className="faq-highlight-box">
                <p>
                  Non &egrave; avere un sistema perfettamente conforme &mdash; &egrave; avere la
                  <strong> documentazione che dimostra che ci hai provato</strong>. Davanti all&rsquo;autorit&agrave;,
                  la <strong>buona fede documentata</strong> &egrave; la difesa legale pi&ugrave; forte che esiste.
                  Riduce drasticamente la sanzione, spesso la trasforma in un warning.
                  Chi non ha nulla da mostrare non ha questa opzione.
                </p>
              </div>
              <p>
                Chi aspetta il 2027 per iniziare partir&agrave; senza storico documentale e senza poter dimostrare
                buona fede. Chi inizia adesso avr&agrave; mesi di check, aggiornamenti e documentazione prodotta &mdash;
                e se arriva un&rsquo;ispezione, ha qualcosa da mettere sul tavolo.
              </p>
              <div className="faq-cta-row">
                <a href="/" className="comp-cta-btn">Fai il tuo primo check &rarr;</a>
                <a href="/compliance" style={{fontSize:'13px',color:'var(--muted)',textDecoration:'none'}}>
                  Vedi come lo facciamo noi su noi stessi
                </a>
              </div>
            </div>

          </FaqItem>

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
                    <p>
                      Chi viene scartato da un algoritmo di selezione, o monitorato da un sistema AI sul lavoro,
                      pu&ograve; fare un esposto al Garante con un click. Non serve un&rsquo;ispezione proattiva
                      &mdash; basta una segnalazione. E le segnalazioni le fanno le persone, non le autorit&agrave;.
                    </p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">2</div>
                  <div className="faq-trigger-body">
                    <strong>I tuoi clienti enterprise</strong>
                    <p>
                      Le grandi aziende stanno gi&agrave; inserendo clausole di AI compliance nei contratti con i
                      fornitori. Se vendi a una banca, a una compagnia assicurativa, a un gruppo industriale &mdash;
                      tra 12&ndash;18 mesi ti arriver&agrave; un questionario sulla tua AI governance.
                      &Egrave; gi&agrave; successo con il GDPR. Chi non risponde perde il contratto.
                    </p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">3</div>
                  <div className="faq-trigger-body">
                    <strong>La tua banca e la tua assicurazione</strong>
                    <p>
                      Le assicurazioni cyber e le banche stanno iniziando a valutare il rischio AI dei clienti
                      nei processi di underwriting e credito. Nessuna documentazione significa rischio pi&ugrave;
                      alto &mdash; premio assicurativo pi&ugrave; alto, o credito pi&ugrave; difficile da ottenere.
                    </p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">4</div>
                  <div className="faq-trigger-body">
                    <strong>Un incidente interno</strong>
                    <p>
                      Un sistema AI che prende una decisione sbagliata su un cliente o un dipendente.
                      Non serve il Garante: basta che la notizia esca, che ci sia una causa civile,
                      che il cliente si arrabbi pubblicamente. In quel momento non avere documentazione
                      &egrave; la cosa peggiore che ti possa capitare.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-section">
              <div className="faq-highlight-box">
                <p>
                  Actify non ti vende protezione dal Garante.
                  Ti vende <strong>protezione da tutto il resto</strong>.
                </p>
              </div>
            </div>

            <div className="doc-section" style={{marginBottom:0}}>
              <h2>Una nota sul GDPR</h2>
              <p>
                Nel 2018 le PMI dicevano esattamente la stessa cosa. <em>&ldquo;Tanto da me non ci
                vengono.&rdquo;</em> Poi sono arrivate le prime sanzioni &mdash; non per violazioni
                gravi, ma perch&eacute; qualcuno aveva fatto un esposto o perch&eacute; un cliente
                enterprise aveva chiesto la documentazione e non c&rsquo;era.
              </p>
              <p>
                L&rsquo;AI Act seguir&agrave; lo stesso schema. La differenza &egrave; che con il
                GDPR le PMI hanno avuto anni per adeguarsi prima dell&rsquo;enforcement serio.
                Con l&rsquo;AI Act <strong>quella finestra si sta chiudendo adesso</strong>.
              </p>
              <div className="faq-cta-row">
                <a href="/" className="comp-cta-btn">Fai il tuo primo check &rarr;</a>
                <a href="/compliance" style={{fontSize:'13px',color:'var(--muted)',textDecoration:'none'}}>
                  Vedi come lo facciamo noi su noi stessi
                </a>
              </div>
            </div>

          </FaqItem>

          <FaqItem num="Q 03" question="Sì ma non posso gratuitamente chiedere a ChatGPT direttamente se sono conforme all'AI Act?">

            <div className="faq-lead">
              <p>
                Prova adesso: apri ChatGPT e scrivi <em>&ldquo;sono conforme all&rsquo;AI Act?&rdquo;</em>
              </p>
              <p>
                Non sa nulla di te. Non sa quali sistemi AI usi, come li usi, chi li usa in azienda,
                se sei fornitore o deployer, se i tuoi sistemi rientrano nel perimetro, quali categorie
                di rischio li riguardano. Ti risponder&agrave; con informazioni generiche sull&rsquo;AI Act
                &mdash; le stesse che trovi su Google.
              </p>
            </div>

            <div className="doc-section">
              <h2>Il problema non &egrave; la risposta. &Egrave; la domanda.</h2>
              <p>
                Per ottenere una valutazione seria devi sapere esattamente cosa chiedere:
                distinguere tra <strong>provider e deployer</strong>, identificare correttamente la
                <strong> categoria di rischio</strong> del tuo sistema, capire se sei escluso
                dall&rsquo;ambito applicativo, quali obblighi scattano e quando.
                Questa &egrave; competenza specialistica, non prompting.
              </p>
            </div>

            <div className="doc-section">
              <h2>Il nostro tool fa una cosa diversa</h2>
              <div className="faq-triggers">
                <div className="faq-trigger">
                  <div className="faq-trigger-n">1</div>
                  <div className="faq-trigger-body">
                    <strong>Ti guida con un form strutturato e preciso</strong>
                    <p>
                      Discrimina ogni sistema AI che usi &mdash; non &ldquo;usi AI s&igrave;/no&rdquo;,
                      ma quale, come, per cosa, su chi. Il risultato &egrave; un profilo d&rsquo;uso
                      reale, non una risposta generica.
                    </p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">2</div>
                  <div className="faq-trigger-body">
                    <strong>Fa il matching preciso tra te e l&rsquo;AI Act</strong>
                    <p>
                      Mappa il tuo profilo d&rsquo;uso sugli obblighi specifici del Regolamento,
                      incluse le <strong>sanzioni applicabili</strong> &mdash; fino al 3&ndash;7%
                      del fatturato globale &mdash; per ogni gap trovato.
                    </p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">3</div>
                  <div className="faq-trigger-body">
                    <strong>Non si ferma alla diagnosi: genera i documenti</strong>
                    <p>
                      Produce automaticamente i documenti mancanti: registri, valutazioni di
                      conformit&agrave;, politiche d&rsquo;uso, informative di trasparenza.
                      Quello che un consulente ti fattura a giorni/uomo, il tool lo genera in secondi.
                    </p>
                  </div>
                </div>
                <div className="faq-trigger">
                  <div className="faq-trigger-n">4</div>
                  <div className="faq-trigger-body">
                    <strong>Mantiene aggiornato il tuo AI Inventory</strong>
                    <p>
                      Un asset che ti serve non solo per il Garante &mdash; ma per audit interni,
                      questionari da clienti enterprise, banche, assicurazioni, e ogni futuro
                      aggiornamento normativo.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-section" style={{marginBottom:0}}>
              <div className="faq-highlight-box">
                <p>
                  <strong>ChatGPT ti spiega l&rsquo;AI Act.</strong><br />
                  Il nostro tool ti dice se e come ti riguarda, la tua esposizione in termini di sanzioni
                  e cosa pu&ograve; automatizzare &mdash; <strong>e tutto ci&ograve; che pu&ograve;
                  automatizzare, lo automatizza</strong>, facendoti risparmiare tempo e denaro.
                </p>
              </div>
              <div className="faq-cta-row">
                <a href="/register" className="comp-cta-btn">Provalo gratuitamente &rarr;</a>
                <a href="/" style={{fontSize:'13px',color:'var(--muted)',textDecoration:'none'}}>
                  Vedi come funziona
                </a>
              </div>
            </div>

          </FaqItem>

        </div>{/* /faq-acc-list */}

        <div className="faq-more-note">
          Hai altre domande? <a href="/register">Crea un account</a> e parla direttamente con il team &mdash; rispondiamo a tutti.
        </div>
      </div>
    </div>
  );
}
