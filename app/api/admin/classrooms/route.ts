/**
 * GET /api/admin/classrooms — every teacher with their Classroom and its
 * sections, each with a student count and class average (panel revision,
 * Nov 2026b: "si admin dapat makakita sa section ni teacher ug pila ang student").
 */
import { NextResponse } from 'next/server'
import { describeDbError, hasColumn, query } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'
import { getClassroomInfo } from '@/lib/classroomInfo'
import { loadClassRecord } from '@/lib/classRecord'
import { classAverage } from '@/lib/analytics'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })

  try {
    const activeExpr = (await hasColumn('users', 'is_active')) ? 'is_active' : '1'
    const teachers = await query<{ id: number; username: string; fullName: string | null; isActive: number }>(
      `SELECT id, username, full_name AS fullName, ${activeExpr} AS isActive
         FROM users WHERE role = 'teacher' ORDER BY COALESCE(full_name, username)`,
    )
    const sections = await query<{ id: number; teacherId: number; name: string; schoolYear: string | null; studentCount: number }>(
      `SELECT c.id, c.teacher_id AS teacherId, c.name, c.school_year AS schoolYear,
              (SELECT COUNT(*) FROM users s WHERE s.classroom_id = c.id AND s.role = 'student') AS studentCount
         FROM classrooms c ORDER BY c.name`,
    )
    const classrooms = await getClassroomInfo(teachers.map(t => t.id))
    const { students } = await loadClassRecord(null, null)

    return NextResponse.json({
      success: true,
      data: teachers.map(t => {
        const own = sections.filter(s => s.teacherId === t.id)
        return {
          id: t.id,
          name: t.fullName ?? t.username,
          username: t.username,
          isActive: Boolean(t.isActive),
          classroom: classrooms.get(t.id),
          studentCount: own.reduce((sum, s) => sum + Number(s.studentCount), 0),
          sections: own.map(s => ({
            id: s.id,
            name: s.name,
            schoolYear: s.schoolYear,
            studentCount: Number(s.studentCount),
            average: classAverage(students.filter(r => r.sectionId === s.id)),
          })),
        }
      }),
    })
  } catch (error) {
    console.error('[admin/classrooms] GET', error)
    return NextResponse.json({ success: false, message: describeDbError(error, 'Could not load classrooms') }, { status: 500 })
  }
}
