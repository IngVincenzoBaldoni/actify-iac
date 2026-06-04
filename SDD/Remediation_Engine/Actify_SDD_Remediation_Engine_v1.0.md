# Actify — Spec-Driven Development
## Remediation Engine — Generazione Automatica Documenti + Document Vault

> **Gap compliance → generazione documento LLM → PDF → Document Vault → gap marcato compliant → sanzioni aggiornate**

| Campo | Valore |
|---|---|
| Versione | v1.0 |
| Data | Maggio 2026 |
| Autore | Actify Product Team |
| Status | Pronto per implementazione |
| Destinatario | Sviluppatore implementatore (Claude Code) |
| Dipende da | `Actify_SDD_Compliance_Recheck_v1.0.md` (FIX-12 — checklist arricchita prerequisito) |
| File coinvolti | `lambda-api/services/remediationService.ts` (nuovo), `lambda-api/routes/remediation.ts` (nuovo), `lambda-pdf/services/pdfService.ts` (esteso), `lambda-api/types/document.ts` (nuovo), DynamoDB (nuova tabella), S3 (nuovo bucket) |

> **Scope**
> Questo SDD descrive il Remediation Engine di Actify: per ogni gap di compliance identificato su un sistema AI, l'utente può generare automaticamente un documento normativo (policy, monitoring plan, disclosure notice, ecc.) tramite LLM Bedrock + PDF, archiviarlo nel Document Vault, e vedere le sanzioni aggiornate in tempo reale. I gap con documento generato vengono marcati automaticamente come `compliant` nella checklist e i successivi compliance check ne tengono conto.

---

## 1. Executive Summary

Il compliance check identifica i gap. Il Remediation Engine li risolve.

Per ogni gap marcato `can_actify_automate: true`, l'utente può cliccare un bottone e ricevere in ~30 secondi un documento professionale conforme all'AI Act, pre-compilato con i dati del suo sistema AI e della sua azienda. Il documento viene archiviato nel Document Vault, il gap viene marcato `present` nella checklist, e le sanzioni si aggiornano immediatamente.

Per i gap non automatizzabili (`can_actify_automate: false`), il sistema fornisce una guida step-by-step con le azioni concrete da intraprendere e, dove applicabile, suggerisce consulenti o template manuali.

### Tipi di documento generabili automaticamente

| `automation_type` | Articolo AI Act | Documento prodotto |
|---|---|---|
| `monitoring_plan` | Art. 14 | Piano di monitoraggio e supervisione umana |
| `transparency_notice` | Art. 50 | Disclosure notice per utenti finali |
| `risk_assessment` | Art. 27 | Bozza FRIA (Fundamental Rights Impact Assessment) |
| `policy_template` | Art. 9 | Policy interna uso AI |
| `document_generation` | Art. 11 | Documentazione tecnica del sistema |
| `conformity_declaration` | Art. 47 | Dichiarazione di conformità EU (deployer) |

### Cosa NON include questa release

- Firma digitale dei documenti
- Workflow di approvazione multi-utente
- Integrazione con sistemi DMS esterni (SharePoint, Google Drive)
- Generazione di documenti per gap su sistemi `prohibited`

---

## 2. Architettura

### 2.1 Flusso completo

```
[Dashboard Tool — Gap List]
    │
    │  User click "⚡ Genera con Actify" su gap Art. 14
    ▼
POST /api/systems/{systemId}/remediation/generate
    │
    ├── [Lambda API] legge gap, sistema, company da DynamoDB
    ├── [remediationService] seleziona prompt per automation_type
    ├── [Bedrock ConverseCommand] genera testo documento (~10-15s)
    ├── [lambda-pdf] converte testo in PDF branded Actify (~5-10s)
    ├── [S3 bucket documenti] salva PDF → restituisce URL pre-firmato
    ├── [DynamoDB Documents] crea record documento
    ├── [DynamoDB AISystems] aggiorna compliance_checklist[Art. 14] = present
    └── risponde { document_id, preview_url, gap_updated: true }
    │
    ▼
[Frontend] mostra modal preview documento + conferma
    │
    │  User click "Salva nel Vault"
    ▼
PUT /api/documents/{documentId}/finalize
    │
    └── [DynamoDB] status: 'draft' → 'final'
```

### 2.2 Nuovi servizi AWS

| Servizio | Ruolo | Note |
|---|---|---|
| S3 bucket `actify-documents-{env}` | Storage PDF generati | Separato dal bucket knowledge base |
| DynamoDB tabella `Documents` | Metadata documenti | Nuova tabella |
| Bedrock (Nova Pro EU) | Generazione testo documento | Stesso modello del compliance check |
| Lambda PDF (esistente) | Conversione testo → PDF | Riuso `lambda-pdf/services/pdfService.ts` |

