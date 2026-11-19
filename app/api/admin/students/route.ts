/**
 * GET /api/admin/students?classroomId=N | ?teacherId=N — the student report
 * the admin sees for one section or one teacher (panel revision, Nov 2026b):
 * best-run score per level, total /50, proficiency band, stars, levels done.
 */
import { NextResponse } from 'next/server'
import { describeDbError, query } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'
import { loadClassRecord } from '@/lib/classRecord'
import { studentBand } from '@/lib/analytics'

export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })

  const params = new URL(request.url).searchParams
  const classroomId = Number(params.get('classroomId')) || null
  const teacherId = Number(params.get('teacherId')) || null
  if (!classroomId && !teacherId) {
    return NextResponse.json({ success: false, message: 'Choose a section or a teacher' }, { status: 400 })
  }

  try {
    const { students, categories } = await loadClassRecord(teacherId, classroomId)
    const ids = students.map(s => s.id)
    const extra = ids.length
      ? await query<{ id: number; status: string; stars: number | null; completedLevels: string | null }>(
          `SELECT u.id, u.enrollment_status AS status, sw.stars, gp.completed_levels AS completedLevels
             FROM users u
             LEFT JOIN student_wallets sw ON sw.user_id = u.id
             LEFT JOIN game_progress gp ON gp.user_id = u.id
            WHERE u.id IN (${ids.map(() => '?').join(',')})
            GROUP BY u.id`,
          ids,
        )
      : []
    const byId = new Map(extra.map(e => [e.id, e]))
    const levelsDone = (raw: string | null) => {
      try {
        const parsed = JSON.parse(raw ?? '[]')
        return Array.isArray(parsed) ? new Set(parsed).size : 0
      } catch { return 0 }
    }

    return NextResponse.json({
      success: true,
      data: {
        categories,
        students: students.map(s => {
          const e = byId.get(s.id)
          return {
            ...s,
            band: studentBand(s),
            status: e?.status ?? 'enrolled',
            stars: Number(e?.stars ?? 0),
            levelsCompleted: levelsDone(e?.completedLevels ?? null),
          }
        }),
      },
    })
  } catch (error) {
    console.error('[admin/students] GET', error)
    return NextResponse.json({ success: false, message: describeDbError(error, 'Could not load the student report') }, { status: 500 })
  }
}
