import { NextResponse }    from 'next/server'
import { query }            from '@/lib/db'
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth'
import { validateLogin }   from '@/lib/validations'
import type { User, PublicUser } from '@/types/user'

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
  }

  const { valid, errors } = validateLogin(body)
  if (!valid) {
    return NextResponse.json({ success: false, message: 'Validation failed', data: errors }, { status: 422 })
  }

  const { email, password } = body as { email: string; password: string }

  try {
    const rows = await query<User>(
      `SELECT
         id, username, email, password_hash, role, enrollment_status, enrolled_by, enrolled_at,
         avatar_url, created_at, updated_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email.toLowerCase()],
    )

    // Constant-time response for non-existent users (prevent user enumeration)
    if (!rows.length || !rows[0].password_hash) {
      // Still hash to prevent timing attacks
      await verifyPassword(password, '$2a$12$invalidsaltplaceholderinvalid00')
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 })
    }

    const user = rows[0]
    const valid2 = await verifyPassword(password, user.password_hash!)
    if (!valid2) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 })
    }

    if (user.role === 'student' && user.enrollment_status !== 'enrolled') {
      return NextResponse.json(
        { success: false, message: 'Student account is not enrolled for platform access.' },
        { status: 403 },
      )
    }

    const token = signToken({ userId: user.id, username: user.username, email: user.email, role: user.role })
    await setAuthCookie(token)

    const publicUser: PublicUser = {
      id:         user.id,
      username:   user.username,
      email:      user.email,
      role:       user.role,
      enrollmentStatus: user.enrollment_status,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    }

    return NextResponse.json({ success: true, message: 'Login successful', data: publicUser })
  } catch (error) {
    console.error('[API /api/auth/login]', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
