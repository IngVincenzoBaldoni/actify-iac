import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as dynamo from './dynamoService';
import { computeSanctions } from './sanctions';
import type { AISystem } from '../types/aiSystem';
import type { Company } from '../types/company';
import type { AutomationType, ActifyDocument } from '../types/document';
import type { ComplianceResultWithSanctions } from './sanctions';

const BEDROCK_REGION  = process.env.BEDROCK_REGION  ?? 'eu-central-1';
const BEDROCK_MODEL   = process.env.BEDROCK_MODEL_ID ?? 'eu.amazon.nova-pro-v1:0';
const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET ?? 'actify-saas-documents';
const LAMBDA_PDF_ARN  = process.env.LAMBDA_PDF_ARN!;
const AWS_REGION      = process.env.AWS_REGION ?? 'eu-central-1';

const bedrockClient = new BedrockRuntimeClient({ region: BEDROCK_REGION });
const lambdaClient  = new LambdaClient({ region: AWS_REGION });
const s3Client      = new S3Client({ region: AWS_REGION });

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Sei un esperto di compliance AI Act (Regolamento UE 2024/1689) specializzato nella redazione di documenti normativi per PMI italiane.
Genera documenti professionali, concreti e adattati al profilo specifico del sistema AI indicato.
Il documento deve essere immediatamente utilizzabile dall'azienda: non generico, non teorico.
Rispondi ESCLUSIVAMENTE con il testo del documento in italiano. Nessuna introduzione, nessun commento fuori dal documento.
Usa una struttura chiara con sezioni numerate, titoli e sottotitoli. Usa la sintassi Markdown (## per sezioni, ### per sottosezioni, **grassetto**, - per liste).`;

// ─── Document prompts per tipo ────────────────────────────────────────────────

type DocumentPromptFn = (s: AISystem, c: Company, gap: Record<string, unknown>) => string;

const DOCUMENT_PROMPTS: Record<AutomationType, DocumentPromptFn> = {

  monitoring_plan: (s, c) => `
Genera un Piano di Monitoraggio e Supervisione Umana conforme all'Art. 14 del Regolamento UE 2024/1689 (AI Act).

SISTEMA AI: ${s.tool_name} (${s.vendor || 'N/D'})
AZIENDA: ${c.name} — ${c.sector} — ${c.employees_range} dipendenti
RUOLO AI ACT: ${s.role}
USO: ${s.purpose}
UTENTI TARGET: ${(s.target_users ?? []).join(', ') || 'N/D'}
DOMINI DECISIONALI: ${(s.decision_domains ?? []).join(', ') || 'N/A'}
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

  transparency_notice: (s, c) => `
Genera una Disclosure Notice conforme all'Art. 50 del Regolamento UE 2024/1689 (AI Act).

SISTEMA AI: ${s.tool_name}
AZIENDA: ${c.name}
MODALITÀ DI ACCESSO: ${(s as unknown as Record<string, unknown>).access_mode ?? 'N/D'}
UTENTI TARGET: ${(s.target_users ?? []).join(', ')}
SCOPO DEL SISTEMA: ${s.purpose}

La notice deve:
1. Essere scritta in linguaggio chiaro e non tecnico, comprensibile da utenti finali
2. Informare esplicitamente che l'utente sta interagendo con un sistema AI
3. Spiegare cosa fa il sistema e cosa NON può fare
4. Indicare come l'utente può richiedere intervento umano (se applicabile)
5. Indicare un contatto per domande o reclami
6. Essere breve (max 300 parole) e adatta al contesto

Genera due versioni: una breve per interfaccia web (banner o modal) e una estesa per l'informativa privacy.
`,

  risk_assessment: (s, c) => `
Genera una bozza di Valutazione d'Impatto sui Diritti Fondamentali (FRIA) conforme all'Art. 27 del Regolamento UE 2024/1689 (AI Act).

SISTEMA AI: ${s.tool_name} (${s.vendor || 'N/D'})
AZIENDA: ${c.name} — ${c.sector}
RUOLO: ${s.role}
SCOPO: ${s.purpose}
DOMINI DECISIONALI: ${(s.decision_domains ?? []).join(', ') || 'N/D'}
SOGGETTI IMPATTATI: ${(s.target_users ?? []).join(', ')}
SOGGETTI VULNERABILI: ${(s.vulnerable_groups ?? []).join(', ') || 'Nessuno identificato'}
TIPOLOGIE DATI: ${(s.data_types ?? []).join(', ') || 'N/D'}
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

  policy_template: (s, c) => `
Genera una Policy Interna per l'Uso del Sistema AI conforme all'Art. 9 del Regolamento UE 2024/1689 (AI Act).

SISTEMA AI: ${s.tool_name}
AZIENDA: ${c.name} — ${c.sector} — ${c.employees_range} dipendenti
RUOLO: ${s.role}
UTENTI INTERNI: ${s.target_users.includes('internal_employees') ? 'Sì' : 'No'}
SCOPO: ${s.purpose}
PERSONALIZZAZIONI: ${(s.customizations ?? []).join(', ') || 'Nessuna'}

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

  document_generation: (s, c) => `
Genera la Documentazione Tecnica del sistema AI conforme all'Art. 11 e Allegato IV del Regolamento UE 2024/1689 (AI Act).

SISTEMA AI: ${s.tool_name} (${s.vendor || 'N/D'})
AZIENDA: ${c.name}
RUOLO: ${s.role}
SCOPO: ${s.purpose}
CATEGORIA: ${s.category}
OUTPUT TIPO: ${(s as unknown as Record<string, unknown>).output_type ?? 'N/D'}
DATI TRATTATI: ${(s.data_types ?? []).join(', ') || 'N/D'}
SUPERVISIONE: ${s.human_oversight_level}
PERSONALIZZAZIONI: ${(s.customizations ?? []).join(', ') || 'Nessuna'}

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

Nota per deployer: alcune sezioni fanno riferimento alla documentazione del provider (${s.vendor || 'N/D'}) che deve essere richiesta e allegata.
`,

  conformity_declaration: (s, c, gap) => `
Genera una Dichiarazione di Conformità conforme all'Art. 47 del Regolamento UE 2024/1689 (AI Act).

SISTEMA AI: ${s.tool_name} (${s.vendor || 'N/D'})
AZIENDA DICHIARANTE: ${c.name}
INDIRIZZO: [da completare]
RUOLO AI ACT: ${s.role}
ARTICOLI APPLICABILI: ${(gap.article as string) ?? 'Art. 47'} e articoli correlati

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

// ─── Document title builder ───────────────────────────────────────────────────

export function buildDocumentTitle(type: AutomationType, toolName: string): string {
  const titles: Record<AutomationType, string> = {
    monitoring_plan:        `Piano di Monitoraggio — ${toolName}`,
    transparency_notice:    `Disclosure Notice AI — ${toolName}`,
    risk_assessment:        `FRIA — ${toolName}`,
    policy_template:        `Policy Uso AI — ${toolName}`,
    document_generation:    `Documentazione Tecnica — ${toolName}`,
    conformity_declaration: `Dichiarazione di Conformità — ${toolName}`,
  };
  return titles[type];
}

// ─── Mark gap compliant in the latest check + recompute sanctions ─────────────

async function markGapCompliant(
  companyId: string,
  systemId:  string,
  gapId:     string,
  company:   Company,
): Promise<void> {
  const [latest, systemRaw] = await Promise.all([
    dynamo.getLatestComplianceCheck(companyId, systemId),
    dynamo.getSystem(companyId, systemId),
  ]);
  if (!latest?.result || latest.status !== 'completed') return;

  const result = latest.result as ComplianceResultWithSanctions;

  const gapExists = result.compliance_gaps.some(g => g.gap_id === gapId);
  if (!gapExists) return;

  // Mark the document-generated gap compliant
  const serverUpdatedGaps = result.compliance_gaps.map(g =>
    g.gap_id === gapId
      ? { ...g, status: 'compliant' as const, estimated_sanction_min: 0, estimated_sanction_max: 0, tier_info: undefined }
      : g,
  );

  // Also apply compliance_checklist overrides already declared by the user
  const checklist = (systemRaw?.compliance_checklist ?? {}) as Record<string, { status?: string }>;
  const finalGaps = serverUpdatedGaps.map(g => {
    const entry = checklist[g.article as string];
    if (entry?.status === 'present') {
      return { ...g, status: 'compliant' as const, estimated_sanction_min: 0, estimated_sanction_max: 0, tier_info: undefined };
    }
    return g;
  });

  const recomputed = computeSanctions({ ...result, compliance_gaps: finalGaps }, company);

  const newResult = {
    ...recomputed,
    compliance_summary: {
      ...recomputed.compliance_summary,
      compliant_count:     finalGaps.filter(g => g.status === 'compliant').length,
      non_compliant_count: finalGaps.filter(g => g.status !== 'compliant' && g.status !== 'partial').length,
      monitoring_count:    finalGaps.filter(g => g.status === 'partial').length,
    },
  };

  const pk = `${companyId}#${systemId}`;
  await dynamo.updateComplianceCheck(pk, latest.check_id, { result: newResult });

  const allCompliant = finalGaps.every(g => g.status === 'compliant');
  await dynamo.updateSystem(companyId, systemId, {
    compliance_status:      allCompliant ? 'compliant' : 'gap_found',
    last_exposure_min:      newResult.total_exposure_estimate?.min ?? 0,
    last_exposure_max:      newResult.total_exposure_estimate?.max ?? 0,
    last_article_sanctions: JSON.stringify(newResult.article_sanctions ?? {}),
    updated_at:             new Date().toISOString(),
  });

  await dynamo.appendSanctionSnapshot(companyId, systemId, {
    at: new Date().toISOString(),
    min: newResult.total_exposure_estimate?.min ?? 0,
    max: newResult.total_exposure_estimate?.max ?? 0,
    source: 'document',
  });
}

// ─── Generate pre-signed URL for frontend preview ────────────────────────────

export async function generatePresignedUrl(s3Key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: s3Key }),
    { expiresIn },
  );
}

