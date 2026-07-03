import { extractAuth, requirePartner } from '../middleware/auth';
import * as dynamo from '../services/dynamoService';
import { getGapType } from '../services/remediationService';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

function extractIds(path: string): { pmiId: string; systemId: string } {
  const parts = path.split('/');
  const invIdx = parts.indexOf('inventory');
  const sysIdx = parts.indexOf('systems');
  return {
    pmiId:    parts[invIdx + 1] ?? '',
    systemId: sysIdx >= 0 ? parts[sysIdx + 1] ?? '' : '',
  };
}

async function verifyPartnerAccess(partnerId: string, companyId: string): Promise<boolean> {
  const partner = await dynamo.getPartner(partnerId);
  if (!partner) return false;
  const ids = (partner.referred_pmi_ids as string[]) ?? [];
  return ids.includes(companyId);
}

// ─── GET /api/partner/inventory ──────────────────────────────────────────────
// Returns all referred PMIs with per-PMI compliance summary

export async function getInventoryOverview(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);

  const partner = await dynamo.getPartner(auth.companyId);
  if (!partner) return { statusCode: 404, body: JSON.stringify({ error: 'partner_not_found' }) };

  const referredIds = (partner.referred_pmi_ids as string[]) ?? [];
  if (referredIds.length === 0) return { statusCode: 200, body: JSON.stringify([]) };

  const summaries = await Promise.all(referredIds.map(async cid => {
    const company = await dynamo.getCompany(cid).catch(() => null);
    if (!company) return null;

    const systems = await dynamo.getSystemsByCompany(cid).catch(() => []);
    const counts = { unchecked: 0, checking: 0, gap_found: 0, compliant: 0 };
    let totalMax = 0, totalMin = 0;

    for (const s of systems) {
      const st = (s.compliance_status as string) ?? 'unchecked';
      (counts as Record<string, number>)[st] = ((counts as Record<string, number>)[st] ?? 0) + 1;
      totalMax += (s.last_exposure_max as number) ?? 0;
      totalMin += (s.last_exposure_min as number) ?? 0;
    }

    return {
      pmi_id:             cid,
      company_name:       company.name as string,
      contact_email:      '',
      subscription_tier:  (company.subscription_tier as string) ?? 'trial',
      sector:             (company.sector as string) ?? '',
      system_count:       systems.length,
      compliance_counts:  counts,
      total_exposure_max: totalMax,
      total_exposure_min: totalMin,
    };
  }));

  return { statusCode: 200, body: JSON.stringify(summaries.filter(Boolean)) };
}

// ─── GET /api/partner/inventory/{pmiId} ──────────────────────────────────────
// Returns one referred PMI with systems from the main AI systems table