### 2.3 Relazione con infrastruttura esistente

```
Esistente                    Nuovo (questo SDD)
─────────────────────────    ──────────────────────────────
lambda-api                   + routes/remediation.ts
  services/complianceEngine  + services/remediationService.ts
  types/aiSystem.ts          + types/document.ts
  DynamoDB: AISystems        + DynamoDB: Documents
  DynamoDB: ComplianceChecks   (invariato)
lambda-pdf (esistente)       + nuovo template branded per documenti normativi
S3: ai-act-knowledge-base    + S3: actify-documents-{env} (nuovo bucket)
```

---

## 3. Modello Dati

### 3.1 Nuova tabella DynamoDB — `Documents`

```typescript
// lambda-api/types/document.ts

export type AutomationType =
  | 'monitoring_plan'
  | 'transparency_notice'
  | 'risk_assessment'
  | 'policy_template'
  | 'document_generation'
  | 'conformity_declaration';

export type DocumentStatus = 'generating' | 'draft' | 'final' | 'error';

export interface ActifyDocument {
  // Keys
  document_id:    string;   // PK — uuid-v4
  company_id:     string;   // GSI PK — per listare tutti i doc di un'azienda
  system_id:      string;   // GSI PK — per listare i doc di un sistema
  gap_id:         string;   // gap che ha originato il documento

  // Metadata
  article:        string;          // es. "Art. 14"
  document_type:  AutomationType;
  title:          string;          // es. "Monitoring Plan — Workable AI Screening"
  status:         DocumentStatus;

  // Storage
  s3_key:         string;          // es. "documents/company_id/doc_id.pdf"
  s3_bucket:      string;

  // Audit
  generated_at:   string;          // ISO datetime
  finalized_at?:  string;
  generated_by:   'actify_auto' | 'user_upload';

  // Dati usati per la generazione (per rigenerare)
  generation_context: {
    system_snapshot:  object;  // copia del sistema al momento della generazione
    company_snapshot: object;  // copia dell'azienda
    gap_snapshot:     object;  // copia del gap
  };
}
```

**Indici DynamoDB:**

| Indice | PK | SK | Uso |
|---|---|---|---|
| Primary | `document_id` | — | Get documento per ID |
| GSI `company-index` | `company_id` | `generated_at` | Document Vault — tutti i doc dell'azienda |
| GSI `system-index` | `system_id` | `generated_at` | Documenti per singolo tool |

### 3.2 Aggiornamento `AISystem` — nessuna modifica al tipo

L'integrazione avviene solo sulla `compliance_checklist` (già modificata in FIX-12). Quando un documento viene finalizzato, si aggiorna:

```typescript
compliance_checklist['Art. 14'] = {
  status: 'present',
  addressed_at: '2026-05-27',
  evidence_note: `Documento generato da Actify: "Monitoring Plan — Workable AI" (doc_id: abc-123)`,
};
```

---

## 4. API Routes

### 4.1 Nuovo file: `lambda-api/routes/remediation.ts`

```typescript
// POST /api/systems/:systemId/remediation/generate
// Genera un documento per un gap specifico
router.post('/systems/:systemId/remediation/generate', authenticate, async (req, res) => {
  const { systemId } = req.params;
  const { gap_id } = req.body; // quale gap generare

  // Trigger asincrono (stesso pattern del compliance check)
  const document_id = uuidv4();
  await saveDocumentRecord(document_id, systemId, gap_id, 'generating');
  selfInvokeLambda('generateDocumentAsync', { document_id, systemId, gap_id, company_id });

  res.status(202).json({ document_id, status: 'generating' });
});

// GET /api/documents/:documentId
// Polling status + URL preview
router.get('/documents/:documentId', authenticate, async (req, res) => {
  const doc = await getDocument(req.params.documentId);
  if (doc.status === 'draft' || doc.status === 'final') {
    doc.preview_url = await generatePresignedUrl(doc.s3_key, 3600); // 1h
  }
  res.json(doc);
});

// PUT /api/documents/:documentId/finalize
// Utente approva la bozza → status draft → final
// Aggiorna compliance_checklist del sistema
router.put('/documents/:documentId/finalize', authenticate, async (req, res) => {
  await finalizeDocument(req.params.documentId);
  // Aggiorna checklist sistema → gap diventa compliant
  const doc = await getDocument(req.params.documentId);
  await updateComplianceChecklist(doc.system_id, doc.article, {
    status: 'present',
    addressed_at: today(),
    evidence_note: `Documento generato da Actify: "${doc.title}" (${doc.document_id})`,
  });
  res.json({ success: true });
});

// GET /api/company/documents
// Document Vault — tutti i documenti dell'azienda
router.get('/company/documents', authenticate, async (req, res) => {
  const docs = await listDocumentsByCompany(req.company_id);
  res.json({ documents: docs });
});

// GET /api/systems/:systemId/documents
// Documenti per singolo tool
router.get('/systems/:systemId/documents', authenticate, async (req, res) => {
  const docs = await listDocumentsBySystem(req.params.systemId);
  res.json({ documents: docs });
});

// DELETE /api/documents/:documentId
// Elimina documento (solo se non final o se owner)
router.delete('/documents/:documentId', authenticate, async (req, res) => {
  await deleteDocument(req.params.documentId, req.company_id);
  res.json({ success: true });
});

// POST /api/documents/:documentId/regenerate
// Rigenera un documento esistente (es. se i dati del sistema sono cambiati)
router.post('/documents/:documentId/regenerate', authenticate, async (req, res) => {
  const old = await getDocument(req.params.documentId);
  // Usa generation_context salvato per rigenerare con dati aggiornati
  const new_document_id = uuidv4();
  selfInvokeLambda('generateDocumentAsync', {
    document_id: new_document_id,
    systemId: old.system_id,
    gap_id: old.gap_id,
    company_id: old.company_id,
  });
  res.status(202).json({ document_id: new_document_id, status: 'generating' });
});
```

