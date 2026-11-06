/**
 * Teacher — electronic class record (2026-10b revision, item 4).
 *
 * GET /api/teacher/class-record[?classroomId=N]
 *
 * One row per enrolled student: their score for each level L1–L5 (best run,
 * out of 10), a category breakdown from those same best runs (Nov 2026), and a
 * total out of 50 — the shape of a paper class record. See lib/classRecord.ts.
 */
import { NextResponse } from 'next/server'
import { describeDbError } from '@/lib/db'
import { requireTeacher } from '@/lib/teacherAuth'
import { loadClassRecord } from '@/lib/classRecord'

export async function GET(request: Request) {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

  const classroomId = Number(new URL(request.url).searchParams.get('classroomId')) || null
  try {
    const { students, categories } = await loadClassRecord(teacher.id, classroomId)
    return NextResponse.json({ success: true, data: { students, categories } })
  } catch (error) {
    console.error('[teacher/class-record] GET', error)
    return NextResponse.json(
      { success: false, message: describeDbError(error, 'Could not build the class record') },
      { status: 500 },
    )
  }
}
