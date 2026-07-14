import type { LucideIcon } from 'lucide-react'
import { BookOpen, Flame, Medal, Star, Swords, Target, TreePine, Trophy } from 'lucide-react'

export type Badge = {
  id: string
  name: string
  description: string
  icon: LucideIcon
}

// Badge set from the panel-approved revision table (June 2026).
// Icons are lucide components — the panel asked for no emojis anywhere.
export const BADGES: Badge[] = [
  { id: 'first_victory', name: 'First Victory', description: 'Complete your first level', icon: Star },
  { id: 'perfect_score', name: 'Perfect Score', description: 'Score 10/10 in any level', icon: Target },
  { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat your first boss', icon: Swords },
  { id: 'math_streak', name: 'Math Streak', description: 'Answer 5 questions correctly in a row', icon: Flame },
  { id: 'forest_champion', name: 'Forest Champion', description: 'Complete all 5 levels', icon: Trophy },
  { id: 'star_collector', name: 'Star Collector', description: 'Collect 100 stars', icon: Medal },
  { id: 'dedicated_learner', name: 'Dedicated Learner', description: 'Replay any level 3 times', icon: BookOpen },
  { id: 'forest_explorer', name: 'Forest Explorer', description: 'Complete every level at least once', icon: TreePine },
]

export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id)
}
