// ── Constants ─────────────────────────────────────────────────────────────────
var STEP_NAMES = ['Profilo Azienda', 'Ruolo & Sistemi AI', 'Decisioni', 'AI Readiness', 'Contesto', 'Riepilogo'];
var TOTAL_STEPS = 6;

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

// ── State ─────────────────────────────────────────────────────────────────────
var cur = 1;
var isProvider = false;
var isDeployer = false;
var providerSystems = [];
var deployerLlmSelected = [];
var deployerSpecialized = [];
var loadTimer;
var loadStep = 0;

// ── Boot ──────────────────────────────────────────────────────────────────────
function startWizard() {
  document.getElementById('landing').style.display = 'none';
  var app = document.getElementById('app');
  app.style.display = 'flex';
  app.style.flexDirection = 'column';
  refreshUI();
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
    if (!fv('companySector')) { alert('Seleziona il settore.'); return false; }
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
}

// ── Provider Systems ──────────────────────────────────────────────────────────
function addProviderSystem() {
  providerSystems.push({tool_name: '', category: 'tech', purpose: '', target_users: []});
  renderProviderSystems();
}
function removeProviderSystem(i) { providerSystems.splice(i, 1); renderProviderSystems(); }
function renderProviderSystems() {
  var c = document.getElementById('providerList'); if (!c) return;
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
    deployerLlmSelected.push({id: id, label: llm.l, vendor: llm.v, custom_name: '', purpose: '', target_users: []});
  }
  renderLlmGrid();
  renderLlmDetails();
}
function renderLlmGrid() {
  var g = document.getElementById('llmGrid'); if (!g) return;
  g.innerHTML = LLM_LIST.map(function(llm) {
    var sel = false;
    for (var k = 0; k < deployerLlmSelected.length; k++) { if (deployerLlmSelected[k].id === llm.id) { sel = true; break; } }
    return '<button type="button" class="llm-chip' + (sel ? ' sel' : '') + '" onclick="toggleLlm(\'' + llm.id + '\')">'
      + '<span class="llm-chip-name">' + llm.l + '</span>'
      + '<span class="llm-chip-vendor">' + llm.v + '</span>'
      + '</button>';
  }).join('');
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
        + '</div>';
    }).join('')
    + '</div>';
}

// ── Deployer Specialized ──────────────────────────────────────────────────────
function addDeployerSpecialized() {
  deployerSpecialized.push({subcategory: 'hr', tool_name: '', vendor: '', purpose: '', target_users: []});
  renderDeployerSpecialized();
}
function removeDeployerSpecialized(i) { deployerSpecialized.splice(i, 1); renderDeployerSpecialized(); }
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
      + '</div>';
  }).join('');
}

