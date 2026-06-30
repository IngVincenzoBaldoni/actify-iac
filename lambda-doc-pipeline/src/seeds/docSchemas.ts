import type { DocSchema } from '../types';

const NOW = new Date().toISOString();

// ─── DISCLOSURE_NOTICE — Art. 50 ─────────────────────────────────────────────
export const DISCLOSURE_NOTICE_V1: DocSchema = {
  docType:        'DISCLOSURE_NOTICE',
  version:        '1.1.0',
  status:         'ACTIVE',
  modelTier:      'economy',
  outputLanguage: 'it',
  createdAt:      NOW,
  closingActions: [{
    gapTypes: ['transparency_notice', '*'],
    actions: [
      "Pubblicare la presente informativa nel punto di contatto principale con l'utente finale (interfaccia web, app mobile, o comunicazione scritta).",
      "Comunicare l'adozione dell'informativa al personale che opera il sistema AI e a eventuali responsabili della comunicazione.",
      "Conservare la presente informativa nell'archivio documentale aziendale per almeno 10 anni dalla data di adozione.",
      "Caricare evidenza dell'adozione (screenshot, data di pubblicazione) nella sezione Documenti di Actify per chiudere il gap.",
    ],
  }],
  sections: [
    {
      sectionId: 'intro',
      title:     'Introduzione e Scopo',
      order:     1,
      kind:      'FIXED',
      template:  "La presente informativa è redatta in conformità all'Art. 50 del Regolamento UE 2024/1689 (AI Act) e descrive l'utilizzo del sistema di intelligenza artificiale {{system.name}} da parte di {{company.name}}.",
      bindings:  ['system.name', 'company.name'],
    },
    {
      sectionId: 'scope',
      title:     'Descrizione del Sistema e Funzionalità',
      order:     2,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'scope',
        instruction:     `Descrivi il sistema AI in linguaggio chiaro e accessibile — prosa continua, senza tecnicismi.
Struttura il testo come segue (senza usare ### per questa sezione di informativa — prosa piana):
Prima spiega cosa fa concretamente il sistema AI nel contesto aziendale (es. "Il sistema analizza automaticamente...").
Poi spiega come viene utilizzato dall'organizzazione nel processo descritto — chi lo usa e in quale momento del processo.
Infine chiarisci esplicitamente cosa NON fa o NON può decidere autonomamente: questo è fondamentale per la trasparenza verso l'utente finale.
Scrivi come se dovessi spiegarlo a un utente non esperto. Max 200 parole.
Usa [DA COMPLETARE — specificare: ___] per elementi non noti.
Rispondi SOLO con JSON valido: { "text": "...descrizione completa in prosa chiara..." }`,
        maxWords:        200,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'informativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Descrizione del sistema in linguaggio accessibile — prosa continua senza ###' },
          },
        },
      },
    },
    {
      sectionId: 'user_rights',
      title:     'Diritti degli Utenti e Contatti',
      order:     3,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'user_rights',
        instruction:     `Descrivi i diritti degli utenti e le modalità di contatto in prosa accessibile con ### sottotitoli.
### Diritti dell'Utente
In prosa, spiega come l'utente può: richiedere l'intervento di un operatore umano o opporsi a decisioni automatizzate (se applicabile); comprendere il ruolo del sistema AI nella decisione che lo riguarda; presentare un reclamo formale.
### Come Contattarci
In prosa, indica un indirizzo di contatto generico (es. compliance@[nome-azienda].it — l'azienda deve completare con il recapito reale) e le modalità di accesso per esercitare i propri diritti.
Max 150 parole. Rispondi SOLO con JSON valido: { "text": "...sezione completa in markdown..." }`,
        maxWords:        150,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'informativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione diritti e contatti in markdown con ### sottotitoli' },
          },
        },
      },
    },
    {
      sectionId: 'normative_references',
      title:     'Riferimenti Normativi',
      order:     90,
      kind:      'FIXED',
    },
    {
      sectionId: 'required_actions',
      title:     'Azioni Richieste per Rendere Efficace Questo Documento',
      order:     91,
      kind:      'FIXED',
    },
    {
      sectionId: 'disclaimer',
      title:     'Avvertenza Legale',
      order:     99,
      kind:      'FIXED',
    },
  ],
};

