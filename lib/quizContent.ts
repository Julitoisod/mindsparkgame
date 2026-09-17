import m5 from "./m5Questions.json"

export interface QuizQuestion {
  id: string
  prompt: string
  options: readonly string[]
  correctOptionIndex: number
}

export interface QuizLevel {
  id: number
  title: string
  environmentImagePath: string
  bossImagePath: string
  avatarImagePath: string
  normalQuestions: readonly QuizQuestion[]
  bossQuestions: readonly QuizQuestion[]
}

export const quizAssetReport = {
  sourceDocumentPath: "/QUIZZES 1-5.docx",
  environmentImagePaths: [
    "/BACKGROUND FOREST 1/FOREST 1/2304x1296.png",
    "/BACKGROUND FOREST 1/FOREST 2/2304x1296.png",
    "/BACKGROUND FOREST 1/FOREST 3/2304x1296.png",
    "/BACKGROUND FOREST 1/FOREST 4/2304x1296.png",
    "/BACKGROUND FOREST 1/FOREST 5/2304x1296.png",
  ],
  bossImagePaths: [
    "/AVATAR CHARACTERS/BOSS CHARACTER 5/FOREST GOLEM (LEVEL 1)/Golem_1/PNG/PNG Sequences/Idle/0_Golem_Idle_000.png",
    "/AVATAR CHARACTERS/BOSS CHARACTER 5/Minotaur_1 (LEVEL 2)/PNG/PNG Sequences/Idle/0_Minotaur_Idle_000.png",
    "/AVATAR CHARACTERS/BOSS CHARACTER 5/WRAIGHT_3 (LEVEL 3)/PNG/Wraith_03 LEVEL 3/PNG Sequences/Idle/Wraith_03_Idle_000.png",
    "/AVATAR CHARACTERS/BOSS CHARACTER 5/Fallen_Angels_3 (LEVEL 4)/PNG/PNG Sequences/Idle/0_Fallen_Angels_Idle_000.png",
    "/AVATAR CHARACTERS/BOSS CHARACTER 5/Dark_Oracle_3 (LEVEL 5)/PNG/PNG Sequences/Idle/0_Dark_Oracle_Idle_000.png",
  ],
  avatarImagePaths: [
    "/AVATAR CHARACTERS/3 AVATAR/2D-KNIGHT BOY CHARACTER/_PNG/1_KNIGHT_ AVATAR/Knight_01__IDLE_000.png",
    "/AVATAR CHARACTERS/3 AVATAR/2D-FAIRY CHARACTER/_PNG/FAIRY AVATAR 1/Fairy_01__IDLE_000.png",
    "/AVATAR CHARACTERS/3 AVATAR/2D-ELF CHARACTER/_PNG/ELF AVATAR 1/Elf_01__IDLE_000.png",
  ],
} as const

const LETTERS = ["A", "B", "C", "D"]

// Offline fallback built from the same Grade 5 set the DB is seeded from
// (scripts/seed-questions.mjs). Phase split must match: alternate normal/boss.
export const quizLevels: readonly QuizLevel[] = m5.levels.map(({ level, title, lessons }) => {
  const questions = lessons
    .flatMap(lesson => lesson.questions)
    .map((q, i) => ({
      id: `level-${level}-${i % 2 === 0 ? "normal" : "boss"}-${Math.floor(i / 2) + 1}`,
      prompt: q.prompt,
      options: q.options,
      correctOptionIndex: LETTERS.indexOf(q.answer),
    }))
  return {
    id: level,
    title,
    environmentImagePath: quizAssetReport.environmentImagePaths[level - 1],
    bossImagePath: quizAssetReport.bossImagePaths[level - 1],
    avatarImagePath: quizAssetReport.avatarImagePaths[(level - 1) % quizAssetReport.avatarImagePaths.length],
    normalQuestions: questions.filter((_, i) => i % 2 === 0).slice(0, 5),
    bossQuestions: questions.filter((_, i) => i % 2 === 1).slice(0, 5),
  }
})

export const levelCount = quizLevels.length
