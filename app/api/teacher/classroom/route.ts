/**
 * The teacher's Classroom information (panel revision, Nov 2026b).
 *
 * GET   /api/teacher/classroom  → { classroom, teacherName }
 * PATCH /api/teacher/classroom  { name, gradeLevel, schoolYear, isActive }
 *
 * Sections stay on /api/teacher/classrooms — this is the classroom they sit in.
 */
import { NextResponse } from 'next/server'
import { describeDbError, query } from '@/lib/db'
import { requireTeacher } from '@/lib/teacherAuth'
import { getClassroomInfo, saveClassroomInfo, validateClassroomInfo } from '@/lib/classroomInfo'

async function teacherName(id: number) {
  const [row] = await query<{ name: string }>('SELECT COALESCE(full_name, username) AS name FROM users WHERE id = ?', [id])
  return row?.name ?? 'Teacher'
}

export async function GET() {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })
  try {
    const info = await getClassroomInfo([teacher.id])
    return NextResponse.json({ success: true, data: { classroom: info.get(teacher.id), teacherName: await teacherName(teacher.id) } })
  } catch (error) {
    console.error('[teacher/classroom] GET', error)
    return NextResponse.json({ success: false, message: describeDbError(error, 'Could not load the classroom') }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
  }

  const result = validateClassroomInfo(body)
  if ('errors' in result) {
    return NextResponse.json({ success: false, message: Object.values(result.errors)[0], data: result.errors }, { status: 422 })
  }

  try {
    await saveClassroomInfo(teacher.id, result.info)
    return NextResponse.json({ success: true, message: 'Classroom updated', data: { classroom: result.info, teacherName: await teacherName(teacher.id) } })
  } catch (error) {
    console.error('[teacher/classroom] PATCH', error)
    return NextResponse.json({ success: false, message: describeDbError(error, 'Could not update the classroom') }, { status: 500 })
  }
}
