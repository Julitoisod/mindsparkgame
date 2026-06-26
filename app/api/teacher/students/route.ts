  import { NextResponse } from 'next/server'
  import { execute, query } from '@/lib/db'
  import { getSession, hashPassword } from '@/lib/auth'
  import type { EnrollmentStatus, User } from '@/types/user'

  interface StudentRow {
    id: number
    username: string
    fullName: string | null
    email: string
    role: 'student'
    enrollmentStatus: EnrollmentStatus
    classroomId: number | null
    classroomName: string | null
    avatar_url: string | null
    enrolledAt: string | null
    created_at: string
    completedLevels: string | null
    stars: number | null
    currentLevel: number | null
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

  function safeParseJSON<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback
    try { return JSON.parse(raw) as T } catch { return fallback }
  }

  function publicStudent(row: StudentRow) {
    const completedLevels = safeParseJSON<number[]>(row.completedLevels, [])
    const levelsCompleted = completedLevels.length
    const totalLevels = 5
    const starBalance = Number(row.stars ?? 0)
    const currentLevel = Number(row.currentLevel ?? 1)

    // No color indicator for newly enrolled students who haven't played yet.
    // Color appears only after they start playing (have at least 1 attempt).
    let performanceColor: 'none' | 'green' | 'yellow' | 'red'
    if (levelsCompleted === 0 && currentLevel === 1 && starBalance === 0) {
      performanceColor = 'none'
    } else if (levelsCompleted >= 3) {
      performanceColor = 'green'
    } else if (levelsCompleted >= 1) {
      performanceColor = 'yellow'
    } else {
      performanceColor = 'red'
    }

    return {
      id: row.id,
      username: row.username,
      fullName: row.fullName,
      email: row.email,
      role: row.role,
      enrollmentStatus: row.enrollmentStatus,
      classroomId: row.classroomId,
      classroomName: row.classroomName,
      avatar_url: row.avatar_url,
      created_at: row.created_at,
      enrolledAt: row.enrolledAt,
      progress: {
        levelsCompleted,
        totalLevels,
        completedLevels,
        starBalance,
        currentLevel,
        performanceColor,
      },
    }
  }

  async function teacherOwnsClassroom(classroomId: number, teacherId: number) {
    const rows = await query<{ id: number }>(
      'SELECT id FROM classrooms WHERE id = ? AND teacher_id = ? LIMIT 1',
      [classroomId, teacherId],
    )

    return rows.length > 0
  }

  export async function GET(request: Request) {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const classroomIdParam = searchParams.get('classroomId')
    const params: number[] = [teacher.id]
    let classroomFilter = ''

    if (classroomIdParam) {
      const classroomId = Number(classroomIdParam)
      if (!Number.isInteger(classroomId) || classroomId <= 0) {
        return NextResponse.json({ success: false, message: 'Invalid section ID' }, { status: 400 })
      }
      if (!(await teacherOwnsClassroom(classroomId, teacher.id))) {
        return NextResponse.json({ success: false, message: 'Section not found' }, { status: 404 })
      }
      classroomFilter = 'AND u.classroom_id = ?'
      params.push(classroomId)
    }

    const rows = await query<StudentRow>(
      `SELECT
        u.id,
        u.username,
        u.full_name AS fullName,
        u.email,
        u.role,
        u.enrollment_status AS enrollmentStatus,
        u.classroom_id AS classroomId,
        c.name AS classroomName,
        u.avatar_url,
        u.enrolled_at AS enrolledAt,
        u.created_at,
        gp.completed_levels AS completedLevels,
        sw.stars,
        cd.level AS currentLevel
      FROM users u
      LEFT JOIN classrooms c ON c.id = u.classroom_id
      LEFT JOIN game_progress gp ON gp.user_id = u.id
      LEFT JOIN student_wallets sw ON sw.user_id = u.id
      LEFT JOIN character_data cd ON cd.user_id = u.id
      WHERE u.role = 'student' AND u.enrolled_by = ?
        ${classroomFilter}
      GROUP BY u.id
      ORDER BY c.name ASC, u.created_at DESC`,
      params,
    )

    // Fetch teacher-granted level unlocks for all students
    const studentIds = rows.map(r => r.id)
    const unlockMap: Record<number, number[]> = {}
    const quizScoreMap: Record<number, { levelNumber: number; totalAttempts: number; correctAttempts: number; totalScore: number; lastAttempt: string }[]> = {}

    if (studentIds.length > 0) {
      const placeholders = studentIds.map(() => '?').join(',')
      const unlockRows = await query<{ student_id: number; level_number: number }>(
        `SELECT student_id, level_number FROM teacher_level_unlocks WHERE student_id IN (${placeholders}) ORDER BY level_number ASC`,
        studentIds,
      )
      for (const row of unlockRows) {
        if (!unlockMap[row.student_id]) unlockMap[row.student_id] = []
        unlockMap[row.student_id].push(row.level_number)
      }

      // Fetch quiz score summaries per student per level
      const scoreRows = await query<{
        user_id: number
        level_number: number
        total_attempts: number
        correct_attempts: number
        total_score: number
        last_attempt: string
      }>(
        `SELECT
           user_id,
           level_number,
           COUNT(*) AS total_attempts,
           SUM(is_correct) AS correct_attempts,
           SUM(score_earned) AS total_score,
           MAX(attempted_at) AS last_attempt
         FROM quiz_attempts
         WHERE user_id IN (${placeholders})
         GROUP BY user_id, level_number
         ORDER BY user_id, level_number`,
        studentIds,
      )
      for (const row of scoreRows) {
        if (!quizScoreMap[row.user_id]) quizScoreMap[row.user_id] = []
        quizScoreMap[row.user_id].push({
          levelNumber: row.level_number,
          totalAttempts: Number(row.total_attempts),
          correctAttempts: Number(row.correct_attempts),
          totalScore: Number(row.total_score),
          lastAttempt: row.last_attempt,
        })
      }
    }

    return NextResponse.json({ success: true, message: 'OK', data: rows.map(row => ({ ...publicStudent(row), teacherUnlockedLevels: unlockMap[row.id] ?? [], quizScores: quizScoreMap[row.id] ?? [] })) })
  }

  export async function POST(request: Request) {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
    }

    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const classroomId = typeof body.classroomId === 'number' ? body.classroomId : Number(body.classroomId)

    const errors: Record<string, string> = {}
    if (!Number.isInteger(classroomId) || classroomId <= 0) {
      errors.classroomId = 'Create and select a section before enrolling students.'
    }
    if (username.length < 3 || username.length > 32 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username = 'Username must be 3-32 letters, numbers, or underscores.'
    }
    if (fullName.length > 120) {
      errors.fullName = 'Full name is too long.'
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      errors.password = 'Password must be at least 8 characters and include a letter and a number.'
    }
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, message: 'Validation failed', data: errors }, { status: 422 })
    }

    if (!(await teacherOwnsClassroom(classroomId, teacher.id))) {
      return NextResponse.json({ success: false, message: 'Section not found' }, { status: 404 })
    }

    // Internal placeholder email (students no longer provide one)
    const email = `${username.toLowerCase()}@student.mindspark`

    const existing = await query<Pick<User, 'id'>>(
      'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
      [email, username],
    )
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: 'Username already in use' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const result = await execute(
      `INSERT INTO users
        (username, full_name, email, password_hash, role, enrollment_status, enrolled_by, classroom_id, enrolled_at)
      VALUES (?, ?, ?, ?, 'student', 'enrolled', ?, ?, NOW())`,
      [username, fullName || null, email, passwordHash, teacher.id, classroomId],
    )

    const rows = await query<StudentRow>(
      `SELECT
        u.id,
        u.username,
        u.full_name AS fullName,
        u.email,
        u.role,
        u.enrollment_status AS enrollmentStatus,
        u.classroom_id AS classroomId,
        c.name AS classroomName,
        u.avatar_url,
        u.enrolled_at AS enrolledAt,
        u.created_at,
        NULL AS completedLevels,
        0 AS stars,
        1 AS currentLevel
      FROM users u
      LEFT JOIN classrooms c ON c.id = u.classroom_id
      WHERE u.id = ?
      LIMIT 1`,
      [result.insertId],
    )

    return NextResponse.json(
      { success: true, message: 'Student enrolled', data: { ...publicStudent(rows[0]), teacherUnlockedLevels: [] } },
      { status: 201 },
    )
  }
