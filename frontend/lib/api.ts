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
};
