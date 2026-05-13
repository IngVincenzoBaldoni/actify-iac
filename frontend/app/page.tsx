'use client';

import Script from 'next/script';
import { logoSvg, markSvg } from '@/lib/branding';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const w = (fn: string) => () => { (window as unknown as Record<string, () => void>)[fn]?.(); };

export default function Page() {
  return (
    <>
      {/* ═══ LANDING ═══ */}
      <section id="landing">
        <nav className="l-nav">
          <span dangerouslySetInnerHTML={{ __html: markSvg(52) }} />
          <span dangerouslySetInnerHTML={{ __html: logoSvg(288, 80) }} />
          <div className="l-pill"><span className="pulse"></span>Enforcement Active &middot; Sanzioni fino a &euro;35M in vigore</div>
        </nav>

        <div className="l-hero">
          <div className="l-hero-inner">
            <div className="hero-badge"><span className="pulse"></span>AI Act Reg. UE 2024/1689 &mdash; in vigore da agosto 2024</div>
            <h1 className="hero-h1">L&rsquo;AI &egrave; il tuo vantaggio<br /><mark>La compliance non deve essere il tuo problema</mark></h1>
            <p className="hero-sub">Deployare IA senza compliance con l&rsquo;AI Act? Dal 2026 &egrave; come guidare senza assicurazione. Mappiamo i tuoi sistemi IA, catalogiamo i rischi e prepariamo una roadmap per essere compliant. Tutto automatizzato, in pochi minuti.</p>
            <button className="hero-btn" onClick={w('startWizard')}>
              <svg width="20" height="20" viewBox="0 0 126 126" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
                <circle cx="63" cy="63" r="60" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.7)" strokeWidth="5.5"/>
                <g stroke="white" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23,81 36,95 81,25"/>
                  <line x1="81" y1="25" x2="99" y2="89"/>
                  <line x1="59" y1="60" x2="91" y2="60"/>
                </g>
              </svg>
              Risk Assessment Gratuito
            </button>
            <div className="hero-trust">
              <div className="trust-item"><div className="trust-check">&#10003;</div> Gratuito</div>
              <div className="trust-item"><div className="trust-check">&#10003;</div> ~10 minuti</div>
              <div className="trust-item"><div className="trust-check">&#10003;</div> Report PDF immediato</div>
              <div className="trust-item"><div className="trust-check">&#10003;</div> Nessuna registrazione</div>
            </div>
          </div>
        </div>

        {/* ═══ THE PROBLEM ═══ */}
        <div className="l-problem">
          <div className="l-problem-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Il Problema
          </div>
          <h2>La Compliance AI <span>è Rotta</span></h2>
          <p className="l-problem-sub">Le PMI che usano AI rischiano sanzioni fino a &euro;35M ma non hanno accesso agli stessi strumenti delle grandi aziende. Ecco perché.</p>
          <div className="problem-cards">
            <div className="prob-card pc-red">
              <div className="pc-icon ic-red">&#128178;</div>
              <div className="pc-label">Costi Proibitivi</div>
              <div className="pc-stat cs-red">&euro;50K+</div>
              <p className="pc-desc">Il costo medio di una consulenza legale specializzata in AI Act per una PMI. Un budget fuori portata per chi non è una grande corporation.</p>
            </div>
            <div className="prob-card pc-orange">
              <div className="pc-icon ic-orange">&#128336;</div>
              <div className="pc-label">Tempo Sprecato</div>
              <div className="pc-stat cs-orange">3&ndash;6 mesi</div>
              <p className="pc-desc">Quanto ci vuole per completare manualmente la documentazione AI Act. Mesi di riunioni, audit interni e burocrazia invece di costruire prodotti.</p>
            </div>
            <div className="prob-card pc-purple">
              <div className="pc-icon ic-purple">&#128295;</div>
              <div className="pc-label">Zero Strumenti</div>
              <div className="pc-stat cs-purple">0</div>
              <p className="pc-desc">Strumenti digitali pensati specificamente per la compliance AI Act delle PMI italiane ed europee. Il mercato è ancora vuoto.</p>
            </div>
          </div>
        </div>

        {/* ═══ THE SOLUTION ═══ */}
        <div className="l-sol-wrap">
          <div className="l-sol">
            <div className="l-sol-head">
              <div className="l-sol-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                La Soluzione
              </div>
              <h2>AI Compliance, <em>Semplificata</em></h2>
              <p className="l-sol-sub">Abbiamo costruito la piattaforma che avremmo voluto esistesse &mdash; accessibile, self-service, pensata per portarti da &ldquo;da dove inizio?&rdquo; a &ldquo;sono conforme&rdquo; in settimane, non mesi.</p>
            </div>
            <div className="l-sol-body">
              <div className="sol-col">
                <div className="sol-feat">
                  <div className="sf-ico sfi-g">&#127919;</div>
                  <div className="sf-txt">
                    <h4>Classificazione Rischio Istantanea</h4>
                    <p>Rispondi al questionario sui tuoi sistemi AI. La piattaforma mappa automaticamente ogni sistema alla corretta categoria AI Act e genera la tua roadmap di compliance personalizzata.</p>
                  </div>
                </div>
                <div className="sol-feat">
                  <div className="sf-ico sfi-p">&#128279;</div>
                  <div className="sf-txt">
                    <h4>Analisi Ruolo Provider &amp; Deployer</h4>
                    <p>Identifica automaticamente i tuoi obblighi specifici in base al ruolo nella catena del valore AI: provider, deployer o entrambi, con gap analysis dedicata.</p>
                  </div>
                </div>
              </div>

              {/* MacBook mockup */}
              <div className="mb-wrap">
                <div className="mb-outer">
                  <div className="mb-lid">
                    <div className="mb-cambar"><div className="mb-camdot"></div></div>
                    <div className="mb-screen">
                      <div className="db">
                        <div className="db-bar">
                          <div className="db-logo">
                            <span dangerouslySetInnerHTML={{ __html: markSvg(14, 'green') }} />
                            Actify
                          </div>
                          <div className="db-nav">
                            <span className="db-ni dna">Dashboard</span>
                            <span className="db-ni">Sistemi</span>
                            <span className="db-ni">Report</span>
                            <span className="db-ni">Impostazioni</span>
                          </div>
                          <div className="db-spacer"></div>
                          <div className="db-livebadge"><span className="db-ldot"></span>Live</div>
                        </div>
                        <div className="db-body">
                          <div className="db-toprow">
                            <div>
                              <div className="db-htitle">AI Act Compliance Dashboard</div>
                              <div className="db-hsub">Aggiornato 13 mag 2026 &middot; 3 azioni richieste</div>
                            </div>
                            <div className="db-chip-ok">
                              <div className="db-chip-n">94%</div>
                              <div className="db-chip-l">CONFORME</div>
                            </div>
                          </div>
                          <div className="db-krow">
                            <div className="db-k"><div className="db-kn">7</div><div className="db-kl">Sistemi AI</div></div>
                            <div className="db-k"><div className="db-kn kc-r">2</div><div className="db-kl">Rischio Alto</div></div>
                            <div className="db-k"><div className="db-kn kc-y">3</div><div className="db-kl">Azioni Pendenti</div></div>
                            <div className="db-k"><div className="db-kn kc-g">2 ago</div><div className="db-kl">Scadenza AI Act</div></div>
                          </div>
                          <div className="db-slabel">SISTEMI AI MONITORATI</div>
                          <div className="db-stbl">
                            <div className="db-sr">
                              <div className="db-sn">CRM Predittivo</div>
                              <div className="db-pill dp-r">ALTO RISCHIO</div>
                              <div className="db-prog"><div className="db-pf" style={{width:'78%',background:'#EF4444'}}></div></div>
                              <div className="db-pp">78%</div>
                            </div>
                            <div className="db-sr">
                              <div className="db-sn">Chatbot Supporto</div>
                              <div className="db-pill dp-g">LIMITATO</div>
                              <div className="db-prog"><div className="db-pf" style={{width:'96%',background:'#22C55E'}}></div></div>
                              <div className="db-pp">96%</div>
                            </div>
                            <div className="db-sr">
                              <div className="db-sn">Analytics HR</div>
                              <div className="db-pill dp-r">ALTO RISCHIO</div>
                              <div className="db-prog"><div className="db-pf" style={{width:'65%',background:'#F97316'}}></div></div>
                              <div className="db-pp">65%</div>
                            </div>
                            <div className="db-sr">
                              <div className="db-sn">Selezione CV automatizzata</div>
                              <div className="db-pill dp-y">IN REVISIONE</div>
                              <div className="db-prog"><div className="db-pf" style={{width:'52%',background:'#EAB308'}}></div></div>
                              <div className="db-pp">52%</div>
                            </div>
                          </div>
                          <div className="db-slabel">AZIONI PRIORITARIE</div>
                          <div className="db-alist">
                            <div className="db-ar da-w">&#9888; Aggiornare documentazione tecnica CRM Predittivo</div>
                            <div className="db-ar da-w">&#9888; Registrare sistemi nel Registro EUDB operatori</div>
                            <div className="db-ar da-o">&#10003; Human oversight implementato su tutti i sistemi</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mb-base"><div className="mb-notch-i"></div></div>
                  <div className="mb-foot"></div>
                </div>
              </div>

              <div className="sol-col">
                <div className="sol-feat">
                  <div className="sf-ico sfi-b">&#9989;</div>
                  <div className="sf-txt">
                    <h4>Checklist di Compliance Dinamica</h4>
                    <p>Una checklist dinamica di ogni requisito per il tuo livello di rischio. Traccia il completamento del team e identifica i gap di governance in tempo reale.</p>
                  </div>
                </div>
                <div className="sol-feat">
                  <div className="sf-ico sfi-o">&#128196;</div>
                  <div className="sf-txt">
                    <h4>Report Audit-Ready in PDF</h4>
                    <p>Genera report di compliance completi con un click. Documenti professionali pronti per audit normativi e verifiche delle autorit&agrave; competenti.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="sol-cta">
              <button className="btn-sp" onClick={w('startWizard')}>
                <svg width="18" height="18" viewBox="0 0 126 126" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
                  <circle cx="63" cy="63" r="60" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.7)" strokeWidth="5.5"/>
                  <g stroke="white" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23,81 36,95 81,25"/>
                    <line x1="81" y1="25" x2="99" y2="89"/>
                    <line x1="59" y1="60" x2="91" y2="60"/>
                  </g>
                </svg>
                Inizia il Risk Assessment Gratuito
              </button>
              <button className="btn-ss">Scopri di pi&ugrave; &#8594;</button>
            </div>
          </div>
        </div>

        <div className="l-cards">
          <div className="l-card"><div className="card-icon ci-green">&#128737;</div><h3>Classificazione del Rischio</h3><p>Mappa i tuoi sistemi AI alle categorie dell&rsquo;AI Act (Annex III) e scopri il livello di rischio: vietato, alto, limitato o minimale.</p></div>
          <div className="l-card"><div className="card-icon ci-purple">&#128196;</div><h3>Report PDF Professionale</h3><p>Documento audit-ready con analisi per sistema, timeline di adeguamento e azioni prioritarie specifiche per il tuo settore.</p></div>
          <div className="l-card"><div className="card-icon ci-blue">&#128506;</div><h3>Roadmap Personalizzata</h3><p>Piano d&rsquo;azione con scadenze AI Act, obblighi specifici per il tuo ruolo (Provider o Deployer) e gap di governance identificati.</p></div>
        </div>
      </section>


      {/* ═══ WIZARD ═══ */}
      <div id="app">
        <nav className="w-nav">
          <div className="w-logo"><span dangerouslySetInnerHTML={{ __html: logoSvg(162, 45) }} /></div>
          <div className="w-step-info" id="stepInfo">Step 1 di 6</div>
          <button className="w-exit" onClick={w('exitWizard')}>&#8592; Esci</button>
        </nav>
        <div className="stepper" id="stepper"></div>
        <div className="w-body">

          {/* Step 1 */}
          <div id="step1" className="step-panel">
            <div className="panel-head">
              <h2>Profilo Azienda</h2>
              <p>Iniziamo con le informazioni di base sulla tua organizzazione.</p>
            </div>
            <div className="disclaimer">
              <div className="disc-icon">&#9888;</div>
              <div>
                <strong>Nota per il compilatore &mdash; Garbage In, Garbage Out</strong><br />
                Come in ogni sistema tecnologico, la qualit&agrave; del tuo report dipende direttamente dalla precisione delle informazioni che fornisci. Essere vago o impreciso produrr&agrave; un report generico e poco utile. <em>Pi&ugrave; sei specifico</em> sui sistemi AI in uso, i processi decisionali e il contesto aziendale, pi&ugrave; l&rsquo;analisi sar&agrave; coerentemente veritiera e azionabile per la tua compliance.
              </div>
            </div>
            <div className="fcard">
              <div className="field">
                <label>Nome Azienda *</label>
                <input type="text" id="companyName" placeholder="Es. Acme S.r.l." />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Settore *</label>
                  <select id="companySector">
                    <option value="">&#8212; Seleziona settore &#8212;</option>
                    <option>Risorse Umane / Recruiting</option>
                    <option>Servizi Finanziari / Banca</option>
                    <option>Assicurazioni</option>
                    <option>Sanit&agrave; / Life Sciences</option>
                    <option>Istruzione / EdTech</option>
                    <option>Manifatturiero / Industria</option>
                    <option>Tecnologia / SaaS</option>
                    <option>Retail / E-commerce</option>
                    <option>Pubblica Amministrazione</option>
                    <option>Legale / Compliance</option>
                    <option>Marketing / Media</option>
                    <option>Logistica / Supply Chain</option>
                    <option>Energia / Utilities</option>
                    <option>Altro</option>
                  </select>
                </div>
                <div className="field">
                  <label>Dimensione *</label>
                  <select id="companySize">
                    <option value="">&#8212; N&deg; dipendenti &#8212;</option>
                    <option value="1-10">1&ndash;10 (Micro)</option>
                    <option value="11-50">11&ndash;50 (Piccola)</option>
                    <option value="51-250">51&ndash;250 (Media)</option>
                    <option value="251-1000">251&ndash;1.000 (Grande)</option>
                    <option value="1000+">1.000+ (Enterprise)</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Sede Legale *</label>
                  <select id="companySede">
                    <option value="">&#8212; Seleziona &#8212;</option>
                    <option value="Italia">&#127470;&#127481; Italia</option>
                    <option value="EU">&#127466;&#127482; Unione Europea (altro paese EU)</option>
                    <option value="Rest of World">&#127760; Rest of World</option>
                  </select>
                </div>
                <div className="field">
                  <label>Range Fatturato <span className="locked-badge">&#128274; Premium</span></label>
                  <select className="locked-select" disabled>
                    <option>&#8212; disponibile nella versione a pagamento &#8212;</option>
                  </select>
                  <div className="locked-note">Questa feature &egrave; abilitata nella versione a pagamento per permetterci di fare una stima delle sanzioni economiche in cui potresti incorrere.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div id="step2" className="step-panel" style={{display:'none'}}>
            <div className="panel-head">
              <h2>Ruolo &amp; Sistemi AI</h2>
              <p>Seleziona il tuo ruolo rispetto all&rsquo;AI Act e inserisci i sistemi AI della tua organizzazione.</p>
            </div>
            <div className="fcard">
              <h3>Il tuo ruolo rispetto ai sistemi AI *</h3>
              <p>Puoi selezionare entrambi se sei sia Provider che Deployer di sistemi AI diversi.</p>
              <div className="check-cards">
                <label className="check-card">
                  <input type="checkbox" id="isProvider" onChange={w('toggleRole')} />
                  <div>
                    <div className="cc-title">Provider (Fornitore)</div>
                    <div className="cc-desc">Sviluppi, commercializzi o metti sul mercato sistemi AI con il tuo marchio, anche come componente di un servizio SaaS pi&ugrave; ampio</div>
                  </div>
                </label>
                <label className="check-card">
                  <input type="checkbox" id="isDeployer" onChange={w('toggleRole')} />
                  <div>
                    <div className="cc-title">Deployer (Utilizzatore)</div>
                    <div className="cc-desc">Usi nella tua attivit&agrave; sistemi AI sviluppati da terzi: API, SaaS, strumenti LLM, software specializzati</div>
                  </div>
                </label>
              </div>
            </div>
            <div id="providerSection" style={{display:'none'}}>
              <div className="fcard">
                <div className="rs-head">
                  <div className="rs-head-title">Sistemi AI Proprietari</div>
                  <span className="rs-badge">Provider</span>
                </div>
                <p>Inserisci i sistemi AI che la tua azienda ha sviluppato e mette sul mercato o integra nei propri servizi.</p>
                <div id="providerList"></div>
                <button className="btn-add" onClick={w('addProviderSystem')}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Aggiungi Sistema AI Proprietario
                </button>
              </div>
            </div>
            <div id="deployerSection" style={{display:'none'}}>
              <div className="fcard">
                <div className="rs-head">
                  <div className="rs-head-title">Sistemi AI in Uso</div>
                  <span className="rs-badge dep">Deployer</span>
                </div>
                <h3 style={{marginBottom:'10px'}}>A. LLM / AI Generativa &mdash; Strumenti Standard</h3>
                <p>Seleziona tutti gli strumenti GenAI che la tua organizzazione utilizza.</p>
                <div className="llm-grid" id="llmGrid"></div>
                <div id="llmDetails"></div>
              </div>
              <div className="fcard">
                <h3>B. Sistemi AI Specializzati</h3>
                <p>Sistemi AI verticali per funzioni specifiche (recruiting AI, credit scoring, diagnostica, ecc.).</p>
                <div id="depSpecList"></div>
                <button className="btn-add" onClick={w('addDeployerSpecialized')}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Aggiungi Sistema Specializzato
                </button>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div id="step3" className="step-panel" style={{display:'none'}}>
            <div className="panel-head">
              <h2>Decisioni &amp; Human-in-the-Loop</h2>
              <p>Come i sistemi AI influenzano i processi decisionali nella tua organizzazione.</p>
            </div>
            <div className="fcard">
              <h3>Processo Decisionale AI</h3>
              <div className="check-cards">
                <label className="check-card">
                  <input type="checkbox" id="makesDec" />
                  <div>
                    <div className="cc-title">I sistemi AI producono decisioni o raccomandazioni che impattano persone fisiche</div>
                    <div className="cc-desc">Include: assunzione, accesso al credito, diagnosi, valutazione scolastica, accesso a servizi, scoring comportamentale</div>
                  </div>
                </label>
                <label className="check-card">
                  <input type="checkbox" id="vulnerable" />
                  <div>
                    <div className="cc-title">I sistemi interagiscono con soggetti vulnerabili</div>
                    <div className="cc-desc">Minori, anziani, persone con disabilit&agrave;, persone in difficolt&agrave; economica o emotiva</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="fcard">
              <h3>Supervisione Umana (Human-in-the-Loop)</h3>
              <div className="radio-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
                <label className="radio-card"><input type="radio" name="humanOversight" value="always" /><div className="rc-row"><div className="rc-title">Sempre presente</div><div className="rc-dot"></div></div><div className="rc-desc">Ogni output AI &egrave; revisionato e approvato da un operatore umano prima di produrre effetti</div></label>
                <label className="radio-card"><input type="radio" name="humanOversight" value="sometimes" /><div className="rc-row"><div className="rc-title">In alcuni casi</div><div className="rc-dot"></div></div><div className="rc-desc">Supervisione umana solo per decisioni ad alto rischio o casi limite; il resto &egrave; automatico</div></label>
                <label className="radio-card"><input type="radio" name="humanOversight" value="never" /><div className="rc-row"><div className="rc-title">Mai &mdash; Full Automatic</div><div className="rc-dot"></div></div><div className="rc-desc">Il sistema decide o agisce autonomamente senza alcun intervento umano nel loop</div></label>
                <label className="radio-card"><input type="radio" name="humanOversight" value="na" /><div className="rc-row"><div className="rc-title">Non applicabile</div><div className="rc-dot"></div></div><div className="rc-desc">I sistemi AI non producono decisioni su persone fisiche (uso puramente interno/operativo)</div></label>
              </div>
            </div>
            <div className="fcard">
              <h3>Ambiti di Decisione</h3>
              <div className="check-list">
                <label className="check-row"><input type="checkbox" className="domain" value="hiring" /><span>Assunzione, selezione e screening del personale</span></label>
                <label className="check-row"><input type="checkbox" className="domain" value="performance_management" /><span>Valutazione delle prestazioni, promozioni, licenziamenti</span></label>
                <label className="check-row"><input type="checkbox" className="domain" value="credit_scoring" /><span>Valutazione creditizia, prestiti, scoring finanziario</span></label>
                <label className="check-row"><input type="checkbox" className="domain" value="insurance" /><span>Assicurazioni: underwriting, tariffazione, liquidazione sinistri</span></label>
                <label className="check-row"><input type="checkbox" className="domain" value="healthcare_diagnosis" /><span>Diagnosi medica, supporto clinico, triage</span></label>
                <label className="check-row"><input type="checkbox" className="domain" value="education_assessment" /><span>Valutazione studenti, accesso all&rsquo;istruzione, orientamento</span></label>
                <label className="check-row"><input type="checkbox" className="domain" value="public_services" /><span>Accesso a servizi pubblici, sussidi, benefici sociali</span></label>
                <label className="check-row"><input type="checkbox" className="domain" value="law_enforcement" /><span>Forze dell&rsquo;ordine, controllo biometrico, sorveglianza</span></label>
                <label className="check-row"><input type="checkbox" className="domain" value="content_moderation" /><span>Moderazione contenuti, accesso a piattaforme digitali</span></label>
                <label className="check-row"><input type="checkbox" className="domain" value="other_decisions" /><span>Altre decisioni con impatto significativo su persone</span></label>
              </div>
            </div>
            <div className="fcard">
              <h3>Tipologie di Dati Trattati dall&rsquo;AI</h3>
              <div className="check-list">
                <label className="check-row"><input type="checkbox" className="dtype" value="biometric" /><span>Dati biometrici (volto, voce, impronte digitali, andatura)</span></label>
                <label className="check-row"><input type="checkbox" className="dtype" value="health" /><span>Dati sanitari, cartelle cliniche, stati di salute</span></label>
                <label className="check-row"><input type="checkbox" className="dtype" value="financial" /><span>Dati finanziari, bancari, reddituali</span></label>
                <label className="check-row"><input type="checkbox" className="dtype" value="behavioral" /><span>Dati comportamentali, navigazione, pattern di utilizzo</span></label>
                <label className="check-row"><input type="checkbox" className="dtype" value="location" /><span>Dati di geolocalizzazione o movimenti fisici</span></label>
                <label className="check-row"><input type="checkbox" className="dtype" value="personal_identifiers" /><span>Identificatori personali (nome, CF, email, numero di telefono)</span></label>
                <label className="check-row"><input type="checkbox" className="dtype" value="sensitive_categories" /><span>Categorie speciali GDPR (etnia, religione, salute, orientamento sessuale, opinioni politiche)</span></label>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div id="step4" className="step-panel" style={{display:'none'}}>
            <div className="panel-head">
              <h2>AI Readiness</h2>
              <p>Valuta il livello di presidio gi&agrave; in atto nella tua organizzazione rispetto agli obblighi dell&rsquo;AI Act.</p>
            </div>
            <div className="fcard">
              <h3>Responsabile Protezione Dati (DPO)</h3>
              <div className="radio-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
                <label className="radio-card"><input type="radio" name="dpoStatus" value="inhouse" /><div className="rc-row"><div className="rc-title">In-house</div><div className="rc-dot"></div></div><div className="rc-desc">DPO designato come dipendente o figura interna dell&rsquo;organizzazione</div></label>
                <label className="radio-card"><input type="radio" name="dpoStatus" value="service" /><div className="rc-row"><div className="rc-title">As a Service</div><div className="rc-dot"></div></div><div className="rc-desc">DPO esterno: consulente, studio legale o servizio DPO-as-a-service</div></label>
                <label className="radio-card"><input type="radio" name="dpoStatus" value="none" /><div className="rc-row"><div className="rc-title">Non presente</div><div className="rc-dot"></div></div><div className="rc-desc">Nessun DPO formalmente designato al momento</div></label>
              </div>
            </div>
            <div className="fcard">
              <h3>Presidi di Conformit&agrave; AI</h3>
              <div className="check-cards">
                <label className="check-card"><input type="checkbox" id="hasInventory" /><div><div className="cc-title">Inventario AI formalizzato</div><div className="cc-desc">Registro documentato di tutti i sistemi AI in uso: scopi, vendor, responsabili e data di adozione</div></div></label>
                <label className="check-card"><input type="checkbox" id="hasImpact" /><div><div className="cc-title">Valutazione d&rsquo;impatto AI condotta (FRIA / DPIA)</div><div className="cc-desc">AI Act Art. 27 (FRIA) e GDPR Art. 35 (DPIA) &mdash; obbligatoria per sistemi ad alto rischio</div></div></label>
                <label className="check-card"><input type="checkbox" id="hasIncident" /><div><div className="cc-title">Procedura di gestione incidenti AI documentata</div><div className="cc-desc">Processo definito per segnalare, tracciare e gestire malfunzionamenti o danni causati da AI</div></div></label>
                <label className="check-card"><input type="checkbox" id="hasAiPolicy" /><div><div className="cc-title">Policy interna sull&rsquo;uso dell&rsquo;AI</div><div className="cc-desc">Documento formale che definisce regole, responsabilit&agrave; e limiti nell&rsquo;adozione di strumenti AI in azienda</div></div></label>
                <label className="check-card"><input type="checkbox" id="hasTraining" /><div><div className="cc-title">Formazione del personale sull&rsquo;AI</div><div className="cc-desc">Dipendenti e responsabili hanno ricevuto formazione specifica sull&rsquo;uso sicuro e consapevole dell&rsquo;AI</div></div></label>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div id="step5" className="step-panel" style={{display:'none'}}>
            <div className="panel-head">
              <h2>Contesto &amp; Note</h2>
              <p>Questo campo viene analizzato direttamente dall&rsquo;AI. Pi&ugrave; dettagli fornisci, pi&ugrave; il report sar&agrave; preciso.</p>
            </div>
            <div className="fcard">
              <div className="hint">
                <span className="hint-icon">&#127919;</span>
                <span>Descrivi come usi esattamente i sistemi AI, chi ne &egrave; impattato, aspetti critici del tuo settore, dubbi specifici sulla compliance. Spesso questo campo rivela rischi non catturati dalle checkbox precedenti. <strong>Ricorda: garbage in, garbage out.</strong></span>
              </div>
              <div className="field" style={{marginBottom:0}}>
                <label>Note Libere &mdash; Contesto Specifico</label>
                <textarea id="contextNotes" rows={7} placeholder="Es: Usiamo HireVue per lo screening iniziale di tutti i candidati. Il sistema produce un punteggio 0-100 e chi scende sotto 60 non viene mai contattato. Operiamo nel settore bancario..."></textarea>
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div id="step6" className="step-panel" style={{display:'none'}}>
            <div className="panel-head">
              <h2>Riepilogo e Generazione</h2>
              <p>Verifica i dati inseriti prima di generare il tuo report di compliance AI Act personalizzato.</p>
            </div>
            <div className="fcard">
              <div id="reviewContent"></div>
            </div>
            <div className="alert-err" id="errorAlert"></div>
          </div>

        </div>{/* /w-body */}

        <div className="w-footer" id="wFooter">
          <button className="btn-back" id="btnBack" onClick={w('goBack')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Indietro
          </button>
          <button className="btn-next" id="btnNext" onClick={w('goNext')}>
            Avanti
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 11l4-4-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="btn-submit" id="btnSubmit" style={{display:'none'}} onClick={w('submitForm')}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 7.5h11M9 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Genera Report PDF
          </button>
        </div>
      </div>


      {/* ═══ LOADING ═══ */}
      <div id="loading">
        <div className="ld-card">
          <div className="ld-logo"><span dangerouslySetInnerHTML={{ __html: markSvg(56) }} /></div>
          <div className="spin"></div>
          <div className="ld-steps">
            <div className="ld-step active" id="ls1"><div className="ld-dot"></div><span>Analizzando il profilo aziendale&hellip;</span></div>
            <div className="ld-step" id="ls2"><div className="ld-dot"></div><span>Classificando i sistemi AI per livello di rischio&hellip;</span></div>
            <div className="ld-step" id="ls3"><div className="ld-dot"></div><span>Applicando framework AI Act Reg. 2024/1689&hellip;</span></div>
            <div className="ld-step" id="ls4"><div className="ld-dot"></div><span>Generando report PDF personalizzato&hellip;</span></div>
          </div>
          <div className="ld-note">Operazione tipicamente di 15&ndash;20 secondi</div>
        </div>
      </div>


      {/* ═══ SUCCESS ═══ */}
      <div id="success">
        <div className="sc-card">
          <div className="sc-icon"><span dangerouslySetInnerHTML={{ __html: markSvg(68) }} /></div>
          <h2>Report Pronto!</h2>
          <p>Il tuo report di compliance AI Act &egrave; stato generato. Il link di download &egrave; valido per 15 minuti.</p>
          <a className="btn-dl" id="downloadBtn" href="#" target="_blank">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Scarica Report PDF
          </a>
          <button className="btn-restart" onClick={w('doRestart')}>Esegui un nuovo assessment</button>
        </div>
      </div>

      {/* Inject API URL before wizard.js loads */}
      <script dangerouslySetInnerHTML={{ __html: `window.ACTIFY_API_URL='${API_URL}';` }} />
      <Script src="/wizard.js" strategy="afterInteractive" />
    </>
  );
}
