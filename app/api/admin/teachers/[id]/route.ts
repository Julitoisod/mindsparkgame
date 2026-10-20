/**
 * Admin — edit or deactivate one teacher (2026-10b revision, item 1).
 *
 * PATCH /api/admin/teachers/:id   { fullName?, email?, username?, password?, isActive? }
 *
 * Deactivating is deliberately a flag, not a delete: a teacher's sections,
 * students and questions all reference this row.
 */
import { NextResponse } from 'next/server'
import { describeDbError, execute, hasColumn, query } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireAdmin } from '@/lib/adminAuth'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })

  const { id } = await context.params
  const teacherId = Number(id)
  if (!Number.isInteger(teacherId)) {
    return NextResponse.json({ success: false, message: 'Invalid teacher id' }, { status: 400 })
  }

  const rows = await query<{ id: number; role: string }>(
    'SELECT id, role FROM users WHERE id = ? LIMIT 1',
    [teacherId],
  )
  if (!rows.length || rows[0].role !== 'teacher') {
    return NextResponse.json({ success: false, message: 'Teacher not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const updates: string[] = []
  const params: (string | number)[] = []

  if (typeof body.username === 'string' && body.username.trim()) {
    const username = body.username.trim()
    const clash = await query<{ id: number }>(
      'SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1', [username, teacherId])
    if (clash.length) return NextResponse.json({ success: false, message: 'Username already in use' }, { status: 409 })
    updates.push('username = ?'); params.push(username)
  }
  if (typeof body.fullName === 'string') {
    updates.push('full_name = ?'); params.push(body.fullName.trim())
  }
  if (typeof body.email === 'string' && body.email.trim()) {
    const email = body.email.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ success: false, message: 'A valid email is required' }, { status: 400 })
    }
    const clash = await query<{ id: number }>(
      'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, teacherId])
    if (clash.length) return NextResponse.json({ success: false, message: 'Email already in use' }, { status: 409 })
    updates.push('email = ?'); params.push(email)
  }
  if (typeof body.password === 'string' && body.password.length > 0) {
    if (body.password.length < 8 || !/[a-zA-Z]/.test(body.password) || !/\d/.test(body.password)) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters and include a letter and a number' },
        { status: 400 })
    }
    updates.push('password_hash = ?'); params.push(await hashPassword(body.password))
    if (await hasColumn('users', 'initial_password')) {
      updates.push('initial_password = ?'); params.push(body.password)
    }
  }
  if (typeof body.isActive === 'boolean') {
    if (!(await hasColumn('users', 'is_active'))) {
      return NextResponse.json(
        { success: false, message: 'The database is out of date — apply database/migrations/2026-10b-revision.sql' },
        { status: 500 })
    }
    updates.push('is_active = ?'); params.push(body.isActive ? 1 : 0)
  }

  if (!updates.length) {
    return NextResponse.json({ success: false, message: 'Nothing to update' }, { status: 400 })
  }

  try {
    params.push(teacherId)
    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)
    return NextResponse.json({ success: true, message: 'Teacher account updated' })
  } catch (error) {
    console.error('[admin/teachers] PATCH', error)
    return NextResponse.json(
      { success: false, message: describeDbError(error, 'Could not update that teacher account') },
      { status: 500 },
    )
  }
}
