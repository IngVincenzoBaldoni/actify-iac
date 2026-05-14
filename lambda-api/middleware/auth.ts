import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

export interface AuthContext {
  companyId: string;
  userId: string;
  email: string;
  role: 'admin' | 'member';
}

export function extractAuth(event: APIGatewayProxyEventV2WithJWTAuthorizer): AuthContext {
  const claims = event.requestContext.authorizer.jwt.claims;
  const companyId = claims['custom:company_id'] as string;
  const userId = claims['sub'] as string;
  const email = claims['email'] as string;
  const role = (claims['custom:role'] as string) === 'admin' ? 'admin' : 'member';

  if (!companyId || !userId) {
    throw Object.assign(new Error('Missing required JWT claims'), { statusCode: 401 });
  }

  return { companyId, userId, email, role };
}

export function requireAdmin(auth: AuthContext): void {
  if (auth.role !== 'admin') {
    throw Object.assign(new Error('Admin role required'), { statusCode: 403 });
  }
}
