/**
 * lib/validations.ts
 * Input validation schemas (no external library, zero-dependency).
 */

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validateRegister(body: unknown): ValidationResult {
  const errors: Record<string, string> = {}
  const data = body as Record<string, unknown>

  if (!data.username || typeof data.username !== 'string' || data.username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters.'
  } else if (data.username.trim().length > 32) {
    errors.username = 'Username must be 32 characters or fewer.'
  } else if (!/^[a-zA-Z0-9_]+$/.test(data.username.trim())) {
    errors.username = 'Username can only contain letters, numbers, and underscores.'
  }

  if (!data.email || typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'A valid email address is required.'
  }

  if (!data.password || typeof data.password !== 'string') {
    errors.password = 'Password is required.'
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  } else if (!/[a-zA-Z]/.test(data.password) || !/\d/.test(data.password)) {
    errors.password = 'Password must contain at least one letter and one number.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
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
