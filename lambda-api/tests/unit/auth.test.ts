import { extractAuth, requireAdmin, requirePartner } from '../../middleware/auth';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

// ─── Helper per costruire un evento mock ──────────────────────────────────────

function mockEvent(claims: Record<string, string>): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: {
      authorizer: {
        jwt: { claims },
      },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

// ─── extractAuth ──────────────────────────────────────────────────────────────

describe('extractAuth', () => {
  it('estrae correttamente i claim JWT per un admin', () => {
    const event = mockEvent({
      'custom:company_id': 'company-123',
      sub:                 'user-456',
      email:               'admin@test.com',
      'custom:role':       'admin',
    });
    const auth = extractAuth(event);
    expect(auth.companyId).toBe('company-123');
    expect(auth.userId).toBe('user-456');
    expect(auth.email).toBe('admin@test.com');
    expect(auth.role).toBe('admin');
  });

  it('mappa custom:role collaborator → role "collaborator"', () => {
    const event = mockEvent({
      'custom:company_id': 'company-123',
      sub:                 'user-789',
      email:               'collab@test.com',
      'custom:role':       'collaborator',
    });
    const auth = extractAuth(event);
    expect(auth.role).toBe('collaborator');
  });

  it('mappa custom:role partner → role "partner"', () => {
    const event = mockEvent({
      'custom:company_id': 'partner-999',
      sub:                 'user-000',
      email:               'partner@studio.it',
      'custom:role':       'partner',
    });
    const auth = extractAuth(event);
    expect(auth.role).toBe('partner');
  });

  it('ruolo sconosciuto → fallback a "collaborator"', () => {
    const event = mockEvent({
      'custom:company_id': 'company-123',
      sub:                 'user-000',
      email:               'x@test.com',
      'custom:role':       'superuser', // valore non previsto
    });
    const auth = extractAuth(event);
    expect(auth.role).toBe('collaborator');
  });

  it('lancia 401 se custom:company_id mancante', () => {
    const event = mockEvent({
      sub:           'user-456',
      email:         'admin@test.com',
      'custom:role': 'admin',
    });
    expect(() => extractAuth(event)).toThrow();
    try {
      extractAuth(event);
    } catch (err: unknown) {
      expect((err as { statusCode?: number }).statusCode).toBe(401);
    }
  });

  it('lancia 401 se sub mancante', () => {
    const event = mockEvent({
      'custom:company_id': 'company-123',
      email:               'admin@test.com',
      'custom:role':       'admin',
    });
    expect(() => extractAuth(event)).toThrow();
    try {
      extractAuth(event);
    } catch (err: unknown) {
      expect((err as { statusCode?: number }).statusCode).toBe(401);
    }
  });
});

// ─── requireAdmin ─────────────────────────────────────────────────────────────

describe('requireAdmin', () => {
  it('non lancia per ruolo admin', () => {
    expect(() => requireAdmin({ companyId: 'c', userId: 'u', email: 'e', role: 'admin' })).not.toThrow();
  });

  it('lancia 403 per ruolo collaborator', () => {
    try {
      requireAdmin({ companyId: 'c', userId: 'u', email: 'e', role: 'collaborator' });
      fail('should have thrown');
    } catch (err: unknown) {
      expect((err as { statusCode?: number }).statusCode).toBe(403);
    }
  });

  it('lancia 403 per ruolo partner', () => {
    try {
      requireAdmin({ companyId: 'c', userId: 'u', email: 'e', role: 'partner' });
      fail('should have thrown');
    } catch (err: unknown) {
      expect((err as { statusCode?: number }).statusCode).toBe(403);
    }
  });
});

// ─── requirePartner ───────────────────────────────────────────────────────────

describe('requirePartner', () => {
  it('non lancia per ruolo partner', () => {
    expect(() => requirePartner({ companyId: 'c', userId: 'u', email: 'e', role: 'partner' })).not.toThrow();
  });

  it('lancia 403 per ruolo admin', () => {
    try {
      requirePartner({ companyId: 'c', userId: 'u', email: 'e', role: 'admin' });
      fail('should have thrown');
    } catch (err: unknown) {
      expect((err as { statusCode?: number }).statusCode).toBe(403);
    }
  });

  it('lancia 403 per ruolo collaborator', () => {
    try {
      requirePartner({ companyId: 'c', userId: 'u', email: 'e', role: 'collaborator' });
      fail('should have thrown');
    } catch (err: unknown) {
      expect((err as { statusCode?: number }).statusCode).toBe(403);
    }
  });
});
