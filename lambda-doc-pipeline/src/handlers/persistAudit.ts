import { v4 as uuidv4 } from 'uuid';
import * as db from '../services/dynamo';
import type { PersistAuditInput, GenStatus } from '../types';

export const handler = async (event: PersistAuditInput): Promise<{ documentId?: string }> => {
  const { action, generationId, companyId } = event;

  console.info('[persistAudit]', { action, generationId, companyId });

  if (action === 'update_status') {
    const status = event.status as GenStatus;
    const errorMsg = event.error
      ? (event.error instanceof Error ? event.error.message : JSON.stringify(event.error))
      : undefined;

    await db.markDocGenerationStatus(companyId, generationId, status, {
      ...(errorMsg ? { errorMessage: errorMsg } : {}),
      ...(status !== 'QUEUED' && status !== 'RUNNING' ? { completedAt: new Date().toISOString() } : {}),
      // 30-day TTL for terminal non-success states
      ...(status === 'FAILED' ? { ttl: Math.floor(Date.now() / 1000) + 30 * 86400 } : {}),
    });

    if (status === 'FAILED') {
      await writeAuditEvent(companyId, generationId, 'DOCUMENT_GENERATION_FAILED', {
        error: errorMsg ?? 'Unknown error',
      });
    }
    return {};
  }

  if (action === 'review_required') {
    const { systemId, gapId, docType, validation } = event;
    const now = new Date().toISOString();

    await db.markDocGenerationStatus(companyId, generationId, 'REVIEW_REQUIRED', {
      completedAt: now,
      validationReport: validation?.report,
    });

    await writeAuditEvent(companyId, generationId, 'DOCUMENT_REVIEW_REQUIRED', {
      systemId, gapId, docType,
      failedSlotCount: validation?.failedSlots.length ?? 0,
    });

    return {};
  }

  if (action === 'persist_draft') {
    const { systemId, gapId, docType, context, assembled, pdf, validation } = event;
    if (!systemId || !gapId || !docType || !context || !assembled || !pdf) {
      throw new Error('persist_draft: missing required fields');
    }

    const documentId = uuidv4();
    const now        = new Date().toISOString();
    // Draft TTL: 7 days
    const ttl        = Math.floor(Date.now() / 1000) + 7 * 86400;

    const DOC_TYPE_TITLES: Record<string, string> = {
      DISCLOSURE_NOTICE: 'Disclosure Notice',
      MONITORING_PLAN:   'Piano di Monitoraggio',
      AI_POLICY:         'Policy AI Interna',
      TECH_DOC:          'Documentazione Tecnica',
      CONFORMITY_DECL:   'Dichiarazione di Conformità',
    };

    const title = `${DOC_TYPE_TITLES[docType] ?? docType} — ${context.system.tool_name}`;

    // Create document record in existing `documents` table (status=draft)
    await db.putDocument({
      document_id:   documentId,
      company_id:    companyId,
      system_id:     systemId,
      gap_id:        gapId,
      article:       context.gap.article,
      document_type: docType,
      title,
      status:        'draft',
      generated_at:  now,
      generated_by:  'actify_pipeline_v2',
      s3_key:        pdf.pdfS3Key,
      s3_key_md:     assembled.markdownS3Key,
      s3_bucket:     process.env.DOCUMENTS_BUCKET ?? 'actify-saas-documents',
      ttl,
      provenance: {
        generationId,
        schemaVersion:  context.schema.version,
        kbVersion:      context.kbVersion,
        modelId:        context.modelId,
        promptVersion:  context.promptVersion,
        contextS3Key:   context.contextS3Key,
        validationPassed: true,
      },
      generation_context: {
        company_snapshot: context.company,
        system_snapshot:  context.system,
        gap_snapshot:     context.gap,
      },
    });

    // Update doc_generations record: DRAFT_READY + documentId + outputS3Key
    await db.markDocGenerationStatus(companyId, generationId, 'DRAFT_READY', {
      documentId,
      outputS3Key:  pdf.pdfS3Key,
      completedAt:  now,
      validationReport: validation?.report,
    });

    // Audit trail event
    await writeAuditEvent(companyId, generationId, 'DOCUMENT_GENERATED', {
      documentId, systemId, gapId, docType,
      schemaVersion: context.schema.version,
      kbVersion:     context.kbVersion,
    });

    console.info('[persistAudit] draft ready', { generationId, documentId });
    return { documentId };
  }

  throw new Error(`Unknown action: ${action}`);
};

async function writeAuditEvent(
  companyId:  string,
  generationId: string,
  eventType:  string,
  details:    Record<string, unknown>,
) {
  try {
    const EVENT_LABELS: Record<string, string> = {
      DOCUMENT_GENERATED:           'Documento generato',
      DOCUMENT_GENERATION_FAILED:   'Generazione documento fallita',
      DOCUMENT_REVIEW_REQUIRED:     'Documento richiede revisione',
    };
    await db.putAuditEvent({
      company_id:  companyId,
      event_id:    `${Date.now()}-${generationId.slice(0, 8)}`,
      event_type:  eventType,
      event_label: EVENT_LABELS[eventType] ?? eventType,
      details:     { generationId, ...details },
      timestamp:   new Date().toISOString(),
    });
  } catch (err) {
    // Audit trail failure must never block the main flow
    console.error('[persistAudit] audit write failed', err);
  }
}
