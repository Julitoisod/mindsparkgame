import { NextResponse } from 'next/server'
import { query, execute }   from '@/lib/db'
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth'
import { validateRegister } from '@/lib/validations'
import type { User, PublicUser } from '@/types/user'

/**
 * POST /api/auth/register
 * Body: { username, email, password }
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate inputs
  const { valid, errors } = validateRegister(body)
  if (!valid) {
    return NextResponse.json({ success: false, message: 'Validation failed', data: errors }, { status: 422 })
  }

  const { username, email, password } = body as { username: string; email: string; password: string }

  // Check uniqueness
  const existing = await query<Pick<User, 'id'>>(
    'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
    [email.toLowerCase(), username.trim()],
  )
  if (existing.length > 0) {
    return NextResponse.json({ success: false, message: 'Email or username already in use' }, { status: 409 })
  }

  // Teacher accounts are self-service. Student accounts are created by teachers.
  const hash = await hashPassword(password)
  const result = await execute(
    `INSERT INTO users
       (username, email, password_hash, role, enrollment_status, enrolled_at)
     VALUES (?, ?, ?, 'teacher', 'enrolled', NOW())`,
    [username.trim(), email.toLowerCase(), hash],
  )

  const userId = result.insertId

  // Issue JWT session
  const token = signToken({ userId, username: username.trim(), email: email.toLowerCase(), role: 'teacher' })
  await setAuthCookie(token)

  const newUser: PublicUser = {
    id:         userId,
    username:   username.trim(),
    email:      email.toLowerCase(),
    role:       'teacher',
    enrollmentStatus: 'enrolled',
    avatar_url: null,
    created_at: new Date().toISOString(),
  }

  return NextResponse.json({ success: true, message: 'Teacher account created', data: newUser }, { status: 201 })
}
