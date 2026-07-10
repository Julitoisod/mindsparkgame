// Official storyline (panel-approved). The Forest Guardian narrates:
// an overall welcome shown once (first time Level 1 is started), a
// "before the quiz" intro per level, and an "after the boss" beat that
// awards one of the five Forest Trophies.

export interface LevelStory {
  level: number
  place: string
  enemy: string
  /** Level heading emoji from the script (🌲 🐂 👻 💀 🔮). */
  emoji: string
  /** Forest Guardian's "Before the Quiz" speech. */
  intro: string
  /** Forest Guardian's "After the Boss" congratulation (trophy named separately). */
  afterBoss: string
  /** The Forest Trophy earned for clearing the level. */
  trophyName: string
}

/** Shown once — the first time the student starts Level 1. */
export const overallStory = {
  speaker: 'Forest Guardian',
  text:
    'Welcome, brave hero! The Enchanted Forest has been taken over by powerful guardians who have been corrupted by dark magic. To restore peace, you must complete math challenges to strengthen your skills before facing each guardian. Defeat every guardian, collect all five Forest Trophies, and become the Forest Hero.',
} as const

export const levelStories: readonly LevelStory[] = [
  {
    level: 1,
    place: 'Forest Gate',
    enemy: 'Golem',
    emoji: '🌲',
    intro:
      "The Golem is blocking the entrance to the Enchanted Forest. To challenge the Golem, you must first complete five math questions. Each correct answer strengthens your hero for the battle ahead. Once you're ready, defeat the Golem and earn your first Forest Trophy.",
    afterBoss: 'Congratulations! You defeated the Golem and cleared the forest entrance.',
    trophyName: 'Forest Explorer Trophy',
  },
  {
    level: 2,
    place: 'Crystal Bridge',
    enemy: 'Minotaur',
    emoji: '🐂',
    intro:
      'The Minotaur is guarding the next path through the forest. Complete the five math questions to prepare your hero for battle. Defeat the Minotaur to continue your journey and earn another Forest Trophy.',
    afterBoss: 'Excellent! The Minotaur has been defeated, and the forest path is safe once again.',
    trophyName: 'Forest Path Trophy',
  },
  {
    level: 3,
    place: 'Elven Ruins',
    enemy: 'Wraith',
    emoji: '👻',
    intro:
      'A powerful Wraith has covered this part of the forest with darkness. Answer the five math questions to gather the strength needed for the battle. Defeat the Wraith to restore light to the forest.',
    afterBoss: 'Well done! The darkness has disappeared.',
    trophyName: 'Light of the Forest Trophy',
  },
  {
    level: 4,
    place: 'Moonlit Keep',
    enemy: 'Necromancer',
    emoji: '💀',
    intro:
      'The Necromancer has spread dark magic across the forest. Complete the five math questions to prepare for the battle. Defeat the Necromancer to protect the forest and earn another Forest Trophy.',
    afterBoss: 'Amazing! The dark magic has been lifted from the forest.',
    trophyName: 'Forest Guardian Trophy',
  },
  {
    level: 5,
    place: 'Oracle Tower',
    enemy: 'Dark Oracle',
    emoji: '🔮',
    intro:
      'The Dark Oracle is the source of the darkness in the Enchanted Forest. Complete the final five math questions to prepare for your greatest challenge. Defeat the Dark Oracle and restore peace to the forest.',
    afterBoss: 'Congratulations, Hero! You defeated the Dark Oracle and restored peace to the Enchanted Forest.',
    trophyName: 'Forest Hero Trophy',
  },
] as const

export function getLevelStory(levelNumber: number): LevelStory {
  return levelStories[levelNumber - 1] ?? levelStories[0]
}
