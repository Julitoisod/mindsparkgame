/**
 * GET /api/admin/overview[?teacherId=N&classroomId=N] — the admin dashboard.
 *
 * Nov 2026 shipped account statistics + recent account activity. The Nov 2026b
 * revision ("kung unsa ang dashboard sa teacher mao sad sa admin", "add some
 * analytics") adds, over every student in the school or one teacher/section:
 * the same learning analytics the teacher Dashboard shows, a student enrollment
 * trend, top-performing sections and recent student activity.
 */
import { NextResponse } from 'next/server'
import { describeDbError, hasColumn, query } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'
import { LEVEL_TITLES, loadClassRecord, loadDashboardExtras, type ClassRecordRow } from '@/lib/classRecord'
import { buildAnalytics, classAverage } from '@/lib/analytics'

type Activity = { kind: 'teacher' | 'section' | 'enrollment'; title: string; detail: string; at: string }

const TREND_MONTHS = 6
const TOP_SECTIONS = 5

/** Students enrolled up to the end of each of the last TREND_MONTHS months. */
function enrollmentTrend(perMonth: { ym: string; n: number }[], now = new Date()) {
  const months = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (TREND_MONTHS - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  return months.map(ym => ({
    month: ym,
    students: perMonth.filter(r => r.ym <= ym).reduce((sum, r) => sum + Number(r.n), 0),
    added: Number(perMonth.find(r => r.ym === ym)?.n ?? 0),
  }))
}

/** Sections ranked by class average (best runs, played levels only). */
function topSections(rows: readonly ClassRecordRow[], sections: { id: number; name: string; teacher: string }[]) {
  return sections
    .map(section => {
      const members = rows.filter(r => r.sectionId === section.id)
      return { ...section, students: members.length, average: classAverage(members) }
    })
    .filter(s => s.average !== null)
    .sort((a, b) => b.average! - a.average!)
    .slice(0, TOP_SECTIONS)
}

export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })

  const params = new URL(request.url).searchParams
  const teacherId = Number(params.get('teacherId')) || null
  const classroomId = Number(params.get('classroomId')) || null

  try {
    const activeExpr = (await hasColumn('users', 'is_active')) ? 'is_active' : '1'
    const [counts] = await query<{ teachers: number; activeTeachers: number; students: number; studentsThisMonth: number; teachersThisMonth: number }>(
      `SELECT SUM(role = 'teacher') AS teachers,
              SUM(role = 'teacher' AND ${activeExpr} = 1) AS activeTeachers,
              SUM(role = 'student') AS students,
              SUM(role = 'student' AND COALESCE(enrolled_at, created_at) >= DATE_FORMAT(NOW(), '%Y-%m-01')) AS studentsThisMonth,
              SUM(role = 'teacher' AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')) AS teachersThisMonth
         FROM users`,
    )
    const [sections] = await query<{ n: number; thisMonth: number }>(
      `SELECT COUNT(*) AS n, SUM(created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')) AS thisMonth FROM classrooms`,
    )
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

    // ── Learning analytics over the chosen scope ──────────────────────────
    const { students, completions } = await loadClassRecord(teacherId, classroomId)
    const { finishedAll, recent: studentActivity } = await loadDashboardExtras(students, completions)
    const perMonth = await query<{ ym: string; n: number }>(
      `SELECT DATE_FORMAT(COALESCE(enrolled_at, created_at), '%Y-%m') AS ym, COUNT(*) AS n
         FROM users WHERE role = 'student' GROUP BY ym`,
    )
    const sectionList = await query<{ id: number; name: string; teacher: string }>(
      `SELECT c.id, c.name, COALESCE(u.full_name, u.username) AS teacher
         FROM classrooms c JOIN users u ON u.id = c.teacher_id`,
    )

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
          studentsThisMonth: Number(counts?.studentsThisMonth ?? 0),
          teachersThisMonth: Number(counts?.teachersThisMonth ?? 0),
          sectionsThisMonth: Number(sections?.thisMonth ?? 0),
        },
        recent,
        scope: { students: students.length, finishedAll },
        analytics: buildAnalytics(students, LEVEL_TITLES),
        enrollmentTrend: enrollmentTrend(perMonth),
        topSections: topSections(students, sectionList),
        studentActivity,
      },
    })
  } catch (error) {
    console.error('[admin/overview] GET', error)
    return NextResponse.json({ success: false, message: describeDbError(error, 'Could not load the dashboard') }, { status: 500 })
  }
}
