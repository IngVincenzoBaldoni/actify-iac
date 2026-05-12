// Self-contained HTML form — 7-step AI Act assessment wizard.
// Served via GET / on the same API Gateway origin as POST /api/report/generate.
// No external dependencies: all CSS and JS are inline.

export const formHtml = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Actify — AI Act Risk Assessment</title>
<style>
  :root {
    --green: #22C55E; --green-dark: #16A34A; --green-light: #F0FDF4;
    --bg: #0F172A; --surface: #1E293B; --border: #334155;
    --text: #F8FAFC; --muted: #94A3B8; --input-bg: #0F172A;
    --red: #EF4444; --yellow: #EAB308; --orange: #F97316;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
  a { color: var(--green); }

  /* ── Layout ── */
  .shell { max-width: 760px; margin: 0 auto; padding: 24px 16px 80px; }

  /* ── Header ── */
  .header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
  .logo { font-size: 26px; font-weight: 800; color: var(--green); letter-spacing: -0.5px; }
  .tagline { font-size: 12px; color: var(--muted); }

  /* ── Progress ── */
  .progress-bar { display: flex; gap: 6px; margin-bottom: 28px; }
  .progress-step { flex: 1; height: 4px; border-radius: 2px; background: var(--border); transition: background .3s; }
  .progress-step.done { background: var(--green); }
  .progress-step.active { background: var(--green); opacity: .5; }
  .step-label { font-size: 12px; color: var(--muted); margin-bottom: 20px; }

  /* ── Card ── */
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 28px; margin-bottom: 16px; }
  .card h2 { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .card .subtitle { font-size: 13px; color: var(--muted); margin-bottom: 22px; line-height: 1.5; }

  /* ── Form elements ── */
  .field { margin-bottom: 18px; }
  .field label { display: block; font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .4px; }
  .field input[type=text], .field select, .field textarea {
    width: 100%; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); font-size: 14px; padding: 10px 14px; outline: none; transition: border .2s;
  }
  .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--green); }
  .field select option { background: var(--surface); }
  .field textarea { resize: vertical; min-height: 90px; line-height: 1.5; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media(max-width:520px) { .field-row { grid-template-columns: 1fr; } }

  /* ── Checkbox ── */
  .check-group { display: flex; flex-direction: column; gap: 10px; }
  .check-item { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
  .check-item input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--green); cursor: pointer; margin-top: 1px; flex-shrink: 0; }
  .check-item .check-label { font-size: 14px; color: var(--text); line-height: 1.4; }
  .check-item .check-desc { font-size: 12px; color: var(--muted); }

  /* ── Radio ── */
  .radio-group { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  @media(max-width:520px) { .radio-group { grid-template-columns: 1fr; } }
  .radio-card { border: 2px solid var(--border); border-radius: 8px; padding: 12px 16px; cursor: pointer; transition: border .2s, background .2s; }
  .radio-card:has(input:checked) { border-color: var(--green); background: #0D2818; }
  .radio-card input { display: none; }
  .radio-card .rc-title { font-size: 14px; font-weight: 600; color: var(--text); }
  .radio-card .rc-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }

  /* ── Tool cards ── */
  .tool-card { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 12px; position: relative; }
  .tool-card .tc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .tool-card .tc-title { font-size: 14px; font-weight: 600; color: var(--green); }
  .btn-remove { background: none; border: 1px solid var(--red); color: var(--red); border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
  .btn-remove:hover { background: rgba(239,68,68,.1); }
  .btn-add { display: flex; align-items: center; gap: 6px; background: none; border: 1px dashed var(--green); color: var(--green); border-radius: 8px; padding: 10px 16px; font-size: 13px; cursor: pointer; width: 100%; justify-content: center; margin-top: 4px; }
  .btn-add:hover { background: rgba(34,197,94,.08); }

  /* ── Navigation buttons ── */
  .nav { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; }
  .btn-back { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 8px; padding: 10px 20px; font-size: 14px; cursor: pointer; }
  .btn-back:hover { border-color: var(--muted); color: var(--text); }
  .btn-next { background: var(--green); color: #fff; border: none; border-radius: 8px; padding: 10px 28px; font-size: 14px; font-weight: 700; cursor: pointer; }
  .btn-next:hover { background: var(--green-dark); }
  .btn-next:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Submit ── */
  .btn-submit { width: 100%; background: var(--green); color: #fff; border: none; border-radius: 10px; padding: 16px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 20px; transition: background .2s; }
  .btn-submit:hover { background: var(--green-dark); }
  .btn-submit:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Review ── */
  .review-section { margin-bottom: 16px; }
  .review-section h3 { font-size: 13px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 8px; }
  .review-row { display: flex; gap: 8px; font-size: 13px; margin-bottom: 5px; }
  .review-key { color: var(--muted); min-width: 160px; }
  .review-val { color: var(--text); font-weight: 500; }
  .tag { display: inline-block; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 2px 8px; font-size: 11px; color: var(--muted); margin: 2px; }

  /* ── Loading overlay ── */
  #loading { display: none; position: fixed; inset: 0; background: rgba(15,23,42,.9); z-index: 100; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
  #loading.show { display: flex; }
  .spinner { width: 48px; height: 48px; border: 4px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-msg { color: var(--text); font-size: 16px; font-weight: 600; }
  .loading-sub { color: var(--muted); font-size: 13px; text-align: center; max-width: 300px; }

  /* ── Error / Success ── */
  .alert { border-radius: 8px; padding: 12px 16px; font-size: 13px; margin-top: 12px; display: none; }
  .alert.show { display: block; }
  .alert-error { background: rgba(239,68,68,.1); border: 1px solid var(--red); color: #FCA5A5; }
  .alert-success { background: rgba(34,197,94,.1); border: 1px solid var(--green); color: #86EFAC; }

  /* ── Note highlight ── */
  .note-box { background: rgba(234,179,8,.08); border: 1px solid rgba(234,179,8,.3); border-radius: 8px; padding: 12px 14px; font-size: 12px; color: #FDE68A; margin-bottom: 16px; line-height: 1.5; }
</style>
</head>
<body>
<div class="shell">

  <div class="header">
    <div>
      <div class="logo">Actify</div>
      <div class="tagline">AI Act Risk Assessment — Reg. UE 2024/1689</div>
    </div>
  </div>

  <div class="progress-bar" id="progressBar">
    <div class="progress-step active" id="ps1"></div>
    <div class="progress-step" id="ps2"></div>
    <div class="progress-step" id="ps3"></div>
    <div class="progress-step" id="ps4"></div>
    <div class="progress-step" id="ps5"></div>
    <div class="progress-step" id="ps6"></div>
    <div class="progress-step" id="ps7"></div>
  </div>
  <div class="step-label" id="stepLabel">Step 1 di 7 — Profilo Azienda</div>

  <!-- ─── STEP 1 — Azienda ─── -->
  <div id="step1">
    <div class="card">
      <h2>Profilo Azienda</h2>
      <div class="subtitle">Iniziamo con le informazioni di base sulla tua organizzazione.</div>
      <div class="field">
        <label>Nome Azienda *</label>
        <input type="text" id="companyName" placeholder="Es. Acme Srl" />
      </div>
      <div class="field-row">
        <div class="field">
          <label>Settore *</label>
          <select id="companySector">
            <option value="">— Seleziona —</option>
            <option>Risorse Umane / Recruiting</option>
            <option>Servizi Finanziari / Banca</option>
            <option>Assicurazioni</option>
            <option>Sanità / Life Sciences</option>
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
        <div class="field">
          <label>Dimensione Azienda *</label>
          <select id="companySize">
            <option value="">— Dipendenti —</option>
            <option value="1-10">1–10 (Micro)</option>
            <option value="11-50">11–50 (Piccola)</option>
            <option value="51-250">51–250 (Media)</option>
            <option value="251-1000">251–1.000 (Grande)</option>
            <option value="1000+">1.000+ (Enterprise)</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Paese</label>
        <input type="text" id="companyCountry" value="Italia" />
      </div>
    </div>
    <div class="nav">
      <div></div>
      <button class="btn-next" onclick="goTo(2)">Avanti →</button>
    </div>
  </div>

  <!-- ─── STEP 2 — Sistemi AI ─── -->
  <div id="step2" style="display:none">
    <div class="card">
      <h2>Sistemi di Intelligenza Artificiale</h2>
      <div class="subtitle">Elenca tutti i sistemi AI che la tua azienda utilizza o ha sviluppato. Includi anche strumenti SaaS con componenti AI (es. ChatGPT, Salesforce Einstein, HireVue).</div>
      <div id="toolsList"></div>
      <button class="btn-add" onclick="addTool()">+ Aggiungi Sistema AI</button>
    </div>
    <div class="nav">
      <button class="btn-back" onclick="goTo(1)">← Indietro</button>
      <button class="btn-next" onclick="goTo(3)">Avanti →</button>
    </div>
  </div>

  <!-- ─── STEP 3 — Use Cases ─── -->
  <div id="step3" style="display:none">
    <div class="card">
      <h2>Come Usi i Sistemi AI</h2>
      <div class="subtitle">Descrivi in modo specifico come vengono utilizzati i sistemi AI nella tua azienda. Più sei specifico, più accurata sarà l'analisi.</div>
      <div class="note-box">💡 Esempi utili: "Usiamo ChatGPT per generare lettere di rifiuto ai candidati", "Il sistema di credito valuta automaticamente le richieste di prestito", "HireVue analizza i video colloqui e assegna uno score".</div>
      <div id="usecasesList"></div>
      <button class="btn-add" onclick="addUseCase()">+ Aggiungi Use Case</button>
    </div>
    <div class="nav">
      <button class="btn-back" onclick="goTo(2)">← Indietro</button>
      <button class="btn-next" onclick="goTo(4)">Avanti →</button>
    </div>
  </div>

  <!-- ─── STEP 4 — Decisioni ─── -->
  <div id="step4" style="display:none">
    <div class="card">
      <h2>Decisioni Automatizzate e Dati</h2>
      <div class="subtitle">Informazioni su come i sistemi AI influenzano le decisioni nella tua organizzazione.</div>
      <div class="field">
        <label>I sistemi AI prendono o influenzano decisioni che riguardano persone fisiche?</label>
        <div class="check-group">
          <label class="check-item">
            <input type="checkbox" id="makesDec" />
            <span class="check-label">Sì, i sistemi prendono o influenzano in modo significativo decisioni su persone</span>
          </label>
        </div>
      </div>
      <div class="field" id="domainField">
        <label>Ambiti di Decisione (seleziona tutti gli applicabili)</label>
        <div class="check-group">
          <label class="check-item"><input type="checkbox" class="domain" value="hiring"><span class="check-label">Assunzione / Selezione del personale</span></label>
          <label class="check-item"><input type="checkbox" class="domain" value="performance_management"><span class="check-label">Valutazione prestazioni / promozioni</span></label>
          <label class="check-item"><input type="checkbox" class="domain" value="credit_scoring"><span class="check-label">Valutazione creditizia / prestiti</span></label>
          <label class="check-item"><input type="checkbox" class="domain" value="insurance"><span class="check-label">Assicurazioni (underwriting, tariffazione)</span></label>
          <label class="check-item"><input type="checkbox" class="domain" value="healthcare_diagnosis"><span class="check-label">Diagnosi / supporto clinico</span></label>
          <label class="check-item"><input type="checkbox" class="domain" value="education_assessment"><span class="check-label">Valutazione studenti / accesso a istruzione</span></label>
          <label class="check-item"><input type="checkbox" class="domain" value="public_services"><span class="check-label">Accesso a servizi pubblici / sussidi</span></label>
          <label class="check-item"><input type="checkbox" class="domain" value="content_moderation"><span class="check-label">Moderazione contenuti / accesso a piattaforme</span></label>
          <label class="check-item"><input type="checkbox" class="domain" value="other_decisions"><span class="check-label">Altre decisioni con impatto significativo</span></label>
        </div>
      </div>
      <div class="field">
        <label>Tipologie di Dati Trattati dai Sistemi AI</label>
        <div class="check-group">
          <label class="check-item"><input type="checkbox" class="dtype" value="biometric"><span class="check-label">Dati biometrici (volto, voce, impronte)</span></label>
          <label class="check-item"><input type="checkbox" class="dtype" value="health"><span class="check-label">Dati sanitari / cartelle cliniche</span></label>
          <label class="check-item"><input type="checkbox" class="dtype" value="financial"><span class="check-label">Dati finanziari / bancari</span></label>
          <label class="check-item"><input type="checkbox" class="dtype" value="behavioral"><span class="check-label">Dati comportamentali / navigazione / interazioni</span></label>
          <label class="check-item"><input type="checkbox" class="dtype" value="location"><span class="check-label">Dati di geolocalizzazione</span></label>
          <label class="check-item"><input type="checkbox" class="dtype" value="personal_identifiers"><span class="check-label">Identificatori personali (nome, CF, email)</span></label>
          <label class="check-item"><input type="checkbox" class="dtype" value="sensitive_categories"><span class="check-label">Categorie speciali GDPR (etnia, religione, orientamento sessuale)</span></label>
        </div>
      </div>
      <div class="field">
        <label>I sistemi AI interagiscono con soggetti vulnerabili?</label>
        <div class="check-group">
          <label class="check-item">
            <input type="checkbox" id="vulnerable" />
            <span class="check-label">Sì — minori, anziani, persone con disabilità o in difficoltà economica</span>
          </label>
        </div>
      </div>
    </div>
    <div class="nav">
      <button class="btn-back" onclick="goTo(3)">← Indietro</button>
      <button class="btn-next" onclick="goTo(5)">Avanti →</button>
    </div>
  </div>

  <!-- ─── STEP 5 — Governance ─── -->
  <div id="step5" style="display:none">
    <div class="card">
      <h2>Governance e Controlli Interni</h2>
      <div class="subtitle">La presenza di governance adeguata è un fattore determinante per la valutazione del rischio di compliance.</div>
      <div class="check-group">
        <label class="check-item">
          <input type="checkbox" id="hasDpo" />
          <div><div class="check-label">DPO (Responsabile Protezione Dati) designato</div><div class="check-desc">Richiesto dal GDPR per molte organizzazioni che trattano dati su larga scala</div></div>
        </label>
        <label class="check-item">
          <input type="checkbox" id="hasInventory" />
          <div><div class="check-label">Inventario formale dei sistemi AI in uso</div><div class="check-desc">Registro documentato di tutti i sistemi AI, scopi, vendor, responsabili</div></div>
        </label>
        <label class="check-item">
          <input type="checkbox" id="hasImpact" />
          <div><div class="check-label">Valutazione d'impatto (FRIA/DPIA) sui sistemi AI</div><div class="check-desc">AI Act Art. 27 e GDPR Art. 35 — obbligatoria per sistemi ad alto rischio</div></div>
        </label>
        <label class="check-item">
          <input type="checkbox" id="hasOversight" />
          <div><div class="check-label">Supervisione umana sui processi decisionali AI</div><div class="check-desc">Persone fisiche con autorità di overridare o bloccare le decisioni del sistema</div></div>
        </label>
        <label class="check-item">
          <input type="checkbox" id="hasIncident" />
          <div><div class="check-label">Procedura di gestione incidenti AI definita</div><div class="check-desc">Processo documentato per segnalare e gestire malfunzionamenti o danni da sistemi AI</div></div>
        </label>
      </div>
    </div>
    <div class="nav">
      <button class="btn-back" onclick="goTo(4)">← Indietro</button>
      <button class="btn-next" onclick="goTo(6)">Avanti →</button>
    </div>
  </div>

  <!-- ─── STEP 6 — Contesto ─── -->
  <div id="step6" style="display:none">
    <div class="card">
      <h2>Ruolo AI Act e Contesto</h2>
      <div class="subtitle">Il tuo ruolo nell'ecosistema AI determina gli obblighi specifici che si applicano alla tua organizzazione.</div>
      <div class="field">
        <label>Qual è il tuo ruolo rispetto ai sistemi AI? *</label>
        <div class="radio-group">
          <label class="radio-card"><input type="radio" name="aiRole" value="provider"><div class="rc-title">Provider (Fornitore)</div><div class="rc-desc">Sviluppo, immetti sul mercato o offri sistemi AI con il tuo nome/marchio</div></label>
          <label class="radio-card"><input type="radio" name="aiRole" value="deployer"><div class="rc-title">Deployer (Utilizzatore)</div><div class="rc-desc">Usi sistemi AI sviluppati da altri (es. SaaS, API) nella tua attività</div></label>
          <label class="radio-card"><input type="radio" name="aiRole" value="both"><div class="rc-title">Entrambi</div><div class="rc-desc">Sei sia Provider di alcuni sistemi che Deployer di altri</div></label>
          <label class="radio-card"><input type="radio" name="aiRole" value="unknown"><div class="rc-title">Non so</div><div class="rc-desc">Lascia che Actify lo determini dall'analisi del profilo</div></label>
        </div>
      </div>
      <div class="field" style="margin-top:20px">
        <label>Note Libere — Contesto Specifico</label>
        <div class="note-box">🎯 Questo è il campo più importante. Descrivi: come usi esattamente i sistemi AI, chi ne è impattato, se ci sono aspetti particolari del tuo settore o dei tuoi clienti. Le note vengono analizzate direttamente dal modello AI e spesso rivelano rischi non catturati dai checkbox.</div>
        <textarea id="contextNotes" rows="5" placeholder="Es: Usiamo HireVue per screening iniziale di tutti i candidati. Il sistema produce un punteggio 0-100 e chi scende sotto 60 non viene contattato. Operiamo prevalentemente nel settore bancario e i nostri clienti ci affidano la selezione del personale con accesso ai loro sistemi IT..."></textarea>
      </div>
    </div>
    <div class="nav">
      <button class="btn-back" onclick="goTo(5)">← Indietro</button>
      <button class="btn-next" onclick="goTo(7)">Avanti →</button>
    </div>
  </div>

  <!-- ─── STEP 7 — Riepilogo ─── -->
  <div id="step7" style="display:none">
    <div class="card">
      <h2>Riepilogo e Generazione Report</h2>
      <div class="subtitle">Verifica i dati inseriti e clicca "Genera Report PDF" per ottenere la tua analisi di compliance AI Act personalizzata.</div>
      <div id="reviewContent"></div>
      <div class="alert alert-error" id="errorAlert"></div>
      <button class="btn-submit" id="submitBtn" onclick="submitForm()">
        📄 Genera Report PDF Gratuito
      </button>
      <div style="font-size:11px;color:var(--muted);text-align:center;margin-top:10px;">
        Il report viene generato in ~15-20 secondi. La generazione costa circa $0.03 e viene addebitata al conto AWS di Actify.
      </div>
    </div>
    <div class="nav">
      <button class="btn-back" onclick="goTo(6)">← Indietro</button>
      <div></div>
    </div>
  </div>

</div><!-- /shell -->

<!-- ─── Loading overlay ─── -->
<div id="loading">
  <div class="spinner"></div>
  <div class="loading-msg">Analisi AI Act in corso…</div>
  <div class="loading-sub">Il modello sta analizzando il profilo della tua azienda e generando il report. Operazione tipicamente di 15-20 secondi.</div>
</div>

<script>
// ── State ──────────────────────────────────────────────────────────────────────
let currentStep = 1;
let tools = [];
let usecases = [];

const STEPS = ['Profilo Azienda','Sistemi AI','Use Case','Decisioni','Governance','Contesto','Riepilogo'];
const TOOL_CATEGORIES = {llm:'LLM (ChatGPT, Claude, Gemini…)',specialized:'Specializzato (HR, finance, vision…)',proprietary:'Proprietario (sviluppato internamente)',other:'Altro'};
const TOOL_USERS = {employees:'Dipendenti interni',customers:'Clienti / utenti esterni',third_parties:'Terze parti (candidati, pazienti…)',all:'Tutti'};

// ── Navigation ─────────────────────────────────────────────────────────────────
function goTo(n) {
  if (n > currentStep && !validateStep(currentStep)) return;
  document.getElementById('step' + currentStep).style.display = 'none';
  currentStep = n;
  document.getElementById('step' + currentStep).style.display = '';
  updateProgress();
  if (n === 2) renderTools();
  if (n === 3) renderUseCases();
  if (n === 7) renderReview();
  window.scrollTo({top:0,behavior:'smooth'});
}

function updateProgress() {
  for (let i = 1; i <= 7; i++) {
    const el = document.getElementById('ps' + i);
    el.className = 'progress-step' + (i < currentStep ? ' done' : i === currentStep ? ' active' : '');
  }
  document.getElementById('stepLabel').textContent = 'Step ' + currentStep + ' di 7 — ' + STEPS[currentStep - 1];
}

// ── Validation ─────────────────────────────────────────────────────────────────
function validateStep(step) {
  if (step === 1) {
    if (!v('companyName')) { alert('Inserisci il nome dell\\'azienda.'); return false; }
    if (!v('companySector')) { alert('Seleziona il settore.'); return false; }
    if (!v('companySize')) { alert('Seleziona la dimensione aziendale.'); return false; }
  }
  if (step === 2 && tools.length === 0) {
    if (!confirm('Non hai inserito sistemi AI. Il report sarà meno preciso. Continuare?')) return false;
  }
  if (step === 6) {
    if (!document.querySelector('input[name=aiRole]:checked')) { alert('Seleziona il ruolo AI Act.'); return false; }
  }
  return true;
}

function v(id) { return document.getElementById(id)?.value?.trim() || ''; }

// ── Tools ──────────────────────────────────────────────────────────────────────
function addTool() {
  tools.push({tool_name:'',vendor:'',category:'llm',purpose:'',target_users:'employees'});
  renderTools();
}

function removeTool(i) {
  tools.splice(i, 1);
  renderTools();
}

function renderTools() {
  const container = document.getElementById('toolsList');
  if (tools.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:16px 0;">Nessun sistema inserito. Clicca + per aggiungere.</div>';
    return;
  }
  container.innerHTML = tools.map((t, i) => \`
    <div class="tool-card">
      <div class="tc-header">
        <span class="tc-title">Sistema #\${i+1}</span>
        <button class="btn-remove" onclick="removeTool(\${i})">✕ Rimuovi</button>
      </div>
      <div class="field-row">
        <div class="field"><label>Nome Tool *</label>
          <input type="text" value="\${esc(t.tool_name)}" placeholder="Es. ChatGPT, HireVue, SAP AI…"
            oninput="tools[\${i}].tool_name=this.value" /></div>
        <div class="field"><label>Vendor</label>
          <input type="text" value="\${esc(t.vendor)}" placeholder="Es. OpenAI, Salesforce…"
            oninput="tools[\${i}].vendor=this.value" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Categoria</label>
          <select onchange="tools[\${i}].category=this.value">
            \${Object.entries(TOOL_CATEGORIES).map(([k,v]) => \`<option value="\${k}"\${t.category===k?' selected':''}>\${v}</option>\`).join('')}
          </select></div>
        <div class="field"><label>Utenti Target</label>
          <select onchange="tools[\${i}].target_users=this.value">
            \${Object.entries(TOOL_USERS).map(([k,v]) => \`<option value="\${k}"\${t.target_users===k?' selected':''}>\${v}</option>\`).join('')}
          </select></div>
      </div>
      <div class="field"><label>Finalità d'uso *</label>
        <input type="text" value="\${esc(t.purpose)}" placeholder="Descrivi a cosa serve questo sistema nella tua azienda"
          oninput="tools[\${i}].purpose=this.value" /></div>
    </div>\`).join('');
}

// ── Use cases ──────────────────────────────────────────────────────────────────
function addUseCase() {
  usecases.push('');
  renderUseCases();
}

function removeUseCase(i) {
  usecases.splice(i, 1);
  renderUseCases();
}

function renderUseCases() {
  const container = document.getElementById('usecasesList');
  if (usecases.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:16px 0;">Nessun use case inserito. Clicca + per aggiungere.</div>';
    return;
  }
  container.innerHTML = usecases.map((uc, i) => \`
    <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:10px;">
      <textarea rows="2" style="flex:1;background:var(--input-bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;padding:10px;outline:none;resize:vertical;"
        placeholder="Descrivi come usi l'AI in questo contesto specifico…"
        oninput="usecases[\${i}]=this.value">\${esc(uc)}</textarea>
      <button class="btn-remove" style="margin-top:4px" onclick="removeUseCase(\${i})">✕</button>
    </div>\`).join('');
}

// ── Review ─────────────────────────────────────────────────────────────────────
function renderReview() {
  const domains = [...document.querySelectorAll('.domain:checked')].map(el => el.value);
  const dtypes = [...document.querySelectorAll('.dtype:checked')].map(el => el.value);
  const role = document.querySelector('input[name=aiRole]:checked')?.value || 'unknown';
  const roleLabels = {provider:'Provider (Fornitore)',deployer:'Deployer (Utilizzatore)',both:'Entrambi',unknown:'Non definito'};

  document.getElementById('reviewContent').innerHTML = \`
    <div class="review-section">
      <h3>Azienda</h3>
      <div class="review-row"><span class="review-key">Nome:</span><span class="review-val">\${esc(v('companyName'))}</span></div>
      <div class="review-row"><span class="review-key">Settore:</span><span class="review-val">\${esc(v('companySector'))}</span></div>
      <div class="review-row"><span class="review-key">Dimensione:</span><span class="review-val">\${esc(v('companySize'))} dipendenti</span></div>
      <div class="review-row"><span class="review-key">Paese:</span><span class="review-val">\${esc(v('companyCountry') || 'Italia')}</span></div>
    </div>
    <div class="review-section">
      <h3>Sistemi AI (\${tools.length})</h3>
      \${tools.map(t => \`<div class="review-row"><span class="review-key">\${esc(t.tool_name)||'—'}:</span><span class="review-val">\${esc(t.purpose)||'nessuna finalità'}</span></div>\`).join('') || '<div class="review-row"><span class="review-val" style="color:var(--muted)">Nessun sistema inserito</span></div>'}
    </div>
    <div class="review-section">
      <h3>Governance</h3>
      \${[['DPO presente','hasDpo'],['Inventario AI','hasInventory'],['Valutazione impatto','hasImpact'],['Supervisione umana','hasOversight'],['Procedura incidenti','hasIncident']].map(([l,id]) => \`
        <div class="review-row"><span class="review-key">\${l}:</span>
        <span class="review-val" style="color:\${document.getElementById(id)?.checked?'var(--green)':'var(--red)'}">
          \${document.getElementById(id)?.checked?'✓ Sì':'✗ No'}</span></div>\`).join('')}
    </div>
    <div class="review-section">
      <h3>Ruolo AI Act</h3>
      <div class="review-row"><span class="review-key">Ruolo:</span><span class="review-val">\${roleLabels[role]}</span></div>
      \${v('contextNotes') ? \`<div class="review-row" style="flex-direction:column;gap:4px"><span class="review-key">Note:</span><span class="review-val" style="font-size:12px;color:var(--muted);">\${esc(v('contextNotes').slice(0,200))}\${v('contextNotes').length>200?'…':''}</span></div>\` : ''}
    </div>\`;
}

// ── Submit ─────────────────────────────────────────────────────────────────────
async function submitForm() {
  const errorAlert = document.getElementById('errorAlert');
  errorAlert.className = 'alert alert-error';

  const domains = [...document.querySelectorAll('.domain:checked')].map(el => el.value);
  const dtypes = [...document.querySelectorAll('.dtype:checked')].map(el => el.value);
  const role = document.querySelector('input[name=aiRole]:checked')?.value || 'unknown';

  const validTools = tools.filter(t => t.tool_name.trim() && t.purpose.trim());
  const validUseCases = usecases.filter(u => u.trim());

  if (validTools.length === 0 && !confirm('Nessun sistema AI con nome e finalità completati. Continuare?')) return;

  const payload = {
    company: {
      name: v('companyName'),
      sector: v('companySector'),
      employees_range: v('companySize'),
      country: v('companyCountry') || 'Italia',
    },
    ai_tools: validTools.length > 0 ? validTools : [{
      tool_name: 'Non specificato', vendor: 'Non specificato',
      category: 'other', purpose: 'Da definire', target_users: 'employees'
    }],
    use_cases: validUseCases,
    decisions: {
      makes_automated_decisions: document.getElementById('makesDec').checked,
      decision_domains: domains,
      data_types: dtypes,
      affects_vulnerable_groups: document.getElementById('vulnerable').checked,
    },
    governance: {
      has_dpo: document.getElementById('hasDpo').checked,
      has_ai_inventory: document.getElementById('hasInventory').checked,
      has_impact_assessment: document.getElementById('hasImpact').checked,
      has_human_oversight: document.getElementById('hasOversight').checked,
      has_incident_procedure: document.getElementById('hasIncident').checked,
    },
    ai_role: role,
    context_notes: v('contextNotes'),
  };

  document.getElementById('submitBtn').disabled = true;
  document.getElementById('loading').className = 'show';

  try {
    const res = await fetch('/api/report/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Errore generazione');
    document.getElementById('loading').className = '';
    window.location.href = data.download_url;
    document.getElementById('submitBtn').disabled = false;
  } catch (err) {
    document.getElementById('loading').className = '';
    errorAlert.className = 'alert alert-error show';
    errorAlert.textContent = '⚠ ' + (err.message || 'Generazione non disponibile. Riprova tra qualche minuto.');
    document.getElementById('submitBtn').disabled = false;
  }
}

// ── Utils ──────────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ───────────────────────────────────────────────────────────────────────
addTool();
addUseCase();
</script>
</body>
</html>`;