// ─── MONITORING_PLAN — Art. 26, 72 ───────────────────────────────────────────
export const MONITORING_PLAN_V1: DocSchema = {
  docType:        'MONITORING_PLAN',
  version:        '1.1.0',
  status:         'ACTIVE',
  modelTier:      'standard',
  outputLanguage: 'it',
  createdAt:      NOW,
  closingActions: [{
    gapTypes: ['monitoring_plan', '*'],
    actions: [
      "Nominare formalmente il Responsabile della Supervisione indicato nel piano (o identificare il ruolo se non ancora assegnato).",
      "Implementare i meccanismi di log e tracciabilità previsti dal piano entro la data di entrata in vigore indicata.",
      "Effettuare la prima revisione periodica del piano entro 6 mesi dall'adozione.",
      "Conservare il piano nell'archivio documentale aziendale e caricare evidenza dell'adozione in Actify per chiudere il gap.",
    ],
  }],
  sections: [
    {
      sectionId: 'intro',
      title:     'Scopo e Ambito del Piano',
      order:     1,
      kind:      'FIXED',
      template:  "Il presente Piano di Monitoraggio è redatto da {{company.name}} in conformità agli articoli applicabili del Regolamento UE 2024/1689 (AI Act) per il sistema AI {{system.name}} (fornitore: {{system.vendor}}).",
      bindings:  ['company.name', 'system.name', 'system.vendor'],
    },
    {
      sectionId: 'responsibilities',
      title:     'Responsabilità e Governance',
      order:     2,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'responsibilities',
        instruction:     `Descrivi la governance e le responsabilità di supervisione in prosa operativa con ### sottotitoli. Non usare nomi propri — solo ruoli aziendali.
### Responsabile della Supervisione
In prosa, identifica il ruolo aziendale responsabile della supervisione del sistema AI (es. Responsabile IT, Data Protection Officer, Referente AI), descrivendo le sue responsabilità specifiche nel contesto di questo piano.
### Catena di Escalation
In prosa, descrivi la catena di escalation in caso di anomalie o malfunzionamenti: chi viene contattato per primo, con quale mezzo (es. ticket, email, chiamata), entro quanto tempo, e chi ha l'autorità di prendere decisioni in caso di incidente.
Max 200 parole. Rispondi SOLO con JSON valido: { "text": "...sezione completa in markdown..." }`,
        maxWords:        200,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione governance e responsabilità in markdown con ### sottotitoli' },
          },
        },
      },
    },
    {
      sectionId: 'monitoring_activities',
      title:     'Attività di Monitoraggio e Frequenza',
      order:     3,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'monitoring_activities',
        instruction:     `Descrivi le attività di monitoraggio in prosa operativa con ### sottotitoli e una tabella markdown obbligatoria. Adatta alla dimensione e al settore dell'azienda.
### Controlli Periodici
Includi OBBLIGATORIAMENTE una tabella markdown con le attività di controllo:
| Attività di Controllo | Frequenza | Cosa si Verifica | Responsabile |
| --- | --- | --- | --- |
| [Descrizione attività] | Giornaliera / Settimanale / Mensile | [Cosa viene verificato concretamente] | [Ruolo] |
Aggiungi 2-3 righe pertinenti al tipo di sistema AI. Dopo la tabella, aggiungi una breve nota narrativa sulle attività più critiche.
### KPI e Soglie di Allerta
In prosa, descrivi almeno 2 KPI o soglie di allerta con valori concreti (es. "Se il tasso di errore supera il 5% in 7 giorni, si attiva una revisione straordinaria del modello").
### Procedura di Log degli Interventi Umani
In prosa, descrivi come vengono tracciati gli interventi umani (override, correzioni, segnalazioni), chi accede ai log e per quanto tempo vengono conservati.
Max 300 parole totali. Rispondi SOLO con JSON valido: { "text": "...sezione completa in markdown con tabella..." }`,
        maxWords:        300,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione attività di monitoraggio in markdown — includi tabella markdown per le attività e prosa con ### sottotitoli' },
          },
        },
      },
    },
    {
      sectionId: 'review',
      title:     'Revisione e Aggiornamento del Piano',
      order:     4,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'review',
        instruction:     `Descrivi il processo di revisione e aggiornamento del piano in prosa con ### sottotitoli.
### Cadenza di Revisione Periodica
In prosa, indica la frequenza della revisione del piano (almeno annuale obbligatoria per AI Act) e la motivazione della cadenza scelta in base al profilo di rischio del sistema.
### Trigger di Revisione Anticipata
In prosa, descrivi almeno 3 eventi che richiedono una revisione anticipata del piano prima della scadenza ordinaria: es. incidenti significativi, modifiche sostanziali al sistema AI, aggiornamenti normativi, cambiamenti nel contesto d'uso o nella struttura aziendale.
### Procedura di Approvazione
In prosa, chi approva le versioni revisionate del piano, come viene documentata l'approvazione (firma, sistema documentale) e come viene comunicata agli utenti del sistema.
Max 150 parole. Rispondi SOLO con JSON valido: { "text": "...sezione completa in markdown..." }`,
        maxWords:        150,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione revisione e aggiornamento piano in markdown con ### sottotitoli' },
          },
        },
      },
    },
    {
      sectionId: 'normative_references',
      title:     'Riferimenti Normativi',
      order:     90,
      kind:      'FIXED',
    },
    {
      sectionId: 'required_actions',
      title:     'Azioni Richieste per Rendere Efficace Questo Documento',
      order:     91,
      kind:      'FIXED',
    },
    {
      sectionId: 'disclaimer',
      title:     'Avvertenza Legale',
      order:     99,
      kind:      'FIXED',
    },
  ],
};