### 4.2 Frontend — polling (stesso pattern compliance check)

```typescript
// Polling ogni 3 secondi fino a status !== 'generating'
async function pollDocumentReady(document_id: string): Promise<ActifyDocument> {
  while (true) {
    const doc = await api.documents.get(document_id);
    if (doc.status === 'draft') return doc;
    if (doc.status === 'error') throw new Error(doc.error_message);
    await sleep(3000);
  }
}
```

---

## 5. Generazione Documenti — `remediationService.ts`

### 5.1 Prompt per ogni tipo documento

```typescript
// lambda-api/services/remediationService.ts

const SYSTEM_PROMPT_REMEDIATION = `
Sei un esperto di compliance AI Act (Regolamento UE 2024/1689) specializzato nella redazione di documenti normativi per PMI italiane.
Genera documenti professionali, concreti e adattati al profilo specifico del sistema AI indicato.
Il documento deve essere immediatamente utilizzabile dall'azienda — non generico, non teorico.
Rispondi ESCLUSIVAMENTE con il testo del documento in italiano. Nessuna introduzione, nessun commento fuori dal documento.
Usa una struttura chiara con sezioni numerate, titoli e sottotitoli.
`;

type DocumentPromptFn = (system: AISystem, company: Company, gap: ComplianceGap) => string;

const DOCUMENT_PROMPTS: Record<AutomationType, DocumentPromptFn> = {

  monitoring_plan: (s, c, g) => `
Genera un Piano di Monitoraggio e Supervisione Umana conforme all'Art. 14 del Regolamento UE 2024/1689 (AI Act).

SISTEMA AI: ${s.tool_name} (${s.vendor})
AZIENDA: ${c.name} — ${c.sector} — ${c.employees_range} dipendenti
RUOLO AI ACT: ${s.role}
USO: ${s.purpose}
UTENTI TARGET: ${s.target_users.join(', ')}
DOMINI DECISIONALI: ${s.decision_domains?.join(', ') || 'N/A'}
SUPERVISIONE ATTUALE: ${s.human_oversight_level}

Il documento deve includere:
1. Scopo e ambito del piano
2. Responsabile della supervisione (ruolo, non nome)
3. Frequenza e modalità dei controlli (giornalieri/settimanali/mensili)
4. KPI e soglie di allerta (con valori numerici o descrittivi concreti)
5. Procedura di escalation in caso di anomalia
6. Log e tracciabilità degli interventi umani
7. Revisione periodica del piano (cadenza e trigger)
8. Data di entrata in vigore e versioning

Adatta il piano alla dimensione dell'azienda (${c.employees_range} dipendenti) e al settore (${c.sector}).
`,

  transparency_notice: (s, c, g) => `
Genera una Disclosure Notice conforme all'Art. 50 del Regolamento UE 2024/1689 (AI Act).

SISTEMA AI: ${s.tool_name}
AZIENDA: ${c.name}
MODALITÀ DI ACCESSO: ${s.access_mode}
UTENTI TARGET: ${s.target_users.join(', ')}
SCOPO DEL SISTEMA: ${s.purpose}

La notice deve:
1. Essere scritta in linguaggio chiaro e non tecnico, comprensibile da utenti finali
2. Informare esplicitamente che l'utente sta interagendo con un sistema AI
3. Spiegare cosa fa il sistema e cosa NON può fare
4. Indicare come l'utente può richiedere intervento umano (se applicabile)
5. Indicare un contatto per domande o reclami
6. Essere breve (max 300 parole) e adatta al contesto di utilizzo (${s.access_mode})