// ─── Core async generation function ──────────────────────────────────────────

export async function generateDocumentAsync(params: {
  document_id: string;
  systemId:    string;
  gapId:       string;
  companyId:   string;
}): Promise<void> {
  const { document_id, systemId, gapId, companyId } = params;

  try {
    // 1. Load system + company from DynamoDB
    const [systemRaw, companyRaw] = await Promise.all([
      dynamo.getSystem(companyId, systemId),
      dynamo.getCompany(companyId),
    ]);

    if (!systemRaw) throw new Error(`Sistema ${systemId} non trovato`);
    if (!companyRaw) throw new Error(`Azienda ${companyId} non trovata`);

    const system  = systemRaw  as unknown as AISystem;
    const company = companyRaw as unknown as Company;

    // 2. Find gap from latest compliance check
    const latestCheck = await dynamo.getLatestComplianceCheck(companyId, systemId);
    if (!latestCheck?.result?.compliance_gaps) {
      throw new Error('Nessun compliance check trovato per questo sistema');
    }
    const gap = (latestCheck.result.compliance_gaps as Record<string, unknown>[])
      .find(g => g.gap_id === gapId);
    if (!gap) throw new Error(`Gap ${gapId} non trovato nell'ultimo compliance check`);

    const automationType = gap.automation_type as AutomationType;
    if (!gap.can_actify_automate || !automationType) {
      throw new Error(`Gap ${gapId} non automatizzabile`);
    }

    // 3. Generate document text with Bedrock
    const promptFn  = DOCUMENT_PROMPTS[automationType];
    const userPrompt = promptFn(system, company, gap);

    const bedrockResponse = await bedrockClient.send(new ConverseCommand({
      modelId: BEDROCK_MODEL,
      system:  [{ text: SYSTEM_PROMPT }],
      messages: [{ role: 'user', content: [{ text: userPrompt }] }],
      inferenceConfig: {
        maxTokens:   4096,
        temperature: 0.3,
      },
    }));

    const content = bedrockResponse.output?.message?.content;
    const documentText = Array.isArray(content)
      ? content.map(b => (b as { text?: string }).text ?? '').join('')
      : '';

    if (!documentText.trim()) throw new Error('Bedrock ha restituito un documento vuoto');

    // 4. Generate PDF via lambda-pdf (direct invocation)
    const title = buildDocumentTitle(automationType, system.tool_name);
    const pdfPayload = {
      _normativeDocumentRequest: {
        content:       documentText,
        title,
        company_name:  company.name,
        document_type: automationType,
        generated_at:  new Date().toISOString(),
        article:       gap.article as string,
      },
    };

    const pdfInvokeResponse = await lambdaClient.send(new InvokeCommand({
      FunctionName:   LAMBDA_PDF_ARN,
      InvocationType: 'RequestResponse',
      Payload:        Buffer.from(JSON.stringify(pdfPayload)),
    }));

    if (pdfInvokeResponse.FunctionError) {
      const errMsg = pdfInvokeResponse.Payload
        ? JSON.parse(Buffer.from(pdfInvokeResponse.Payload).toString()).errorMessage
        : 'lambda-pdf error';
      throw new Error(`PDF generation failed: ${errMsg}`);
    }

    const pdfResult = pdfInvokeResponse.Payload
      ? JSON.parse(Buffer.from(pdfInvokeResponse.Payload).toString())
      : null;
    if (!pdfResult?.pdfBase64) throw new Error('lambda-pdf non ha restituito il PDF');

    const pdfBuffer = Buffer.from(pdfResult.pdfBase64, 'base64');

    // 5. Upload PDF to S3
    const s3Key = `documents/${companyId}/${document_id}.pdf`;
    await s3Client.send(new PutObjectCommand({
      Bucket:      DOCUMENTS_BUCKET,
      Key:         s3Key,
      Body:        pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        company_id:    companyId,
        system_id:     systemId,
        document_type: automationType,
        article:       gap.article as string,
      },
    }));

    // 6. Update document record → status: final (auto-finalized on save)
    await dynamo.updateDocument(document_id, {
      status:       'final',
      finalized_at: new Date().toISOString(),
      s3_key:       s3Key,
      s3_bucket:    DOCUMENTS_BUCKET,
      title,
      generation_context: {
        system_snapshot:  systemRaw,
        company_snapshot: companyRaw,
        gap_snapshot:     gap,
      },
    });

    // 7. Mark the corresponding gap compliant in the latest check + recompute sanctions
    await markGapCompliant(companyId, systemId, gapId, company);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
    console.error('[REMEDIATION] generateDocumentAsync failed:', msg);
    await dynamo.updateDocument(document_id, {
      status:        'error',
      error_message: msg,
    });
  }
}
