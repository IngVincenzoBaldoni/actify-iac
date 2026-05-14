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
};
