'use client';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

export async function getJwtToken(): Promise<string> {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() ?? '';
}

export async function getAuthClaims(): Promise<{
  companyId: string;
  userId: string;
  email: string;
  role: 'admin' | 'collaborator' | 'partner';
} | null> {
  try {
    const session = await fetchAuthSession();
    const payload = session.tokens?.idToken?.payload;
    if (!payload) return null;
    const rawRole = payload['custom:role'] as string;
    const role: 'admin' | 'collaborator' | 'partner' =
      rawRole === 'admin' ? 'admin' : rawRole === 'partner' ? 'partner' : 'collaborator';
    return {
      companyId: (payload['custom:company_id'] as string) ?? '',
      userId:    (payload['sub'] as string) ?? '',
      email:     (payload['email'] as string) ?? '',
      role,
    };
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}

export async function doSignIn(email: string, password: string) {
  return signIn({ username: email, password });
}

export async function doSignOut() {
  // Clear the session cookie used by middleware
  document.cookie = 'actify-session=; Max-Age=0; path=/';
  await signOut();
}

export function setSessionCookie() {
  const maxAge = 60 * 60; // 1h, Amplify refresh handles renewal
  document.cookie = `actify-session=1; Max-Age=${maxAge}; path=/; SameSite=Lax`;
}
