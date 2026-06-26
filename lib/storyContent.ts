// Narrative shown before each level and on the rescue/level-complete beat (reqs #9, #17).
// Keys are collected one per level; each key frees a captured friend.

export interface LevelStory {
  level: number
  place: string
  enemy: string
  /** Short intro shown on the story screen before the quiz begins. */
  intro: string
  /** Who the student frees when they earn this level's key. */
  rescue: string
  /** The key earned for clearing the level. */
  keyName: string
  keyEmoji: string
}

export const levelStories: readonly LevelStory[] = [
  {
    level: 1,
    place: 'Forest Gate',
    enemy: 'Root Warden',
    intro:
      'The Root Warden has tangled the Forest Gate in thorns and caged the Forest Sprite. Answer the first 5 questions to power up your courage — then face the Warden to set the Sprite free!',
    rescue: 'the Forest Sprite',
    keyName: 'Emerald Key',
    keyEmoji: '🟢',
  },
  {
    level: 2,
    place: 'Crystal Bridge',
    enemy: 'Rune Knight',
    intro:
      'The Rune Knight guards the Crystal Bridge and has chained the Bridge Keeper. Solve the first 5 challenges to charge your blade — then duel the Knight to free the Keeper!',
    rescue: 'the Bridge Keeper',
    keyName: 'Sapphire Key',
    keyEmoji: '🔵',
  },
  {
    level: 3,
    place: 'Elven Ruins',
    enemy: 'Mirror Mage',
    intro:
      'The Mirror Mage hides in the Elven Ruins and has trapped the Lost Elf in a mirror. Master the first 5 puzzles to sharpen your focus — then break the Mage to release the Elf!',
    rescue: 'the Lost Elf',
    keyName: 'Amethyst Key',
    keyEmoji: '🟣',
  },
  {
    level: 4,
    place: 'Moonlit Keep',
    enemy: 'Storm Captain',
    intro:
      'The Storm Captain rules the Moonlit Keep and has locked away the Moon Child. Clear the first 5 trials to steady your aim — then defeat the Captain to rescue the Child!',
    rescue: 'the Moon Child',
    keyName: 'Topaz Key',
    keyEmoji: '🟡',
  },
  {
    level: 5,
    place: 'Oracle Tower',
    enemy: 'Dark Oracle',
    intro:
      'The Dark Oracle waits atop the Oracle Tower, holding the Star Guardian captive. Conquer the first 5 questions to unlock your full power — then face the Oracle and save the Guardian!',
    rescue: 'the Star Guardian',
    keyName: 'Diamond Key',
    keyEmoji: '⚪',
  },
] as const

export function getLevelStory(levelNumber: number): LevelStory {
  return levelStories[levelNumber - 1] ?? levelStories[0]
}
