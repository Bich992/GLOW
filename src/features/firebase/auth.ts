import { getAdminAuth } from './admin';

export interface DecodedToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

export async function verifyIdToken(idToken: string): Promise<DecodedToken | null> {
  const auth = getAdminAuth();
  if (!auth) return null;

  try {
    const decoded = await auth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
  } catch (e) {
    console.warn('Failed to verify ID token:', e);
    return null;
  }
}

export async function verifySessionToken(sessionCookie: string): Promise<DecodedToken | null> {
  const auth = getAdminAuth();
  if (!auth) return null;

  try {
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
  } catch {
    return null;
  }
}

export async function createSessionCookie(idToken: string, expiresIn: number): Promise<string | null> {
  const auth = getAdminAuth();
  if (!auth) return null;

  try {
    return await auth.createSessionCookie(idToken, { expiresIn });
  } catch (e) {
    console.warn('Failed to create session cookie:', e);
    return null;
  }
}

export async function revokeRefreshTokens(uid: string): Promise<void> {
  const auth = getAdminAuth();
  if (!auth) return;

  try {
    await auth.revokeRefreshTokens(uid);
  } catch (e) {
    console.warn('Failed to revoke refresh tokens:', e);
  }
}
