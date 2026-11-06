/**
 * Server-side badge granting, shared by /api/attempts (mid-game badges) and
 * /api/progress (end-of-level badges). A badge is only ever returned the first
 * time it is earned — INSERT IGNORE + affectedRows — so the game never shows
 * an already-owned badge again (panel revision, Nov 2026).
 */
import { execute, query } from '@/lib/db'
import { CAPSTONE_BADGE_ID, REQUIRED_FOR_CHAMPION } from '@/lib/badges'

/** Stars needed for the Star Collector badge (one star per correct answer). */
export const STAR_COLLECTOR_TARGET = 100

/**
 * Grants each badge the student does not have yet, then the Forest Champion
 * capstone if that completed the set. Returns only the badges that are NEW.
 */
export async function awardBadges(userId: number, badgeIds: string[]): Promise<string[]> {
  const awarded: string[] = []
  for (const badgeId of badgeIds) {
    const result = await execute(
      'INSERT IGNORE INTO student_badges (user_id, badge_id) VALUES (?, ?)',
      [userId, badgeId],
    )
    if (result.affectedRows > 0) awarded.push(badgeId)
  }

  const owned = await query<{ badge_id: string }>(
    'SELECT badge_id FROM student_badges WHERE user_id = ?',
    [userId],
  )
  const ownedSet = new Set(owned.map(row => row.badge_id))
  if (!ownedSet.has(CAPSTONE_BADGE_ID) && REQUIRED_FOR_CHAMPION.every(id => ownedSet.has(id))) {
    const result = await execute(
      'INSERT IGNORE INTO student_badges (user_id, badge_id) VALUES (?, ?)',
      [userId, CAPSTONE_BADGE_ID],
    )
    if (result.affectedRows > 0) awarded.push(CAPSTONE_BADGE_ID)
  }
  return awarded
}

/** Lifetime stars collected = correct answers (the wallet can be spent, this can't). */
export async function starsCollected(userId: number): Promise<number> {
  const rows = await query<{ collected: number }>(
    'SELECT COUNT(*) AS collected FROM quiz_attempts WHERE user_id = ? AND is_correct = 1',
    [userId],
  )
  return Number(rows[0]?.collected ?? 0)
}