// ─── AI_POLICY — Art. 4, 26 ──────────────────────────────────────────────────
export const AI_POLICY_V1: DocSchema = {
  docType:        'AI_POLICY',
  version:        '1.1.0',
  status:         'ACTIVE',
  modelTier:      'standard',
  outputLanguage: 'it',
  createdAt:      NOW,
  closingActions: [{
    gapTypes: ['policy_template', '*'],
    actions: [
      "Fare approvare la presente policy dalla direzione aziendale prima della pubblicazione interna.",
      "Comunicare la policy a tutti i dipendenti che utilizzano o supervisiona il sistema AI indicato.",
      "Predisporre un percorso di formazione minima per gli utenti del sistema (anche auto-formazione sul documento stesso).",
      "Caricare evidenza dell'adozione (approvazione direzione, comunicazione al personale) in Actify per chiudere il gap.",
    ],
  }],
  sections: [
    {
      sectionId: 'intro',
      title:     'Scopo e Ambito di Applicazione',
      order:     1,
      kind:      'FIXED',
      template:  "La presente Policy disciplina l'utilizzo del sistema AI {{system.name}} all'interno di {{company.name}}, in conformità al Regolamento UE 2024/1689 (AI Act) e alle best practice in materia di governance AI.",
      bindings:  ['system.name', 'company.name'],
    },
    {
      sectionId: 'usage_rules',
      title:     'Regole di Utilizzo e Comportamenti Vietati',
      order:     2,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'usage_rules',
        instruction:     `Redigi la sezione sulle regole d'uso del sistema AI in prosa operativa con ### sottotitoli. Adatta al settore e alla dimensione dell'azienda.
### Usi Consentiti
In prosa, descrivi almeno 3 casi d'uso approvati e specifici per questo sistema AI nel contesto aziendale, spiegando brevemente per ogni caso perché è appropriato e quali garanzie di supervisione si applicano.
### Usi Vietati
In prosa, descrivi almeno 3 comportamenti esplicitamente proibiti — sii specifico al sistema e al contesto (es. "È vietato utilizzare gli output del sistema per prendere decisioni finali su candidati senza revisione umana", "È vietato condividere gli output con soggetti terzi non autorizzati"). Evita formulazioni generiche.
### Requisiti di Revisione Umana degli Output
In prosa, specifica quando e come gli output del sistema AI devono essere revisionati da un operatore umano prima di essere agiti: quali tipi di output richiedono revisione, chi la effettua, con quale procedura.
Max 300 parole. Rispondi SOLO con JSON valido: { "text": "...sezione completa in markdown..." }`,
        maxWords:        300,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione regole d\'uso in markdown con ### sottotitoli e misure concrete' },
          },
        },
      },
    },
    {
      sectionId: 'responsibilities',
      title:     'Responsabilità degli Utenti e Referente AI',
      order:     3,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'responsibilities',
        instruction:     `Descrivi le responsabilità degli utenti e del Referente AI interno in prosa con ### sottotitoli.
### Responsabilità degli Utenti
In prosa, elenca e spiega le responsabilità di chi utilizza il sistema AI: firma e rispetto della policy, completamento della formazione minima richiesta, segnalazione tempestiva di anomalie o output problematici, rispetto delle regole d'uso definite nella sezione precedente.
### Ruolo del Referente AI Interno
In prosa, descrivi chi supervisiona il sistema AI a livello aziendale (ruolo, non nome), con quale frequenza effettua controlli sulle attività e sugli output, e come coordina le segnalazioni degli utenti.
### Procedura di Segnalazione Incidenti
In prosa, descrivi come un utente deve segnalare un malfunzionamento, un output inappropriato o un uso improprio: canale di segnalazione (es. email dedicata, sistema di ticketing), tempi attesi di risposta, chi gestisce la segnalazione e come viene tracciata.
Max 200 parole. Rispondi SOLO con JSON valido: { "text": "...sezione completa in markdown..." }`,
        maxWords:        200,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione responsabilità utenti e Referente AI in markdown con ### sottotitoli' },
          },
        },
      },
    },
    {
      sectionId: 'normative_references',
      title:     'Riferimenti Normativi',
      order:     90,
      kind:      'FIXED',
    },
    {
      sectionId: 'required_actions',
      title:     'Azioni Richieste per Rendere Efficace Questo Documento',
      order:     91,
      kind:      'FIXED',
    },
    {
      sectionId: 'disclaimer',
      title:     'Avvertenza Legale',
      order:     99,
      kind:      'FIXED',
    },
  ],
};

