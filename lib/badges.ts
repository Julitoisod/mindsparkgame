export type Badge = {
  id: string
  name: string
  description: string
  /** Public path to the badge artwork. */
  image: string
}

// Final badge set (panel-approved, July 2026). Custom artwork lives in
// /public/rewards/badges — the panel asked for no emojis / no placeholder icons.
export const BADGES: Badge[] = [
  { id: 'first_victory',   name: 'First Victory',   description: 'Complete your first level',              image: '/rewards/badges/first_victory.png' },
  { id: 'perfect_score',   name: 'Perfect Score',   description: 'Get 10/10 in any level',                 image: '/rewards/badges/perfect_score.png' },
  { id: 'boss_slayer',     name: 'Boss Slayer',     description: 'Defeat your first boss',                 image: '/rewards/badges/boss_slayer.png' },
  { id: 'math_streak',     name: 'Math Streak',     description: 'Answer 5 questions correctly in a row',  image: '/rewards/badges/math_streak.png' },
  { id: 'star_collector',  name: 'Star Collector',  description: 'Earn 100 stars',                         image: '/rewards/badges/star_collector.png' },
  { id: 'forest_explorer', name: 'Forest Explorer', description: 'Complete all 5 levels',                  image: '/rewards/badges/forest_explorer.png' },
  { id: 'forest_champion', name: 'Forest Champion', description: 'Earn all other badges in the game',      image: '/rewards/badges/forest_champion.png' },
]

/** The capstone badge — awarded only once every other badge is earned. */
export const CAPSTONE_BADGE_ID = 'forest_champion'

/** Every badge that must be earned before the capstone unlocks. */
export const REQUIRED_FOR_CHAMPION = BADGES.filter(b => b.id !== CAPSTONE_BADGE_ID).map(b => b.id)

export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id)
}
