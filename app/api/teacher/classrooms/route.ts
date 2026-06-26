import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import type { User } from '@/types/user'

interface ClassroomRow {
  id: number
  name: string
  studentCount: number
  createdAt: string
  updatedAt: string
}

async function requireTeacher() {
  const session = await getSession()
  if (!session) return null

  const rows = await query<Pick<User, 'id' | 'role'>>(
    'SELECT id, role FROM users WHERE id = ? LIMIT 1',
    [session.userId],
  )

  if (!rows.length || rows[0].role !== 'teacher') return null
  return rows[0]
}

function publicClassroom(row: ClassroomRow) {
  return {
    id: row.id,
    name: row.name,
    studentCount: Number(row.studentCount ?? 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function serverError(scope: string, error: unknown, message: string) {
  console.error(`[teacher/classrooms] ${scope}`, error)
  return NextResponse.json({ success: false, message }, { status: 500 })
}

async function getClassroom(classroomId: number, teacherId: number) {
  const rows = await query<ClassroomRow>(
    `SELECT
       c.id,
       c.name,
       COUNT(u.id) AS studentCount,
       c.created_at AS createdAt,
       c.updated_at AS updatedAt
     FROM classrooms c
     LEFT JOIN users u
       ON u.classroom_id = c.id
      AND u.role = 'student'
      AND u.enrolled_by = c.teacher_id
     WHERE c.id = ? AND c.teacher_id = ?
     GROUP BY c.id, c.name, c.created_at, c.updated_at
     LIMIT 1`,
    [classroomId, teacherId],
  )

  return rows[0] ? publicClassroom(rows[0]) : null
}

export async function GET() {
  try {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    const rows = await query<ClassroomRow>(
      `SELECT
         c.id,
         c.name,
         COUNT(u.id) AS studentCount,
         c.created_at AS createdAt,
         c.updated_at AS updatedAt
       FROM classrooms c
       LEFT JOIN users u
         ON u.classroom_id = c.id
        AND u.role = 'student'
        AND u.enrolled_by = c.teacher_id
       WHERE c.teacher_id = ?
       GROUP BY c.id, c.name, c.created_at, c.updated_at
       ORDER BY c.created_at DESC`,
      [teacher.id],
    )

    return NextResponse.json({ success: true, message: 'OK', data: rows.map(publicClassroom) })
  } catch (error) {
    return serverError('GET', error, 'Failed to load sections')
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { success: false, message: 'Section name must be 2-80 characters.', data: { name: 'Section name must be 2-80 characters.' } },
        { status: 422 },
      )
    }

    const existing = await query<Pick<ClassroomRow, 'id'>>(
      'SELECT id FROM classrooms WHERE teacher_id = ? AND name = ? LIMIT 1',
      [teacher.id, name],
    )
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: 'Section already exists' }, { status: 409 })
    }

    const result = await execute(
      'INSERT INTO classrooms (teacher_id, name) VALUES (?, ?)',
      [teacher.id, name],
    )

    const classroom = await getClassroom(result.insertId, teacher.id)
    return NextResponse.json({ success: true, message: 'Section created', data: classroom }, { status: 201 })
  } catch (error) {
    return serverError('POST', error, 'Failed to create section')
  }
}

export async function PATCH(request: Request) {
  try {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
    }

    const classroomId = typeof body.id === 'number' ? body.id : Number(body.id)
    if (!Number.isInteger(classroomId) || classroomId <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid section ID' }, { status: 400 })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { success: false, message: 'Section name must be 2-80 characters.', data: { name: 'Section name must be 2-80 characters.' } },
        { status: 422 },
      )
    }

    // Check for duplicate name (excluding current classroom)
    const duplicate = await query<Pick<ClassroomRow, 'id'>>(
      'SELECT id FROM classrooms WHERE teacher_id = ? AND name = ? AND id != ? LIMIT 1',
      [teacher.id, name, classroomId],
    )
    if (duplicate.length > 0) {
      return NextResponse.json({ success: false, message: 'A section with that name already exists' }, { status: 409 })
    }

    const result = await execute(
      'UPDATE classrooms SET name = ?, updated_at = NOW() WHERE id = ? AND teacher_id = ?',
      [name, classroomId, teacher.id],
    )

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: 'Section not found' }, { status: 404 })
    }

    const classroom = await getClassroom(classroomId, teacher.id)
    return NextResponse.json({ success: true, message: 'Section renamed', data: classroom })
  } catch (error) {
    return serverError('PATCH', error, 'Failed to rename section')
  }
}
