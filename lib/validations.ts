/**
 * lib/validations.ts
 * Input validation schemas (no external library, zero-dependency).
 */

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

/** Field rules shared by every account form (null = valid). */
export function usernameError(value: string): string | null {
  const v = value.trim()
  if (v.length < 3) return 'Username must be at least 3 characters.'
  if (v.length > 32) return 'Username must be 32 characters or fewer.'
  if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Username can only contain letters, numbers, and underscores.'
  return null
}

export function emailError(value: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : 'A valid email address is required.'
}

export function passwordError(value: string): string | null {
  if (value.length < 8) return 'Password must be at least 8 characters.'
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) return 'Password must contain at least one letter and one number.'
  return null
}

export function validateLogin(body: unknown): ValidationResult {
  const errors: Record<string, string> = {}
  const data = body as Record<string, unknown>

  const identifier = data.identifier ?? data.email
  if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
    errors.identifier = 'Username is required.'
  }
  if (!data.password || typeof data.password !== 'string') {
    errors.password = 'Password is required.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