// ─── TECH_DOC — Allegato IV AI Act (v2.1.0 — prosa markdown, no JSON frammentato) ──
// v2.1: tutti gli slot generativi emettono { text: "...markdown..." } invece di JSON
//       strutturato → assembleDocument.ts restituisce content['text'] direttamente
//       senza frammentare valori senza contesto.
export const TECH_DOC_V1: DocSchema = {
  docType:        'TECH_DOC',
  version:        '2.1.0',
  status:         'ACTIVE',
  modelTier:      'standard',
  outputLanguage: 'it',
  createdAt:      NOW,
  closingActions: [{
    gapTypes: ['document_generation', '*'],
    actions: [
      "Completare tutte le sezioni [DA COMPLETARE] con i dati tecnici reali: versione modello, metriche misurate, referenti nominativi, date. Se deployer, richiedere la scheda tecnica al fornitore.",
      "Se deployer: richiedere al fornitore la Documentazione Tecnica Allegato IV e allegarla come Appendice A. Verificare che copra tutti i punti §1-§8.",
      "Far verificare il documento dal Responsabile Tecnico AI e controfirmare dal rappresentante legale prima di archiviarlo ufficialmente.",
      "Assegnare numero di versione (es. v1.0), data di emissione e classificazione al documento prima del deposito.",
      "Conservare per tutta la durata d'uso del sistema + 10 anni (Art. 72 AI Act). Ricaricare la versione completata e firmata in Actify per chiudere il gap.",
    ],
  }],
  sections: [
    // ── 1. FIXED — Copertina / identificazione ────────────────────────────────
    {
      sectionId: 'identification',
      title:     'Copertina e Identificazione del Sistema AI',
      order:     1,
      kind:      'FIXED',
      template:  `⚠ BOZZA — Completare e far firmare prima dell'uso ufficiale ⚠

DOCUMENTAZIONE TECNICA DEL SISTEMA AI
Redatta ai sensi dell'Allegato IV, Regolamento UE 2024/1689 (AI Act)
Generata da Actify AI — da revisionare, completare e approvare

---

Organizzazione: {{company.name}}
Settore: {{company.sector}}
Ruolo AI Act: {{system.role}}

Sistema AI: {{system.name}}
Fornitore / Sviluppatore: {{system.vendor}}
Versione sistema: [X.X — DA COMPLETARE]
Categoria di rischio: [Alto rischio — Allegato III — DA COMPLETARE]

Versione documento: [1.0 — DA COMPLETARE]
Data prima emissione: [GG/MM/AAAA — DA COMPLETARE]
Data ultima revisione: [GG/MM/AAAA — DA COMPLETARE]
Classificazione: Riservato — uso interno
Responsabile documento: [Nome, cognome e ruolo — DA COMPLETARE]`,
      bindings:  ['company.name', 'company.sector', 'system.name', 'system.vendor', 'system.role'],
    },

    // ── 2. GENERATIVE — §1 Descrizione generale ──────────────────────────────
    {
      sectionId: 'system_overview',
      title:     'All. IV §1 — Descrizione Generale del Sistema AI',
      order:     2,
      kind:      'GENERATIVE',
      slot: {
        slotId:           'system_overview',
        instruction:      `Redigi la sezione §1 dell'Allegato IV AI Act basandoti sul profilo del sistema nel contesto.
Struttura la sezione con sottotitoli ### e prosa continua coerente — NON elenchi di valori isolati.
(1) ### Finalità del Sistema — cosa fa il sistema, quale problema risolve — specifico e tecnico.
(2) ### Casi d'Uso Principali — 2-3 scenari concreti, specificando come il sistema partecipa al processo decisionale (es. "il recruiter vede solo i candidati con score ≥ 70").
(3) ### Tipo di Output — decisioni autonome, raccomandazioni, classificazioni, contenuti — specifica se vincolante o consultivo e in quale misura.
(4) ### Utenti Finali — categorie di personale che interagisce con il sistema, chi supervisiona, chi riceve le decisioni.
(5) ### Livello di Autonomia — il sistema decide autonomamente, raccomanda con supervisione obbligatoria, o genera contenuto revisionato? Indica esplicitamente le garanzie di supervisione umana.
Usa [DA COMPLETARE — specificare: ___] per elementi che l'azienda deve completare. Max 350 parole.
Rispondi SOLO con JSON valido: { "text": "...sezione §1 completa in markdown..." }`,
        maxWords:         350,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:             'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione §1 completa in markdown — prosa con ### sottotitoli e punti elenco dove appropriato' },
          },
        },
      },
    },

    // ── 3. GENERATIVE — §2 Architettura e sviluppo ───────────────────────────
    {
      sectionId: 'architecture',
      title:     'All. IV §2 — Architettura, Sviluppo e Componenti del Sistema',
      order:     3,
      kind:      'GENERATIVE',
      slot: {
        slotId:           'architecture',
        instruction:      `Redigi la sezione §2 dell'Allegato IV come prosa tecnica strutturata con sottotitoli ###.
### Architettura e Tecnologia AI — tipo di architettura AI/ML (es. "LLM (Large Language Model) con RAG", "Classificatore supervisionato (Gradient Boosting)") — sii tecnico e specifico al sistema descritto.
### Componenti Principali — descrivi in prosa i componenti principali deployati nell'organizzazione (almeno 3: es. modello base, interfaccia API, modulo log, pipeline dati), spiegando il ruolo di ciascuno.
### Personalizzazioni — personalizzazioni rispetto al sistema base del fornitore: system prompt, fine-tuning, RAG su knowledge base interna, soglie configurate. Se nessuna: "Il sistema è utilizzato as-is, senza personalizzazioni rispetto alla versione del fornitore."
### Processo di Selezione e Deployment — come l'organizzazione ha selezionato, testato e messo in produzione il sistema (criteri di valutazione, test preliminari, rollout).
### Versione e Aggiornamenti — versione corrente e data ultimo aggiornamento, o [DA COMPLETARE — richiedere la versione corrente al fornitore].
Adatta a provider (sviluppa il sistema) o deployer (acquista il sistema). Max 300 parole.
Rispondi SOLO con JSON valido: { "text": "...sezione §2 completa in markdown..." }`,
        maxWords:         300,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:             'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione §2 completa in markdown — prosa tecnica con ### sottotitoli' },
          },
        },
      },
    },

    // ── 4. GENERATIVE — §3 Dati ──────────────────────────────────────────────
    {
      sectionId: 'training_data',
      title:     'All. IV §3 — Dati di Addestramento, Validazione e Test',
      order:     4,
      kind:      'GENERATIVE',
      slot: {
        slotId:           'training_data',
        instruction:      `Redigi la sezione §3 dell'Allegato IV relativa ai dati come prosa tecnica con sottotitoli ###.
### Contesto: Deployer o Provider — apri con una frase che identifica se l'organizzazione è deployer (acquista sistema di terzi) o provider (sviluppa il sistema), e cosa questo implica per la responsabilità sui dati.
Se DEPLOYER: in prosa, descrivi (a) i dati elaborati in produzione dal sistema, (b) le garanzie contrattuali del fornitore su training e qualità dei dati, (c) eventuali personalizzazioni con dati interni (RAG, fine-tuning).
Se PROVIDER: in prosa, descrivi dataset di training (fonti, dimensione, periodo), preprocessing, split train/val/test, copertura demografica.
### Categorie di Dati Trattati in Produzione — elenca in prosa le categorie specifiche di dati trattati (almeno 3, es. dati anagrafici, curriculum, storico transazioni).
### Misure di Qualità dei Dati — descrivi in prosa le misure di qualità dei dati in input (validazione, pulizia, deduplicazione — almeno 2 misure concrete).
### Rischi di Bias e Mitigazioni — bias identificati e misure di mitigazione concrete. Se non ancora analizzato: "[DA COMPLETARE — condurre analisi bias formale entro [X] giorni dall'adozione di questo documento]".
Max 300 parole. Rispondi SOLO con JSON valido: { "text": "...sezione §3 completa in markdown..." }`,
        maxWords:         300,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:             'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione §3 completa in markdown — prosa con ### sottotitoli' },
          },
        },
      },
    },

    // ── 5. GENERATIVE — §4 Metriche (sezione critica per audit) ──────────────
    {
      sectionId: 'performance_metrics',
      title:     'All. IV §4 — Metriche di Performance, Test e Validazione',
      order:     5,
      kind:      'GENERATIVE',
      slot: {
        slotId:           'performance_metrics',
        instruction:      `Redigi la sezione §4 dell'Allegato IV — SEZIONE CRITICA: senza metriche concrete il documento non regge un audit.
Struttura come prosa tecnica con ### sottotitoli e una tabella markdown obbligatoria per le metriche.
### Metriche di Performance
Includi OBBLIGATORIAMENTE una tabella markdown con almeno 3 metriche nel formato:
| Metrica | Valore Misurato | Benchmark di Riferimento | Fonte / Data |
| --- | --- | --- | --- |
| Accuracy | [DA COMPLETARE — richiedere scheda tecnica al fornitore] | ≥ 85% | [DA COMPLETARE] |
| ... | ... | ... | ... |
Scegli le metriche pertinenti al tipo di sistema: Classificatori (Accuracy, Precision, Recall, F1-Score, AUC-ROC, FPR); Sistemi LLM/generativi (Tasso rifiuto prompt non conformi, Tasso allucinazioni rilevate, Accuracy fattuale); Sistemi decisionali (Tasso override umano, Tasso errori gravi, Tempo medio risposta).
Se deployer, indica "Fonte: Documentazione tecnica fornitore" e usa "[DA COMPLETARE — richiedere al fornitore entro 30 giorni]" per valori mancanti.
### Metodologia di Test e Validazione
Descrivi in prosa come il sistema è stato valutato (test set interno, benchmark pubblico, valutazione umana, A/B test). Includi data ultima validazione o "[DA COMPLETARE]".
### Test di Bias
Gruppi demografici o categorie protette testati e risultati. Se non condotti: "[DA COMPLETARE — pianificare bias audit formale entro [X] mesi dall'adozione del documento]".
### Limitazioni Note
Descrivi in prosa almeno 2 scenari in cui il sistema può errare o performa in modo degradato (obbligatorio Allegato IV).
Max 400 parole totali. Rispondi SOLO con JSON valido: { "text": "...sezione §4 completa in markdown con tabella..." }`,
        maxWords:         400,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:             'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione §4 completa in markdown — includi tabella markdown per le metriche e prosa con ### sottotitoli' },
          },
        },
      },
    },

    // ── 6. GENERATIVE — §6 Supervisione umana ────────────────────────────────
    {
      sectionId: 'oversight',
      title:     'All. IV §6 — Supervisione Umana, Monitoraggio e Controllo',
      order:     6,
      kind:      'GENERATIVE',
      slot: {
        slotId:           'oversight',
        instruction:      `Redigi la sezione §6 dell'Allegato IV come prosa operativa con ### sottotitoli. Art. 14 AI Act richiede misure concrete di supervisione.
### Procedure di Supervisione
Descrivi in prosa chi verifica gli output e con quale procedura concreta — sii specifico (NON "il manager controlla" ma "il Responsabile [Ruolo] rivede ogni output AI prima di comunicarlo usando una checklist di [N] punti che include: [...]"). Indica la frequenza (per ogni output / giornaliera / settimanale).
### Procedura di Override
Descrivi in prosa come un operatore può ignorare, modificare o annullare la decisione o raccomandazione del sistema AI. Specifica in quali circostanze l'override è obbligatorio e chi ha l'autorità definitiva.
### KPI e Soglie di Allerta in Produzione
Descrivi almeno 2 metriche monitorate in produzione con valori numerici di soglia che attivano una revisione (es. "Se il tasso di override supera il 20% in un periodo di 30 giorni, si avvia una revisione del modello"). Se non ancora definite: "[DA DEFINIRE — formalizzare le soglie entro [GG/MM/AAAA]]".
### Sistema di Log e Tracciabilità
Descrivi in prosa cosa viene tracciato (chi usa il sistema, su quali dati, con quale esito), chi accede ai log, e il periodo di conservazione (retention period).
Max 300 parole. Rispondi SOLO con JSON valido: { "text": "...sezione §6 completa in markdown..." }`,
        maxWords:         300,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:             'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione §6 completa in markdown — prosa operativa con ### sottotitoli e misure concrete' },
          },
        },
      },
    },

    // ── 7. GENERATIVE — §7 Sicurezza e robustezza ────────────────────────────
    {
      sectionId: 'security',
      title:     'All. IV §7 — Sicurezza, Robustezza e Gestione degli Incidenti',
      order:     7,
      kind:      'GENERATIVE',
      slot: {
        slotId:           'security',
        instruction:      `Redigi la sezione §7 dell'Allegato IV come prosa operativa con ### sottotitoli.
### Controllo degli Accessi
Descrivi in prosa: chi può accedere al sistema AI (ruoli aziendali specifici), come vengono autenticati (es. SSO, MFA, credenziali aziendali), e chi approva e revoca gli accessi. Includi almeno 3 misure concrete.
### Protezione degli Output
Descrivi dove vengono memorizzati gli output del sistema, chi vi ha accesso, per quanto tempo vengono conservati, e se vengono condivisi con terzi (e con quali garanzie contrattuali).
### Robustezza e Guardrail
Descrivi come il sistema gestisce prompt malformati, input anomali o tentativi di manipolazione (jailbreak). Elenca i guardrail in atto (es. filtri contenuto, validazione input, rate limiting).
### Definizione di Incidente AI e Procedura di Risposta
Prima definisci cosa costituisce un incidente rilevante nel contesto di questo sistema — almeno 3 esempi specifici (es. "output discriminatorio rilevato in una raccomandazione HR", "allucinazione con impatto su una decisione critica", "accesso non autorizzato ai log del sistema"). Poi descrivi il piano di risposta: chi notificare internamente, entro quanto tempo, e se sussiste obbligo di notifica esterna ai sensi dell'Art. 73 AI Act.
### Disattivazione di Emergenza
Descrivi la procedura di disattivazione o bypass del sistema in caso di malfunzionamento grave — chi ha l'autorità di disattivare e come.
Max 300 parole. Rispondi SOLO con JSON valido: { "text": "...sezione §7 completa in markdown..." }`,
        maxWords:         300,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:             'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione §7 completa in markdown — prosa operativa con ### sottotitoli e misure concrete' },
          },
        },
      },
    },

    // ── 8. FIXED — Pagina firma / approvazione ────────────────────────────────
    {
      sectionId: 'signature_page',
      title:     'Approvazione e Firma del Documento',
      order:     8,
      kind:      'FIXED',
      template:  `Il presente documento costituisce la Documentazione Tecnica del sistema AI {{system.name}} redatta ai sensi dell'Allegato IV del Reg. UE 2024/1689. È una BOZZA generata da Actify AI. Deve essere completata, verificata e firmata prima di qualsiasi deposito ufficiale o trasmissione alle autorità di vigilanza.

FIRME DI APPROVAZIONE

| Ruolo | Nome e Cognome | Firma | Data |
| --- | --- | --- | --- |
| Responsabile Tecnico AI | [DA COMPLETARE] | _____________ | ___/___/______ |
| Rappresentante Legale | [DA COMPLETARE] | _____________ | ___/___/______ |
| DPO (se nominato) | [N/A o DA COMPLETARE] | _____________ | ___/___/______ |

REGISTRO REVISIONI

| Versione | Data | Autore | Descrizione Modifiche |
| --- | --- | --- | --- |
| 1.0 | [DA COMPLETARE] | [DA COMPLETARE] | Prima emissione — bozza Actify |
| | | | |`,
      bindings:  ['system.name'],
    },

    // ── Sezioni finali fisse ──────────────────────────────────────────────────
    {
      sectionId: 'normative_references',
      title:     'Riferimenti Normativi (Allegato IV AI Act)',
      order:     90,
      kind:      'FIXED',
    },
    {
      sectionId: 'required_actions',
      title:     'Azioni Richieste per Rendere Efficace Questo Documento',
      order:     91,
      kind:      'FIXED',
    },
    {
      sectionId: 'disclaimer',
      title:     'Avvertenza Legale',
      order:     99,
      kind:      'FIXED',
    },
  ],
};