Genera sia una versione per interfaccia web (banner o modal) sia una versione estesa per l'informativa privacy.
`,

  risk_assessment: (s, c, g) => `
Genera una bozza di Valutazione d'Impatto sui Diritti Fondamentali (FRIA) conforme all'Art. 27 del Regolamento UE 2024/1689 (AI Act).

SISTEMA AI: ${s.tool_name} (${s.vendor})
AZIENDA: ${c.name} — ${c.sector}
RUOLO: ${s.role}
SCOPO: ${s.purpose}
DOMINI DECISIONALI: ${s.decision_domains?.join(', ')}
SOGGETTI IMPATTATI: ${s.target_users.join(', ')}
SOGGETTI VULNERABILI: ${s.vulnerable_groups?.join(', ') || 'Nessuno identificato'}
TIPOLOGIE DATI: ${s.data_types?.join(', ')}
SUPERVISIONE UMANA: ${s.human_oversight_level}

Il documento deve includere:
1. Descrizione del sistema e del suo utilizzo
2. Identificazione dei diritti fondamentali potenzialmente impattati
3. Valutazione del rischio per ciascun diritto (basso/medio/alto + motivazione)
4. Misure di mitigazione per i rischi identificati
5. Consultazione degli interessati (piano o esiti)
6. Conclusioni e raccomandazioni
7. Revisione prevista

Nota: questo è un documento di bozza che richiede revisione legale prima dell'uso ufficiale.
`,

  policy_template: (s, c, g) => `
Genera una Policy Interna per l'Uso del Sistema AI conforme all'Art. 9 del Regolamento UE 2024/1689 (AI Act).

SISTEMA AI: ${s.tool_name}
AZIENDA: ${c.name} — ${c.sector} — ${c.employees_range} dipendenti
RUOLO: ${s.role}
UTENTI INTERNI: ${s.target_users.includes('internal_employees') ? 'Sì' : 'No'}
SCOPO: ${s.purpose}
PERSONALIZZAZIONI: ${s.customizations?.join(', ') || 'Nessuna'}

La policy deve includere:
1. Scopo e ambito di applicazione
2. Definizioni (sistema AI, utente autorizzato, dato sensibile)
3. Regole d'uso consentito e vietato
4. Responsabilità degli utenti e del referente AI
5. Gestione degli output (revisione, archiviazione, condivisione)
6. Incidenti e malfunzionamenti — come segnalarli
7. Formazione obbligatoria per gli utenti
8. Sanzioni in caso di violazione
9. Data di revisione della policy

Adatta la policy a un'azienda di ${c.employees_range} dipendenti nel settore ${c.sector}.
`,

  document_generation: (s, c, g) => `
Genera la Documentazione Tecnica del sistema AI conforme all'Art. 11 e Allegato IV del Regolamento UE 2024/1689 (AI Act).

SISTEMA AI: ${s.tool_name} (${s.vendor})
AZIENDA: ${c.name}
RUOLO: ${s.role}
SCOPO: ${s.purpose}
CATEGORIA: ${s.category}
OUTPUT TIPO: ${s.output_type}
DATI TRATTATI: ${s.data_types?.join(', ')}
SUPERVISIONE: ${s.human_oversight_level}
PERSONALIZZAZIONI: ${s.customizations?.join(', ') || 'Nessuna'}

Il documento deve includere (Allegato IV AI Act):
1. Descrizione generale del sistema e del suo scopo
2. Versione e data di rilascio
3. Elementi dell'addestramento (se deployer: riferimento al provider)
4. Capacità e limiti del sistema
5. Modifiche apportate dall'azienda (customizzazioni, system prompt, RAG)
6. Misure di supervisione umana implementate
7. Standard tecnici applicati
8. Misure di cybersecurity
9. Referente tecnico interno

Nota per deployer: alcune sezioni fanno riferimento alla documentazione del provider (${s.vendor}) che deve essere richiesta e allegata.
`,

  conformity_declaration: (s, c, g) => `
Genera una Dichiarazione di Conformità conforme all'Art. 47 del Regolamento UE 2024/1689 (AI Act).

SISTEMA AI: ${s.tool_name} (${s.vendor})
AZIENDA DICHIARANTE: ${c.name}
INDIRIZZO: [da completare]
RUOLO AI ACT: ${s.role}
CLASSIFICAZIONE RISCHIO: high
ARTICOLI APPLICABILI: ${g.article} e articoli correlati

La dichiarazione deve includere:
1. Identificazione del sistema AI (nome, versione, fornitore)
2. Identità del dichiarante (azienda, indirizzo, rappresentante legale)
3. Dichiarazione di conformità agli articoli applicabili
4. Riferimento agli standard armonizzati applicati (se disponibili)
5. Firma del rappresentante legale (campo da compilare)
6. Data e luogo

