import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';

import { register, invite } from './routes/auth';
import { getCompany, updateCompany, setupWizard, getUsers, deleteUser } from './routes/company';
import { listSystems, createSystem, getSystem, updateSystem, deleteSystem } from './routes/systems';
import {
  triggerCheck, getLatestCheck, listChecks, executeCheckAsync,
} from './routes/complianceCheck';
import {
  generateDocument, getDocument, finalizeDocument,
  listCompanyDocuments, listSystemDocuments,
  deleteDocument, regenerateDocument, closeGap,
} from './routes/remediation';
import { generateDocumentAsync } from './services/remediationService';
import {
  startDocGeneration, getDocGenerationStatus, listSystemDocGenerations, listCompanyDocGenerations,
} from './routes/docVault';
import {
  listDepartments, createDepartment, deleteDepartment,
  suggestCerts, addCertification, listCertifications, deleteCertification,
} from './routes/literacy';
import {
  registerPartner, getPartnerMe, updatePartnerMe,
  listPMI, addPMI, importPMICSV, getPMI, deletePMI, updatePMIStatus,
  sendAssessment, sendReferralEmail, sendOnboardingEmail, generatePMIPdf,
  getAssessmentForm, submitAssessmentForm,
} from './routes/partner';
import {
  getInventoryOverview, getPMIInventory,
  getPartnerSystem, updatePartnerSystem,
  triggerPartnerCheck, getPartnerSystemCheck,
} from './routes/partnerInventory';
import { getArticleText } from './routes/articles';
import { listAuditTrail, exportAuditTrail } from './routes/auditTrail';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

function ok(body: unknown, statusCode = 200): APIGatewayProxyResultV2 {
  return { statusCode, headers: CORS, body: typeof body === 'string' ? body : JSON.stringify(body) };
}

