// ── Constants ─────────────────────────────────────────────────────────────────
var STEP_NAMES = ['Profilo Azienda', 'Ruolo & Sistemi AI', 'AI Readiness', 'Contesto', 'Riepilogo'];
var TOTAL_STEPS = 5;

var AI_CATS = [
  {v:'hr',        l:'HR & Recruiting'},
  {v:'finance',   l:'Finanza & Contabilità'},
  {v:'marketing', l:'Marketing & Vendite'},
  {v:'operations',l:'Operations & Logistica'},
  {v:'legal',     l:'Legale & Compliance'},
  {v:'tech',      l:'Tecnico-IT & Sviluppo'},
  {v:'healthcare',l:'Sanità & Life Sciences'},
  {v:'other',     l:'Altro (specifica sotto)'}
];

var LLM_LIST = [
  {id:'chatgpt',    l:'ChatGPT',    v:'OpenAI'},
  {id:'claude',     l:'Claude',     v:'Anthropic'},
  {id:'gemini',     l:'Gemini',     v:'Google'},
  {id:'copilot',    l:'Copilot',    v:'Microsoft'},
  {id:'llama',      l:'Llama',      v:'Meta'},
  {id:'mistral',    l:'Mistral',    v:'Mistral AI'},
  {id:'perplexity', l:'Perplexity', v:'Perplexity AI'},
  {id:'grok',       l:'Grok',       v:'xAI'},
  {id:'other_llm',  l:'Altro LLM',  v:''}
];

var DECISION_DOMAINS = [
  {v:'hiring',                l:'Assunzione, selezione, screening personale'},
  {v:'performance_management',l:'Valutazione prestazioni, promozioni, licenziamenti'},
  {v:'credit_scoring',        l:'Valutazione creditizia, prestiti, scoring finanziario'},
  {v:'insurance',             l:'Assicurazioni: underwriting, tariffazione, sinistri'},
  {v:'healthcare_diagnosis',  l:'Diagnosi medica, supporto clinico, triage'},
  {v:'education_assessment',  l:'Valutazione studenti, accesso all\'istruzione'},
  {v:'public_services',       l:'Accesso a servizi pubblici, sussidi, benefici'},
  {v:'law_enforcement',       l:'Forze dell\'ordine, biometria, sorveglianza'},
  {v:'content_moderation',    l:'Moderazione contenuti, accesso a piattaforme'},
  {v:'other_decisions',       l:'Altre decisioni con impatto su persone fisiche'}
];

var DATA_TYPES = [
  {v:'biometric',           l:'Biometrici (volto, voce, impronte, andatura)'},
  {v:'health',              l:'Sanitari, cartelle cliniche, stati di salute'},
  {v:'financial',           l:'Finanziari, bancari, reddituali'},
  {v:'behavioral',          l:'Comportamentali, pattern di utilizzo'},
  {v:'location',            l:'Geolocalizzazione o movimenti fisici'},
  {v:'personal_identifiers',l:'Identificatori personali (nome, CF, email)'},
  {v:'sensitive_categories',l:'Categorie speciali GDPR (etnia, religione, ecc.)'}
];

var OUTPUT_TYPES = [
  {v:'recommendation',        l:'Raccomandazione',          d:'Suggerisce azioni o scelte, ma l\'utente finale prende la decisione'},
  {v:'automated_decision',    l:'Decisione Automatica',     d:'Il sistema agisce o decide autonomamente, senza intervento umano nel loop'},
  {v:'content_generation',    l:'Generazione Contenuto',    d:'Produce testo, immagini, codice, audio o altri media'},
  {v:'classification_scoring',l:'Classificazione / Scoring',d:'Categorizza soggetti o assegna punteggi (es. credit score, ranking candidati)'}
];

var ACCESS_MODES = [
  {v:'chat_ui',          l:'Chat web / interfaccia UI'},
  {v:'api',              l:'API / integrazione programmatica'},
  {v:'internal_product', l:'Integrato in prodotto o applicazione interna'},
  {v:'plugin',           l:'Plugin su software aziendale (Office, CRM, ERP…)'}
];

var AI_SYSTEM_TYPES = [
  {v:'supervised_ml',   l:'Machine Learning supervisionato', d:'Modelli addestrati su dati etichettati: classificazione, regressione, ranking'},
  {v:'generative',      l:'AI Generativa',                   d:'LLM, modelli di diffusione immagini, text-to-speech, code generation'},
  {v:'rule_based',      l:'Rule-based / Sistemi esperti',    d:'Logica decisionale basata su regole esplicite o alberi decisionali'},
  {v:'computer_vision', l:'Computer Vision',                 d:'Analisi, classificazione e riconoscimento in immagini o video'},
  {v:'nlp',             l:'NLP / Elaborazione linguaggio',   d:'Analisi del testo, sentiment, NER, traduzione automatica'}
];

var DISTRIBUTION_COUNTRIES = [
  {v:'italy',    l:'Italia'},
  {v:'eu_other', l:'UE — altri paesi membro'},
  {v:'extra_eu', l:'Extra-UE (UK, USA, Asia, ecc.)'}
];

// ── State ─────────────────────────────────────────────────────────────────────
var cur = 1;
var isProvider = false;
var isDeployer = false;
var providerSystems = [];
var deployerLlmSelected = [];
var deployerSpecialized = [];
var loadTimer;
var loadStep = 0;

var FREE_TOOL_LIMIT = 1;
var PARTNER_TOKEN = (function() {
  try { return new URLSearchParams(window.location.search).get('token') || null; } catch(e) { return null; }
})();
var PARTNER_PMI_ID = null;
var PARTNER_REFERRAL_CODE = null;

// Fetch assessment form metadata so we can build the registration CTA in the success screen
async function loadPartnerFormData() {
  if (!PARTNER_TOKEN) return;
  try {
    var apiUrl = (window.ACTIFY_API_URL || '');
    var res = await fetch(apiUrl + '/api/assessment/' + PARTNER_TOKEN);
    if (!res.ok) return;
    var data = await res.json();
    PARTNER_PMI_ID = data.pmi_id || null;
    PARTNER_REFERRAL_CODE = data.referral_code || null;
  } catch(e) { /* non-blocking */ }
}

function totalTools() {
  return providerSystems.length + deployerLlmSelected.length + deployerSpecialized.length;
}
function showToolLimitAlert() {
  alert('Il form gratuito permette di analizzare 1 solo sistema AI.\nRegistrati su Actify per censire più tool e ottenere un\'analisi completa del tuo inventario AI.');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
function startWizard() {
  document.getElementById('landing').style.display = 'none';
  var app = document.getElementById('app');
  app.style.display = 'flex';
  app.style.flexDirection = 'column';
  refreshUI();
  loadPartnerFormData(); // non-blocking — populates PARTNER_PMI_ID + PARTNER_REFERRAL_CODE for success CTA
}
function exitWizard() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('landing').style.display = 'flex';
}
function doRestart() {
  cur = 1; isProvider = false; isDeployer = false;
  providerSystems = []; deployerLlmSelected = []; deployerSpecialized = [];
  document.getElementById('success').style.display = 'none';
  document.getElementById('landing').style.display = 'flex';
}

