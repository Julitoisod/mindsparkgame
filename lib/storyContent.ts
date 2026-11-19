// The overall storyline — "The Legend of the Five Math Crystals" (panel
// revision, Nov 2026b, REVISIONSS.pdf). Spark narrates: an opening cinematic
// after every sign-in (components/game/OpeningCinematic.tsx), a "before the
// quiz" intro per kingdom, and an "after the boss" beat as each crystal comes
// home — so every level continues the same story. The five Forest Trophies
// (final artwork) are still the per-level reward.

export interface LevelStory {
  level: number
  /** The kingdom this level takes place in. */
  place: string
  /** The monster guardian fought in the boss battle. */
  enemy: string
  /** The Math Crystal the guardian holds. */
  crystal: string
  /** Crystal colour, for the gem drawn on screen. */
  crystalColor: string
  /** Spark's "Before the Quiz" speech. */
  intro: string
  /** Spark's "After the Boss" line (trophy named separately). */
  afterBoss: string
  /** The trophy earned for defeating the guardian. */
  trophyName: string
  /** Public path to the trophy artwork. */
  trophyImage: string
}

export const NARRATOR = 'Spark'
export const WORLD = 'Mathoria'

export interface CinematicScene {
  title: string
  line: string
}

/** The opening cinematic, word for word from the panel's script. */
export const openingScenes: readonly CinematicScene[] = [
  { title: 'The Magical World', line: 'Hello there, brave Math Hero! Welcome to Mathoria, a magical world where numbers hold incredible powers!' },
  { title: 'The Darkness Arrives', line: 'But one day, a mysterious villain named Lord Numerox stole the Five Magic Math Crystals! Without their powers, the Five Kingdoms began to lose their magic!' },
  { title: 'The Chosen Hero', line: 'Now, Mathoria needs a hero! And guess what? That hero is YOU!' },
  { title: 'The Five Kingdoms', line: 'Your journey will take you through five incredible kingdoms! Face Thornfang in the Multiplication Forest, Sandrox in the Division Desert, Captain Splitfin in the Fraction Ocean, Rockmaw in Shape Mountain, and Mirrorclaw in the Symmetry Castle!' },
  { title: 'The Mission', line: 'Use your mathematical powers, solve exciting challenges, and defeat the monster guardians to recover every crystal!' },
  { title: 'The Adventure Begins', line: "Are you ready, brave Math Hero? Let's save Mathoria together!" },
] as const

export const levelStories: readonly LevelStory[] = [
  {
    level: 1,
    place: 'Multiplication Forest',
    enemy: 'Thornfang',
    crystal: 'Emerald Crystal',
    crystalColor: '#34d399',
    intro:
      'Welcome to the Multiplication Forest, hero! Thornfang, the thorny guardian, is hiding the Emerald Crystal deep in these woods. Answer five math questions to power up, then defeat Thornfang in the boss battle to win back the first crystal!',
    afterBoss: 'You did it! Thornfang is defeated and the Emerald Crystal shines again. Next stop: the Division Desert!',
    trophyName: 'Forest Explorer Trophy',
    trophyImage: '/rewards/trophies/forest_explorer.png',
  },
  {
    level: 2,
    place: 'Division Desert',
    enemy: 'Sandrox',
    crystal: 'Amber Crystal',
    crystalColor: '#fbbf24',
    intro:
      'The Emerald Crystal lights our way to the Division Desert. Sandrox, the sand beast, guards the Amber Crystal beneath the dunes. Complete five math questions to get ready, then defeat Sandrox to recover the second crystal!',
    afterBoss: 'Great work! Sandrox is defeated and the Amber Crystal is ours. The Fraction Ocean is waiting!',
    trophyName: 'Pathfinder Trophy',
    trophyImage: '/rewards/trophies/pathfinder.png',
  },
  {
    level: 3,
    place: 'Fraction Ocean',
    enemy: 'Captain Splitfin',
    crystal: 'Sapphire Crystal',
    crystalColor: '#60a5fa',
    intro:
      'Two crystals recovered! Now we sail into the Fraction Ocean, where the ghostly Captain Splitfin hides the Sapphire Crystal. Answer five math questions to gather your strength, then defeat him to claim the third crystal!',
    afterBoss: 'Well done! Captain Splitfin sinks away and the Sapphire Crystal sparkles again. On to Shape Mountain!',
    trophyName: 'Lightkeeper Trophy',
    trophyImage: '/rewards/trophies/lightkeeper.png',
  },
  {
    level: 4,
    place: 'Shape Mountain',
    enemy: 'Rockmaw',
    crystal: 'Ruby Crystal',
    crystalColor: '#f87171',
    intro:
      'Three crystals are glowing in your bag! High on Shape Mountain, Rockmaw guards the Ruby Crystal. Complete five math questions to prepare, then defeat Rockmaw to win the fourth crystal!',
    afterBoss: 'Amazing! Rockmaw has fallen and the Ruby Crystal is safe. Only the Symmetry Castle is left!',
    trophyName: 'Nature Guardian Trophy',
    trophyImage: '/rewards/trophies/nature_guardian.png',
  },
  {
    level: 5,
    place: 'Symmetry Castle',
    enemy: 'Mirrorclaw',
    crystal: 'Amethyst Crystal',
    crystalColor: '#c084fc',
    intro:
      "This is it, hero! Mirrorclaw, Lord Numerox's strongest guardian, holds the last crystal — the Amethyst Crystal — inside the Symmetry Castle. Answer the final five math questions, then defeat Mirrorclaw to bring all five crystals home!",
    afterBoss: "Hooray! Mirrorclaw is defeated and all five Math Crystals are back. Lord Numerox's darkness is gone — you saved Mathoria!",
    trophyName: 'Forest Hero Trophy',
    trophyImage: '/rewards/trophies/forest_hero.png',
  },
] as const

export function getLevelStory(levelNumber: number): LevelStory {
  return levelStories[levelNumber - 1] ?? levelStories[0]
}
