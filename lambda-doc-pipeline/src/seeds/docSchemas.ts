import type { DocSchema } from '../types';

const NOW = new Date().toISOString();

// ─── DISCLOSURE_NOTICE — Art. 50 ─────────────────────────────────────────────
export const DISCLOSURE_NOTICE_V1: DocSchema = {
  docType:        'DISCLOSURE_NOTICE',
  version:        '1.0.0',
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
        instruction:     "Descrivi in linguaggio chiaro e non tecnico: (1) cosa fa il sistema AI, (2) come viene utilizzato dall'azienda, (3) cosa NON fa o NON può decidere autonomamente. Max 200 parole. Evita tecnicismi. Formato: stringa di testo semplice.",
        maxWords:        200,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'informativo',
        outputSchema: {
          type: 'object',
          required: ['description'],
          properties: {
            description: { type: 'string', description: 'Descrizione del sistema in linguaggio accessibile' },
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
        instruction:     "Specifica: (1) come l'utente può richiedere intervento umano o opporsi a decisioni automatizzate (se applicabile), (2) un indirizzo di contatto generico (es. compliance@[azienda].it — l'azienda completerà il recapito), (3) come l'utente può presentare un reclamo. Max 150 parole.",
        maxWords:        150,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'informativo',
        outputSchema: {
          type: 'object',
          required: ['rights_text', 'contact_placeholder'],
          properties: {
            rights_text:          { type: 'string' },
            contact_placeholder:  { type: 'string', description: 'Es: compliance@[nome-azienda].it — completare con il recapito reale' },
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
  version:        '1.0.0',
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
        instruction:     "Descrivi: (1) il ruolo aziendale responsabile della supervisione del sistema AI (es. Responsabile IT, Data Protection Officer, Referente AI), (2) le responsabilità specifiche di questo ruolo, (3) la catena di escalation in caso di anomalie. Non usare nomi propri, solo ruoli. Max 200 parole.",
        maxWords:        200,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['supervisor_role', 'responsibilities', 'escalation_chain'],
          properties: {
            supervisor_role:    { type: 'string' },
            responsibilities:   { type: 'array', items: { type: 'string' } },
            escalation_chain:   { type: 'string' },
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
        instruction:     "Definisci le attività di monitoraggio con frequenza concreta: (1) controlli periodici (giornalieri/settimanali/mensili) con descrizione di cosa si verifica, (2) KPI o soglie di allerta specifiche (usa valori numerici o descrittivi concreti), (3) modalità di log degli interventi umani. Adatta alla dimensione dell'azienda. Max 300 parole.",
        maxWords:        300,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['periodic_checks', 'kpis', 'logging_procedure'],
          properties: {
            periodic_checks:   { type: 'array', items: { type: 'string' } },
            kpis:              { type: 'array', items: { type: 'string' } },
            logging_procedure: { type: 'string' },
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
        instruction:     "Specifica: (1) cadenza della revisione periodica del piano (almeno annuale), (2) eventi trigger che richiedono revisione anticipata (es. incidenti, modifiche al sistema, aggiornamenti normativi), (3) procedura di approvazione delle revisioni. Max 150 parole.",
        maxWords:        150,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['review_frequency', 'triggers', 'approval_procedure'],
          properties: {
            review_frequency:    { type: 'string' },
            triggers:            { type: 'array', items: { type: 'string' } },
            approval_procedure:  { type: 'string' },
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
  version:        '1.0.0',
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
        instruction:     "Definisci regole concrete di utilizzo del sistema AI: (1) usi consentiti (elenca almeno 3 casi d'uso approvati), (2) usi vietati (almeno 3 comportamenti proibiti, es. uso per decisioni discriminatorie, condivisione output con terzi non autorizzati), (3) requisiti di revisione umana degli output. Adatta al settore e dimensione dell'azienda. Max 300 parole.",
        maxWords:        300,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['allowed_uses', 'prohibited_uses', 'human_review_requirement'],
          properties: {
            allowed_uses:              { type: 'array', items: { type: 'string' } },
            prohibited_uses:           { type: 'array', items: { type: 'string' } },
            human_review_requirement:  { type: 'string' },
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
        instruction:     "Specifica: (1) responsabilità degli utenti del sistema AI (firma policy, formazione, segnalazione anomalie), (2) ruolo del Referente AI interno (chi supervisiona, con quale frequenza), (3) procedura di segnalazione incidenti o malfunzionamenti. Max 200 parole.",
        maxWords:        200,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['user_responsibilities', 'ai_referent_role', 'incident_procedure'],
          properties: {
            user_responsibilities: { type: 'array', items: { type: 'string' } },
            ai_referent_role:      { type: 'string' },
            incident_procedure:    { type: 'string' },
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

// ─── TECH_DOC — Art. 11-12, 26 ───────────────────────────────────────────────
export const TECH_DOC_V1: DocSchema = {
  docType:        'TECH_DOC',
  version:        '1.0.0',
  status:         'ACTIVE',
  modelTier:      'standard',
  outputLanguage: 'it',
  createdAt:      NOW,
  closingActions: [{
    gapTypes: ['document_generation', '*'],
    actions: [
      "Completare le sezioni marcate [DA COMPLETARE] con le informazioni specifiche del sistema (versione, date, referenti).",
      "Richiedere al fornitore del sistema AI (se deployer) la documentazione tecnica prevista dall'Allegato IV AI Act e allegarla.",
      "Assegnare un numero di versione e una data ufficiale al documento prima dell'archiviazione.",
      "Conservare il documento per tutta la durata di utilizzo del sistema + 10 anni. Caricare evidenza in Actify per chiudere il gap.",
    ],
  }],
  sections: [
    {
      sectionId: 'intro',
      title:     'Identificazione del Sistema AI',
      order:     1,
      kind:      'FIXED',
      template:  "Il presente documento descrive il sistema AI {{system.name}} utilizzato da {{company.name}} in qualità di {{system.role}} ai sensi del Regolamento UE 2024/1689 (AI Act).",
      bindings:  ['system.name', 'company.name', 'system.role'],
    },
    {
      sectionId: 'system_description',
      title:     'Descrizione Generale e Capacità del Sistema',
      order:     2,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'system_description',
        instruction:     "Descrivi: (1) funzionalità principali e scopo del sistema, (2) tipo di output prodotto (testo, immagini, raccomandazioni, decisioni), (3) capacità e limitazioni note, (4) personalizzazioni apportate dall'azienda (system prompt, configurazioni, RAG). Sii specifico e tecnico. Max 300 parole.",
        maxWords:        300,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['main_functions', 'output_type', 'limitations', 'customizations'],
          properties: {
            main_functions:  { type: 'string' },
            output_type:     { type: 'string' },
            limitations:     { type: 'array', items: { type: 'string' } },
            customizations:  { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    {
      sectionId: 'oversight',
      title:     'Misure di Supervisione Umana e Sicurezza',
      order:     3,
      kind:      'GENERATIVE',
      slot: {
        slotId:          'oversight',
        instruction:     "Descrivi: (1) le misure di supervisione umana implementate (chi verifica, come, con quale frequenza), (2) misure di cybersecurity adottate (es. controllo accessi, log degli utilizzi), (3) referente tecnico interno responsabile del sistema. Max 200 parole.",
        maxWords:        200,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['oversight_measures', 'security_measures', 'technical_referent'],
          properties: {
            oversight_measures: { type: 'array', items: { type: 'string' } },
            security_measures:  { type: 'array', items: { type: 'string' } },
            technical_referent: { type: 'string', description: 'Ruolo, non nome. Es: "Responsabile IT"' },
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

// ─── CONFORMITY_DECL — Art. 47 (autovalutazione interna, non marcatura CE) ───
export const CONFORMITY_DECL_V1: DocSchema = {
  docType:        'CONFORMITY_DECL',
  version:        '1.0.0',
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
        instruction:     "Redigi la dichiarazione di conformità autovalutata includendo: (1) identificazione del sistema AI (nome, versione se nota, fornitore), (2) gli articoli del Regolamento UE 2024/1689 per i quali si dichiara l'adempimento, (3) le misure concrete adottate per ciascun articolo citato (una frase per misura). Usa formulazioni operative ('è stata adottata', 'è prevista', 'è in vigore') — mai formulazioni certificate. Max 350 parole.",
        maxWords:        350,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['system_identification', 'compliance_measures'],
          properties: {
            system_identification: { type: 'string' },
            compliance_measures: {
              type: 'array',
              items: {
                type: 'object',
                required: ['article', 'measure_description'],
                properties: {
                  article:             { type: 'string' },
                  measure_description: { type: 'string' },
                },
              },
            },
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
  version:        '1.0.0',
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
        instruction:     "Descrivi con precisione: (1) il processo aziendale specifico in cui verrà utilizzato il sistema AI, incluse le decisioni che vengono prese con o tramite il sistema (es. selezione del personale, concessione di credito, erogazione di servizi, valutazione delle prestazioni, accesso a servizi pubblici); (2) se il sistema AI supporta una decisione umana, raccomanda un'azione, o determina autonomamente un esito — sii esplicito su questo punto; (3) la frequenza di utilizzo prevista (es. quotidiana, per ogni richiesta di servizio, mensile) e il periodo di impiego del sistema; (4) le categorie di dati personali elaborati dal sistema (es. dati identificativi, dati comportamentali, dati biometrici, dati relativi a vulnerabilità, dati economici). Adatta la descrizione al settore e alla dimensione dell'azienda.",
        maxWords:        350,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['business_process', 'decision_type', 'frequency_and_period', 'data_categories'],
          properties: {
            business_process:     { type: 'string', description: 'Descrizione del processo aziendale specifico in cui il sistema AI è impiegato' },
            decision_type:        { type: 'string', enum: ['supporto decisionale', 'raccomandazione', 'decisione autonoma', 'classificazione', 'altro'], description: 'Tipo di contributo del sistema AI al processo decisionale' },
            frequency_and_period: { type: 'string', description: 'Frequenza di utilizzo e periodo previsto di impiego' },
            data_categories:      { type: 'array', items: { type: 'string' }, description: 'Categorie di dati personali trattati (almeno 2)' },
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
        instruction:     "Identifica e descrivi sistematicamente tutte le persone fisiche che potrebbero essere influenzate dal sistema AI. Per ciascuna categoria: (1) descrivi la categoria (es. candidati a posizioni lavorative, clienti richiedenti credito, utenti di un servizio pubblico, pazienti, studenti); (2) fornisci una stima indicativa della scala di impatto (es. 'decine di persone/anno', 'potenzialmente tutta la clientela', 'popolazione di una specifica area geografica'); (3) specifica se l'impatto è diretto (il sistema prende/informa decisioni su di loro) o indiretto. Poi analizza i GRUPPI VULNERABILI tra gli interessati: esamina esplicitamente — anche se la conclusione è 'non presente nel contesto' — ciascuno dei seguenti: (a) minori (sotto i 18 anni); (b) anziani; (c) persone con disabilità fisica o cognitiva; (d) minoranze etniche, religiose o linguistiche; (e) migranti o richiedenti asilo; (f) persone economicamente svantaggiate o con basso livello di alfabetizzazione digitale; (g) lavoratori in posizione subordinata o precaria. Infine: specifica se il sistema tratta dati di categorie speciali (dati sulla salute, etnia, orientamento sessuale, opinioni politiche, biometria — rilevante per Art. 9 GDPR).",
        maxWords:        400,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['affected_categories', 'vulnerable_groups', 'special_data_categories'],
          properties: {
            affected_categories: {
              type: 'array',
              items: {
                type: 'object',
                required: ['category', 'estimated_scale', 'impact_nature'],
                properties: {
                  category:        { type: 'string', description: 'Nome della categoria di persone interessate' },
                  estimated_scale: { type: 'string', description: 'Stima indicativa della portata (es: "circa 50 persone/anno", "potenzialmente tutta la clientela")' },
                  impact_nature:   { type: 'string', enum: ['diretto', 'indiretto', 'diretto e indiretto'] },
                },
              },
              description: 'Almeno 1 categoria identificata',
            },
            vulnerable_groups: {
              type: 'array',
              items: {
                type: 'object',
                required: ['group', 'present_in_context', 'specific_risks'],
                properties: {
                  group:              { type: 'string', description: 'Nome del gruppo vulnerabile analizzato' },
                  present_in_context: { type: 'boolean', description: 'true se questo gruppo è presente tra gli interessati nel contesto specifico' },
                  specific_risks:     { type: 'string', description: 'Se presente: rischi specifici per questo gruppo. Se assente: motivazione breve.' },
                },
              },
              description: 'Analisi di tutti i 7 gruppi vulnerabili elencati nell\'istruzione — anche quelli non presenti nel contesto',
            },
            special_data_categories: { type: 'boolean', description: 'true se il sistema elabora dati di categorie speciali ai sensi dell\'Art. 9 GDPR' },
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
        instruction:     "Conduci una valutazione strutturata dei rischi per i diritti fondamentali garantiti dalla Carta dei Diritti Fondamentali dell'UE. Per ciascun diritto analizzato, valuta: probabilità che il rischio si materializzi nel contesto specifico (alta/media/bassa), gravità dell'impatto potenziale (alta/media/bassa), e descrizione concreta del rischio. ANALIZZA OBBLIGATORIAMENTE tutti i seguenti diritti fondamentali in relazione al sistema AI e al suo contesto d'uso: (1) 'Non discriminazione e parità di trattamento' — rischi di bias algoritmici, discriminazione per genere, etnia, età, disabilità, orientamento sessuale nelle decisioni automatizzate o semi-automatizzate; (2) 'Protezione dei dati personali e riservatezza' — rischi di profilazione non autorizzata, accesso illecito, conservazione eccessiva, trasferimento a terzi senza base giuridica; (3) 'Dignità umana' — rischi di trattamento degradante, etichettatura automatica stigmatizzante, riduzione della persona a dati; (4) 'Accesso a servizi essenziali e libertà' — rischi di esclusione da servizi di lavoro, credito, assistenza, libertà di movimento o espressione causata da decisioni algoritmiche; (5) 'Diritto a un ricorso effettivo e alla revisione delle decisioni' — rischi che le persone interessate non possano contestare o comprendere una decisione automatizzata che le riguarda; (6) Diritti specifici al settore — se pertinente: diritti del minore, diritti dei lavoratori, diritto all'istruzione, presunzione di innocenza. Per i rischi con probabilità ALTA o gravità ALTA: espandi la descrizione con l'impatto concreto nel contesto aziendale specifico.",
        maxWords:        500,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['risk_assessments', 'overall_risk_level', 'highest_risk_summary'],
          properties: {
            risk_assessments: {
              type: 'array',
              items: {
                type: 'object',
                required: ['fundamental_right', 'probability', 'severity', 'risk_description'],
                properties: {
                  fundamental_right: { type: 'string', description: 'Nome del diritto fondamentale (es: "Non discriminazione", "Protezione dei dati personali", "Dignità umana")' },
                  probability:       { type: 'string', enum: ['alta', 'media', 'bassa', 'non applicabile'] },
                  severity:          { type: 'string', enum: ['alta', 'media', 'bassa', 'non applicabile'] },
                  risk_description:  { type: 'string', description: 'Descrizione concreta del rischio nel contesto specifico — almeno 1 frase per ogni diritto analizzato' },
                },
              },
              description: 'Minimo 5 diritti analizzati, uno per ciascuno dei diritti elencati nell\'istruzione',
            },
            overall_risk_level: { type: 'string', enum: ['alto', 'medio', 'basso'], description: 'Livello di rischio complessivo risultante dall\'analisi' },
            highest_risk_summary: { type: 'string', description: 'Sintesi narrativa dei rischi più elevati identificati (max 2 frasi)' },
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
        instruction:     "Descrivi le misure di supervisione umana implementate per questo sistema AI, in conformità alle istruzioni d'uso fornite dal fornitore (Art. 26 AI Act): (1) meccanismi concreti di supervisione: chi verifica gli output del sistema, con quale procedura e frequenza, prima che una decisione impatti una persona — sii specifico (es. 'il responsabile HR rivede ogni output prima di comunicarlo al candidato'); (2) capacità di intervento e override umano: come un operatore può ignorare, modificare o annullare la raccomandazione/decisione del sistema AI, e in quali circostanze è obbligatorio farlo; (3) formazione e qualificazione richiesta agli operatori che supervisionano il sistema — specifica il livello minimo; (4) misure specifiche per i casi che coinvolgono i gruppi vulnerabili identificati (es. revisione addizionale obbligatoria, doppio controllo); (5) trasparenza verso gli interessati: come viene comunicato l'uso del sistema AI alle persone coinvolte e come possono richiedere un'interazione umana.",
        maxWords:        350,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['supervision_mechanisms', 'override_procedure', 'operator_training', 'vulnerable_groups_measures', 'transparency_to_subjects'],
          properties: {
            supervision_mechanisms:    { type: 'array', items: { type: 'string' }, description: 'Almeno 2 meccanismi concreti di supervisione umana' },
            override_procedure:        { type: 'string', description: 'Come un operatore può annullare o modificare la decisione AI' },
            operator_training:         { type: 'string', description: 'Formazione minima richiesta per gli operatori del sistema' },
            vulnerable_groups_measures: { type: 'string', description: 'Misure aggiuntive specifiche per soggetti vulnerabili (o "N/A — nessun gruppo vulnerabile identificato")' },
            transparency_to_subjects:  { type: 'string', description: 'Come le persone interessate vengono informate dell\'utilizzo del sistema AI' },
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
        instruction:     "Descrivi le misure di risposta ai rischi e la governance in conformità all'Art. 27(2)(e) AI Act: (1) per ciascun rischio ad alta o media probabilità/gravità identificato nella sezione precedente, definisci: la misura concreta di mitigazione (non generica — azione specifica adatta alla PMI), il ruolo aziendale responsabile dell'attuazione, e un timeframe realistico; (2) meccanismo di reclamo accessibile alle persone interessate (Art. 26(4)): specifica il canale di accesso (es. email dedicata, modulo web, sportello fisico), il ruolo che gestisce i reclami, e il tempo di risposta garantito; (3) struttura di governance interna per la FRIA: chi è responsabile dell'aggiornamento della valutazione, con quale frequenza viene rivista, chi approva le versioni aggiornate; (4) coordinamento con la DPIA GDPR: indica se è stata o sarà condotta una Valutazione d'Impatto sulla Protezione dei Dati (DPIA) separata o congiunta con questa FRIA — la FRIA non sostituisce la DPIA per trattamenti ad alto rischio GDPR. Max 400 parole.",
        maxWords:        400,
        allowedCitations: 'FROM_CONTEXT_ONLY',
        tone:            'operativo',
        outputSchema: {
          type: 'object',
          required: ['mitigation_measures', 'complaint_mechanism', 'governance_structure', 'gdpr_coordination'],
          properties: {
            mitigation_measures: {
              type: 'array',
              items: {
                type: 'object',
                required: ['risk_addressed', 'measure', 'responsible_role', 'timeframe'],
                properties: {
                  risk_addressed:   { type: 'string', description: 'Diritto fondamentale o rischio a cui si risponde' },
                  measure:          { type: 'string', description: 'Misura concreta di mitigazione — specifica e adatta alla PMI' },
                  responsible_role: { type: 'string', description: 'Ruolo aziendale responsabile (non nome proprio)' },
                  timeframe:        { type: 'string', description: 'Es: "entro 30 giorni dall\'adozione della FRIA", "prima della messa in uso"' },
                },
              },
              description: 'Almeno 1 misura per ogni rischio ad alta o media probabilità/gravità',
            },
            complaint_mechanism: {
              type: 'object',
              required: ['channel', 'handling_role', 'response_time'],
              properties: {
                channel:        { type: 'string', description: 'Canale di accesso al reclamo (es: "email: reclami@[azienda].it — completare con il recapito reale")' },
                handling_role:  { type: 'string', description: 'Ruolo aziendale che gestisce i reclami (es: Responsabile Compliance, DPO, Responsabile HR)' },
                response_time:  { type: 'string', description: 'Es: "entro 30 giorni lavorativi dalla ricezione del reclamo"' },
              },
            },
            governance_structure: { type: 'string', description: 'Chi aggiorna la FRIA, con quale frequenza, chi firma la versione aggiornata' },
            gdpr_coordination:    { type: 'string', description: 'Relazione tra questa FRIA e la DPIA GDPR (se il sistema tratta dati personali)' },
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
