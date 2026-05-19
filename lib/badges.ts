export type Badge = {
  id: string
  name: string
  description: string
  icon: string
}

export const BADGES: Badge[] = [
  { id: 'first_steps', name: 'First Steps', description: 'Complete Level 1', icon: '🏁' },
  { id: 'math_explorer', name: 'Math Explorer', description: 'Complete Level 3', icon: '🧭' },
  { id: 'champion', name: 'Champion', description: 'Complete all 5 levels', icon: '🏆' },
  { id: 'perfect_score', name: 'Perfect Score', description: 'Get 3 stars on any level', icon: '⭐' },
  { id: 'star_collector', name: 'Star Collector', description: 'Earn 20+ total stars', icon: '🌟' },
  { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat 3 bosses', icon: '⚔️' },
]

export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id)
}
