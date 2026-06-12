import { getJwtToken } from './auth';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isPublic = false,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!isPublic) {
    const token = await getJwtToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(json.error ?? json.message ?? res.statusText), { statusCode: res.status });
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (body: {
      email: string; password: string; company_name: string;
      sector: string; employees_range: string; country: string;
      referral_code?: string; pmi_id?: string;
    }) => request<{ company_id: string; user_id: string; message: string }>(
      'POST', '/api/auth/register', body, true
    ),
    invite: (body: { email: string; role: 'admin' | 'member' }) =>
      request<{ message: string }>('POST', '/api/auth/invite', body),
  },

  // ─── Company ────────────────────────────────────────────────────────────────
  company: {
    get: () => request<Record<string, unknown>>('GET', '/api/company'),
    update: (body: Record<string, unknown>) => request<{ message: string }>('PUT', '/api/company', body),
    setup: (body: Record<string, unknown>) => request<{ message: string }>('PUT', '/api/company/setup', body),
    getUsers: () => request<unknown[]>('GET', '/api/company/users'),
    deleteUser: (userId: string) => request<{ message: string }>('DELETE', `/api/company/users/${userId}`),
  },

  // ─── Systems ────────────────────────────────────────────────────────────────
  systems: {
    list: () => request<unknown[]>('GET', '/api/systems'),
    create: (body: Record<string, unknown>) => request<{ system_id: string; tool_name: string; compliance_status: string }>('POST', '/api/systems', body),
    get: (id: string) => request<Record<string, unknown>>('GET', `/api/systems/${id}`),
    update: (id: string, body: Record<string, unknown>) => request<{ message: string }>('PUT', `/api/systems/${id}`, body),
    delete: (id: string) => request<{ message: string }>('DELETE', `/api/systems/${id}`),
  },

  // ─── Gap actions ────────────────────────────────────────────────────────────
  gaps: {
    close: (systemId: string, gapId: string, body: {
      evidence_note?: string;
      proof_base64?: string;
      proof_filename?: string;
    }) => request<{ success: boolean; source: string; article: string }>(
      'POST', `/api/systems/${systemId}/gaps/${gapId}/close`, body
    ),
  },

  // ─── Compliance ─────────────────────────────────────────────────────────────
  compliance: {
    trigger: (systemId: string) => request<{ check_id: string; status: string; poll_url: string }>(
      'POST', `/api/systems/${systemId}/compliance-check`, {}
    ),
    getLatest: (systemId: string) => request<Record<string, unknown>>(
      'GET', `/api/systems/${systemId}/compliance-checks/latest`
    ),
    list: (systemId: string) => request<unknown[]>(
      'GET', `/api/systems/${systemId}/compliance-checks`
    ),
  },

  // ─── Document Generation Pipeline (Step Functions) ──────────────────────────
  docPipeline: {
    start: (systemId: string, gapId: string, idempotencyKey?: string) => {
      const headers: Record<string, string> = {};
      if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
      return request<{ generationId: string; status: string }>(
        'POST', `/api/systems/${systemId}/documents`, { gap_id: gapId }
      );
    },
    getStatus: (generationId: string) =>
      request<import('./types').DocGeneration>('GET', `/api/document-generations/${generationId}`),
    listBySystem: (systemId: string) =>
      request<{ generations: import('./types').DocGeneration[] }>('GET', `/api/systems/${systemId}/document-generations`),
    listByCompany: () =>
      request<{ generations: import('./types').DocGeneration[] }>('GET', '/api/company/document-generations'),
  },

  // ─── Documents (Remediation Engine) ─────────────────────────────────────────
  documents: {
    generate: (systemId: string, gapId: string) =>
      request<{ document_id: string; status: string }>(
        'POST', `/api/systems/${systemId}/remediation/generate`, { gap_id: gapId }
      ),
    get: (documentId: string) =>
      request<Record<string, unknown>>('GET', `/api/documents/${documentId}`),
    finalize: (documentId: string) =>
      request<{ success: boolean }>('PUT', `/api/documents/${documentId}/finalize`, {}),
    delete: (documentId: string) =>
      request<{ success: boolean }>('DELETE', `/api/documents/${documentId}`),
    regenerate: (documentId: string) =>
      request<{ document_id: string; status: string }>(
        'POST', `/api/documents/${documentId}/regenerate`, {}
      ),
    listBySystem: (systemId: string) =>
      request<{ documents: unknown[] }>('GET', `/api/systems/${systemId}/documents`),
    listByCompany: () =>
      request<{ documents: unknown[] }>('GET', '/api/company/documents'),
  },

  // ─── AI Literacy ────────────────────────────────────────────────────────────
  literacy: {
    list: () => request<{ departments: unknown[]; systems: unknown[] }>('GET', '/api/literacy'),
    createDept: (body: { name: string; headcount: number; system_ids: string[] }) =>
      request<{ dept_id: string }>('POST', '/api/literacy/departments', body),
    deleteDept: (deptId: string) =>
      request<{ message: string }>('DELETE', `/api/literacy/departments/${deptId}`),
    suggest: (deptId: string) =>
      request<{ suggestions: unknown[] }>('POST', `/api/literacy/departments/${deptId}/suggest`, {}),
    listCerts: (deptId: string) =>
      request<{ certifications: unknown[] }>('GET', `/api/literacy/departments/${deptId}/certifications`),
    addCert: (deptId: string, body: {
      certification_name: string; issued_date: string;
      url?: string; people_count?: number; notes?: string;
    }) => request<{ cert_id: string }>('POST', `/api/literacy/departments/${deptId}/certifications`, body),
    deleteCert: (deptId: string, certId: string) =>
      request<{ message: string }>('DELETE', `/api/literacy/departments/${deptId}/certifications/${certId}`),
  },

  // ─── Partner ────────────────────────────────────────────────────────────────
  partner: {
    register: (body: {
      email: string; password: string;
      ragione_sociale: string; tipo_studio: string; n_clienti: number;
    }) => request<{ partner_id: string; message: string }>(
      'POST', '/api/partner/request', body, true
    ),
    getMe: () => request<Record<string, unknown>>('GET', '/api/partner/me'),
    updateMe: (body: Record<string, unknown>) =>
      request<{ message: string }>('PUT', '/api/partner/me', body),
    sendReferral: (body: { contact_email: string; company_name?: string; custom_message?: string }) =>
      request<{ message: string; sent_at: string }>('POST', '/api/partner/send-referral', body),
    listPMI: () => request<unknown[]>('GET', '/api/partner/pmi'),
    addPMI: (body: { company_name: string; contact_email: string }) =>
      request<Record<string, unknown>>('POST', '/api/partner/pmi', body),
    importCSV: (rows: { company_name: string; contact_email: string }[]) =>
      request<{ created: number; items: unknown[] }>('POST', '/api/partner/pmi/import-csv', { rows }),
    getPMI: (pmiId: string) => request<Record<string, unknown>>('GET', `/api/partner/pmi/${pmiId}`),
    deletePMI: (pmiId: string) => request<{ message: string }>('DELETE', `/api/partner/pmi/${pmiId}`),
    updateStatus: (pmiId: string, status: string) =>
      request<{ message: string; status: string }>('POST', `/api/partner/pmi/${pmiId}/status`, { status }),
    sendAssessment: (pmiId: string, emailBody?: string) =>
      request<{ message: string; sent_at: string }>(
        'POST', `/api/partner/pmi/${pmiId}/send-assessment`, { email_body: emailBody }
      ),
    sendOnboarding: (pmiId: string) =>
      request<{ message: string; sent_at: string }>(
        'POST', `/api/partner/pmi/${pmiId}/send-onboarding`, {}
      ),
    getPMIReport: (pmiId: string) =>
      request<{ report: Record<string, unknown> }>('POST', `/api/partner/pmi/${pmiId}/pdf`, {}),
  },

  // ─── Partner Inventory (AI compliance for partner PMI clients) ──────────────
  partnerInventory: {
    getOverview: () =>
      request<Record<string, unknown>[]>('GET', '/api/partner/inventory'),
    getPMI: (pmiId: string) =>
      request<Record<string, unknown>>('GET', `/api/partner/inventory/${pmiId}`),
    getSystem: (pmiId: string, systemId: string) =>
      request<Record<string, unknown>>('GET', `/api/partner/inventory/${pmiId}/systems/${systemId}`),
    updateSystem: (pmiId: string, systemId: string, body: Record<string, unknown>) =>
      request<{ message: string }>('PUT', `/api/partner/inventory/${pmiId}/systems/${systemId}`, body),
    triggerCheck: (pmiId: string, systemId: string) =>
      request<{ check_id: string; status: string }>('POST', `/api/partner/inventory/${pmiId}/systems/${systemId}/compliance-check`, {}),
    getLatestCheck: (pmiId: string, systemId: string) =>
      request<Record<string, unknown>>('GET', `/api/partner/inventory/${pmiId}/systems/${systemId}/compliance-checks/latest`),
  },

  // ─── AI Act articles (public) ────────────────────────────────────────────────
  articles: {
    get: (articleNum: number) =>
      request<{ article_number: number; article_title: string; text: string; parts_count: number }>(
        'GET', `/api/articles/${articleNum}`, undefined, true
      ),
  },

  // ─── Assessment (public, no auth) ───────────────────────────────────────────
  assessment: {
    getForm: (token: string) => request<Record<string, unknown>>('GET', `/api/assessment/${token}`, undefined, true),
    submit: (token: string, systems: Record<string, unknown>[], companyProfile?: Record<string, unknown>) =>
      request<{ message: string; systems_count: number }>(
        'POST', `/api/assessment/${token}/submit`, { systems, company_profile: companyProfile }, true
      ),
  },

  // ─── Audit Trail ─────────────────────────────────────────────────────────────
  auditTrail: {
    list:   () => request<import('./types').AuditEvent[]>('GET', '/api/audit-trail'),
    export: () => request<{ pdfBase64: string; filename: string }>('POST', '/api/audit-trail/export'),
  },
};
