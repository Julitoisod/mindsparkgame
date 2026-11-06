/**
 * GET /api/admin/overview — the admin dashboard (panel revision, Nov 2026):
 * account statistics plus a feed of recent account activity, built from
 * existing timestamps (no activity table needed).
 */
import { NextResponse } from 'next/server'
import { describeDbError, hasColumn, query } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'

type Activity = { kind: 'teacher' | 'section' | 'enrollment'; title: string; detail: string; at: string }

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })

  try {
    const activeExpr = (await hasColumn('users', 'is_active')) ? 'is_active' : '1'
    const [counts] = await query<{ teachers: number; activeTeachers: number; students: number }>(
      `SELECT SUM(role = 'teacher') AS teachers,
              SUM(role = 'teacher' AND ${activeExpr} = 1) AS activeTeachers,
              SUM(role = 'student') AS students
         FROM users`,
    )
    const [sections] = await query<{ n: number }>('SELECT COUNT(*) AS n FROM classrooms')
    const [questions] = await query<{ n: number }>('SELECT COUNT(*) AS n FROM quiz_questions WHERE is_active = 1')

    const teacherRows = await query<{ username: string; fullName: string | null; ts: number }>(
      `SELECT username, full_name AS fullName, UNIX_TIMESTAMP(created_at) AS ts
         FROM users WHERE role = 'teacher' ORDER BY created_at DESC LIMIT 6`,
    )
    const sectionRows = await query<{ name: string; teacher: string; ts: number }>(
      `SELECT c.name, u.username AS teacher, UNIX_TIMESTAMP(c.created_at) AS ts
         FROM classrooms c JOIN users u ON u.id = c.teacher_id
        ORDER BY c.created_at DESC LIMIT 6`,
    )
    const enrollRows = await query<{ teacher: string; n: number; ts: number }>(
      `SELECT t.username AS teacher, COUNT(*) AS n, UNIX_TIMESTAMP(MAX(s.enrolled_at)) AS ts
         FROM users s JOIN users t ON t.id = s.enrolled_by
        WHERE s.role = 'student' AND s.enrolled_at IS NOT NULL
        GROUP BY s.enrolled_by, DATE(s.enrolled_at)
        ORDER BY ts DESC LIMIT 6`,
    )

    // UNIX_TIMESTAMP everywhere: right whatever the MySQL server time zone is
    const iso = (ts: number) => new Date(Number(ts) * 1000).toISOString()
    const recent: Activity[] = [
      ...teacherRows.map(r => ({ kind: 'teacher' as const, title: `Teacher account created`, detail: r.fullName ? `${r.fullName} (@${r.username})` : `@${r.username}`, at: iso(r.ts) })),
      ...sectionRows.map(r => ({ kind: 'section' as const, title: `Section created`, detail: `${r.name} — by @${r.teacher}`, at: iso(r.ts) })),
      ...enrollRows.map(r => ({ kind: 'enrollment' as const, title: `Students enrolled`, detail: `${Number(r.n)} student${Number(r.n) === 1 ? '' : 's'} by @${r.teacher}`, at: iso(r.ts) })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 10)

    const teachers = Number(counts?.teachers ?? 0)
    const activeTeachers = Number(counts?.activeTeachers ?? 0)
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          teachers,
          activeTeachers,
          inactiveTeachers: teachers - activeTeachers,
          students: Number(counts?.students ?? 0),
          sections: Number(sections?.n ?? 0),
          questions: Number(questions?.n ?? 0),
        },
        recent,
      },
    })
  } catch (error) {
    console.error('[admin/overview] GET', error)
    return NextResponse.json({ success: false, message: describeDbError(error, 'Could not load the dashboard') }, { status: 500 })
  }
}