function err(statusCode: number, message: string): APIGatewayProxyResultV2 {
  return { statusCode, headers: CORS, body: JSON.stringify({ error: message }) };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export const handler = async (
  event: APIGatewayProxyEventV2 | APIGatewayProxyEventV2WithJWTAuthorizer | Record<string, unknown>
): Promise<APIGatewayProxyResultV2 | void> => {

  // ── Async self-invoke: compliance check ───────────────────────────────────
  if ('_asyncComplianceCheck' in event && event._asyncComplianceCheck) {
    await executeCheckAsync(event as Parameters<typeof executeCheckAsync>[0]);
    return;
  }

  // ── Async self-invoke: document generation ────────────────────────────────
  if ('_asyncDocumentGeneration' in event && event._asyncDocumentGeneration) {
    const p = event._asyncDocumentGeneration as {
      document_id: string; systemId: string; gapId: string; companyId: string;
    };
    await generateDocumentAsync(p);
    return;
  }

  const ev = event as APIGatewayProxyEventV2WithJWTAuthorizer;
  const method = ev.requestContext?.http?.method ?? '';
  const rawPath = ev.requestContext?.http?.path ?? ev.rawPath ?? '';

  // Normalize path — strip trailing slash
  const path = rawPath.replace(/\/$/, '');

  try {
    // ── CORS preflight ─────────────────────────────────────────────────────
    if (method === 'OPTIONS') {
      return { statusCode: 200, headers: CORS, body: '' };
    }

    // ── Public routes ──────────────────────────────────────────────────────
    if (method === 'POST' && path === '/api/auth/register') {
      const r = await register(ev as unknown as APIGatewayProxyEventV2);
      return { ...r, headers: CORS };
    }

    if (method === 'POST' && path === '/api/partner/request') {
      const r = await registerPartner(ev as unknown as APIGatewayProxyEventV2);
      return { ...r, headers: CORS };
    }

    // /api/assessment/{token} — public white-label form
    const assessmentTokenPath = path.match(/^\/api\/assessment\/([^/]+)$/);
    if (assessmentTokenPath) {
      if (method === 'GET') {
        const r = await getAssessmentForm(ev as unknown as APIGatewayProxyEventV2);
        return { ...r, headers: CORS };
      }
    }
    if (method === 'POST' && /^\/api\/assessment\/[^/]+\/submit$/.test(path)) {
      const r = await submitAssessmentForm(ev as unknown as APIGatewayProxyEventV2);
      return { ...r, headers: CORS };
    }

    // ── Auth routes ────────────────────────────────────────────────────────
    if (method === 'POST' && path === '/api/auth/invite')
      return { ...await invite(ev), headers: CORS };

    if (method === 'GET' && path === '/api/company')
      return { ...await getCompany(ev), headers: CORS };
    if (method === 'PUT' && path === '/api/company')
      return { ...await updateCompany(ev), headers: CORS };
    if (method === 'PUT' && path === '/api/company/setup')
      return { ...await setupWizard(ev), headers: CORS };
    if (method === 'GET' && path === '/api/company/users')
      return { ...await getUsers(ev), headers: CORS };
    if (method === 'DELETE' && /^\/api\/company\/users\/[^/]+$/.test(path))
      return { ...await deleteUser(ev), headers: CORS };

    // Document Vault — all company documents
    if (method === 'GET' && path === '/api/company/documents')
      return { ...await listCompanyDocuments(ev), headers: CORS };

    // Document Vault — all company doc generations (pipeline status)
    if (method === 'GET' && path === '/api/company/document-generations')
      return { ...await listCompanyDocGenerations(ev), headers: CORS };

    if (method === 'GET' && path === '/api/systems')
      return { ...await listSystems(ev), headers: CORS };
    if (method === 'POST' && path === '/api/systems')
      return { ...await createSystem(ev), headers: CORS };

    // /api/systems/{systemId}
    const singleSystem = path.match(/^\/api\/systems\/([^/]+)$/);
    if (singleSystem) {
      if (method === 'GET')    return { ...await getSystem(ev), headers: CORS };
      if (method === 'PUT')    return { ...await updateSystem(ev), headers: CORS };
      if (method === 'DELETE') return { ...await deleteSystem(ev), headers: CORS };
    }

    // /api/systems/{systemId}/compliance-check(s)
    const checkPath = path.match(/^\/api\/systems\/([^/]+)\/(compliance-check|compliance-checks)(\/latest)?$/);
    if (checkPath) {
      const [, , resource, sub] = checkPath;
      if (method === 'POST' && resource === 'compliance-check')
        return { ...await triggerCheck(ev), headers: CORS };
      if (method === 'GET' && resource === 'compliance-checks' && sub === '/latest')
        return { ...await getLatestCheck(ev), headers: CORS };
      if (method === 'GET' && resource === 'compliance-checks' && !sub)
        return { ...await listChecks(ev), headers: CORS };
    }

    // /api/systems/{systemId}/documents — new Step Functions pipeline
    if (method === 'POST' && /^\/api\/systems\/[^/]+\/documents$/.test(path))
      return { ...await startDocGeneration(ev), headers: CORS };

    // /api/systems/{systemId}/document-generations — list generations for a system
    if (method === 'GET' && /^\/api\/systems\/[^/]+\/document-generations$/.test(path))
      return { ...await listSystemDocGenerations(ev), headers: CORS };

    // /api/document-generations/{generationId} — polling endpoint
    if (method === 'GET' && /^\/api\/document-generations\/[^/]+$/.test(path))
      return { ...await getDocGenerationStatus(ev), headers: CORS };

    // /api/systems/{systemId}/remediation/generate (legacy — kept for backward compat)
    if (method === 'POST' && /^\/api\/systems\/[^/]+\/remediation\/generate$/.test(path))
      return { ...await generateDocument(ev), headers: CORS };

    // /api/systems/{systemId}/gaps/{gapId}/close
    if (method === 'POST' && /^\/api\/systems\/[^/]+\/gaps\/[^/]+\/close$/.test(path))
      return { ...await closeGap(ev), headers: CORS };

    // /api/systems/{systemId}/documents
    if (method === 'GET' && /^\/api\/systems\/[^/]+\/documents$/.test(path))
      return { ...await listSystemDocuments(ev), headers: CORS };

    // /api/documents/{documentId}
    const singleDoc = path.match(/^\/api\/documents\/([^/]+)$/);
    if (singleDoc) {
      if (method === 'GET')    return { ...await getDocument(ev), headers: CORS };
      if (method === 'DELETE') return { ...await deleteDocument(ev), headers: CORS };
    }

    // /api/documents/{documentId}/finalize
    if (method === 'PUT' && /^\/api\/documents\/[^/]+\/finalize$/.test(path))
      return { ...await finalizeDocument(ev), headers: CORS };

    // /api/documents/{documentId}/regenerate
    if (method === 'POST' && /^\/api\/documents\/[^/]+\/regenerate$/.test(path))
      return { ...await regenerateDocument(ev), headers: CORS };

    // ── Partner ────────────────────────────────────────────────────────────
    if (method === 'GET'  && path === '/api/partner/me')
      return { ...await getPartnerMe(ev), headers: CORS };
    if (method === 'PUT'  && path === '/api/partner/me')
      return { ...await updatePartnerMe(ev), headers: CORS };
    if (method === 'POST' && path === '/api/partner/send-referral')
      return { ...await sendReferralEmail(ev), headers: CORS };
    if (method === 'GET'  && path === '/api/partner/pmi')
      return { ...await listPMI(ev), headers: CORS };
    if (method === 'POST' && path === '/api/partner/pmi')
      return { ...await addPMI(ev), headers: CORS };
    if (method === 'POST' && path === '/api/partner/pmi/import-csv')
      return { ...await importPMICSV(ev), headers: CORS };

    // /api/partner/pmi/{pmiId}
    const singlePMI = path.match(/^\/api\/partner\/pmi\/([^/]+)$/);
    if (singlePMI) {
      if (method === 'GET')    return { ...await getPMI(ev), headers: CORS };
      if (method === 'DELETE') return { ...await deletePMI(ev), headers: CORS };
    }

    if (method === 'POST' && /^\/api\/partner\/pmi\/[^/]+\/status$/.test(path))
      return { ...await updatePMIStatus(ev), headers: CORS };
    if (method === 'POST' && /^\/api\/partner\/pmi\/[^/]+\/send-assessment$/.test(path))
      return { ...await sendAssessment(ev), headers: CORS };
    if (method === 'POST' && /^\/api\/partner\/pmi\/[^/]+\/send-onboarding$/.test(path))
      return { ...await sendOnboardingEmail(ev), headers: CORS };
    if (method === 'POST' && /^\/api\/partner\/pmi\/[^/]+\/pdf$/.test(path))
      return { ...await generatePMIPdf(ev), headers: CORS };

    // ── Partner Inventory (AI compliance for PMI clients) ──────────────────
    if (method === 'GET' && path === '/api/partner/inventory')
      return { ...await getInventoryOverview(ev), headers: CORS };

    // /api/partner/inventory/{pmiId}
    if (method === 'GET' && /^\/api\/partner\/inventory\/[^/]+$/.test(path))
      return { ...await getPMIInventory(ev), headers: CORS };

    // /api/partner/inventory/{pmiId}/systems/{systemId}
    const partnerSystemPath = path.match(/^\/api\/partner\/inventory\/([^/]+)\/systems\/([^/]+)(\/.*)?$/);
    if (partnerSystemPath) {
      const sub = partnerSystemPath[3] ?? '';
      if (method === 'GET'  && !sub) return { ...await getPartnerSystem(ev), headers: CORS };
      if (method === 'PUT'  && !sub) return { ...await updatePartnerSystem(ev), headers: CORS };
      if (method === 'POST' && sub === '/compliance-check')
        return { ...await triggerPartnerCheck(ev), headers: CORS };
      if (method === 'GET'  && sub === '/compliance-checks/latest')
        return { ...await getPartnerSystemCheck(ev), headers: CORS };
    }

    // ── AI Literacy ────────────────────────────────────────────────────────
    if (method === 'GET'  && path === '/api/literacy')
      return { ...await listDepartments(ev), headers: CORS };
    if (method === 'POST' && path === '/api/literacy/departments')
      return { ...await createDepartment(ev), headers: CORS };

    // /api/literacy/departments/:deptId
    const singleDept = path.match(/^\/api\/literacy\/departments\/([^/]+)$/);
    if (singleDept) {
      if (method === 'DELETE') return { ...await deleteDepartment(ev), headers: CORS };
    }

    // /api/literacy/departments/:deptId/suggest
    if (method === 'POST' && /^\/api\/literacy\/departments\/[^/]+\/suggest$/.test(path))
      return { ...await suggestCerts(ev), headers: CORS };

    // /api/literacy/departments/:deptId/certifications
    const certBase = path.match(/^\/api\/literacy\/departments\/([^/]+)\/certifications$/);
    if (certBase) {
      if (method === 'GET')  return { ...await listCertifications(ev), headers: CORS };
      if (method === 'POST') return { ...await addCertification(ev), headers: CORS };
    }

    // /api/literacy/departments/:deptId/certifications/:certId
    if (method === 'DELETE' && /^\/api\/literacy\/departments\/[^/]+\/certifications\/[^/]+$/.test(path))
      return { ...await deleteCertification(ev), headers: CORS };

    // /api/audit-trail
    if (method === 'GET' && path === '/api/audit-trail')
      return { ...await listAuditTrail(ev), headers: CORS };
    if (method === 'POST' && path === '/api/audit-trail/export')
      return { ...await exportAuditTrail(ev), headers: CORS };

    // /api/articles/{num} — public, returns full AI Act article text from knowledge base
    if (method === 'GET' && /^\/api\/articles\/\d+$/.test(path))
      return { ...await getArticleText(ev as unknown as APIGatewayProxyEventV2), headers: CORS };

    return err(404, `Route not found: ${method} ${path}`);

  } catch (e: unknown) {
    const error = e as { message?: string; statusCode?: number };
    const statusCode = error.statusCode ?? 500;
    const message = error.message ?? 'Internal server error';
    if (statusCode >= 500) console.error('[ERROR]', e);
    return err(statusCode, message);
  }
};