// ─── CONFORMITY_DECL — Art. 47 (autovalutazione interna, non marcatura CE) ───
export const CONFORMITY_DECL_V1: DocSchema = {
  docType:        'CONFORMITY_DECL',
  version:        '1.1.0',
  status:         'ACTIVE',
  modelTier:      'standard',
  outputLanguage: 'it',
  createdAt:      NOW,
  closingActions: [{
    gapTypes: ['conformity_declaration', '*'],
    actions: [
      "Fare firmare il documento dal rappresentante legale dell'azienda prima di qualsiasi uso ufficiale.",
      "Completare le sezioni [DA COMPLETARE] (indirizzo, rappresentante legale, data).",
      "Verificare con un consulente legale o di compliance che il documento rifletta accuratamente lo stato di adempimento.",
      "Conservare il documento per almeno 10 anni. Caricare copia firmata in Actify per chiudere il gap.",
    ],
  }],
  sections: [
    {
      sectionId: 'intro',
      title:     'Dichiarazione',
      order:     1,
      kind:      'FIXED',
      template:  "La società {{company.name}} [indirizzo completo — da completare], nella persona del rappresentante legale [nome — da completare], dichiara quanto segue in relazione al sistema AI {{system.name}}.",
      bindings:  ['company.name', 'system.name'],
    },
    {
      sectionId: 'conformity_statement',
      title:     "Oggetto della Dichiarazione e Misure Adottate",
      order:     2,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'conformity_statement',
        instruction:     `Redigi la dichiarazione di conformità autovalutata in prosa formale con ### sottotitoli e una tabella markdown obbligatoria.
Inizia con un breve paragrafo introduttivo che identifica il sistema AI (nome, versione se nota, fornitore) e il contesto della dichiarazione.
### Misure di Adempimento per Articolo
Includi OBBLIGATORIAMENTE una tabella markdown con gli articoli del Regolamento UE 2024/1689 per i quali si dichiara l'adempimento:
| Articolo | Titolo / Oggetto | Misura Concreta Adottata |
| --- | --- | --- |
| Art. XX | [Titolo dell'articolo] | [Descrizione della misura adottata — una frase operativa] |
Includi almeno 4-6 articoli pertinenti al profilo e alla classificazione del sistema AI. Usa formulazioni operative ("è stata adottata", "è prevista", "è in vigore") — mai formulazioni certificate.
### Limiti della Dichiarazione
In prosa (3-4 frasi): chiarisci che si tratta di un'autovalutazione interna operativa, non di una certificazione di terze parti, e che non sostituisce una valutazione di conformità formale ai sensi dell'Art. 43 AI Act.
Max 350 parole totali. Rispondi SOLO con JSON valido: { "text": "...dichiarazione completa in markdown con tabella..." }`,
        maxWords:        350,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Dichiarazione di conformità completa in markdown — include tabella articoli/misure e prosa con ### sottotitoli' },
          },
        },
      },
    },
    {
      sectionId: 'normative_references',
      title:     'Riferimenti Normativi',
      order:     90,
      kind:      'FIXED',
    },
    {
      sectionId: 'required_actions',
      title:     'Azioni Richieste per Rendere Efficace Questo Documento',
      order:     91,
      kind:      'FIXED',
    },
    {
      sectionId: 'disclaimer',
      title:     'Avvertenza Legale',
      order:     99,
      kind:      'FIXED',
    },
  ],
};

