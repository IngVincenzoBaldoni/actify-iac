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

export const ALL_SCHEMAS = [
  DISCLOSURE_NOTICE_V1,
  MONITORING_PLAN_V1,
  AI_POLICY_V1,
  TECH_DOC_V1,
  CONFORMITY_DECL_V1,
];
