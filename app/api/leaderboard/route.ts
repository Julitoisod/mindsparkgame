/**
 * Student leaderboard (2026-10b revision, item 7).
 *
 * GET /api/leaderboard
 * Ranks students by the points they have earned in the game, and marks the row
 * belonging to whoever is asking so the app can highlight it.
 *
 * Points come from quiz_attempts.score_earned — the same number the game shows
 * during play — so the ranking updates itself as students play.
 */
import { NextResponse } from 'next/server'
import { describeDbError, query } from '@/lib/db'
import { getSession } from '@/lib/auth'

const TOP_N = 50

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await query<{
      id: number
      username: string
      fullName: string | null
      section: string | null
      totalPoints: number
      levelsCleared: number
    }>(
      `SELECT
         u.id,
         u.username,
         u.full_name AS fullName,
         c.name AS section,
         COALESCE(SUM(qa.score_earned), 0) AS totalPoints,
         COUNT(DISTINCT CASE WHEN qa.is_correct = 1 THEN qa.level_number END) AS levelsCleared
       FROM users u
       LEFT JOIN classrooms c ON c.id = u.classroom_id
       LEFT JOIN quiz_attempts qa ON qa.user_id = u.id
       WHERE u.role = 'student'
       GROUP BY u.id
       ORDER BY totalPoints DESC, u.username ASC
       LIMIT ${TOP_N}`,
    )

    const data = rows.map((row, index) => ({
      rank: index + 1,
      id: row.id,
      username: row.username,
      name: row.fullName ?? row.username,
      section: row.section,
      totalPoints: Number(row.totalPoints ?? 0),
      levelsCleared: Number(row.levelsCleared ?? 0),
      isMe: row.id === session.userId,
    }))

    // If the viewer is outside the top N, send their own standing along so the
    // app can still show them where they are.
    let me = data.find(r => r.isMe) ?? null
    if (!me) {
      const mine = await query<{ totalPoints: number; rankAbove: number; username: string; fullName: string | null; section: string | null }>(
        `SELECT
           COALESCE(SUM(qa.score_earned), 0) AS totalPoints,
           u.username,
           u.full_name AS fullName,
           c.name AS section,
           (SELECT COUNT(*) FROM (
              SELECT other.id, COALESCE(SUM(oa.score_earned), 0) AS pts
                FROM users other
                LEFT JOIN quiz_attempts oa ON oa.user_id = other.id
               WHERE other.role = 'student'
               GROUP BY other.id
            ) ranked WHERE ranked.pts > COALESCE(SUM(qa.score_earned), 0)) AS rankAbove
         FROM users u
         LEFT JOIN classrooms c ON c.id = u.classroom_id
         LEFT JOIN quiz_attempts qa ON qa.user_id = u.id
         WHERE u.id = ?
         GROUP BY u.id`,
        [session.userId],
      )
      if (mine.length) {
        me = {
          rank: Number(mine[0].rankAbove ?? 0) + 1,
          id: session.userId,
          username: mine[0].username,
          name: mine[0].fullName ?? mine[0].username,
          section: mine[0].section,
          totalPoints: Number(mine[0].totalPoints ?? 0),
          levelsCleared: 0,
          isMe: true,
        }
      }
    }

    return NextResponse.json({ success: true, data: { rows: data, me } })
  } catch (error) {
    console.error('[leaderboard] GET', error)
    return NextResponse.json(
      { success: false, message: describeDbError(error, 'Could not load the leaderboard') },
      { status: 500 },
    )
  }
}
