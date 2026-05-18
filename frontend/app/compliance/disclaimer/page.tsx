import { markSvg } from '@/lib/branding';

export default function DisclaimerPage() {
  return (
    <div className="doc-page">
      <nav className="doc-page-nav">
        <a href="/compliance" className="doc-back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          AI Act Compliance
        </a>
        <span className="doc-crumb">Disclaimer Utilizzo AI</span>
        <span dangerouslySetInnerHTML={{ __html: markSvg(28) }} />
      </nav>

      <div className="doc-body">
        <div className="doc-header">
          <div className="doc-tag">Disclaimer legale · v1.0 · maggio 2026</div>
          <h1 className="doc-title">Disclaimer Utilizzo AI</h1>
          <p className="doc-meta">
            <strong>Limitazioni di responsabilità sull&rsquo;uso dei sistemi AI nella piattaforma Actify</strong><br />
            Emesso da: <strong>Actify</strong> (piattaforma SaaS AI Act compliance)<br />
            Applicabile a: tutti i report, analisi e output generati dalla piattaforma<br />
            Data di emissione: <strong>maggio 2026</strong> — Versione: <strong>1.0</strong>
          </p>
        </div>

        <div className="doc-warn">
          <p>
            <strong>Leggere attentamente prima di utilizzare i report di compliance generati da Actify.</strong>{' '}
            Le analisi prodotte dai sistemi AI della piattaforma sono strumenti di supporto decisionale, non
            pareri legali. L&rsquo;utilizzo di questo servizio implica l&rsquo;accettazione delle condizioni
            descritte nel presente disclaimer.
          </p>
        </div>

        <div className="doc-section">
          <h2>1. Natura advisory dell&rsquo;analisi AI</h2>
          <p>
            I report, le gap analysis, le classificazioni di rischio e le raccomandazioni operative generate dalla
            piattaforma Actify tramite sistemi AI (<strong>Amazon Nova Pro</strong> via Amazon Bedrock) hanno
            esclusivamente <strong>carattere informativo e di supporto decisionale</strong>. Essi:
          </p>
          <ul>
            <li>Non costituiscono un accertamento giuridico dello stato di conformità dell&rsquo;organizzazione</li>
            <li>Non hanno valore legale, regolamentare o certificatorio</li>
            <li>Non rappresentano una valutazione formale ai sensi del Reg. UE 2024/1689 o di qualsiasi altra normativa</li>
            <li>Non possono essere utilizzati come unica base per decisioni aziendali di rilevanza significativa</li>
            <li>Non vincolo Actify né obbligano l&rsquo;organizzazione del cliente verso terze parti o autorità</li>
          </ul>
          <p>
            Il termine &ldquo;compliance check&rdquo; utilizzato nella piattaforma indica un&rsquo;analisi automatizzata
            di supporto, non una certificazione o un audit formale di conformità.
          </p>
        </div>

        <div className="doc-section">
          <h2>2. Non è consulenza legale</h2>
          <div className="doc-warn">
            <p>
              <strong>Actify non è uno studio legale e non fornisce consulenza legale.</strong> La piattaforma è
              uno strumento tecnologico di supporto alla compliance. I report generati dall&rsquo;AI non sostituiscono
              il parere di un avvocato, di un consulente legale specializzato in diritto dell&rsquo;AI, o di un
              esperto di conformità normativa.
            </p>
          </div>
          <p>
            In particolare, per le seguenti situazioni <strong>è sempre necessario il supporto di un professionista qualificato</strong>:
          </p>
          <ul>
            <li>Sistemi AI classificati ad alto rischio (Annex III del Reg. UE 2024/1689)</li>
            <li>Notifiche alle autorità competenti</li>
            <li>Valutazioni di impatto fondamentale sui diritti (FRIA)</li>
            <li>Decisioni riguardanti l&rsquo;obbligo di registrazione nell&rsquo;EU AI Database</li>
            <li>Risposte a indagini o procedimenti delle autorità di vigilanza</li>
            <li>Stima delle sanzioni per procedimenti formali</li>
            <li>Interpretazioni normative in aree di incertezza giuridica</li>
          </ul>
        </div>

        <div className="doc-section">
          <h2>3. Supervisione umana obbligatoria</h2>
          <p>
            L&rsquo;AI Act stesso, all&rsquo;art. 14, richiede che i sistemi AI ad alto rischio siano soggetti a
            supervisione umana. Actify estende questo principio a tutta la propria piattaforma come misura di
            buona governance: <strong>ogni output AI richiede revisione critica da parte di una persona competente</strong>.
          </p>
          <p>
            L&rsquo;utente è responsabile di:
          </p>
          <ul>
            <li>Verificare la coerenza delle conclusioni del report con la propria conoscenza del sistema AI analizzato</li>
            <li>Valutare criticamente i gap identificati e le azioni consigliate prima di implementarle</li>
            <li>Consultare professionisti qualificati per decisioni aziendali rilevanti</li>
            <li>Mantenere propria documentazione aggiornata indipendentemente dall&rsquo;uso della piattaforma</li>
          </ul>
        </div>

        <div className="doc-section">
          <h2>4. Limitazioni tecniche del sistema AI</h2>
          <p>
            I modelli AI di linguaggio di grandi dimensioni (LLM) come Amazon Nova Pro presentano limitazioni
            tecniche intrinseche di cui l&rsquo;utente deve essere consapevole:
          </p>

          <h3>4.1 Aggiornamento normativo</h3>
          <p>
            Il modello AI ha una data di taglio della conoscenza e potrebbe non essere aggiornato rispetto a:
            linee guida più recenti delle autorità competenti, orientamenti interpretativi dell&rsquo;EAIA (European AI
            Office), giurisprudenza emergente, o aggiornamenti al testo normativo successivi al training del modello.
            Actify aggiorna i propri prompt di sistema periodicamente, ma non può garantire il recepimento immediato
            di ogni evoluzione normativa.
          </p>

          <h3>4.2 Contesto specifico</h3>
          <p>
            Il modello AI elabora le informazioni fornite dall&rsquo;utente. Un&rsquo;analisi incompleta o imprecisa
            dei dati di input produce un&rsquo;analisi di output meno accurata (<em>garbage in, garbage out</em>).
            Il modello non ha accesso diretto ai sistemi, processi o documenti aziendali dell&rsquo;utente oltre
            a quanto esplicitamente indicato nelle schede di registrazione del sistema AI.
          </p>

          <h3>4.3 Allucinazioni e imprecisioni</h3>
          <p>
            I modelli AI di linguaggio possono occasionalmente produrre affermazioni imprecise, riferimenti normativi
            non corretti, o interpretazioni non condivise dalla dottrina giuridica prevalente. L&rsquo;utente
            deve verificare ogni riferimento normativo critico con le fonti ufficiali (EUR-Lex, EAIA).
          </p>

          <h3>4.4 Stima delle sanzioni</h3>
          <p>
            Le stime economiche delle sanzioni potenziali (art. 99 AI Act) sono calcolate applicando un algoritmo
            deterministico basato su tier normativi, revenue aziendale e fattori di correzione. Tali stime sono
            indicative e non tengono conto di: attenuanti o aggravanti specifiche del caso, discrezionalità
            dell&rsquo;autorità competente, precedenti sanzionatori, o accordi conciliatori. Non utilizzare
            le stime di sanzione a fini contabili, assicurativi o processuali senza il supporto di un professionista.
          </p>
        </div>

        <div className="doc-section">
          <h2>5. Limitazione di responsabilità</h2>
          <p>
            Nei limiti consentiti dalla legge applicabile, <strong>Actify non è responsabile</strong> per:
          </p>
          <ul>
            <li>Decisioni aziendali prese esclusivamente sulla base dei report generati dalla piattaforma</li>
            <li>Sanzioni, procedimenti o conseguenze derivanti dall&rsquo;eventuale non conformità al Reg. UE 2024/1689 o ad altre normative</li>
            <li>Imprecisioni, errori o lacune nelle analisi generate dal sistema AI</li>
            <li>Danni diretti, indiretti, consequenziali o punitivi derivanti dall&rsquo;uso del servizio</li>
            <li>Conseguenze derivanti dalla mancata supervisione umana degli output AI</li>
            <li>Decisioni basate su analisi AI non aggiornate rispetto all&rsquo;evoluzione normativa</li>
          </ul>
          <p>
            La responsabilità massima di Actify nei confronti dell&rsquo;utente è limitata ai termini
            specificati nel contratto di servizio (Terms of Service) in vigore tra le parti.
          </p>
        </div>

        <div className="doc-section">
          <h2>6. Qualità dei dati inseriti</h2>
          <p>
            La qualità dell&rsquo;analisi dipende direttamente dalla qualità e completezza dei dati inseriti dall&rsquo;utente.
            L&rsquo;utente è responsabile di:
          </p>
          <ul>
            <li>Fornire informazioni accurate e complete sui sistemi AI registrati</li>
            <li>Aggiornare le schede dei sistemi al variare delle caratteristiche rilevanti</li>
            <li>Non inserire dati fuorvianti, incompleti o di fantasia che porterebbero a un&rsquo;analisi non rappresentativa della realtà aziendale</li>
          </ul>
          <p>
            Actify non verifica l&rsquo;accuratezza dei dati inseriti dall&rsquo;utente e non può essere ritenuta
            responsabile per analisi basate su informazioni inesatte fornite dall&rsquo;utente stesso.
          </p>
        </div>

        <div className="doc-section">
          <h2>7. Evoluzione normativa</h2>
          <p>
            Il Reg. UE 2024/1689 (AI Act) è entrato in vigore il 1° agosto 2024 con un regime di applicazione
            progressivo. L&rsquo;interpretazione di molti articoli è ancora in via di definizione attraverso atti
            delegati, linee guida dell&rsquo;AI Office europeo e orientamenti delle autorità nazionali competenti.
          </p>
          <p>
            Actify aggiorna i propri modelli di analisi in modo ragionevole ma non può garantire l&rsquo;immediato
            recepimento di ogni evoluzione normativa o interpretativa. <strong>L&rsquo;utente è invitato a
            verificare sempre le fonti normative ufficiali</strong> (EUR-Lex, sito dell&rsquo;AI Office europeo)
            per le interpretazioni più aggiornate.
          </p>
        </div>

        <div className="doc-section">
          <h2>8. Accettazione del disclaimer</h2>
          <p>
            L&rsquo;utilizzo della piattaforma Actify e dei report di compliance da essa generati implica la
            lettura e l&rsquo;accettazione del presente disclaimer. Se non accetti le condizioni descritte, non
            utilizzare i report come base per decisioni operative, legali o organizzative senza preventiva
            revisione professionale.
          </p>
          <p>
            Per domande o chiarimenti su questo disclaimer, contatta il team compliance di Actify attraverso
            l&rsquo;interfaccia della piattaforma.
          </p>
        </div>

        <div className="doc-sig">
          <strong>Disclaimer emesso da Actify</strong>
          Piattaforma SaaS AI Act Compliance — actify.io<br />
          Data: maggio 2026 — Versione documento: 1.0<br />
          <br />
          Documenti correlati:{' '}
          <a href="/compliance/dichiarazione" style={{color:'var(--green)'}}>Dichiarazione di Conformità</a>
          {' · '}
          <a href="/compliance/registro-ai" style={{color:'var(--green)'}}>Registro AI</a>
          {' · '}
          <a href="/compliance/trasparenza" style={{color:'var(--green)'}}>Informativa Art. 50</a>
          {' · '}
          <a href="/compliance" style={{color:'var(--green)'}}>AI Compliance Hub</a>
        </div>
      </div>
    </div>
  );
}