Nota: la dichiarazione di conformità richiede firma del rappresentante legale e deve essere conservata per 10 anni.
`,
};
```

### 5.2 Funzione principale di generazione

```typescript
// lambda-api/services/remediationService.ts

export async function generateDocumentAsync(params: {
  document_id: string;
  systemId: string;
  gap_id: string;
  company_id: string;
}): Promise<void> {
  const { document_id, systemId, gap_id, company_id } = params;

  try {
    // 1. Carica dati necessari
    const [system, company, gap] = await Promise.all([
      getSystem(systemId),
      getCompany(company_id),
      getGapFromLatestCheck(systemId, gap_id),
    ]);

    if (!gap.can_actify_automate || !gap.automation_type) {
      throw new Error(`Gap ${gap_id} non automatizzabile`);
    }

    // 2. Genera testo documento con LLM
    const promptFn = DOCUMENT_PROMPTS[gap.automation_type as AutomationType];
    const userPrompt = promptFn(system, company, gap);

    const bedrockResponse = await bedrockClient.send(new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID,
      system: [{ text: SYSTEM_PROMPT_REMEDIATION }],
      messages: [{ role: 'user', content: [{ text: userPrompt }] }],
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.3,  // leggermente creativo per documenti, non zero
      },
    }));

    const documentText = extractTextFromBedrockResponse(bedrockResponse);

    // 3. Genera PDF con lambda-pdf (invocazione diretta Lambda)
    const pdfBuffer = await generatePDF({
      content: documentText,
      title: buildDocumentTitle(gap.automation_type, system.tool_name),
      company_name: company.name,
      document_type: gap.automation_type,
      generated_at: new Date().toISOString(),
      article: gap.article,
    });

    // 4. Salva PDF su S3
    const s3Key = `documents/${company_id}/${document_id}.pdf`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.DOCUMENTS_BUCKET,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        company_id,
        system_id: systemId,
        document_type: gap.automation_type,
        article: gap.article,
      },
    }));

    // 5. Aggiorna record documento → status: draft
    await updateDocumentStatus(document_id, 'draft', {
      s3_key: s3Key,
      title: buildDocumentTitle(gap.automation_type, system.tool_name),
      generation_context: {
        system_snapshot: system,
        company_snapshot: company,
        gap_snapshot: gap,
      },
    });

  } catch (err) {
    await updateDocumentStatus(document_id, 'error', {
      error_message: err instanceof Error ? err.message : 'Errore sconosciuto',
    });
  }
}

function buildDocumentTitle(type: AutomationType, toolName: string): string {
  const titles: Record<AutomationType, string> = {
    monitoring_plan:       `Piano di Monitoraggio — ${toolName}`,
    transparency_notice:   `Disclosure Notice AI — ${toolName}`,
    risk_assessment:       `FRIA — ${toolName}`,
    policy_template:       `Policy Uso AI — ${toolName}`,
    document_generation:   `Documentazione Tecnica — ${toolName}`,
    conformity_declaration:`Dichiarazione di Conformità — ${toolName}`,
  };
  return titles[type];
}
```

---

## 6. PDF Generation — Template Remediation

### 6.1 Estensione `lambda-pdf/services/pdfService.ts`

Il PDF dei documenti di remediation è diverso dal PDF report del form pubblico. Aggiungere un secondo template:

