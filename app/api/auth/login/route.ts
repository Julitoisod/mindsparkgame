import { NextResponse }    from 'next/server'
import { hasColumn, query } from '@/lib/db'
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth'
import { validateLogin }   from '@/lib/validations'
import type { User, PublicUser } from '@/types/user'

/**
 * POST /api/auth/login
 * Body: { identifier, password } | { email, password }
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

  const data = body as Record<string, string>
  const identifier = (data.identifier ?? data.email ?? '').trim()
  const password = data.password

  try {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
    // is_active arrives with 2026-10b; fall back so a deploy that lands before
    // its migration still logs people in.
    const activeColumn = (await hasColumn('users', 'is_active')) ? 'is_active' : '1 AS is_active'
    const rows = await query<User & { is_active: number }>(
      `SELECT
         id, username, email, password_hash, role, enrollment_status, enrolled_by, enrolled_at,
         ${activeColumn},
         avatar_url, created_at, updated_at
       FROM users
       WHERE ${isEmail ? 'email = ?' : 'username = ?'}
       LIMIT 1`,
      [isEmail ? identifier.toLowerCase() : identifier],
    )

    // Constant-time response for non-existent users (prevent user enumeration)
    if (!rows.length || !rows[0].password_hash) {
      await verifyPassword(password, '$2a$12$invalidsaltplaceholderinvalid00')
      return NextResponse.json({ success: false, message: 'Invalid username or password' }, { status: 401 })
    }

    const user = rows[0]
    const valid2 = await verifyPassword(password, user.password_hash!)
    if (!valid2) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 })
    }

    // A teacher the admin deactivated keeps their data but cannot sign in (item 1)
    if (user.role === 'teacher' && Number(user.is_active) === 0) {
      return NextResponse.json(
        { success: false, message: 'This teacher account has been deactivated. Please contact the administrator.' },
        { status: 403 },
      )
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
