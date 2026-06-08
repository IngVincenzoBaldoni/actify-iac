'use client';

import Script from 'next/script';
import { logoSvg, markSvg, badgeSvg } from '@/lib/branding';

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
          <div className="l-nav-links">
            <a href="/perche-fidarti" className="l-nav-link">Perch&eacute; puoi fidarti</a>
            <a href="/chi-siamo" className="l-nav-link">Chi siamo</a>
            <a href="/faq" className="l-nav-link">FAQ</a>
          </div>
          <div className="l-pill"><span className="pulse"></span>Enforcement Active &middot; Sanzioni fino a &euro;35M in vigore</div>
          <div className="l-nav-auth">
            <a href="/login" className="l-nav-login">Accedi</a>
            <a href="/register" className="l-nav-register">Registrati</a>
          </div>
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

        {/* ═══ PERCHÉ PUOI FIDARTI ═══ */}
        <div className="l-trust" id="trust">
          <div className="l-trust-inner">
            <div className="l-trust-head">
              <div className="l-sol-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
                Perch&eacute; puoi fidarti
              </div>
              <h2>Siamo i nostri <em>primi clienti</em></h2>
              <p>Prima di chiederti di usare Actify, lo abbiamo usato su noi stessi. Ogni sistema AI che alimenta la nostra piattaforma &egrave; censito, classificato e verificato con il nostro stesso strumento. Questo &egrave; il risultato.</p>
            </div>

            <div className="l-trust-card">
              <div className="l-trust-badge-col">
                <span dangerouslySetInnerHTML={{ __html: badgeSvg(130) }} />
                <div className="l-trust-verified-row">
                  <span className="l-trust-v-chip">&#10003; Actify Verified Compliant</span>
                  <span className="l-trust-v-date">Reg. UE 2024/1689 &middot; maggio 2026</span>
                </div>
              </div>
              <div className="l-trust-right">
                <div className="l-trust-stats">
                  <div className="l-trust-stat"><div className="l-trust-stat-n">0</div><div className="l-trust-stat-l">Violazioni AI Act</div></div>
                  <div className="l-trust-stat"><div className="l-trust-stat-n">11</div><div className="l-trust-stat-l">Articoli verificati</div></div>
                  <div className="l-trust-stat"><div className="l-trust-stat-n">2</div><div className="l-trust-stat-l">Sistemi AI censiti</div></div>
                  <div className="l-trust-stat"><div className="l-trust-stat-n">100%</div><div className="l-trust-stat-l">Score conformit&agrave;</div></div>
                </div>
                <div className="l-trust-systems">
                  <div className="l-trust-sys">
                    <div className="l-trust-sys-dot l-sys-blue"></div>
                    <div className="l-trust-sys-info">
                      <div className="l-trust-sys-name">Claude Code</div>
                      <div className="l-trust-sys-vendor">Anthropic &middot; Uso interno sviluppatori</div>
                    </div>
                    <div className="comp-risk-badge comp-risk-min">Rischio Minimo</div>
                  </div>
                  <div className="l-trust-sys">
                    <div className="l-trust-sys-dot l-sys-orange"></div>
                    <div className="l-trust-sys-info">
                      <div className="l-trust-sys-name">Amazon Nova Pro</div>
                      <div className="l-trust-sys-vendor">AWS Bedrock &middot; Genera i tuoi report</div>
                    </div>
                    <div className="comp-risk-badge comp-risk-lim">Rischio Limitato</div>
                  </div>
                </div>
                <div className="l-trust-footer-row">
                  <a href="/perche-fidarti" className="comp-link-btn" style={{fontSize:'13px',padding:'9px 18px'}}>Scopri di pi&ugrave; &rarr;</a>
                  <a href="/compliance" style={{fontSize:'12px',color:'var(--muted)',textDecoration:'none'}}>Tutta la documentazione compliance</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="l-cards">
          <div className="l-card"><div className="card-icon ci-green">&#128737;</div><h3>Classificazione del Rischio</h3><p>Mappa i tuoi sistemi AI alle categorie dell&rsquo;AI Act (Annex III) e scopri il livello di rischio: vietato, alto, limitato o minimale.</p></div>
          <div className="l-card"><div className="card-icon ci-purple">&#128196;</div><h3>Report PDF Professionale</h3><p>Documento audit-ready con analisi per sistema, timeline di adeguamento e azioni prioritarie specifiche per il tuo settore.</p></div>
          <div className="l-card"><div className="card-icon ci-blue">&#128506;</div><h3>Roadmap Personalizzata</h3><p>Piano d&rsquo;azione con scadenze AI Act, obblighi specifici per il tuo ruolo (Provider o Deployer) e gap di governance identificati.</p></div>
        </div>

        {/* ═══ CHI SIAMO ═══ */}
        <div className="l-team" id="team">
          <div className="l-team-inner">
            <div className="l-team-head">
              <div className="l-sol-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Chi siamo
              </div>
              <h2>Due persone, <em>un&rsquo;ossessione</em></h2>
              <p>Siamo un team di due fondatori che hanno visto lo stesso problema da angolazioni diverse &mdash; e hanno deciso di risolverlo insieme.</p>
            </div>

            <div className="l-team-grid">

              {/* CTO */}
              <div className="l-team-card">
                <div className="l-avatar">
                  <div className="l-avatar-ring">
                    <div className="l-avatar-circle">
                      <svg className="l-avatar-placeholder" width="54" height="54" viewBox="0 0 54 54" fill="none">
                        <circle cx="27" cy="19" r="11" fill="white" fillOpacity="0.14"/>
                        <path d="M5 52C5 39.85 15.07 30 27 30C38.93 30 49 39.85 49 52" stroke="white" strokeOpacity="0.1" strokeWidth="2" fill="none"/>
                      </svg>
                    </div>
                  </div>
                  <div className="l-avatar-badge">CTO</div>
                </div>
                <h3 className="l-team-name">Co-Founder &amp; CTO</h3>
                <div className="l-team-role">Ingegnere Cloud AI &middot; AWS Specialist</div>
                <p className="l-team-bio">
                  5+ anni di consulenza IT su architetture cloud AWS per PMI e scale-up europee. Specializzato in sistemi AI generativi su infrastruttura serverless, con focus su automazione, IaC e sicurezza cloud. Ha guidato la progettazione tecnica di sistemi AI in settori come fintech, healthcare e manifatturiero.
                </p>
                <div className="l-team-tags">
                  {['AWS', 'AI/ML', 'Serverless', 'IaC', 'Python', 'TypeScript'].map(t => (
                    <span key={t} className="l-team-tag">{t}</span>
                  ))}
                </div>
              </div>

              {/* CEO */}
              <div className="l-team-card">
                <div className="l-avatar">
                  <div className="l-avatar-ring">
                    <div className="l-avatar-circle">
                      <svg className="l-avatar-placeholder" width="54" height="54" viewBox="0 0 54 54" fill="none">
                        <circle cx="27" cy="19" r="11" fill="white" fillOpacity="0.14"/>
                        <path d="M5 52C5 39.85 15.07 30 27 30C38.93 30 49 39.85 49 52" stroke="white" strokeOpacity="0.1" strokeWidth="2" fill="none"/>
                      </svg>
                    </div>
                  </div>
                  <div className="l-avatar-badge">CEO</div>
                </div>
                <h3 className="l-team-name">Co-Founder &amp; CEO</h3>
                <div className="l-team-role">AI Strategy &middot; PMI Specialist</div>
                <p className="l-team-bio">
                  10+ anni nell&rsquo;adozione di soluzioni AI nelle PMI italiane ed europee. Ha accompagnato oltre 50 aziende in settori come retail, logistica, HR e servizi professionali nell&rsquo;integrazione di strumenti AI. Traduce complessit&agrave; normativa in opportunit&agrave; concreta di business.
                </p>
                <div className="l-team-tags">
                  {['AI Strategy', 'PMI', 'AI Act', 'Business Dev', 'Operations'].map(t => (
                    <span key={t} className="l-team-tag">{t}</span>
                  ))}
                </div>
              </div>

            </div>
            <div style={{textAlign:'center',marginTop:'40px'}}>
              <a href="/chi-siamo" className="btn-ss">Chi siamo &rarr;</a>
            </div>
          </div>
        </div>

      </section>


      {/* ═══ WIZARD ═══ */}
      <div id="app">
        <nav className="w-nav">
          <div className="w-logo"><span dangerouslySetInnerHTML={{ __html: logoSvg(162, 45) }} /></div>
          <div className="w-step-info" id="stepInfo">Step 1 di 5</div>
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
              <div className="field">
                <label>Email per ricevere il report *</label>
                <input type="email" id="contactEmail" placeholder="mario@azienda.it (preferibilmente aziendale)" autoComplete="email" />
                <div className="locked-note" style={{marginTop:6}}>Il PDF del report verrà inviato a questo indirizzo. Nessun account richiesto.</div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Settore *</label>
                  <select id="companySector" onChange={e => {
                    const el = document.getElementById('companySectorCustom') as HTMLElement | null;
                    if (el) el.style.display = e.target.value === 'Altro - specifica' ? 'block' : 'none';
                  }}>
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
                    <option>Immobiliare / PropTech</option>
                    <option>Trasporti / Mobilit&agrave;</option>
                    <option>Costruzioni / Edilizia</option>
                    <option>Turismo / Hospitality</option>
                    <option>Telecomunicazioni</option>
                    <option>Agricoltura / Agritech</option>
                    <option>Altro - specifica</option>
                  </select>
                  <input
                    type="text"
                    id="companySectorCustom"
                    style={{ display: 'none', marginTop: 8 }}
                    placeholder="Es. Agroalimentare, Moda, Sport&hellip;"
                  />
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
                  <label>Fatturato annuo (opzionale)</label>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input
                      type="number"
                      id="revenueExact"
                      placeholder="Es. 4500000"
                      min="0"
                      style={{flex:1}}
                      onChange={e => {
                        const rangeEl = document.getElementById('revenueRange') as HTMLSelectElement | null;
                        if (rangeEl) rangeEl.disabled = !!e.target.value;
                        if (rangeEl) rangeEl.style.opacity = e.target.value ? '0.45' : '1';
                      }}
                    />
                    <span style={{fontSize:12,color:'var(--dim)',whiteSpace:'nowrap'}}>EUR / anno</span>
                  </div>
                  <select
                    id="revenueRange"
                    style={{marginTop:8}}
                  >
                    <option value="">&#8212; Oppure seleziona un range &#8212;</option>
                    <option value="under_100k">Meno di &euro;100K</option>
                    <option value="100k_500k">&euro;100K &ndash; &euro;500K</option>
                    <option value="500k_1m">&euro;500K &ndash; &euro;1M</option>
                    <option value="1m_3m">&euro;1M &ndash; &euro;3M</option>
                    <option value="3m_10m">&euro;3M &ndash; &euro;10M</option>
                    <option value="10m_30m">&euro;10M &ndash; &euro;30M</option>
                    <option value="30m_100m">&euro;30M &ndash; &euro;100M</option>
                    <option value="100m_500m">&euro;100M &ndash; &euro;500M</option>
                    <option value="500m_1b">&euro;500M &ndash; &euro;1B</option>
                    <option value="over_1b">Oltre &euro;1B</option>
                  </select>
                  <div className="locked-note" style={{marginTop:6}}>
                    Usato esclusivamente per stimare le sanzioni economiche Art. 99 AI Act nel report. Il fatturato esatto ha priorità sul range. Nessun dato condiviso con terze parti.
                  </div>
                </div>
              </div>
            </div>
            <div id="emailError" style={{display:'none',color:'#DC2626',fontSize:13,marginTop:12,padding:'10px 14px',background:'rgba(220,38,38,0.08)',borderRadius:8,border:'1px solid rgba(220,38,38,0.25)'}}></div>
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
            {/* 1-tool limit banner — shown by wizard.js when limit is reached */}
            <div id="toolLimitNotice" style={{display:'none'}} className="fcard" aria-live="polite">
              <div style={{display:'flex',alignItems:'flex-start',gap:'12px',background:'#FFF7ED',border:'1px solid #FED7AA',borderLeft:'4px solid #EA580C',borderRadius:'8px',padding:'14px 16px'}}>
                <span style={{fontSize:'20px',flexShrink:0}}>🔒</span>
                <div>
                  <div style={{fontWeight:700,fontSize:'14px',color:'#9A3412',marginBottom:'4px'}}>
                    Form gratuito: 1 sistema AI
                  </div>
                  <div style={{fontSize:'13px',color:'#92400E',lineHeight:'1.6'}}>
                    Hai già aggiunto il sistema AI per questo assessment gratuito. Per censire più tool e ottenere un&rsquo;analisi completa del tuo inventario AI, <a href="/register" style={{color:'#EA580C',fontWeight:600}}>crea un account Actify</a>.
                  </div>
                </div>
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
                <p>Seleziona l&rsquo;LLM che la tua organizzazione utilizza.</p>
                <div className="llm-grid" id="llmGrid"></div>
                <div id="llmDetails"></div>
              </div>
              <div className="fcard">
                <h3>B. Sistemi AI Specializzati</h3>
                <p>Sistema AI verticale per funzioni specifiche (recruiting AI, credit scoring, diagnostica, ecc.).</p>
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

          {/* Step 4 */}
          <div id="step4" className="step-panel" style={{display:'none'}}>
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

          {/* Step 5 */}
          <div id="step5" className="step-panel" style={{display:'none'}}>
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
          <h2>Report in Arrivo!</h2>
          <p>Il tuo report di compliance AI Act &egrave; stato generato e inviato via email a:</p>
          <div id="successEmail" style={{fontWeight:700,fontSize:18,color:'var(--green)',margin:'12px 0',letterSpacing:'-0.3px'}}></div>
          <p style={{fontSize:13,color:'var(--muted)'}}>Controlla la tua casella (e la cartella spam). Il link nel report &egrave; valido per <strong>24 ore</strong>.</p>
          {/* wizard.js populates this when pmi_id + referral_code are available */}
          <div id="successRegisterCta" style={{display:'none',textAlign:'center',marginTop:8}}></div>
          <a href="/" className="btn-restart" style={{display:'inline-block',textDecoration:'none',textAlign:'center',marginTop:16}}>Torna alla home</a>
        </div>
      </div>

      {/* Inject API URL before wizard.js loads */}
      <script dangerouslySetInnerHTML={{ __html: `window.ACTIFY_API_URL='${API_URL}';` }} />
      <Script src="/wizard.js" strategy="afterInteractive" />
    </>
  );
}