```typescript
// Nuovo template per documenti normativi (più formale del report)
export async function generateNormativeDocument(params: {
  content: string;       // testo generato dall'LLM — già strutturato
  title: string;
  company_name: string;
  document_type: AutomationType;
  generated_at: string;
  article: string;
}): Promise<Buffer> {

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: 'Helvetica Neue', sans-serif; color: #1a1a1a; margin: 0; padding: 0; }

      /* Header branded */
      .doc-header {
        background: #0f0f0f; color: white; padding: 32px 48px;
        display: flex; justify-content: space-between; align-items: center;
      }
      .doc-header .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
      .doc-header .meta { text-align: right; font-size: 11px; color: #888; }

      /* Copertina */
      .doc-cover {
        padding: 48px; border-bottom: 3px solid #e5e5e5; margin-bottom: 32px;
      }
      .doc-type-badge {
        display: inline-block; background: #f0f0f0; color: #555;
        font-size: 10px; font-weight: 700; letter-spacing: 1px;
        text-transform: uppercase; padding: 4px 10px; border-radius: 4px;
        margin-bottom: 16px;
      }
      .doc-title { font-size: 28px; font-weight: 800; margin: 0 0 8px; }
      .doc-company { font-size: 14px; color: #666; margin: 0 0 24px; }
      .doc-meta-row { display: flex; gap: 32px; font-size: 12px; color: #888; }

      /* Corpo */
      .doc-body { padding: 0 48px 48px; }
      .doc-body h1 { font-size: 20px; font-weight: 700; margin: 32px 0 12px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
      .doc-body h2 { font-size: 16px; font-weight: 600; margin: 24px 0 8px; }
      .doc-body p  { line-height: 1.7; margin: 0 0 12px; font-size: 13px; }
      .doc-body ul { margin: 8px 0 16px 24px; }
      .doc-body li { line-height: 1.6; font-size: 13px; margin-bottom: 4px; }

      /* Footer */
      .doc-footer {
        position: fixed; bottom: 0; left: 0; right: 0;
        padding: 12px 48px; background: #fafafa; border-top: 1px solid #e5e5e5;
        display: flex; justify-content: space-between; font-size: 10px; color: #999;
      }
      .doc-disclaimer {
        background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px;
        padding: 12px 16px; margin: 32px 48px; font-size: 11px; color: #92400e;
      }
    </style>
  </head>
  <body>
    <div class="doc-header">
      <div class="logo">Actify</div>
      <div class="meta">
        AI Act Compliance Platform<br>
        Regolamento UE 2024/1689
      </div>
    </div>

    <div class="doc-cover">
      <div class="doc-type-badge">${DOC_TYPE_LABELS[params.document_type]}</div>
      <h1 class="doc-title">${params.title}</h1>
      <p class="doc-company">${params.company_name}</p>
      <div class="doc-meta-row">
        <span>Articolo di riferimento: <strong>${params.article}</strong></span>
        <span>Generato il: <strong>${formatDate(params.generated_at)}</strong></span>
        <span>Generato da: <strong>Actify AI</strong></span>
      </div>
    </div>

    <div class="doc-disclaimer">
      ⚠ Documento generato automaticamente da Actify sulla base del profilo sistema dichiarato.
      Verificare la correttezza dei dati e far revisionare il documento da un consulente legale
      prima dell'uso ufficiale. Actify non assume responsabilità per l'accuratezza legale del documento.
    </div>

    <div class="doc-body">
      ${markdownToHtml(params.content)}
    </div>

    <div class="doc-footer">
      <span>${params.company_name} — ${params.title}</span>
      <span>Generato da Actify — actify.io</span>
    </div>
  </body>
  </html>
  `;

  return await puppeteer.generatePDF(html, {
    format: 'A4',
    margin: { top: '0', bottom: '60px', left: '0', right: '0' },
    printBackground: true,
  });
}

const DOC_TYPE_LABELS: Record<AutomationType, string> = {
  monitoring_plan:       'Piano di Monitoraggio — Art. 14 AI Act',
  transparency_notice:   'Disclosure Notice — Art. 50 AI Act',
  risk_assessment:       'FRIA — Art. 27 AI Act',
  policy_template:       'Policy Interna AI — Art. 9 AI Act',
  document_generation:   'Documentazione Tecnica — Art. 11 AI Act',
  conformity_declaration:'Dichiarazione di Conformità — Art. 47 AI Act',
};
```

---

## 7. Frontend

### 7.1 Gap Card — pulsante Generate

Nel componente gap list della dashboard tool, aggiungi il pulsante di generazione:

```tsx
// Per gap con can_actify_automate: true
{gap.can_actify_automate && gap.status !== 'compliant' && (
  <div className="gap-remediation">
    {!existingDoc ? (
      <button
        className="btn-generate"
        onClick={() => handleGenerate(gap)}
        disabled={generating === gap.gap_id}
      >
        {generating === gap.gap_id
          ? <><span className="spin" /> Generazione in corso (~30s)...</>
          : <><span>⚡</span> Genera con Actify</>
        }
      </button>
    ) : existingDoc.status === 'draft' ? (
      <div className="doc-preview-row">
        <button className="btn-preview" onClick={() => openPreview(existingDoc)}>
          👁 Anteprima documento
        </button>
        <button className="btn-finalize" onClick={() => finalizeDocument(existingDoc)}>
          ✓ Salva nel Vault
        </button>
      </div>
    ) : (
      <div className="doc-done-row">
        <span className="doc-done-badge">✓ Documento nel Vault</span>
        <button className="btn-view" onClick={() => openDocument(existingDoc)}>
          📄 Apri
        </button>
        <button className="btn-regen" onClick={() => handleRegenerate(existingDoc)}>
          ↻ Rigenera
        </button>
      </div>
    )}
  </div>
)}