export async function getPMIInventory(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);

  const { pmiId } = extractIds(event.requestContext.http.path);

  const hasAccess = await verifyPartnerAccess(auth.companyId, pmiId);
  if (!hasAccess) return { statusCode: 403, body: JSON.stringify({ error: 'access_denied' }) };

  const [company, partner] = await Promise.all([
    dynamo.getCompany(pmiId),
    dynamo.getPartner(auth.companyId),
  ]);
  if (!company) return { statusCode: 404, body: JSON.stringify({ error: 'pmi_not_found' }) };

  const systems = await dynamo.getSystemsByCompany(pmiId).catch(() => []);

  // Enrich: fetch documents + latest compliance checks for gap breakdown
  const [documents, ...checks] = await Promise.all([
    dynamo.listDocumentsByCompany(pmiId).catch(() => []),
    ...systems.map((s: Record<string, unknown>) =>
      dynamo.getLatestComplianceCheck(pmiId, s.system_id as string).catch(() => null)
    ),
  ]);

  // Build gap breakdown: intervention_needed (OPERATIONAL unresolved) + hybrid_pending (HYBRID doc ready, action pending)
  let interventionNeeded = 0;
  let hybridPending      = 0;
  let totalGaps          = 0;
  let compliantGaps      = 0;

  for (const check of checks) {
    if (!check?.result?.compliance_gaps) continue;
    const sys = systems.find((s: Record<string, unknown>) => {
      const pk = `${pmiId}#${(s as Record<string, unknown>).system_id}`;
      return (check as Record<string, unknown>).pk === pk;
    }) as Record<string, unknown> | undefined;
    const checklist = ((sys?.compliance_checklist ?? {}) as Record<string, { status?: string }>);

    for (const gap of (check.result.compliance_gaps as Record<string, unknown>[])) {
      const article = gap.article as string;
      const status  = (checklist[article]?.status ?? gap.status) as string;
      totalGaps++;
      if (status === 'present' || gap.status === 'compliant') { compliantGaps++; continue; }
      const gapType = getGapType(gap.automation_type as string | null);
      if (status === 'document_ready') { hybridPending++; }
      else if (gapType === 'OPERATIONAL' || !gap.can_actify_automate) { interventionNeeded++; }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      pmi: {
        pmi_id:             pmiId,
        company_name:       company.name,
        contact_email:      '',
        subscription_tier:  company.subscription_tier ?? 'trial',
        systems,
        gap_summary: {
          total:                 totalGaps,
          compliant:             compliantGaps,
          hybrid_pending:        hybridPending,
          intervention_needed:   interventionNeeded,
        },
      },
      documents: (documents as Record<string, unknown>[]).map(d => ({
        document_id:   d.document_id,
        system_id:     d.system_id,
        article:       d.article,
        document_type: d.document_type,
        title:         d.title,
        status:        d.status,
        generated_at:  d.generated_at,
        finalized_at:  d.finalized_at,
      })),
      partner: {
        ragione_sociale: partner?.ragione_sociale,
        primary_color:   (partner?.primary_color as string) ?? '#6C47FF',
      },
    }),
  };
}

// ─── GET /api/partner/inventory/{pmiId}/systems/{systemId} ────────────────────

export async function getPartnerSystem(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);

  const { pmiId, systemId } = extractIds(event.requestContext.http.path);

  const hasAccess = await verifyPartnerAccess(auth.companyId, pmiId);
  if (!hasAccess) return { statusCode: 403, body: JSON.stringify({ error: 'access_denied' }) };

  const [company, system] = await Promise.all([
    dynamo.getCompany(pmiId),
    dynamo.getSystem(pmiId, systemId),
  ]);
  if (!system) return { statusCode: 404, body: JSON.stringify({ error: 'system_not_found' }) };

  return { statusCode: 200, body: JSON.stringify({ ...system, company_name: company?.name ?? '' }) };
}

// ─── PUT /api/partner/inventory/{pmiId}/systems/{systemId} — READ-ONLY ────────

export async function updatePartnerSystem(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  void event;
  return { statusCode: 403, body: JSON.stringify({ error: 'read_only', message: 'Partner inventory is read-only.' }) };
}

// ─── POST .../compliance-check — READ-ONLY ────────────────────────────────────

export async function triggerPartnerCheck(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  void event;
  return { statusCode: 403, body: JSON.stringify({ error: 'read_only', message: 'Compliance checks are managed by the PMI account.' }) };
}

// ─── GET .../compliance-checks/latest ─────────────────────────────────────────

export async function getPartnerSystemCheck(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const auth = extractAuth(event);
  requirePartner(auth);

  const { pmiId, systemId } = extractIds(event.requestContext.http.path);

  const hasAccess = await verifyPartnerAccess(auth.companyId, pmiId);
  if (!hasAccess) return { statusCode: 403, body: JSON.stringify({ error: 'access_denied' }) };

  const check = await dynamo.getLatestComplianceCheck(pmiId, systemId);
  if (!check) return { statusCode: 404, body: JSON.stringify({ error: 'no_checks_found' }) };

  return { statusCode: 200, body: JSON.stringify(check) };
}