// ── Stepper ───────────────────────────────────────────────────────────────────
function renderStepper() {
  document.getElementById('stepper').innerHTML = STEP_NAMES.map(function(name, i) {
    var n = i + 1;
    var done = n < cur, active = n === cur;
    var dc = done ? 'done' : active ? 'active' : '';
    var nc = done ? 'done' : active ? 'active' : '';
    var lc = n < cur ? 'done' : '';
    var icon = done ? '&#10003;' : String(n);
    var line = n < TOTAL_STEPS ? '<div class="s-line ' + lc + '"></div>' : '';
    return '<div class="s-item"><div class="s-dot-wrap"><div class="s-dot ' + dc + '">' + icon + '</div>'
      + '<div class="s-name ' + nc + '">' + name + '</div></div>' + line + '</div>';
  }).join('');
}

// ── Navigation ────────────────────────────────────────────────────────────────
function goNext() {
  if (!validate(cur)) return;
  if (cur === 1) { checkEmailAndProceed(); return; }
  if (cur < TOTAL_STEPS) {
    document.getElementById('step' + cur).style.display = 'none';
    cur++;
    document.getElementById('step' + cur).style.display = '';
    refreshUI();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
}
function goBack() {
  if (cur > 1) {
    document.getElementById('step' + cur).style.display = 'none';
    cur--;
    document.getElementById('step' + cur).style.display = '';
    refreshUI();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
}
function refreshUI() {
  renderStepper();
  document.getElementById('stepInfo').textContent = 'Step ' + cur + ' di ' + TOTAL_STEPS;
  document.getElementById('btnBack').style.display = cur === 1 ? 'none' : '';
  document.getElementById('btnNext').style.display = cur === TOTAL_STEPS ? 'none' : '';
  document.getElementById('btnSubmit').style.display = cur === TOTAL_STEPS ? '' : 'none';
  if (cur === TOTAL_STEPS) renderReview();
  if (cur === 2) { renderLlmGrid(); renderProviderSystems(); renderDeployerSpecialized(); renderLlmDetails(); }
}

// ── Validation ────────────────────────────────────────────────────────────────
function validate(s) {
  if (s === 1) {
    if (!fv('companyName'))   { alert('Inserisci il nome dell\'azienda.'); return false; }
    var email = fv('contactEmail');
    if (!email) { alert('Inserisci la tua email per ricevere il report.'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Inserisci un indirizzo email valido.'); return false; }
    if (!fv('companySector')) { alert('Seleziona il settore.'); return false; }
    if (fv('companySector') === 'Altro - specifica' && !fv('companySectorCustom')) { alert('Specifica il tuo settore nel campo di testo.'); return false; }
    if (!fv('companySize'))   { alert('Seleziona la dimensione aziendale.'); return false; }
    if (!fv('companySede'))   { alert('Seleziona la sede legale.'); return false; }
  }
  if (s === 2) {
    var prov = document.getElementById('isProvider').checked;
    var dep  = document.getElementById('isDeployer').checked;
    if (!prov && !dep) { alert('Seleziona almeno un ruolo: Provider o Deployer.'); return false; }
    var hasTools = (prov && providerSystems.length > 0) || (dep && (deployerLlmSelected.length > 0 || deployerSpecialized.length > 0));
    if (!hasTools) {
      return confirm('Nessun sistema AI inserito. Il report sarà significativamente meno preciso. Continuare comunque?');
    }
  }
  return true;
}
function fv(id) { return (document.getElementById(id) || {value: ''}).value.trim(); }
function companyName() { return fv('companyName') || 'la tua azienda'; }

// ── Role toggle ───────────────────────────────────────────────────────────────
function toggleRole() {
  isProvider = document.getElementById('isProvider').checked;
  isDeployer = document.getElementById('isDeployer').checked;
  document.getElementById('providerSection').style.display = isProvider ? '' : 'none';
  document.getElementById('deployerSection').style.display = isDeployer ? '' : 'none';
  if (isProvider && !providerSystems.length) { addProviderSystem(); return; }
  if (isDeployer) { renderLlmGrid(); renderDeployerSpecialized(); renderLlmDetails(); }
  renderProviderSystems();
}

// ── Target Users helper ───────────────────────────────────────────────────────
function renderTargetChecks(type, idx, sel) {
  var vals = ['employees', 'customers', 'third_parties'];
  var labs = ['Dipendenti Interni', 'Clienti / Utenti', 'Terze Parti (es. candidati)'];
  var h = '<div class="field"><label>Utenti Target</label><div class="mini-checks">';
  for (var j = 0; j < vals.length; j++) {
    var chk = sel && sel.indexOf(vals[j]) >= 0 ? ' checked' : '';
    h += '<label class="mini-chk"><input type="checkbox"' + chk
      + ' onchange="toggleTarget(\'' + type + '\',' + idx + ',\'' + vals[j] + '\',this.checked)">'
      + labs[j] + '</label>';
  }
  h += '</div></div>';
  return h;
}
function toggleTarget(type, idx, val, on) {
  var arr = type === 'prov' ? providerSystems : type === 'llm' ? deployerLlmSelected : deployerSpecialized;
  var tu = arr[idx].target_users;
  if (on) { if (tu.indexOf(val) < 0) tu.push(val); }
  else { var ix = tu.indexOf(val); if (ix >= 0) tu.splice(ix, 1); }
  if (type !== 'prov') updateDeployerExtras(type, idx);
}
function updateDeployerExtras(type, idx) {
  var el = document.getElementById('dep-extras-' + type + '-' + idx);
  if (!el) return;
  var tmp = document.createElement('div');
  tmp.innerHTML = renderDeployerExtras(type, idx, getSysArr(type)[idx]);
  el.parentNode.replaceChild(tmp.firstChild, el);
}

// ── Decision section helpers ───────────────────────────────────────────────────
function getSysArr(type) {
  return type === 'prov' ? providerSystems : type === 'llm' ? deployerLlmSelected : deployerSpecialized;
}
function setSystemField(type, idx, field, val) {
  getSysArr(type)[idx][field] = val;
}
function toggleSystemArray(type, idx, field, val, on) {
  var arr = getSysArr(type)[idx][field];
  if (on) { if (arr.indexOf(val) < 0) arr.push(val); }
  else { var i = arr.indexOf(val); if (i >= 0) arr.splice(i, 1); }
}

function renderDeployerExtras(type, idx, sys) {
  var hasExternal = sys.target_users && (sys.target_users.indexOf('customers') >= 0 || sys.target_users.indexOf('third_parties') >= 0);
  var isInternalOnly = sys.target_users && sys.target_users.length > 0 && !hasExternal;

  var outputHtml = OUTPUT_TYPES.map(function(o) {
    var chk = sys.output_type === o.v ? ' checked' : '';
    return '<label class="radio-card">'
      + '<input type="radio" name="ot_' + type + '_' + idx + '" value="' + o.v + '"' + chk
      + ' onchange="setSystemField(\'' + type + '\',' + idx + ',\'output_type\',\'' + o.v + '\')">'
      + '<div class="rc-row"><div class="rc-title">' + o.l + '</div><div class="rc-dot"></div></div>'
      + '<div class="rc-desc">' + o.d + '</div></label>';
  }).join('');
  var accessHtml = ACCESS_MODES.map(function(a) {
    var chk = sys.access_modes && sys.access_modes.indexOf(a.v) >= 0 ? ' checked' : '';
    return '<label class="check-row"><input type="checkbox"' + chk
      + ' onchange="toggleSystemArray(\'' + type + '\',' + idx + ',\'access_modes\',\'' + a.v + '\',this.checked)">'
      + '<span>' + a.l + '</span></label>';
  }).join('');

  var uaStyle = '', uaNote = '';
  if (hasExternal) {
    if (!sys.users_aware) {
      uaStyle = ' style="border-color:rgba(251,146,60,.55);background:rgba(251,146,60,.04)"';
      uaNote  = '<div style="font-size:11px;font-weight:700;color:#FB923C;margin-top:6px">&#9888; Obbligatorio &mdash; Art. 50 AI Act</div>';
    } else {
      uaStyle = ' style="border-color:rgba(34,197,94,.4)"';
      uaNote  = '<div style="font-size:11px;font-weight:700;color:var(--green);margin-top:6px">&#10003; Conforme &mdash; Art. 50 AI Act</div>';
    }
  } else if (isInternalOnly) {
    uaNote = '<div style="font-size:11px;color:var(--dim);margin-top:6px">&#8505; Meno critico per sistemi ad uso interno esclusivo</div>';
  }

  return '<div id="dep-extras-' + type + '-' + idx + '" class="dec-section">'
    + '<div class="dec-title">Contesto di Deployment</div>'
    + '<div class="dec-sub">Tipo di Output</div>'
    + '<div class="radio-grid">' + outputHtml + '</div>'
    + '<div class="dec-sub" style="margin-top:14px">Modalità di Accesso</div>'
    + '<div class="check-list cl-2col">' + accessHtml + '</div>'
    + '<div class="check-cards" style="margin-top:14px">'
    + '<label class="check-card"' + (sys.is_customized ? ' style="border-color:rgba(251,146,60,.35)"' : '') + '><input type="checkbox"' + (sys.is_customized ? ' checked' : '')
    + ' onchange="setSystemField(\'' + type + '\',' + idx + ',\'is_customized\',this.checked)">'
    + '<div><div class="cc-title">Il modello è stato customizzato</div>'
    + '<div class="cc-desc">System prompt fissi, fine-tuning su dati aziendali, RAG su knowledge base interna. Se sì, le responsabilità del deployer si avvicinano a quelle del provider.</div></div></label>'
    + '<label class="check-card"' + uaStyle + '><input type="checkbox"' + (sys.users_aware ? ' checked' : '')
    + ' onchange="setSystemField(\'' + type + '\',' + idx + ',\'users_aware\',this.checked);updateDeployerExtras(\'' + type + '\',' + idx + ')">'
    + '<div><div class="cc-title">Gli utenti finali sanno di interagire con AI</div>'
    + '<div class="cc-desc">Obbligo di trasparenza Art. 50 AI Act: notifica chiara agli utenti che stanno interagendo con un sistema AI, non con un essere umano.</div>'
    + uaNote + '</div></label>'
    + '</div>'
    + '</div>';
}

function renderProviderExtras(idx, sys) {
  var typeHtml = AI_SYSTEM_TYPES.map(function(t) {
    var chk = sys.ai_system_type === t.v ? ' checked' : '';
    return '<label class="radio-card">'
      + '<input type="radio" name="ast_prov_' + idx + '" value="' + t.v + '"' + chk
      + ' onchange="setSystemField(\'prov\',' + idx + ',\'ai_system_type\',\'' + t.v + '\')">'
      + '<div class="rc-row"><div class="rc-title">' + t.l + '</div><div class="rc-dot"></div></div>'
      + '<div class="rc-desc">' + t.d + '</div></label>';
  }).join('');
  var countryHtml = DISTRIBUTION_COUNTRIES.map(function(c) {
    var chk = sys.distribution_countries && sys.distribution_countries.indexOf(c.v) >= 0 ? ' checked' : '';
    return '<label class="check-row"><input type="checkbox"' + chk
      + ' onchange="toggleSystemArray(\'prov\',' + idx + ',\'distribution_countries\',\'' + c.v + '\',this.checked)">'
      + '<span>' + c.l + '</span></label>';
  }).join('');
  return '<div class="dec-section">'
    + '<div class="dec-title">Specifiche Provider</div>'
    + '<div class="dec-sub">Tipo di Sistema AI</div>'
    + '<div class="radio-grid">' + typeHtml + '</div>'
    + '<div class="dec-sub" style="margin-top:14px">Obblighi Provider (Art. 9–15 • 11 • 72)</div>'
    + '<div class="check-cards">'
    + '<label class="check-card"><input type="checkbox"' + (sys.is_tested ? ' checked' : '')
    + ' onchange="setSystemField(\'prov\',' + idx + ',\'is_tested\',this.checked)">'
    + '<div><div class="cc-title">Il sistema è stato testato e validato</div>'
    + '<div class="cc-desc">Test su dataset rappresentativi, validazione performance, gestione bias e accuratezza (Art. 9–15 AI Act)</div></div></label>'
    + '<label class="check-card"><input type="checkbox"' + (sys.has_tech_docs ? ' checked' : '')
    + ' onchange="setSystemField(\'prov\',' + idx + ',\'has_tech_docs\',this.checked)">'
    + '<div><div class="cc-title">Esiste documentazione tecnica</div>'
    + '<div class="cc-desc">Documentazione completa ex Art. 11 AI Act: architettura, dati di training, performance attese, limitazioni note</div></div></label>'
    + '<label class="check-card"><input type="checkbox"' + (sys.has_monitoring ? ' checked' : '')
    + ' onchange="setSystemField(\'prov\',' + idx + ',\'has_monitoring\',this.checked)">'
    + '<div><div class="cc-title">Sistema di post-market monitoring attivo</div>'
    + '<div class="cc-desc">Monitoraggio continuo post-deployment, raccolta feedback, gestione anomalie e incidenti (Art. 72 AI Act)</div></div></label>'
    + '</div>'
    + '<div class="dec-sub" style="margin-top:14px">Paesi di Distribuzione</div>'
    + '<div class="check-list cl-2col">' + countryHtml + '</div>'
    + '</div>';
}

function renderDecisionSection(type, idx, sys) {
  var HOV = [
    {v:'always',    l:'Sempre presente', d:'Ogni output AI è revisionato da un operatore umano prima di produrre effetti'},
    {v:'sometimes', l:'In alcuni casi',  d:'Supervisione solo per decisioni ad alto rischio; il resto è automatico'},
    {v:'never',     l:'Mai — Full Auto', d:'Il sistema decide o agisce autonomamente, senza intervento umano nel loop'},
    {v:'na',        l:'Non applicabile', d:'Il sistema non produce decisioni con impatto su persone fisiche'}
  ];
  var radioHtml = HOV.map(function(h) {
    var chk = sys.human_oversight === h.v ? ' checked' : '';
    return '<label class="radio-card">'
      + '<input type="radio" name="ho_' + type + '_' + idx + '" value="' + h.v + '"' + chk
      + ' onchange="setSystemField(\'' + type + '\',' + idx + ',\'human_oversight\',\'' + h.v + '\')">'
      + '<div class="rc-row"><div class="rc-title">' + h.l + '</div><div class="rc-dot"></div></div>'
      + '<div class="rc-desc">' + h.d + '</div></label>';
  }).join('');
  var domHtml = DECISION_DOMAINS.map(function(d) {
    var chk = sys.decision_domains.indexOf(d.v) >= 0 ? ' checked' : '';
    return '<label class="check-row"><input type="checkbox"' + chk
      + ' onchange="toggleSystemArray(\'' + type + '\',' + idx + ',\'decision_domains\',\'' + d.v + '\',this.checked)">'
      + '<span>' + d.l + '</span></label>';
  }).join('');
  var dtHtml = DATA_TYPES.map(function(d) {
    var chk = sys.data_types.indexOf(d.v) >= 0 ? ' checked' : '';
    return '<label class="check-row"><input type="checkbox"' + chk
      + ' onchange="toggleSystemArray(\'' + type + '\',' + idx + ',\'data_types\',\'' + d.v + '\',this.checked)">'
      + '<span>' + d.l + '</span></label>';
  }).join('');

  return '<div class="dec-section">'
    + '<div class="dec-title">Decisioni &amp; Human-in-the-Loop</div>'
    + '<div class="check-cards">'
    + '<label class="check-card"><input type="checkbox"' + (sys.makes_decisions ? ' checked' : '')
    + ' onchange="setSystemField(\'' + type + '\',' + idx + ',\'makes_decisions\',this.checked)">'
    + '<div><div class="cc-title">Produce decisioni o raccomandazioni che impattano persone fisiche</div>'
    + '<div class="cc-desc">Include: assunzione, accesso al credito, diagnosi, valutazione scolastica, scoring comportamentale</div></div></label>'
    + '<label class="check-card"><input type="checkbox"' + (sys.affects_vulnerable ? ' checked' : '')
    + ' onchange="setSystemField(\'' + type + '\',' + idx + ',\'affects_vulnerable\',this.checked)">'
    + '<div><div class="cc-title">Interagisce con soggetti vulnerabili</div>'
    + '<div class="cc-desc">Minori, anziani, persone con disabilità, persone in difficoltà economica o emotiva</div></div></label>'
    + '</div>'
    + '<div class="dec-sub">Supervisione Umana (Human-in-the-Loop)</div>'
    + '<div class="radio-grid">' + radioHtml + '</div>'
    + '<div class="dec-sub">Ambiti di Decisione</div>'
    + '<div class="check-list cl-2col">' + domHtml + '</div>'
    + '<div class="dec-sub">Tipologie di Dati Trattati</div>'
    + '<div class="check-list cl-2col">' + dtHtml + '</div>'
    + '</div>';
}

// ── Provider Systems ──────────────────────────────────────────────────────────
function addProviderSystem() {
  if (totalTools() >= FREE_TOOL_LIMIT) { showToolLimitAlert(); return; }
  providerSystems.push({
    tool_name: '', category: 'tech', purpose: '', target_users: [],
    ai_system_type: '', is_tested: false, has_tech_docs: false, has_monitoring: false, distribution_countries: [],
    makes_decisions: false, affects_vulnerable: false,
    human_oversight: 'na', decision_domains: [], data_types: []
  });
  renderProviderSystems();
}
function removeProviderSystem(i) { providerSystems.splice(i, 1); renderLlmGrid(); renderProviderSystems(); }
function renderProviderSystems() {
  var c = document.getElementById('providerList'); if (!c) return;
  // Sync tool limit notice
  var notice = document.getElementById('toolLimitNotice');
  if (notice) notice.style.display = totalTools() >= FREE_TOOL_LIMIT ? '' : 'none';
  if (!providerSystems.length) {
    c.innerHTML = '<div class="empty"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="8" y="12" width="24" height="20" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M14 20h12M14 26h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><p>Nessun sistema proprietario aggiunto.</p></div>';
    return;
  }
  c.innerHTML = providerSystems.map(function(s, i) {
    var catOpts = AI_CATS.map(function(cat) {
      return '<option value="' + cat.v + '"' + (s.category === cat.v ? ' selected' : '') + '>' + cat.l + '</option>';
    }).join('');
    var tuHtml = renderTargetChecks('prov', i, s.target_users);
    return '<div class="tool-card">'
      + '<div class="tc-head">'
      + '<span class="tc-num">Sistema Proprietario #' + (i + 1) + '</span>'
      + '<button class="btn-rm" onclick="removeProviderSystem(' + i + ')">&#10005; Rimuovi</button>'
      + '</div>'
      + '<div class="field-row">'
      + '<div class="field"><label>Nome Sistema *</label>'
      + '<input type="text" value="' + esc(s.tool_name) + '" placeholder="Es. Actify Analytics, SmartHire..." oninput="providerSystems[' + i + '].tool_name=this.value"></div>'
      + '<div class="field"><label>Categoria</label>'
      + '<select onchange="providerSystems[' + i + '].category=this.value">' + catOpts + '</select></div>'
      + '</div>'
      + '<div class="field"><label>Vendor / Sviluppatore</label>'
      + '<input type="text" value="' + esc(companyName()) + '" readonly style="opacity:.45;cursor:not-allowed" placeholder="(nome azienda da Step 1)"></div>'
      + '<div class="field"><label>Finalità d\'uso *</label>'
      + '<textarea rows="2" placeholder="A cosa serve, come viene usato, quali decisioni supporta..." oninput="providerSystems[' + i + '].purpose=this.value">' + esc(s.purpose) + '</textarea></div>'
      + tuHtml
      + renderProviderExtras(i, s)
      + renderDecisionSection('prov', i, s)
      + '</div>';
  }).join('');
}

// ── Deployer LLM ──────────────────────────────────────────────────────────────
function toggleLlm(id) {
  var llm = null;
  for (var k = 0; k < LLM_LIST.length; k++) { if (LLM_LIST[k].id === id) { llm = LLM_LIST[k]; break; } }
  if (!llm) return;
  var existing = -1;
  for (var m = 0; m < deployerLlmSelected.length; m++) { if (deployerLlmSelected[m].id === id) { existing = m; break; } }
  if (existing >= 0) {
    deployerLlmSelected.splice(existing, 1);
  } else {
    if (totalTools() >= FREE_TOOL_LIMIT) { showToolLimitAlert(); return; }
    deployerLlmSelected.push({
      id: id, label: llm.l, vendor: llm.v, custom_name: '', purpose: '', target_users: [],
      output_type: '', access_modes: [], is_customized: false, users_aware: false,
      makes_decisions: false, affects_vulnerable: false,
      human_oversight: 'na', decision_domains: [], data_types: []
    });
  }
  renderLlmGrid();
  renderLlmDetails();
}
function renderLlmGrid() {
  var g = document.getElementById('llmGrid'); if (!g) return;
  var atLimit = totalTools() >= FREE_TOOL_LIMIT;
  g.innerHTML = LLM_LIST.map(function(llm) {
    var sel = false;
    for (var k = 0; k < deployerLlmSelected.length; k++) { if (deployerLlmSelected[k].id === llm.id) { sel = true; break; } }
    var disabled = atLimit && !sel;
    return '<button type="button" class="llm-chip' + (sel ? ' sel' : '') + (disabled ? ' disabled' : '') + '"'
      + (disabled ? ' style="opacity:.35;cursor:not-allowed"' : '')
      + ' onclick="toggleLlm(\'' + llm.id + '\')">'
      + '<span class="llm-chip-name">' + llm.l + '</span>'
      + '<span class="llm-chip-vendor">' + llm.v + '</span>'
      + '</button>';
  }).join('');
  // Show / hide limit notice
  var notice = document.getElementById('toolLimitNotice');
  if (notice) notice.style.display = atLimit ? '' : 'none';
}
function renderLlmDetails() {
  var c = document.getElementById('llmDetails'); if (!c) return;
  if (!deployerLlmSelected.length) { c.innerHTML = ''; return; }
  c.innerHTML = '<div style="margin-top:16px">'
    + deployerLlmSelected.map(function(l, i) {
      var nameField = l.id === 'other_llm'
        ? '<div class="field"><label>Nome strumento</label><input type="text" value="' + esc(l.custom_name) + '" placeholder="Nome dello strumento LLM..." oninput="deployerLlmSelected[' + i + '].custom_name=this.value"></div>'
          + '<div class="field"><label>Vendor / Fornitore</label><input type="text" value="' + esc(l.vendor) + '" placeholder="Es. Together AI, Cohere..." oninput="deployerLlmSelected[' + i + '].vendor=this.value"></div>'
        : '';
      var tuHtml = renderTargetChecks('llm', i, l.target_users);
      return '<div class="tool-card">'
        + '<div class="tc-head">'
        + '<span class="tc-label">' + l.label + (l.vendor ? ' <span style="font-weight:400;color:var(--dim)">&mdash; ' + l.vendor + '</span>' : '') + '</span>'
        + '<button class="btn-rm" onclick="toggleLlm(\'' + l.id + '\')">&#10005;</button>'
        + '</div>'
        + nameField
        + '<div class="field"><label>Finalità d\'uso *</label>'
        + '<textarea rows="2" placeholder="Come usi ' + l.label + ' nella tua organizzazione? Chi ne fa uso? Per quali processi?" oninput="deployerLlmSelected[' + i + '].purpose=this.value">' + esc(l.purpose) + '</textarea></div>'
        + tuHtml
        + renderDeployerExtras('llm', i, l)
        + renderDecisionSection('llm', i, l)
        + '</div>';
    }).join('')
    + '</div>';
}

// ── Deployer Specialized ──────────────────────────────────────────────────────
function addDeployerSpecialized() {
  if (totalTools() >= FREE_TOOL_LIMIT) { showToolLimitAlert(); return; }
  deployerSpecialized.push({
    subcategory: 'hr', tool_name: '', vendor: '', purpose: '', target_users: [],
    output_type: '', access_modes: [], is_customized: false, users_aware: false,
    makes_decisions: false, affects_vulnerable: false,
    human_oversight: 'na', decision_domains: [], data_types: []
  });
  renderDeployerSpecialized();
}
function removeDeployerSpecialized(i) { deployerSpecialized.splice(i, 1); renderLlmGrid(); renderDeployerSpecialized(); }
function renderDeployerSpecialized() {
  var c = document.getElementById('depSpecList'); if (!c) return;
  if (!deployerSpecialized.length) {
    c.innerHTML = '<div class="empty"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="8" y="12" width="24" height="20" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M14 20h12M14 26h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><p>Nessun sistema specializzato aggiunto.</p></div>';
    return;
  }
  c.innerHTML = deployerSpecialized.map(function(s, i) {
    var catOpts = AI_CATS.map(function(cat) {
      return '<option value="' + cat.v + '"' + (s.subcategory === cat.v ? ' selected' : '') + '>' + cat.l + '</option>';
    }).join('');
    var tuHtml = renderTargetChecks('spec', i, s.target_users);
    return '<div class="tool-card">'
      + '<div class="tc-head">'
      + '<span class="tc-num">Sistema Specializzato #' + (i + 1) + '</span>'
      + '<button class="btn-rm" onclick="removeDeployerSpecialized(' + i + ')">&#10005; Rimuovi</button>'
      + '</div>'
      + '<div class="field-row">'
      + '<div class="field"><label>Sotto-categoria</label>'
      + '<select onchange="deployerSpecialized[' + i + '].subcategory=this.value">' + catOpts + '</select></div>'
      + '<div class="field"><label>Nome Sistema *</label>'
      + '<input type="text" value="' + esc(s.tool_name) + '" placeholder="Es. HireVue, Salesforce Einstein..." oninput="deployerSpecialized[' + i + '].tool_name=this.value"></div>'
      + '</div>'
      + '<div class="field"><label>Vendor / Fornitore</label>'
      + '<input type="text" value="' + esc(s.vendor) + '" placeholder="Es. HireVue Inc., Salesforce..." oninput="deployerSpecialized[' + i + '].vendor=this.value"></div>'
      + '<div class="field"><label>Finalità d\'uso *</label>'
      + '<textarea rows="2" placeholder="A cosa serve nella tua azienda? Chi lo usa? Quali decisioni supporta?" oninput="deployerSpecialized[' + i + '].purpose=this.value">' + esc(s.purpose) + '</textarea></div>'
      + tuHtml
      + renderDeployerExtras('spec', i, s)
      + renderDecisionSection('spec', i, s)
      + '</div>';
  }).join('');
}

// ── Review ────────────────────────────────────────────────────────────────────
function renderReview() {
  var dpoEl    = document.querySelector('input[name=dpoStatus]:checked');
  var dpoLabel = {inhouse: 'In-house', service: 'As a Service', none: 'Non presente'};
  var hovLabel = {always: 'Sempre presente', sometimes: 'In alcuni casi', never: 'Mai (Full Auto)', na: 'Non applicabile'};

  var aiRole = isProvider && isDeployer ? 'Provider + Deployer' : isProvider ? 'Provider' : isDeployer ? 'Deployer' : 'Non selezionato';

  var readiness = [
    ['Inventario AI', 'hasInventory'],
    ['Valutazione impatto (FRIA/DPIA)', 'hasImpact'],
    ['Gestione incidenti', 'hasIncident'],
    ['Policy AI interna', 'hasAiPolicy'],
    ['Formazione personale', 'hasTraining']
  ];

  function sysDecSummary(s) {
    var hov = hovLabel[s.human_oversight] || s.human_oversight;
    var domCount = s.decision_domains.length;
    var dtCount  = s.data_types.length;
    var outputLabel = {recommendation:'Raccomandazione', automated_decision:'Decisione Automatica', content_generation:'Generazione Contenuto', classification_scoring:'Classificazione/Scoring'};
    var aiTypeLabel = {supervised_ml:'ML Supervisionato', generative:'AI Generativa', rule_based:'Rule-based', computer_vision:'Computer Vision', nlp:'NLP'};
    return '<div class="rev-sys-dec">'
      + (s.output_type ? '<div class="rev-row" style="margin-bottom:3px"><span class="rk" style="min-width:140px">Output:</span><span class="rv">' + (outputLabel[s.output_type] || s.output_type) + '</span></div>' : '')
      + (s.ai_system_type ? '<div class="rev-row" style="margin-bottom:3px"><span class="rk" style="min-width:140px">Tipo sistema:</span><span class="rv">' + (aiTypeLabel[s.ai_system_type] || s.ai_system_type) + '</span></div>' : '')
      + '<div class="rev-row" style="margin-bottom:3px"><span class="rk" style="min-width:140px">Supervisione:</span><span class="rv">' + hov + '</span></div>'
      + '<div class="rev-row" style="margin-bottom:3px"><span class="rk" style="min-width:140px">Decisioni su persone:</span><span class="rv" style="color:' + (s.makes_decisions ? 'var(--orange)' : 'var(--dim)') + '">' + (s.makes_decisions ? '&#9888; S&igrave;' : '&ndash; No') + '</span></div>'
      + (s.affects_vulnerable ? '<div class="rev-row" style="margin-bottom:3px"><span class="rk" style="min-width:140px">Soggetti vulnerabili:</span><span class="rv" style="color:var(--red)">&#9888; S&igrave;</span></div>' : '')
      + ('is_customized' in s ? '<div class="rev-row" style="margin-bottom:3px"><span class="rk" style="min-width:140px">Customizzato:</span><span class="rv" style="color:' + (s.is_customized ? 'var(--orange)' : 'var(--dim)') + '">' + (s.is_customized ? '&#9888; S&igrave;' : '&ndash; No') + '</span></div>' : '')
      + ('users_aware' in s ? '<div class="rev-row" style="margin-bottom:3px"><span class="rk" style="min-width:140px">Trasparenza AI:</span><span class="rv" style="color:' + (s.users_aware ? 'var(--green)' : 'var(--orange)') + '">' + (s.users_aware ? '&#10003; S&igrave;' : '&#9888; No (Art. 50)') + '</span></div>' : '')
      + ('has_tech_docs' in s ? '<div class="rev-row" style="margin-bottom:3px"><span class="rk" style="min-width:140px">Doc. tecnica:</span><span class="rv" style="color:' + (s.has_tech_docs ? 'var(--green)' : 'var(--orange)') + '">' + (s.has_tech_docs ? '&#10003; Presente' : '&#9888; Assente (Art. 11)') + '</span></div>' : '')
      + ('has_monitoring' in s ? '<div class="rev-row" style="margin-bottom:3px"><span class="rk" style="min-width:140px">Post-market mon.:</span><span class="rv" style="color:' + (s.has_monitoring ? 'var(--green)' : 'var(--orange)') + '">' + (s.has_monitoring ? '&#10003; Attivo' : '&#9888; Assente (Art. 72)') + '</span></div>' : '')
      + (domCount ? '<div class="rev-row" style="margin-bottom:3px"><span class="rk" style="min-width:140px">Ambiti:</span><span class="rv">' + domCount + ' selezionato/i</span></div>' : '')
      + (dtCount  ? '<div class="rev-row" style="margin-bottom:0"><span class="rk" style="min-width:140px">Dati trattati:</span><span class="rv">' + dtCount  + ' tipologia/e</span></div>' : '')
      + '</div>';
  }

  var revenueExact = fv('revenueExact');
  var revenueRange = fv('revenueRange');
  var revenueDisplay = revenueExact ? '€' + Number(revenueExact).toLocaleString('it-IT') + ' (esatto)'
    : revenueRange ? revenueRange.replace(/_/g, ' ') + ' (range)' : 'Non specificato';

  var html = '<div class="rev-block"><h3>Profilo Azienda</h3>'
    + '<div class="rev-row"><span class="rk">Nome:</span><span class="rv">' + esc(fv('companyName')) + '</span></div>'
    + '<div class="rev-row"><span class="rk">Email report:</span><span class="rv">' + esc(fv('contactEmail')) + '</span></div>'
    + '<div class="rev-row"><span class="rk">Settore:</span><span class="rv">' + esc(fv('companySector') === 'Altro - specifica' ? fv('companySectorCustom') : fv('companySector')) + '</span></div>'
    + '<div class="rev-row"><span class="rk">Dimensione:</span><span class="rv">' + esc(fv('companySize')) + ' dipendenti</span></div>'
    + '<div class="rev-row"><span class="rk">Sede Legale:</span><span class="rv">' + esc(fv('companySede')) + '</span></div>'
    + '<div class="rev-row"><span class="rk">Fatturato:</span><span class="rv" style="color:var(--dim)">' + esc(revenueDisplay) + '</span></div>'
    + '</div>'
    + '<div class="rev-block"><h3>Ruolo &amp; Sistemi AI</h3>'
    + '<div class="rev-row"><span class="rk">Ruolo AI Act:</span><span class="rv" style="color:var(--green)">' + aiRole + '</span></div>';

  if (isProvider) {
    providerSystems.filter(function(s) { return s.tool_name.trim(); }).forEach(function(s) {
      html += '<div style="margin:10px 0 4px">'
        + '<div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:4px">&#9679; ' + esc(s.tool_name) + ' <span style="font-size:11px;color:var(--dim);font-weight:400">(Proprietario)</span></div>'
        + sysDecSummary(s)
        + '</div>';
    });
  }
  if (isDeployer) {
    deployerLlmSelected.forEach(function(l) {
      html += '<div style="margin:10px 0 4px">'
        + '<div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:4px">&#9679; ' + esc(l.label) + ' <span style="font-size:11px;color:var(--dim);font-weight:400">(LLM &mdash; ' + esc(l.vendor) + ')</span></div>'
        + sysDecSummary(l)
        + '</div>';
    });
    deployerSpecialized.filter(function(s) { return s.tool_name.trim(); }).forEach(function(s) {
      html += '<div style="margin:10px 0 4px">'
        + '<div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:4px">&#9679; ' + esc(s.tool_name) + ' <span style="font-size:11px;color:var(--dim);font-weight:400">(Specializzato)</span></div>'
        + sysDecSummary(s)
        + '</div>';
    });
  }

  html += '</div>'
    + '<div class="rev-block"><h3>AI Readiness</h3>'
    + '<div class="rev-row"><span class="rk">DPO:</span><span class="rv" style="color:' + (!dpoEl || dpoEl.value === 'none' ? '#F87171' : 'var(--green)') + '">' + (dpoEl ? (dpoLabel[dpoEl.value] || dpoEl.value) : 'Non selezionato') + '</span></div>'
    + readiness.map(function(r) {
        var el = document.getElementById(r[1]);
        var ok = el && el.checked;
        return '<div class="rev-row"><span class="rk">' + r[0] + ':</span><span class="rv" style="color:' + (ok ? 'var(--green)' : '#F87171') + '">' + (ok ? '&#10003; Presente' : '&#10007; Assente') + '</span></div>';
      }).join('')
    + '</div>';

  if (fv('contextNotes')) {
    html += '<div class="rev-block"><h3>Note Contestuali</h3>'
      + '<div class="rev-row"><span class="rv" style="font-size:12px;color:var(--muted);line-height:1.7">' + esc(fv('contextNotes').slice(0, 300)) + (fv('contextNotes').length > 300 ? '&hellip;' : '') + '</span></div>'
      + '</div>';
  }

  document.getElementById('reviewContent').innerHTML = html;
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submitForm() {
  document.getElementById('errorAlert').className = 'alert-err';
  document.getElementById('btnSubmit').disabled = true;

  var dpoEl  = document.querySelector('input[name=dpoStatus]:checked');
  var dpoVal = dpoEl ? dpoEl.value : 'none';
  var aiRole = isProvider && isDeployer ? 'both' : isProvider ? 'provider' : isDeployer ? 'deployer' : 'unknown';

  var aiTools = [];

  if (isProvider) {
    providerSystems.forEach(function(s) {
      if (s.tool_name.trim() && s.purpose.trim()) {
        aiTools.push({
          tool_name: s.tool_name,
          vendor: fv('companyName') || 'N/D',
          category: s.category,
          role: 'provider',
          purpose: s.purpose,
          target_users: s.target_users.length ? s.target_users : ['employees'],
          ai_system_type: s.ai_system_type || null,
          is_tested: s.is_tested,
          has_tech_docs: s.has_tech_docs,
          has_monitoring: s.has_monitoring,
          distribution_countries: s.distribution_countries,
          makes_decisions: s.makes_decisions,
          affects_vulnerable: s.affects_vulnerable,
          human_oversight: s.human_oversight,
          decision_domains: s.decision_domains,
          data_types: s.data_types
        });
      }
    });
  }

  if (isDeployer) {
    deployerLlmSelected.forEach(function(l) {
      var name = l.id === 'other_llm' ? (l.custom_name || 'LLM Non specificato') : l.label;
      aiTools.push({
        tool_name: name,
        vendor: l.vendor || 'N/D',
        category: 'llm',
        role: 'deployer',
        purpose: l.purpose || 'Uso generale',
        target_users: l.target_users.length ? l.target_users : ['employees'],
        output_type: l.output_type || null,
        access_modes: l.access_modes || [],
        is_customized: l.is_customized,
        users_aware: l.users_aware,
        makes_decisions: l.makes_decisions,
        affects_vulnerable: l.affects_vulnerable,
        human_oversight: l.human_oversight,
        decision_domains: l.decision_domains,
        data_types: l.data_types
      });
    });
    deployerSpecialized.forEach(function(s) {
      if (s.tool_name.trim() && s.purpose.trim()) {
        aiTools.push({
          tool_name: s.tool_name,
          vendor: s.vendor || 'N/D',
          category: s.subcategory,
          role: 'deployer',
          purpose: s.purpose,
          target_users: s.target_users.length ? s.target_users : ['employees'],
          output_type: s.output_type || null,
          access_modes: s.access_modes || [],
          is_customized: s.is_customized,
          users_aware: s.users_aware,
          makes_decisions: s.makes_decisions,
          affects_vulnerable: s.affects_vulnerable,
          human_oversight: s.human_oversight,
          decision_domains: s.decision_domains,
          data_types: s.data_types
        });
      }
    });
  }

  if (!aiTools.length) {
    aiTools = [{
      tool_name: 'Non specificato', vendor: 'N/D', category: 'other', role: 'deployer',
      purpose: 'Da definire', target_users: ['employees'],
      makes_decisions: false, affects_vulnerable: false,
      human_oversight: 'na', decision_domains: [], data_types: []
    }];
  }

  // Compute global decisions summary from per-tool data (backward compat with Lambda schema)
  var allDomains = [], allDtypes = [];
  var makesDec = false, affVul = false;
  var worstOversight = 'na';
  var oversightPri = {never: 0, sometimes: 1, always: 2, na: 3};
  aiTools.forEach(function(t) {
    if (t.makes_decisions) makesDec = true;
    if (t.affects_vulnerable) affVul = true;
    (t.decision_domains || []).forEach(function(d) { if (allDomains.indexOf(d) < 0) allDomains.push(d); });
    (t.data_types || []).forEach(function(d) { if (allDtypes.indexOf(d) < 0) allDtypes.push(d); });
    var pri = oversightPri[t.human_oversight];
    if (pri !== undefined && pri < (oversightPri[worstOversight] !== undefined ? oversightPri[worstOversight] : 3)) {
      worstOversight = t.human_oversight;
    }
  });

  var revExactRaw = fv('revenueExact');
  var revExactNum = revExactRaw ? parseFloat(revExactRaw.replace(/[^\d.]/g, '')) : null;
  var revRange    = fv('revenueRange') || null;

  var payload = {
    contact_email: fv('contactEmail'),
    company: {
      name: fv('companyName'),
      sector: fv('companySector') === 'Altro - specifica' ? fv('companySectorCustom') : fv('companySector'),
      employees_range: fv('companySize'),
      country: fv('companySede'),
      sede_legale: fv('companySede'),
      annual_revenue_exact: (revExactNum && !isNaN(revExactNum) && revExactNum > 0) ? revExactNum : null,
      annual_revenue_range: revExactNum ? null : revRange,
    },
    ai_tools: aiTools,
    use_cases: [],
    decisions: {
      makes_automated_decisions: makesDec,
      human_oversight_level: worstOversight,
      decision_domains: allDomains,
      data_types: allDtypes,
      affects_vulnerable_groups: affVul
    },
    governance: {
      has_dpo: dpoVal !== 'none',
      dpo_status: dpoVal,
      has_ai_inventory: document.getElementById('hasInventory').checked,
      has_impact_assessment: document.getElementById('hasImpact').checked,
      has_human_oversight: worstOversight !== 'never' && worstOversight !== 'na',
      has_incident_procedure: document.getElementById('hasIncident').checked,
      has_ai_policy: document.getElementById('hasAiPolicy').checked,
      has_training: document.getElementById('hasTraining').checked
    },
    ai_role: aiRole,
    context_notes: fv('contextNotes')
  };

  document.getElementById('loading').className = 'show';
  startLoad();

  try {
    var apiUrl = (window.ACTIFY_API_URL || '');
    var res  = await fetch(apiUrl + '/api/report/generate', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
    var data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Errore generazione');
    stopLoad();
    // Partner tracking — non-blocking
    if (PARTNER_TOKEN) {
      try {
        var partnerSystems = aiTools.map(function(t) {
          return { name: t.tool_name, purpose: t.purpose, role: t.role || 'deployer', vendor: t.vendor, category: t.category };
        });
        var partnerProfile = {
          sector:               payload.company.sector,
          employees_range:      payload.company.employees_range,
          annual_revenue_range: revRange || undefined,
          annual_revenue_exact: (revExactNum && !isNaN(revExactNum) && revExactNum > 0) ? revExactNum : undefined
        };
        await fetch(apiUrl + '/api/assessment/' + PARTNER_TOKEN + '/submit', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ systems: partnerSystems, company_profile: partnerProfile })
        });
      } catch(e) { /* non-blocking — main submit already succeeded */ }
    }
    document.getElementById('loading').className = '';
    document.getElementById('app').style.display = 'none';
    var emailEl = document.getElementById('successEmail');
    if (emailEl) emailEl.textContent = data.email || '';
    var sc = document.getElementById('success');
    sc.style.display = 'flex';
    sc.style.flexDirection = 'column';
    sc.style.alignItems = 'center';
    sc.style.justifyContent = 'center';
    sc.style.minHeight = '100vh';
    // If this was a partner assessment, show registration CTA with referral link
    if (PARTNER_TOKEN && PARTNER_REFERRAL_CODE && PARTNER_PMI_ID) {
      var ctaEl = document.getElementById('successRegisterCta');
      if (ctaEl) {
        var regUrl = 'https://official-actify.com/register?type=pmi&ref=' + PARTNER_REFERRAL_CODE + '&pmi=' + PARTNER_PMI_ID;
        ctaEl.innerHTML = '<p style="margin:16px 0 8px;font-size:15px;color:#1a1a2e;">Vuoi gestire la compliance completa?</p>'
          + '<a href="' + regUrl + '" style="display:inline-block;background:#6C47FF;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:8px;">Registrati su Actify →</a>'
          + '<p style="font-size:12px;color:#888;margin:4px 0 0;">Accedi con il 20% di sconto tramite il tuo consulente</p>';
        ctaEl.style.display = 'block';
      }
    }
  } catch(err) {
    stopLoad();
    document.getElementById('loading').className = '';
    var ea = document.getElementById('errorAlert');
    ea.className = 'alert-err show';
    ea.textContent = String(err.message || 'Generazione non disponibile. Riprova tra qualche minuto.');
    document.getElementById('btnSubmit').disabled = false;
  }
}

// ── Email duplicate check (step 1 → step 2) ───────────────────────────────────
async function checkEmailAndProceed() {
  var email = fv('contactEmail');
  var btn   = document.getElementById('btnNext');
  var errEl = document.getElementById('emailError');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  if (btn) { btn.disabled = true; }
  try {
    var apiUrl = (window.ACTIFY_API_URL || '');
    var res = await fetch(apiUrl + '/api/check-email', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: email })
    });
    var data = await res.json();
    if (data.already_used) {
      if (errEl) {
        errEl.textContent = 'Questa email ha già ricevuto un assessment gratuito. Controlla la tua casella di posta o registrati su Actify per censire tutti i tuoi strumenti AI.';
        errEl.style.display = '';
      }
      return;
    }
    var s1 = document.getElementById('step1');
    if (s1) s1.style.display = 'none';
    cur++;
    document.getElementById('step' + cur).style.display = '';
    refreshUI();
    window.scrollTo({top: 0, behavior: 'smooth'});
  } catch(err) {
    // On network error proceed anyway — duplicate guard is also at submit
    var s1 = document.getElementById('step1');
    if (s1) s1.style.display = 'none';
    cur++;
    document.getElementById('step' + cur).style.display = '';
    refreshUI();
    window.scrollTo({top: 0, behavior: 'smooth'});
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── Loading ───────────────────────────────────────────────────────────────────
var LS = ['ls1', 'ls2', 'ls3', 'ls4'];
function startLoad() {
  loadStep = 0;
  LS.forEach(function(id) { document.getElementById(id).className = 'ld-step'; });
  document.getElementById('ls1').className = 'ld-step active';
  loadTimer = setInterval(function() {
    if (loadStep < LS.length - 1) {
      document.getElementById(LS[loadStep]).className = 'ld-step done';
      loadStep++;
      document.getElementById(LS[loadStep]).className = 'ld-step active';
    }
  }, 4500);
}
function stopLoad() { clearInterval(loadTimer); }

// ── Utils ─────────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Auto-start from partner assessment link (?token=XXX) ──────────────────────
if (PARTNER_TOKEN) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWizard);
  } else {
    startWizard();
  }
}
