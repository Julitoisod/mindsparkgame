import { NextResponse }  from 'next/server'
import { query, execute } from '@/lib/db'
import { getSession }     from '@/lib/auth'
import type { SavePayload } from '@/types/game'
import { BADGES } from '@/lib/badges'
import { sendProgressEmail } from '@/lib/email'

/**
 * GET /api/progress?characterId=<id>
 * Returns the latest progress record for a character.
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const characterId = parseInt(searchParams.get('characterId') ?? '0', 10)
  if (!characterId) return NextResponse.json({ success: false, message: 'characterId required' }, { status: 400 })

  // Verify ownership
  const owned = await query<{ id: number }>(
    'SELECT id FROM character_data WHERE id = ? AND user_id = ? LIMIT 1',
    [characterId, session.userId],
  )
  if (!owned.length) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })

  const rows = await query<Record<string, unknown>>(
    `SELECT
       id, user_id AS userId, character_id AS characterId,
       current_zone AS currentZone,
       quest_flags AS questFlags,
       completed_levels AS completedLevels,
       level_stars AS levelStars,
       playtime_seconds AS playtimeSeconds,
       last_saved AS lastSaved,
       created_at, updated_at
     FROM game_progress
     WHERE character_id = ?
     ORDER BY last_saved DESC
     LIMIT 1`,
    [characterId],
  )

  const wallets = await query<{ stars: number }>(
    'SELECT stars FROM student_wallets WHERE user_id = ? LIMIT 1',
    [session.userId],
  )
  const starBalance = Number(wallets[0]?.stars ?? 0)

  // Fetch teacher-granted level unlocks
  const teacherUnlocks = await query<{ level_number: number }>(
    'SELECT level_number FROM teacher_level_unlocks WHERE student_id = ? ORDER BY level_number ASC',
    [session.userId],
  )
  const teacherUnlockedLevels = teacherUnlocks.map(row => row.level_number)

  // Fetch earned badges
  const badgeRows = await query<{ badge_id: string }>(
    'SELECT badge_id FROM student_badges WHERE user_id = ? ORDER BY earned_at ASC',
    [session.userId],
  )
  const earnedBadges = badgeRows.map(row => row.badge_id)

  // Fetch cumulative total score from all quiz attempts
  const scoreRows = await query<{ total_score: number }>(
    'SELECT COALESCE(SUM(score_earned), 0) AS total_score FROM quiz_attempts WHERE user_id = ?',
    [session.userId],
  )
  const totalScore = Number(scoreRows[0]?.total_score ?? 0)

  if (!rows.length) {
    return NextResponse.json({ success: true, message: 'No progress', data: null, meta: { starBalance, totalScore, teacherUnlockedLevels, earnedBadges } })
  }

  // Parse JSON columns stored as TEXT
  const row = rows[0]
  const parsed = {
    ...row,
    questFlags:      safeParseJSON(row.questFlags as string, {}),
    completedLevels: safeParseJSON(row.completedLevels as string, []),
    levelStars:      safeParseJSON(row.levelStars as string, {}),
  }

  return NextResponse.json({ success: true, message: 'OK', data: parsed, meta: { starBalance, totalScore, teacherUnlockedLevels, earnedBadges } })
}

/**
 * POST /api/progress
 * Upserts (save/overwrite) a progress record.
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  let body: SavePayload
  try { body = await request.json() } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
  }

  const {
    characterId, positionX, positionY, positionZ,
    stats, currentZone, questFlags, completedLevels, playtimeSeconds, starsEarned, levelStars,
  } = body

  // Verify ownership
  const owned = await query<{ id: number }>(
    'SELECT id FROM character_data WHERE id = ? AND user_id = ? LIMIT 1',
    [characterId, session.userId],
  )
  if (!owned.length) return NextResponse.json({ success: false, message: 'Character not found' }, { status: 404 })

  // Update character position + stats
  await execute(
    `UPDATE character_data SET
       position_x = ?, position_y = ?, position_z = ?,
       hp = ?, mp = ?, level = ?, experience = ?,
       updated_at = NOW()
     WHERE id = ?`,
    [
      positionX, positionY, positionZ,
      stats.hp, stats.mp, stats.level, stats.experience,
      characterId,
    ],
  )

  const existingProgress = await query<{ questFlags: string | null; levelStars: string | null }>(
    'SELECT quest_flags AS questFlags, level_stars AS levelStars FROM game_progress WHERE character_id = ? LIMIT 1',
    [characterId],
  )
  const mergedQuestFlags = {
    ...safeParseJSON<Record<string, unknown>>(existingProgress[0]?.questFlags ?? null, {}),
    ...(questFlags ?? {}),
  }

  // Merge levelStars: keep existing stars, override with new ones (keep best)
  const existingLevelStars = safeParseJSON<Record<string, number>>(existingProgress[0]?.levelStars ?? null, {})
  const mergedLevelStars: Record<string, number> = { ...existingLevelStars }
  if (levelStars) {
    for (const [lvl, rating] of Object.entries(levelStars)) {
      const existing = mergedLevelStars[lvl] ?? 0
      mergedLevelStars[lvl] = Math.max(existing, rating)
    }
  }

  // Upsert progress
  await execute(
    `INSERT INTO game_progress
       (user_id, character_id, current_zone, quest_flags, completed_levels, level_stars, playtime_seconds, last_saved)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       current_zone     = VALUES(current_zone),
       quest_flags      = VALUES(quest_flags),
       completed_levels = VALUES(completed_levels),
       level_stars      = VALUES(level_stars),
       playtime_seconds = VALUES(playtime_seconds),
       last_saved       = NOW(),
       updated_at       = NOW()`,
    [
      session.userId, characterId,
      currentZone,
      JSON.stringify(mergedQuestFlags),
      JSON.stringify(completedLevels ?? []),
      JSON.stringify(mergedLevelStars),
      playtimeSeconds ?? 0,
    ],
  )

  // Stars are now added in real-time via /api/attempts on each correct answer
  // No need to add them again here to avoid double-counting

  // ── Badge evaluation ──────────────────────────────────────────────────────
  const newBadges: string[] = []
  const completedArray = Array.isArray(completedLevels) ? completedLevels : []

  // first_steps: Complete Level 1
  if (completedArray.includes(1)) {
    newBadges.push('first_steps')
  }

  // math_explorer: Complete Level 3
  if (completedArray.includes(3)) {
    newBadges.push('math_explorer')
  }

  // champion: Complete all 5 levels
  if ([1, 2, 3, 4, 5].every(n => completedArray.includes(n))) {
    newBadges.push('champion')
  }

  // perfect_score: Get 3 stars on any level
  const hasThreeStars = Object.values(mergedLevelStars).some(s => s >= 3)
  if (hasThreeStars) {
    newBadges.push('perfect_score')
  }

  // star_collector: Earn 20+ total stars (from wallet)
  const walletRows = await query<{ stars: number }>(
    'SELECT stars FROM student_wallets WHERE user_id = ? LIMIT 1',
    [session.userId],
  )
  const totalStars = Number(walletRows[0]?.stars ?? 0)
  if (totalStars >= 20) {
    newBadges.push('star_collector')
  }

  // boss_slayer: Defeat 3 bosses (3+ completed levels)
  if (completedArray.length >= 3) {
    newBadges.push('boss_slayer')
  }

  // Insert new badges (INSERT IGNORE to skip duplicates)
  const awardedBadges: string[] = []
  for (const badgeId of newBadges) {
    try {
      const result = await execute(
        'INSERT IGNORE INTO student_badges (user_id, badge_id) VALUES (?, ?)',
        [session.userId, badgeId],
      )
      if (result.affectedRows > 0) {
        awardedBadges.push(badgeId)
      }
    } catch {
      // Skip if duplicate or error
    }
  }

  // Send email to parent if new badges were earned and parent_email is set
  if (awardedBadges.length > 0) {
    const userRows = await query<{ username: string; parent_email: string | null }>(
      'SELECT username, parent_email FROM users WHERE id = ? LIMIT 1',
      [session.userId],
    )
    const userRow = userRows[0]
    if (userRow?.parent_email) {
      const allBadgeRows = await query<{ badge_id: string }>(
        'SELECT badge_id FROM student_badges WHERE user_id = ? ORDER BY earned_at ASC',
        [session.userId],
      )
      const allBadgeIds = allBadgeRows.map(r => r.badge_id)
      const latestBadge = BADGES.find(b => b.id === awardedBadges[0])
      // Fire-and-forget email send
      sendProgressEmail(userRow.parent_email, userRow.username, {
        levelsCompleted: completedArray.length,
        totalLevels: 5,
        starBalance: totalStars,
        badges: allBadgeIds,
        latestAchievement: latestBadge?.name,
      }).catch(err => console.error('[progress] Email send failed:', err))
    }
  }

  return NextResponse.json({ success: true, message: 'Progress saved', newBadges: awardedBadges })
}

function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}
