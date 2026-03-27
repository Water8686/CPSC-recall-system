import { SignJWT, jwtVerify } from 'jose';

/**
 * App-issued JWT (class project — not Supabase Auth).
 * Set APP_JWT_SECRET in production (any long random string).
 */
export function getJwtSecret() {
  const s = process.env.APP_JWT_SECRET;
  if (s && s.length >= 8) return s;
  if (process.env.NODE_ENV !== 'production') {
    return 'dev-only-insecure-jwt-secret';
  }
  throw new Error('APP_JWT_SECRET must be set (min 8 characters)');
}

function secretKey() {
  return new TextEncoder().encode(getJwtSecret());
}

export async function signAppToken(userId, email, role) {
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setExpirationTime('7d')
    .sign(secretKey());
}

export async function verifyAppToken(token) {
  const { payload } = await jwtVerify(token, secretKey());
  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}
