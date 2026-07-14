import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { getSession } from '@/lib/auth'

/**
 * POST /api/attempts
 * Records an individual quiz attempt (fire-and-forget from the game).
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
  }

  const characterId = Number(body.characterId)
  const levelNumber = Number(body.levelNumber)
  const phase = body.phase as string
  const questionId = String(body.questionId ?? '')
  const selectedAnswer = String(body.selectedAnswer ?? '')
  const isCorrect = body.isCorrect ? 1 : 0
  const heartsRemaining = Number(body.heartsRemaining ?? 5)
  const scoreEarned = Number(body.scoreEarned ?? 0)

  if (!characterId || !levelNumber || !['normal', 'boss'].includes(phase) || !questionId) {
    return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
  }

  // Verify character ownership
  const owned = await query<{ id: number }>(
    'SELECT id FROM character_data WHERE id = ? AND user_id = ? LIMIT 1',
    [characterId, session.userId],
  )
  if (!owned.length) {
    return NextResponse.json({ success: false, message: 'Character not found' }, { status: 404 })
  }

  await execute(
    `INSERT INTO quiz_attempts
       (user_id, character_id, level_number, phase, question_id, selected_answer, is_correct, hearts_remaining, score_earned)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [session.userId, characterId, levelNumber, phase, questionId, selectedAnswer, isCorrect, heartsRemaining, scoreEarned],
  )

  // Update star wallet and score in real-time for correct answers
  if (isCorrect && scoreEarned > 0) {
    await execute(
      `INSERT INTO student_wallets (user_id, stars)
       VALUES (?, 1)
       ON DUPLICATE KEY UPDATE
         stars = stars + 1,
         updated_at = NOW()`,
      [session.userId],
    )
  }

  // math_streak badge: 5 correct answers in a row (quiz + boss combined)
  const newBadges: string[] = []
  if (isCorrect) {
    const recent = await query<{ is_correct: number }>(
      'SELECT is_correct FROM quiz_attempts WHERE user_id = ? ORDER BY id DESC LIMIT 5',
      [session.userId],
    )
    if (recent.length === 5 && recent.every(row => Number(row.is_correct) === 1)) {
      const awarded = await execute(
        'INSERT IGNORE INTO student_badges (user_id, badge_id) VALUES (?, ?)',
        [session.userId, 'math_streak'],
      )
      if (awarded.affectedRows > 0) newBadges.push('math_streak')
    }
  }

  return NextResponse.json({ success: true, message: 'Attempt recorded', newBadges })
}

/**
 * GET /api/attempts?characterId=X&levelNumber=Y
 * Fetches attempt history for a character, optionally filtered by level.
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const characterId = parseInt(searchParams.get('characterId') ?? '0', 10)
  if (!characterId) {
    return NextResponse.json({ success: false, message: 'characterId required' }, { status: 400 })
  }

  // Verify character ownership
  const owned = await query<{ id: number }>(
    'SELECT id FROM character_data WHERE id = ? AND user_id = ? LIMIT 1',
    [characterId, session.userId],
  )
  if (!owned.length) {
    return NextResponse.json({ success: false, message: 'Character not found' }, { status: 404 })
  }

  const levelNumber = searchParams.get('levelNumber')
  let sql = `SELECT id, level_number AS levelNumber, phase, question_id AS questionId,
                    selected_answer AS selectedAnswer, is_correct AS isCorrect,
                    hearts_remaining AS heartsRemaining, score_earned AS scoreEarned,
                    attempted_at AS attemptedAt
             FROM quiz_attempts
             WHERE character_id = ?`
  const params: (string | number)[] = [characterId]

  if (levelNumber) {
    sql += ' AND level_number = ?'
    params.push(Number(levelNumber))
  }

  sql += ' ORDER BY attempted_at DESC LIMIT 200'

  const rows = await query<Record<string, unknown>>(sql, params)

  return NextResponse.json({ success: true, data: rows })
}