// ─── FRIA — Art. 27 (Fundamental Rights Impact Assessment) ───────────────────
// Usa sempre Nova Pro: documento ad alta criticità legale, max dettaglio richiesto.
export const FRIA_V1: DocSchema = {
  docType:        'FRIA',
  version:        '1.1.0',
  status:         'ACTIVE',
  modelTier:      'standard',
  modelId:        'eu.amazon.nova-pro-v1:0',
  outputLanguage: 'it',
  createdAt:      NOW,
  closingActions: [{
    gapTypes: ['risk_assessment', '*'],
    actions: [
      "Far revisionare e approvare la FRIA dal responsabile compliance, dal DPO (se nominato) o da un consulente legale specializzato prima di qualsiasi utilizzo del sistema AI.",
      "Coinvolgere, dove possibile, rappresentanti delle categorie di persone interessate (dipendenti, utenti, soggetti vulnerabili) nella verifica della valutazione dei rischi.",
      "Comunicare la FRIA alle funzioni aziendali coinvolte nell'utilizzo del sistema (HR, Legal, IT, direzione) e al Responsabile della Supervisione AI nominato.",
      "Verificare con un consulente legale se sussiste l'obbligo di notifica all'autorità di vigilanza del mercato competente (obbligatorio per enti pubblici e fornitori di servizi pubblici essenziali che usano sistemi AI Allegato III categorie 1, 2, 3, 4, 5(b), 5(d), 6, 7, 8).",
      "Impostare un calendario di revisione periodica della FRIA (minimo annuale) e definire i trigger per revisione anticipata: incidenti, modifiche sostanziali al sistema, nuovi contesti d'uso, aggiornamenti normativi.",
      "Conservare la FRIA per tutta la durata di utilizzo del sistema AI + 10 anni. Caricare copia firmata in Actify per chiudere il gap.",
    ],
  }],
  sections: [
    {
      sectionId: 'intro',
      title:     'Identificazione e Ambito della Valutazione',
      order:     1,
      kind:      'FIXED',
      template:  "La presente Valutazione dell'Impatto sui Diritti Fondamentali (FRIA — Fundamental Rights Impact Assessment) è condotta da {{company.name}} in qualità di Deployer ai sensi dell'Art. 27 del Regolamento UE 2024/1689 (AI Act), in relazione al sistema di intelligenza artificiale {{system.name}} (fornitore: {{system.vendor}}).\n\nLa FRIA deve essere eseguita prima della messa in uso del sistema AI ad alto rischio e aggiornata in caso di modifiche sostanziali al sistema o al contesto di utilizzo. Il presente documento costituisce una bozza operativa da revisionare, completare e approvare prima dell'uso ufficiale.",
      bindings:  ['company.name', 'system.name', 'system.vendor'],
    },
    {
      sectionId: 'process_use',
      title:     'Descrizione del Processo e Modalità di Utilizzo',
      order:     2,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'process_use',
        instruction:     `Descrivi il processo aziendale e le modalità d'uso del sistema AI in prosa operativa con ### sottotitoli. Adatta al settore e alla dimensione dell'azienda.
### Processo Aziendale e Finalità d'Uso
In prosa, descrivi il processo aziendale specifico in cui il sistema AI è impiegato e le decisioni prese con o tramite il sistema. Sii specifico e concreto (es. non "supporta le decisioni HR" ma "classifica automaticamente le candidature e le ordina per score di adeguatezza, che il responsabile HR usa per definire la shortlist").
### Tipo di Contributo del Sistema AI
In prosa, spiega esplicitamente se il sistema supporta una decisione umana, raccomanda un'azione, determina autonomamente un esito, o classifica soggetti. Indica chiaramente il livello di autonomia e le garanzie di supervisione umana presenti — questo è il punto più critico per la FRIA.
### Frequenza e Periodo d'Uso
In prosa, la frequenza di utilizzo prevista (es. quotidiana per ogni richiesta, settimanale, per ogni nuovo caso) e il periodo di impiego del sistema (inizio previsto, durata stimata).
### Categorie di Dati Personali Elaborati
In prosa, elenca le categorie di dati personali trattati dal sistema (almeno 2 specifiche, es. dati identificativi, dati comportamentali, dati economici, biometria). Indica se si tratta di dati di categorie speciali ai sensi dell'Art. 9 GDPR.
Max 350 parole. Rispondi SOLO con JSON valido: { "text": "...sezione completa in markdown..." }`,
        maxWords:        350,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione processo aziendale e modalità d\'uso in markdown con ### sottotitoli' },
          },
        },
      },
    },
    {
      sectionId: 'affected_persons',
      title:     'Categorie di Persone Interessate e Gruppi Vulnerabili',
      order:     3,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'affected_persons',
        instruction:     `Descrivi le categorie di persone interessate e i gruppi vulnerabili in prosa analitica con ### sottotitoli e tabelle markdown obbligatorie.
### Categorie di Persone Interessate
Includi OBBLIGATORIAMENTE una tabella markdown:
| Categoria di Persone | Stima Scala Impatto | Natura dell'Impatto |
| --- | --- | --- |
| [Nome categoria] | [Es: "circa 50 persone/anno", "potenzialmente tutta la clientela"] | Diretto / Indiretto / Diretto e indiretto |
Aggiungi almeno 1 categoria pertinente al contesto. Dopo la tabella, un breve paragrafo narrativo sulle categorie più rilevanti.
### Analisi dei Gruppi Vulnerabili
Includi OBBLIGATORIAMENTE una tabella markdown che analizza tutti e 7 i gruppi vulnerabili — anche quelli non presenti nel contesto (indicando "No" e la motivazione):
| Gruppo Vulnerabile | Presente nel Contesto | Rischi Specifici o Motivazione Assenza |
| --- | --- | --- |
| Minori (< 18 anni) | Sì / No | [Rischi specifici se Sì, oppure breve motivazione se No] |
| Anziani | Sì / No | ... |
| Persone con disabilità fisica o cognitiva | Sì / No | ... |
| Minoranze etniche, religiose o linguistiche | Sì / No | ... |
| Migranti o richiedenti asilo | Sì / No | ... |
| Persone economicamente svantaggiate o con bassa alfabetizzazione digitale | Sì / No | ... |
| Lavoratori in posizione subordinata o precaria | Sì / No | ... |
Aggiungi una nota narrativa sui gruppi presenti e i rischi più rilevanti.
### Dati di Categorie Speciali (Art. 9 GDPR)
In prosa: indica se il sistema elabora dati di categorie speciali (salute, etnia, orientamento sessuale, opinioni politiche, biometria) e le implicazioni per la valutazione dei rischi.
Max 400 parole totali. Rispondi SOLO con JSON valido: { "text": "...sezione completa in markdown con tabelle..." }`,
        maxWords:        400,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione persone interessate e gruppi vulnerabili in markdown — include due tabelle markdown obbligatorie e prosa con ### sottotitoli' },
          },
        },
      },
    },
    {
      sectionId: 'rights_risks',
      title:     "Valutazione dei Rischi per i Diritti Fondamentali",
      order:     4,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'rights_risks',
        instruction:     `Conduci la valutazione dei rischi per i diritti fondamentali in prosa analitica con ### sottotitoli e una tabella markdown obbligatoria.
### Metodologia di Valutazione
Breve paragrafo (2-3 frasi) sulla metodologia di analisi applicata: quali fattori sono stati considerati (natura del sistema, categorie di persone interessate, contesto d'uso) e come è stata determinata la probabilità e la gravità dei rischi.
### Valutazione per Diritto Fondamentale
Includi OBBLIGATORIAMENTE una tabella markdown che copra tutti i diritti richiesti:
| Diritto Fondamentale | Probabilità | Gravità | Descrizione del Rischio nel Contesto Specifico |
| --- | --- | --- | --- |
| Non discriminazione e parità di trattamento | Alta / Media / Bassa / N.A. | Alta / Media / Bassa / N.A. | [Descrizione concreta del rischio: bias algoritmici, discriminazione per genere/etnia/età nelle decisioni] |
| Protezione dei dati personali e riservatezza | ... | ... | [Rischi di profilazione, accesso illecito, conservazione eccessiva] |
| Dignità umana | ... | ... | [Rischi di trattamento degradante, etichettatura automatica stigmatizzante] |
| Accesso a servizi essenziali e libertà | ... | ... | [Rischi di esclusione da servizi causata da decisioni algoritmiche] |
| Diritto a un ricorso effettivo | ... | ... | [Rischi che le persone non possano contestare una decisione automatizzata] |
| [Diritti specifici al settore, se applicabili] | ... | ... | ... |
Per ogni diritto con probabilità ALTA o gravità ALTA, aggiungi sotto la tabella un breve paragrafo descrittivo che espande il rischio concreto nel contesto aziendale specifico.
### Livello di Rischio Complessivo
In prosa (2-3 frasi): sintetizza il livello di rischio complessivo risultante (alto/medio/basso) e i fattori determinanti principali.
Max 500 parole totali. Rispondi SOLO con JSON valido: { "text": "...sezione completa in markdown con tabella..." }`,
        maxWords:        500,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Valutazione rischi diritti fondamentali in markdown — include tabella obbligatoria e prosa con ### sottotitoli' },
          },
        },
      },
    },
    {
      sectionId: 'oversight_measures',
      title:     "Misure di Supervisione Umana (Art. 26 AI Act)",
      order:     5,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'oversight_measures',
        instruction:     `Descrivi le misure di supervisione umana in prosa operativa con ### sottotitoli. Art. 26 AI Act.
### Meccanismi di Supervisione
In prosa, descrivi almeno 2 meccanismi concreti: chi verifica gli output, con quale procedura specifica passo-passo (NON "il manager controlla" ma la procedura concreta), e con quale frequenza. Specifica se la supervisione avviene prima o dopo che la decisione impatta una persona.
### Override e Intervento Umano
In prosa, descrivi come un operatore può ignorare, modificare o annullare la raccomandazione/decisione del sistema AI, e in quali circostanze specifiche l'override è obbligatorio. Chi ha l'autorità definitiva.
### Formazione degli Operatori
In prosa, il livello minimo di formazione richiesto per gli operatori che supervisionano il sistema: conoscenza del funzionamento, sensibilizzazione sui bias, procedure di escalation, frequenza aggiornamento.
### Misure per Soggetti Vulnerabili
In prosa: misure aggiuntive specifiche per i gruppi vulnerabili identificati nella sezione precedente (es. revisione addizionale obbligatoria, doppio controllo). Se non applicabile: "Nessun gruppo vulnerabile identificato nel contesto d'uso — non sono previste misure specifiche aggiuntive."
### Trasparenza verso gli Interessati
In prosa: come le persone interessate vengono informate dell'utilizzo del sistema AI e come possono richiedere un'interazione umana alternativa.
Max 350 parole. Rispondi SOLO con JSON valido: { "text": "...sezione completa in markdown..." }`,
        maxWords:        350,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Misure di supervisione umana FRIA in markdown con ### sottotitoli e misure concrete' },
          },
        },
      },
    },
    {
      sectionId: 'risk_mitigation',
      title:     "Misure di Mitigazione, Governance Interna e Meccanismo di Reclamo",
      order:     6,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'risk_mitigation',
        instruction:     `Descrivi le misure di mitigazione, la governance interna e il meccanismo di reclamo in prosa operativa con ### sottotitoli e una tabella markdown. Art. 27(2)(e) AI Act.
### Misure di Mitigazione dei Rischi
Includi OBBLIGATORIAMENTE una tabella markdown con le misure di risposta ai rischi ad alta o media probabilità/gravità identificati nella sezione precedente:
| Diritto Fondamentale / Rischio | Misura di Mitigazione Concreta | Ruolo Responsabile | Scadenza |
| --- | --- | --- | --- |
| [Diritto fondamentale] | [Misura specifica e concreta — NON generica, adatta alla PMI] | [Ruolo aziendale] | [Es: "entro 30 giorni dall'adozione della FRIA"] |
Aggiungi una breve nota narrativa per le misure più critiche.
### Meccanismo di Reclamo (Art. 26(4))
In prosa: specifica il canale di accesso al reclamo (es. email: reclami@[nome-azienda].it — da completare con il recapito reale), il ruolo aziendale che gestisce i reclami (es. Responsabile Compliance, DPO), e il tempo di risposta garantito (es. entro 30 giorni lavorativi).
### Governance della FRIA
In prosa: chi è responsabile dell'aggiornamento della FRIA, con quale frequenza viene rivista (minimo annuale), chi approva le versioni aggiornate e come viene tracciato il cambiamento.
### Coordinamento con la DPIA GDPR
In prosa (3-4 frasi): indica se è stata o sarà condotta una Valutazione d'Impatto sulla Protezione dei Dati (DPIA) separata o congiunta con questa FRIA. Nota importante: la FRIA non sostituisce la DPIA per trattamenti ad alto rischio ai sensi del GDPR.
Max 400 parole totali. Rispondi SOLO con JSON valido: { "text": "...sezione completa in markdown con tabella..." }`,
        maxWords:        400,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Sezione mitigazione, governance e reclami in markdown — include tabella obbligatoria e prosa con ### sottotitoli' },
          },
        },
      },
    },
    {
      sectionId: 'normative_references',
      title:     'Riferimenti Normativi',
      order:     90,
      kind:      'FIXED',
    },
    {
      sectionId: 'required_actions',
      title:     'Azioni Richieste per Rendere Efficace Questo Documento',
      order:     91,
      kind:      'FIXED',
    },
    {
      sectionId: 'disclaimer',
      title:     'Avvertenza Legale',
      order:     99,
      kind:      'FIXED',
    },
  ],
};

export const ALL_SCHEMAS = [
  DISCLOSURE_NOTICE_V1,
  MONITORING_PLAN_V1,
  AI_POLICY_V1,
  TECH_DOC_V1,
  CONFORMITY_DECL_V1,
  FRIA_V1,
];
