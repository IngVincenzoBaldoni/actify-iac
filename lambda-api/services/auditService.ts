import { v4 as uuidv4 } from 'uuid';
import * as dynamo from './dynamoService';

export type AuditEventType =
  | 'account_created'
  | 'setup_completed'
  | 'company_updated'
  | 'system_created'
  | 'system_updated'
  | 'system_deleted'
  | 'compliance_check_started'
  | 'compliance_check_completed'
  | 'compliance_check_failed'
  | 'document_generated'
  | 'document_finalized'
  | 'document_deleted'
  | 'literacy_dept_created'
  | 'literacy_dept_deleted'
  | 'literacy_cert_added'
  | 'literacy_cert_deleted'
  | 'literacy_profile_updated'
  | 'literacy_evidence_added'
  | 'literacy_report_generated'
  | 'user_invited'
  | 'user_deleted';

const EVENT_LABELS: Record<AuditEventType, string> = {
  account_created:             'Account creato',
  setup_completed:             'Setup wizard completato',
  company_updated:             'Impostazioni azienda aggiornate',
  system_created:              'Sistema AI censito',
  system_updated:              'Sistema AI aggiornato',
  system_deleted:              'Sistema AI rimosso dall\'inventario',
  compliance_check_started:    'Compliance check avviato',
  compliance_check_completed:  'Compliance check completato',
  compliance_check_failed:     'Compliance check fallito',
  document_generated:          'Documento di remediation generato',
  document_finalized:          'Documento finalizzato',
  document_deleted:            'Documento eliminato',
  literacy_dept_created:       'Reparto aggiunto (AI Literacy)',
  literacy_dept_deleted:       'Reparto rimosso (AI Literacy)',
  literacy_cert_added:         'Certificazione registrata',
  literacy_cert_deleted:       'Certificazione rimossa',
  literacy_profile_updated:    'Profilo literacy aggiornato',
  literacy_evidence_added:     'Evidenza formazione registrata',
  literacy_report_generated:   'Report Art. 4 generato',
  user_invited:                'Utente invitato',
  user_deleted:                'Utente rimosso',
};

export async function logEvent(
  companyId: string,
  eventType: AuditEventType,
  details: Record<string, unknown> = {},
  actorEmail?: string,
): Promise<void> {
  const now = new Date().toISOString();
  const eventId = `${now}#${uuidv4()}`;
  await dynamo.putAuditEvent({
    company_id:  companyId,
    event_id:    eventId,
    event_type:  eventType,
    event_label: EVENT_LABELS[eventType],
    details,
    actor_email: actorEmail ?? null,
    timestamp:   now,
  }).catch(e => console.error('[AUDIT LOG ERROR]', e));
}