// Per gap NON automatizzabili
{!gap.can_actify_automate && gap.status !== 'compliant' && (
  <div className="gap-manual">
    <button
      className="btn-guide"
      onClick={() => toggleGuide(gap.gap_id)}
    >
      📋 Guida step-by-step
    </button>
    {showGuide[gap.gap_id] && (
      <div className="manual-steps">
        <p>{gap.what_to_do}</p>
        <a href={MANUAL_GUIDE_URLS[gap.article]} target="_blank">
          Leggi la guida completa →
        </a>
      </div>
    )}
  </div>
)}
```

### 7.2 Modal Preview Documento

```tsx
function DocumentPreviewModal({ doc, onFinalize, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-lg">
        <div className="modal-head">
          <h2>{doc.title}</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="doc-meta-bar">
            <span>Generato il {formatDate(doc.generated_at)}</span>
            <span>{doc.article}</span>
            <span className="badge-draft">Bozza</span>
          </div>

          {/* PDF iframe preview */}
          <iframe
            src={doc.preview_url}
            className="pdf-preview-frame"
            title="Anteprima documento"
          />

          <div className="modal-disclaimer">
            ⚠ Verifica il documento prima di salvarlo. Puoi rigenerarlo se necessario.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => downloadDoc(doc)}>
            ⬇ Scarica PDF
          </button>
          <button className="btn-primary" onClick={onFinalize}>
            ✓ Salva nel Vault — segna gap come risolto
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 7.3 Document Vault — nuova route `/dashboard/documents`

```tsx
function DocumentVault() {
  // Lista tutti i documenti dell'azienda
  // Filtri: per tool, per tipo documento, per stato (draft/final)
  // Ogni documento: titolo, tool, articolo, data, stato, azioni (apri, rigenera, elimina)

  return (
    <div className="vault-page">
      <div className="vault-header">
        <h1>Document Vault</h1>
        <p>Documenti di compliance generati da Actify per i tuoi sistemi AI.</p>
      </div>

      <div className="vault-filters">
        <select onChange={filterBySystem}>Tutti i sistemi</select>
        <select onChange={filterByType}>Tutti i tipi</select>
        <select onChange={filterByStatus}>Tutti gli stati</select>
      </div>

      <div className="vault-table">
        {documents.map(doc => (
          <div key={doc.document_id} className="vault-row">
            <div className="vault-doc-info">
              <span className="vault-doc-title">{doc.title}</span>
              <span className="vault-doc-meta">{doc.article} · {doc.system_name}</span>
            </div>
            <div className="vault-doc-date">{formatDate(doc.generated_at)}</div>
            <div className="vault-doc-status">
              <span className={`badge badge-${doc.status}`}>{doc.status}</span>
            </div>
            <div className="vault-doc-actions">
              <button onClick={() => openDocument(doc)}>📄 Apri</button>
              <button onClick={() => regenerate(doc)}>↻ Rigenera</button>
              <button onClick={() => deleteDoc(doc)}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 8. Integrazione con Compliance Re-check e Sanzioni

Quando `finalizeDocument()` viene chiamato, aggiorna la checklist del sistema:

```typescript
// In routes/remediation.ts — PUT /api/documents/:id/finalize

await updateComplianceChecklist(doc.system_id, doc.article, {
  status: 'present',
  addressed_at: today(),
  evidence_note: `Documento Actify: "${doc.title}" (ID: ${doc.document_id})`,
});
```

Il **prossimo compliance check** (FIX-11 in `Compliance_Recheck_v1.0.md`) vede l'articolo come `present` → lo skippa nell'analisi LLM → genera un gap sintetico compliant → `computeSanctions` non lo include nel calcolo → **la stima sanzionatoria si riduce automaticamente**.

Non è necessario forzare un re-check: il frontend può chiamare `GET /api/systems/{id}/compliance-checks/latest` e ricalcolare la stima sanzioni lato client applicando il delta (articolo rimosso dal totale sanzioni), senza invocare nuovamente il LLM. Il vero re-check avviene solo quando l'utente lo richiede esplicitamente.

---

## 9. Nuova Infrastruttura Terraform

### 9.1 Nuovo bucket S3 per documenti

```hcl
# terraform/release-1/s3.tf — aggiungi:

resource "aws_s3_bucket" "actify_documents" {
  bucket = "actify-documents-${var.environment}"
}

resource "aws_s3_bucket_lifecycle_configuration" "documents_lifecycle" {
  bucket = aws_s3_bucket.actify_documents.id
  rule {
    id     = "expire-drafts"
    status = "Enabled"
    filter { prefix = "documents/" }
    # I draft non finalizzati scadono dopo 7 giorni
    expiration { days = 7 }
    # Override: i documenti final non scadono (nessuna regola di expire per final)
  }
}

resource "aws_s3_bucket_cors_configuration" "documents_cors" {
  bucket = aws_s3_bucket.actify_documents.id
  cors_rule {
    allowed_methods = ["GET"]
    allowed_origins = [var.frontend_url]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}
```

### 9.2 Nuova tabella DynamoDB

```hcl
# terraform/release-1/dynamodb.tf — aggiungi:

resource "aws_dynamodb_table" "documents" {
  name         = "Documents-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "document_id"

  attribute { name = "document_id";  type = "S" }
  attribute { name = "company_id";   type = "S" }
  attribute { name = "system_id";    type = "S" }
  attribute { name = "generated_at"; type = "S" }

  global_secondary_index {
    name            = "company-index"
    hash_key        = "company_id"
    range_key       = "generated_at"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "system-index"
    hash_key        = "system_id"
    range_key       = "generated_at"
    projection_type = "ALL"
  }

  ttl { attribute_name = "ttl"; enabled = true }  # per draft non finalizzati
}
```

### 9.3 Policy IAM Lambda

```hcl
# Aggiungi al policy della Lambda API:
resource "aws_iam_role_policy" "lambda_documents" {
  name = "lambda-documents-policy"
  role = aws_iam_role.lambda_api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.actify_documents.arn}/documents/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GeneratePresignedUrl"]
        Resource = "${aws_s3_bucket.actify_documents.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem", "dynamodb:Query"]
        Resource = [
          aws_dynamodb_table.documents.arn,
          "${aws_dynamodb_table.documents.arn}/index/*"
        ]
      }
    ]
  })
}
```

---

## 10. Ordine di Implementazione

```
Step 1 — Infrastruttura (Terraform):
  → Nuovo bucket S3 actify-documents
  → Nuova tabella DynamoDB Documents con GSI
  → Policy IAM Lambda aggiornata