// ── Review ────────────────────────────────────────────────────────────────────
function renderReview() {
  var domains  = Array.from(document.querySelectorAll('.domain:checked')).map(function(el) { return el.value; });
  var dtypes   = Array.from(document.querySelectorAll('.dtype:checked')).map(function(el) { return el.value; });
  var hovEl    = document.querySelector('input[name=humanOversight]:checked');
  var hovLabel = {always: 'Sempre presente', sometimes: 'In alcuni casi', never: 'Mai (Full Automatic)', na: 'Non applicabile'};
  var dpoEl    = document.querySelector('input[name=dpoStatus]:checked');
  var dpoLabel = {inhouse: 'In-house', service: 'As a Service', none: 'Non presente'};

  var provCount = providerSystems.filter(function(s) { return s.tool_name.trim(); }).length;
  var llmCount  = deployerLlmSelected.length;
  var specCount = deployerSpecialized.filter(function(s) { return s.tool_name.trim(); }).length;
  var aiRole    = isProvider && isDeployer ? 'Provider + Deployer' : isProvider ? 'Provider' : isDeployer ? 'Deployer' : 'Non selezionato';

  var readiness = [
    ['Inventario AI', 'hasInventory'],
    ['Valutazione impatto (FRIA/DPIA)', 'hasImpact'],
    ['Gestione incidenti', 'hasIncident'],
    ['Policy AI interna', 'hasAiPolicy'],
    ['Formazione personale', 'hasTraining']
  ];

  var html = '<div class="rev-block"><h3>Profilo Azienda</h3>'
    + '<div class="rev-row"><span class="rk">Nome:</span><span class="rv">' + esc(fv('companyName')) + '</span></div>'
    + '<div class="rev-row"><span class="rk">Settore:</span><span class="rv">' + esc(fv('companySector')) + '</span></div>'
    + '<div class="rev-row"><span class="rk">Dimensione:</span><span class="rv">' + esc(fv('companySize')) + ' dipendenti</span></div>'
    + '<div class="rev-row"><span class="rk">Sede Legale:</span><span class="rv">' + esc(fv('companySede')) + '</span></div>'
    + '</div>'
    + '<div class="rev-block"><h3>Ruolo & Sistemi AI</h3>'
    + '<div class="rev-row"><span class="rk">Ruolo AI Act:</span><span class="rv" style="color:var(--green)">' + aiRole + '</span></div>';

  if (isProvider && provCount > 0) {
    html += '<div class="rev-row" style="align-items:flex-start"><span class="rk">Sistemi Proprietari:</span><div>'
      + providerSystems.filter(function(s) { return s.tool_name.trim(); }).map(function(s) {
          return '<div class="rev-row" style="margin-bottom:4px"><span class="rv">' + esc(s.tool_name) + '</span></div>';
        }).join('')
      + '</div></div>';
  }
  if (isDeployer && llmCount > 0) {
    html += '<div class="rev-row" style="align-items:flex-start"><span class="rk">LLM Standard:</span><div class="tags">'
      + deployerLlmSelected.map(function(l) { return '<span class="tag">' + l.label + '</span>'; }).join('')
      + '</div></div>';
  }
  if (isDeployer && specCount > 0) {
    html += '<div class="rev-row" style="align-items:flex-start"><span class="rk">Sistemi Specializzati:</span><div>'
      + deployerSpecialized.filter(function(s) { return s.tool_name.trim(); }).map(function(s) {
          return '<div class="rev-row" style="margin-bottom:4px"><span class="rv">' + esc(s.tool_name) + '</span></div>';
        }).join('')
      + '</div></div>';
  }

  html += '</div>'
    + '<div class="rev-block"><h3>Decisioni & Dati</h3>'
    + '<div class="rev-row"><span class="rk">Decisioni su persone:</span><span class="rv" style="color:' + (document.getElementById('makesDec').checked ? 'var(--orange)' : 'var(--muted)') + '">' + (document.getElementById('makesDec').checked ? '&#9888; S&igrave;' : '&ndash; No') + '</span></div>'
    + '<div class="rev-row"><span class="rk">Supervisione umana:</span><span class="rv">' + (hovEl ? (hovLabel[hovEl.value] || hovEl.value) : 'Non selezionato') + '</span></div>'
    + '<div class="rev-row"><span class="rk">Soggetti vulnerabili:</span><span class="rv" style="color:' + (document.getElementById('vulnerable').checked ? 'var(--red)' : 'var(--muted)') + '">' + (document.getElementById('vulnerable').checked ? '&#9888; S&igrave;' : '&ndash; No') + '</span></div>'
    + (domains.length ? '<div class="rev-row" style="align-items:flex-start"><span class="rk">Ambiti:</span><div class="tags">' + domains.map(function(d) { return '<span class="tag">' + d + '</span>'; }).join('') + '</div></div>' : '')
    + '</div>'
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

  var domains = Array.from(document.querySelectorAll('.domain:checked')).map(function(el) { return el.value; });
  var dtypes  = Array.from(document.querySelectorAll('.dtype:checked')).map(function(el) { return el.value; });
  var hovEl   = document.querySelector('input[name=humanOversight]:checked');
  var hovVal  = hovEl ? hovEl.value : 'na';
  var dpoEl   = document.querySelector('input[name=dpoStatus]:checked');
  var dpoVal  = dpoEl ? dpoEl.value : 'none';
  var aiRole  = isProvider && isDeployer ? 'both' : isProvider ? 'provider' : isDeployer ? 'deployer' : 'unknown';

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
          target_users: s.target_users.length ? s.target_users : ['employees']
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
        target_users: l.target_users.length ? l.target_users : ['employees']
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
          target_users: s.target_users.length ? s.target_users : ['employees']
        });
      }
    });
  }

  if (!aiTools.length) {
    aiTools = [{tool_name: 'Non specificato', vendor: 'N/D', category: 'other', role: 'deployer', purpose: 'Da definire', target_users: ['employees']}];
  }

  var payload = {
    company: {
      name: fv('companyName'),
      sector: fv('companySector'),
      employees_range: fv('companySize'),
      country: fv('companySede'),
      sede_legale: fv('companySede')
    },
    ai_tools: aiTools,
    use_cases: [],
    decisions: {
      makes_automated_decisions: document.getElementById('makesDec').checked,
      human_oversight_level: hovVal,
      decision_domains: domains,
      data_types: dtypes,
      affects_vulnerable_groups: document.getElementById('vulnerable').checked
    },
    governance: {
      has_dpo: dpoVal !== 'none',
      dpo_status: dpoVal,
      has_ai_inventory: document.getElementById('hasInventory').checked,
      has_impact_assessment: document.getElementById('hasImpact').checked,
      has_human_oversight: hovVal !== 'never' && hovVal !== 'na',
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
    document.getElementById('loading').className = '';
    document.getElementById('app').style.display = 'none';
    document.getElementById('downloadBtn').href = data.download_url;
    var sc = document.getElementById('success');
    sc.style.display = 'flex';
    sc.style.flexDirection = 'column';
    sc.style.alignItems = 'center';
    sc.style.justifyContent = 'center';
    sc.style.minHeight = '100vh';
  } catch(err) {
    stopLoad();
    document.getElementById('loading').className = '';
    var ea = document.getElementById('errorAlert');
    ea.className = 'alert-err show';
    ea.textContent = String(err.message || 'Generazione non disponibile. Riprova tra qualche minuto.');
    document.getElementById('btnSubmit').disabled = false;
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
