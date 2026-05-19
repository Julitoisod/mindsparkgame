/**
 * lib/auth.ts
 * JWT-based session helpers: sign, verify, cookie management.
 */
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import type { AuthPayload } from '@/types/user'

const JWT_SECRET     = process.env.JWT_SECRET     ?? 'dev_secret_change_me'
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn']
const COOKIE_NAME    = 'mindspark_session'
const BCRYPT_ROUNDS  = 12

// ─── Password ─────────────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

export function signToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload
  } catch {
    return null
  }
}

// ─── Cookie Helpers (Server Components / Route Handlers) ──────────────────────

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 24 * 7, // 7 days in seconds
  })
}

export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// ─── Session Resolution ───────────────────────────────────────────────────────

/**
 * Returns the decoded AuthPayload if the session cookie is valid, else null.
 * Safe to call in any Server Component or Route Handler.
 */
export async function getSession(): Promise<AuthPayload | null> {
  const token = await getAuthCookie()
  if (!token) return null
  return verifyToken(token)
}