Step 2 — Backend core:
  → Crea types/document.ts
  → Crea services/remediationService.ts (prompt + generateDocumentAsync)
  → Estendi lambda-pdf con template normativo
  → Crea routes/remediation.ts (generate, get, finalize, list, delete, regenerate)

Step 3 — Integrazione checklist:
  → finalizeDocument() → updateComplianceChecklist()
  → Test: genera monitoring_plan → verifica Art. 14 in checklist = present

Step 4 — Frontend:
  → Gap card con bottone Generate + stati (idle/generating/draft/final)
  → Modal preview documento con iframe PDF
  → Document Vault page /dashboard/documents
  → Polling status documento (stesso pattern compliance check)
```

---

## 11. Test di Accettazione

- [ ] POST generate → status 202, document_id restituito
- [ ] Polling GET document → status passa da `generating` a `draft` in < 45 secondi
- [ ] PDF generato contiene: header Actify, titolo, disclaimer, testo strutturato
- [ ] Finalizza documento → `compliance_checklist[Art. 14].status = 'present'`
- [ ] Prossimo compliance check skippa Art. 14 → gap sintetico compliant nell'output
- [ ] Sanzione per Art. 14 = 0 dopo finalizzazione
- [ ] Rigenera documento → nuovo document_id, vecchio rimane in vault
- [ ] Draft non finalizzato scade da S3 dopo 7 giorni (lifecycle rule)
- [ ] Document Vault lista tutti i documenti dell'azienda filtrabili per tool
- [ ] Gap con `can_actify_automate: false` mostra guida step-by-step, nessun bottone Generate
- [ ] URL pre-firmato S3 scade dopo 1 ora → richiesta nuovo URL tramite GET document

---

## 12. Note per Claude Code

1. **Stesso pattern asincrono del compliance check**: `POST generate` → 202 + document_id → polling GET → draft → finalize. Non inventare un pattern diverso.

2. **Temperature 0.3 per i documenti**: a differenza del compliance check (temperature 0), i documenti normativi beneficiano di una leggera variabilità per risultare più naturali. Non usare 0.

3. **Il disclaimer nel PDF è obbligatorio**: ogni documento generato da Actify deve contenere il disclaimer legale. Non rimuoverlo mai, nemmeno se l'utente lo richiede.

4. **Draft lifecycle**: i draft hanno un TTL DynamoDB di 7 giorni. Impostalo al momento della creazione: `ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60`. I documenti `final` non hanno TTL.

5. **Pre-signed URL**: usa `GetObjectCommand` con `expiresIn: 3600` per generare URL temporanei. Non esporre mai URL permanenti al frontend.

6. **`generation_context` nel record documento**: salva snapshot completi di sistema, company e gap al momento della generazione. Serve per rigenerare il documento anche se i dati del sistema cambiano in seguito.

7. **Guida manuale per gap non automatizzabili**: `MANUAL_GUIDE_URLS` è un dizionario statico che mappa `article → URL guida`. Inizialmente può puntare a pagine della knowledge base di Actify o a link ufficiali EUR-Lex. Implementarlo come costante in `remediationService.ts`.
