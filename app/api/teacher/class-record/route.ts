/**
 * Teacher — electronic class record (2026-10b revision, item 4).
 *
 * GET /api/teacher/class-record[?classroomId=N]
 *
 * One row per enrolled student: their score for each level L1–L5, a breakdown
 * by question category, and a total — the shape of a paper class record.
 *
 * A level's score is the student's BEST single run (10 questions), not the sum
 * of every retry, so retaking a level cannot inflate the record.
 */
import { NextResponse } from 'next/server'
import { describeDbError, query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import type { User } from '@/types/user'

const MAX_LEVEL = 5
const QUESTIONS_PER_LEVEL = 10

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

export async function GET(request: Request) {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const classroomId = Number(searchParams.get('classroomId')) || null

  try {
    const studentParams: (number | string)[] = [teacher.id]
    let classroomFilter = ''
    if (classroomId) {
      classroomFilter = 'AND u.classroom_id = ?'
      studentParams.push(classroomId)
    }

    const students = await query<{
      id: number
      username: string
      fullName: string | null
      classroomName: string | null
    }>(
      `SELECT u.id, u.username, u.full_name AS fullName, c.name AS classroomName
         FROM users u
         LEFT JOIN classrooms c ON c.id = u.classroom_id
        WHERE u.role = 'student' AND u.enrolled_by = ? ${classroomFilter}
        ORDER BY COALESCE(u.last_name, u.full_name, u.username), u.first_name`,
      studentParams,
    )

    if (students.length === 0) {
      return NextResponse.json({ success: true, data: { students: [], categories: [] } })
    }

    const ids = students.map(s => s.id)
    const placeholders = ids.map(() => '?').join(',')

    // Best run per level: group attempts into 10-minute sessions (same rule the
    // attempts report uses), then keep each student's strongest session.
    const levelRows = await query<{ user_id: number; level_number: number; best: number; attempts: number }>(
      `SELECT user_id, level_number, MAX(correct_in_session) AS best, SUM(asked_in_session) AS attempts
         FROM (
           SELECT user_id,
                  level_number,
                  SUM(is_correct) AS correct_in_session,
                  COUNT(*)        AS asked_in_session
             FROM quiz_attempts
            WHERE user_id IN (${placeholders})
            GROUP BY user_id, level_number, FLOOR(UNIX_TIMESTAMP(attempted_at) / 600)
         ) sessions
        GROUP BY user_id, level_number`,
      ids,
    )

    // Category breakdown: how many of that category's questions the student has
    // answered correctly overall.
    const categoryRows = await query<{ user_id: number; category: string; correct: number; asked: number }>(
      `SELECT qa.user_id,
              COALESCE(qq.category, 'Uncategorized') AS category,
              SUM(qa.is_correct) AS correct,
              COUNT(*)           AS asked
         FROM quiz_attempts qa
         LEFT JOIN quiz_questions qq ON CAST(qq.id AS CHAR) = qa.question_id
        WHERE qa.user_id IN (${placeholders})
        GROUP BY qa.user_id, COALESCE(qq.category, 'Uncategorized')`,
      ids,
    )

    const categories = Array.from(new Set(categoryRows.map(r => r.category))).sort()

    const data = students.map(s => {
      const levels: Record<number, { score: number; attempts: number }> = {}
      for (let level = 1; level <= MAX_LEVEL; level++) levels[level] = { score: 0, attempts: 0 }
      for (const row of levelRows.filter(r => r.user_id === s.id)) {
        if (row.level_number >= 1 && row.level_number <= MAX_LEVEL) {
          // A level is 10 questions (5 quiz + 5 boss), so a session can never
          // legitimately score higher — cap it so odd data cannot inflate a record.
          levels[row.level_number] = {
            score: Math.min(Number(row.best ?? 0), QUESTIONS_PER_LEVEL),
            attempts: Number(row.attempts ?? 0),
          }
        }
      }

      const byCategory: Record<string, { correct: number; asked: number }> = {}
      for (const row of categoryRows.filter(r => r.user_id === s.id)) {
        byCategory[row.category] = { correct: Number(row.correct ?? 0), asked: Number(row.asked ?? 0) }
      }

      const total = Object.values(levels).reduce((sum, l) => sum + l.score, 0)
      return {
        id: s.id,
        name: s.fullName ?? s.username,
        username: s.username,
        section: s.classroomName,
        levels,
        categories: byCategory,
        total,
      }
    })

    return NextResponse.json({ success: true, data: { students: data, categories } })
  } catch (error) {
    console.error('[teacher/class-record] GET', error)
    return NextResponse.json(
      { success: false, message: describeDbError(error, 'Could not build the class record') },
      { status: 500 },
    )
  }
}
