'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import {
  playCorrectSound,
  playWrongSound,
  playBossHitSound,
  playLevelCompleteSound,
  playBossWarningSound,
  playGameOverSound,
  playClickSound,
  startMusic,
  stopMusic,
  speak,
  stopSpeaking,
  setSoundMuted,
  loadMutedPreference,
} from '@/lib/sounds'
import {
  CalendarClock,
  CheckCircle2,
  Crown,
  Flame,
  Home,
  Lock,
  Map as MapIcon,
  RotateCcw,
  Skull,
  Sparkles,
  Star,
  Swords,
  TreePine,
  Trophy,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react'

import * as quizContent from '@/lib/quizContent'
import { BADGES } from '@/lib/badges'
import { getLevelStory, overallStory } from '@/lib/storyContent'
import {
  bossSpriteAnimations,
  heroSpriteAnimationsByClass,
  heroSpriteImageByClass,
  type SpriteAction,
  type SpriteFrameSet,
} from '@/lib/quizSprites'
import type { CharacterClass, CharacterStats } from '@/types/character'

type Phase = 'normal' | 'boss' | 'levelComplete' | 'gameComplete' | 'gameOver'
type Screen = 'map' | 'story' | 'battle'

type RawRecord = Record<string, unknown>

type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  correctAnswer: string | number
  explanation?: string
}

type QuizLevel = {
  id: string
  number: number
  title: string
  environment: string
  backgroundImage: string
  characterImage: string
  characterFrames?: SpriteFrameSet
  bossImage: string
  bossFrames?: SpriteFrameSet
  bossName: string
  normalQuestions: QuizQuestion[]
  bossQuestions: QuizQuestion[]
  rewards: {
    coins: number
    gems: number
    exp: number
    title: string
  }
}

interface QuizAdventureProps {
  playerName?: string
  playerClass?: CharacterClass
  characterId?: number
  characterStats?: CharacterStats
  initialLevel?: number
}

const MAX_LEVELS = 5
const QUESTIONS_PER_PHASE = 5
const MAX_HEARTS = 5
const MAX_BOSS_HP = 100
const NORMAL_POINTS = 10
// The result popup waits for the death animation to play on screen first
// (panel revision: "the enemy must clearly be seen dying before the result").
const BOSS_DEFEAT_ANIM_MS = 2800
const HERO_DEFEAT_ANIM_MS = 1800
const NORMAL_EXP = 12 // eslint-disable-line @typescript-eslint/no-unused-vars
const BOSS_DAMAGE = 20
const FALLBACK_CHARACTER_STATS: CharacterStats = {
  hp: 100,
  maxHp: 100,
  mp: 50,
  maxMp: 50,
  attack: 10,
  defense: 5,
  speed: 5,
  level: 1,
  experience: 0,
  experienceToNext: 100,
}

const FALLBACK_BACKGROUNDS = [
  '/BACKGROUND FOREST 1/FOREST 1/2304x1296.png',
  '/BG BATTLE GROUND FOREST 2/game_background_1/game_background_1.png',
  '/BG BATTLE GROUND ELVES 3/game_background_1/game_background_1.png',
  '/BACKGROUND FOREST 1/FOREST 3/2304x1296.png',
  '/BG BATTLE GROUND ELVES 3/game_background_3/game_background_3.png',
]

// Measured from each idle frame's alpha bounds (content height / bottom padding
// as fractions of the frame). scale makes every fighter's VISIBLE height equal;
// ty (translateY, % of the sprite box) plants their feet on the same grass line.
const HERO_SPRITE_TUNING: Record<CharacterClass, { scale: number; ty: string }> = {
  warrior: { scale: 4.0, ty: '99%' },
  mage: { scale: 4.0, ty: '42%' },
  rogue: { scale: 4.15, ty: '59%' },
  archer: { scale: 4.15, ty: '59%' },
}
const BOSS_SPRITE_TUNING = [
  { scale: 3.45, ty: '27%' }, // L1 forest golem
  { scale: 3.75, ty: '35%' }, // L2 minotaur
  { scale: 2.95, ty: '38%' }, // L3 wraith
  { scale: 3.1, ty: '24%' },  // L4 fallen angel
  { scale: 3.35, ty: '28%' }, // L5 dark oracle
] as const

const FALLBACK_CHARACTER =
  '/AVATAR CHARACTERS/3 AVATAR/2D-KNIGHT BOY CHARACTER/_PNG/1_KNIGHT_ AVATAR/Knight_01__IDLE_000.png'
const FALLBACK_BOSS =
  '/AVATAR CHARACTERS/BOSS CHARACTER 5/Dark_Oracle_3 (LEVEL 5)/PNG/PNG Sequences/Idle/0_Dark_Oracle_Idle_000.png'

const FALLBACK_LEVELS: QuizLevel[] = Array.from({ length: MAX_LEVELS }, (_, index) => {
  const levelNumber = index + 1

  return {
    id: `level-${levelNumber}`,
    number: levelNumber,
    title: `MindSpark Trial ${levelNumber}`,
    environment: ['Forest Gate', 'Crystal Bridge', 'Elven Ruins', 'Moonlit Keep', 'Oracle Tower'][index],
    backgroundImage: FALLBACK_BACKGROUNDS[index],
    characterImage: FALLBACK_CHARACTER,
    bossImage: FALLBACK_BOSS,
    bossName: ['Golem', 'Minotaur', 'Wraith', 'Necromancer', 'Dark Oracle'][index],
    normalQuestions: Array.from({ length: QUESTIONS_PER_PHASE }, (_, questionIndex) => ({
      id: `fallback-${levelNumber}-normal-${questionIndex}`,
      prompt: `Practice question ${questionIndex + 1} for level ${levelNumber}`,
      options: ['First answer', 'Second answer', 'Third answer', 'Fourth answer'],
      correctAnswer: 0,
      explanation: 'Replace this fallback by exporting real quiz content from lib/quizContent.',
    })),
    bossQuestions: Array.from({ length: QUESTIONS_PER_PHASE }, (_, questionIndex) => ({
      id: `fallback-${levelNumber}-boss-${questionIndex}`,
      prompt: `Boss question ${questionIndex + 1} for level ${levelNumber}`,
      options: ['First answer', 'Second answer', 'Third answer', 'Fourth answer'],
      correctAnswer: 0,
      explanation: 'Boss questions should come from the shared quiz content module.',
    })),
    rewards: {
      coins: 80 + levelNumber * 20,
      gems: levelNumber,
      exp: 40 + levelNumber * 10,
      title: `Level ${levelNumber} unlocked`,
    },
  }
})

function asRecord(value: unknown): RawRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringFrom(record: RawRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }

  return fallback
}

function numberFrom(record: RawRecord, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return fallback
}

function pathFrom(record: RawRecord, keys: string[], fallback: string): string {
  const path = stringFrom(record, keys, fallback)
  if (path.startsWith('/') || path.startsWith('http')) {
    return path
  }

  return `/${path}`
}

function normalizeQuestion(value: unknown, fallback: QuizQuestion, index: number): QuizQuestion {
  const record = asRecord(value)
  const rawOptions = asArray(record.options ?? record.answers ?? record.choices)
    .map(option => String(option))
    .filter(Boolean)

  const correctAnswer =
    record.correctAnswer ??
    record.answer ??
    record.correct ??
    record.correctOptionIndex ??
    record.correctIndex ??
    fallback.correctAnswer

  return {
    id: stringFrom(record, ['id', 'slug'], fallback.id) || `${fallback.id}-${index}`,
    prompt: stringFrom(record, ['prompt', 'question', 'text', 'title'], fallback.prompt),
    options: rawOptions.length >= 2 ? rawOptions.slice(0, 4) : fallback.options,
    correctAnswer: typeof correctAnswer === 'number' || typeof correctAnswer === 'string' ? correctAnswer : fallback.correctAnswer,
    explanation: stringFrom(record, ['explanation', 'hint', 'feedback'], fallback.explanation ?? ''),
  }
}

function normalizeLevel(value: unknown, fallback: QuizLevel, index: number): QuizLevel {
  const record = asRecord(value)
  const assets = asRecord(record.assets)
  const boss = asRecord(record.boss)
  const rewards = asRecord(record.rewards ?? record.reward)

  const normalSource =
    record.normalQuestions ??
    record.questions ??
    record.normal ??
    record.quizQuestions ??
    record.practiceQuestions

  const bossSource =
    record.bossQuestions ??
    record.hardQuestions ??
    record.bossQuiz ??
    record.challengeQuestions

  return {
    id: stringFrom(record, ['id', 'slug'], fallback.id),
    number: numberFrom(record, ['number', 'level', 'levelNumber'], index + 1),
    title: stringFrom(record, ['title', 'name'], fallback.title),
    environment: stringFrom(record, ['environment', 'zone', 'world'], fallback.environment),
    backgroundImage: pathFrom(
      { ...assets, ...record },
      ['environmentImagePath', 'backgroundImage', 'background', 'backgroundPath', 'environmentImage', 'image'],
      fallback.backgroundImage,
    ),
    characterImage: pathFrom(
      { ...assets, ...record },
      ['avatarImagePath', 'characterImage', 'character', 'heroImage', 'avatarImage'],
      fallback.characterImage,
    ),
    bossImage: pathFrom(
      { ...assets, ...boss, ...record },
      ['bossImagePath', 'bossImage', 'image', 'sprite', 'bossSprite'],
      fallback.bossImage,
    ),
    bossName: stringFrom({ ...boss, ...record }, ['bossName', 'bossTitle', 'bossLabel'], fallback.bossName),
    normalQuestions: asArray(normalSource)
      .slice(0, QUESTIONS_PER_PHASE)
      .map((question, questionIndex) =>
        normalizeQuestion(question, fallback.normalQuestions[questionIndex], questionIndex),
      ),
    bossQuestions: asArray(bossSource)
      .slice(0, QUESTIONS_PER_PHASE)
      .map((question, questionIndex) =>
        normalizeQuestion(question, fallback.bossQuestions[questionIndex], questionIndex),
      ),
    rewards: {
      coins: numberFrom(rewards, ['coins', 'coinReward'], fallback.rewards.coins),
      gems: numberFrom(rewards, ['gems', 'gemReward'], fallback.rewards.gems),
      exp: numberFrom(rewards, ['exp', 'xp', 'experience'], fallback.rewards.exp),
      title: stringFrom(rewards, ['title', 'label', 'name'], fallback.rewards.title),
    },
  }
}

function getExportedLevels(): unknown[] {
  const moduleRecord = quizContent as RawRecord
  const candidates = [
    moduleRecord.quizLevels,
    moduleRecord.levels,
    moduleRecord.gameLevels,
    moduleRecord.QUIZ_LEVELS,
    moduleRecord.default,
  ]

  const levels = candidates.find(candidate => Array.isArray(candidate))
  return Array.isArray(levels) ? levels : []
}

function isCorrectAnswer(question: QuizQuestion, option: string, optionIndex: number): boolean {
  if (typeof question.correctAnswer === 'number') {
    return question.correctAnswer === optionIndex
  }

  const normalizedCorrect = question.correctAnswer.trim().toLowerCase()
  return normalizedCorrect === option.trim().toLowerCase() || normalizedCorrect === String(optionIndex)
}

function normalizeCompletedLevels(value: unknown): number[] {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map(item => Number(item))
        .filter(item => Number.isInteger(item) && item >= 1 && item <= MAX_LEVELS),
    ),
  ).sort((a, b) => a - b)
}

function nextPlayableLevelIndex(completedLevels: number[]): number {
  if (completedLevels.length === 0) return 0
  return Math.min(Math.max(...completedLevels), MAX_LEVELS - 1)
}

/** Accepts MySQL DATETIME ('2026-07-20 08:00:00') or ISO strings. */
function parseDeadline(raw: string): Date | null {
  const date = new Date(raw.includes('T') || raw.includes('Z') ? raw : raw.replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDeadline(raw: string): string {
  const date = parseDeadline(raw)
  if (!date) return raw
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

function isDeadlineOverdue(raw: string): boolean {
  const date = parseDeadline(raw)
  return date !== null && date.getTime() < Date.now()
}

function StatPill({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  tone: string
}) {
  return (
    <div
      className="relative flex flex-1 min-w-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5 rounded-lg sm:rounded-xl border-2 border-amber-700/50 bg-gradient-to-b from-[#3d2914] via-[#2a1a0a] to-[#1a0f05] px-1.5 sm:px-2.5 lg:px-3.5 shadow-[0_3px_0_#1a0f05,inset_0_1px_0_rgba(255,255,255,0.1)]"
      style={{ height: 'clamp(32px, 7dvh, 52px)' }}
    >
      {/* Inner border highlight */}
      <span className="absolute inset-[2px] rounded-lg border border-amber-600/20 pointer-events-none" />
      <span className={`relative flex shrink-0 items-center justify-center rounded-md sm:rounded-lg ${tone}`} style={{ height: 'clamp(20px, 4.5dvh, 34px)', width: 'clamp(20px, 4.5dvh, 34px)' }}>{icon}</span>
      <span className="relative min-w-0">
        <span className="hidden sm:block font-bold uppercase tracking-wide text-amber-300/70" style={{ fontSize: 'clamp(7px, 1.6dvh, 11px)' }}>{label}</span>
        <span className="block truncate font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" style={{ fontSize: 'clamp(12px, 2.8dvh, 18px)' }}>{value}</span>
      </span>
    </div>
  )
}

function AnimatedSprite({
  frames,
  action,
  fallbackSrc,
  alt,
  className,
  sizes,
  fill = false,
  width = 380,
  height = 380,
  fps = 12,
  loop = true,
}: {
  frames?: SpriteFrameSet
  action: SpriteAction
  fallbackSrc: string
  alt: string
  className?: string
  sizes: string
  fill?: boolean
  width?: number
  height?: number
  fps?: number
  loop?: boolean
}) {
  const frameList = useMemo(
    () => (frames?.[action]?.length ? frames[action] : frames?.idle ?? [fallbackSrc]),
    [action, fallbackSrc, frames],
  )
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    setFrameIndex(0)

    frameList.forEach(src => {
      const image = new window.Image()
      image.src = src
    })

    if (frameList.length <= 1) {
      return undefined
    }

    const delay = Math.max(42, Math.round(1000 / fps))
    const intervalId = window.setInterval(() => {
      setFrameIndex(current => {
        if (loop) {
          return (current + 1) % frameList.length
        }

        return Math.min(current + 1, frameList.length - 1)
      })
    }, delay)

    return () => window.clearInterval(intervalId)
  }, [fps, frameList, loop])

  const src = frameList[frameIndex] ?? fallbackSrc

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        draggable={false}
        unoptimized
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      draggable={false}
      unoptimized
    />
  )
}

export default function QuizAdventure({
  playerName = 'Hero', // eslint-disable-line @typescript-eslint/no-unused-vars
  playerClass = 'warrior',
  characterId,
  characterStats,
  initialLevel = 1,
}: QuizAdventureProps) {
  const levels = useMemo(() => {
    const exportedLevels = getExportedLevels()
    const normalized = FALLBACK_LEVELS.map((fallback, index) =>
      normalizeLevel(exportedLevels[index], fallback, index),
    )
    const heroFrames = heroSpriteAnimationsByClass[playerClass] ?? heroSpriteAnimationsByClass.warrior
    const heroImage = heroSpriteImageByClass[playerClass] ?? heroSpriteImageByClass.warrior

    return normalized.map(level => ({
      ...level,
      characterImage: heroImage,
      characterFrames: heroFrames,
      bossFrames: bossSpriteAnimations[level.number - 1] ?? bossSpriteAnimations[0],
      normalQuestions:
        level.normalQuestions.length === QUESTIONS_PER_PHASE
          ? level.normalQuestions
          : FALLBACK_LEVELS[level.number - 1]?.normalQuestions ?? FALLBACK_LEVELS[0].normalQuestions,
      bossQuestions:
        level.bossQuestions.length === QUESTIONS_PER_PHASE
          ? level.bossQuestions
          : FALLBACK_LEVELS[level.number - 1]?.bossQuestions ?? FALLBACK_LEVELS[0].bossQuestions,
    }))
  }, [playerClass])

  const [levelIndex, setLevelIndex] = useState(initialLevel - 1)
  const [phase, setPhase] = useState<Phase>('normal')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [hearts, setHearts] = useState(MAX_HEARTS)
  const [score, setScore] = useState(0)
  const [stars, setStars] = useState(0)
  const [savedStarBalance, setSavedStarBalance] = useState(0)
  const [bossHp, setBossHp] = useState(MAX_BOSS_HP)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [scorePopup, setScorePopup] = useState<string | null>(null) // eslint-disable-line @typescript-eslint/no-unused-vars
  const [screen, setScreen] = useState<Screen>('map')

  // Hide dashboard header when in battle/game screens
  useEffect(() => {
    if (screen !== 'map') {
      document.body.classList.add('game-battle-active')
    } else {
      document.body.classList.remove('game-battle-active')
    }
    return () => document.body.classList.remove('game-battle-active')
  }, [screen])
  const [normalCorrectCount, setNormalCorrectCount] = useState(0)
  const [completedLevels, setCompletedLevels] = useState<number[]>([])
  const [teacherUnlockedLevels, setTeacherUnlockedLevels] = useState<number[]>([])
  const [progressLoaded, setProgressLoaded] = useState(!characterId)
  const [progressSaving, setProgressSaving] = useState(false) // eslint-disable-line @typescript-eslint/no-unused-vars
  const [progressError, setProgressError] = useState<string | null>(null) // eslint-disable-line @typescript-eslint/no-unused-vars
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [screenShake, setScreenShake] = useState(false)
  const [showParticles, setShowParticles] = useState<'correct' | 'wrong' | null>(null)
  const [levelStars, setLevelStars] = useState<Record<number, number>>({})
  const [earnedBadges, setEarnedBadges] = useState<string[]>([])
  const [newBadgeNotification, setNewBadgeNotification] = useState<string | null>(null)
  // Freshly sampled question sets from the DB question bank (shuffled, one-per-category)
  const [dbSets, setDbSets] = useState<Record<number, { normal: QuizQuestion[]; boss: QuizQuestion[] }>>({})
  // Wrong answers this run — drives the avatar fade (req #16)
  const [wrongCount, setWrongCount] = useState(0)
  // Result modals wait for the death animation to finish (panel revision).
  // Starts true so a "game already complete" load still shows its modal.
  const [resultShown, setResultShown] = useState(true)
  // Teacher-set deadlines per level (panel revision: visible on student side)
  const [deadlines, setDeadlines] = useState<Record<number, string>>({})
  // Music + voice mute toggle, persisted per device
  const [soundMuted, setSoundMutedState] = useState(() => loadMutedPreference())
  // Overall story shows once — the first time this character starts Level 1
  const [introSeen, setIntroSeen] = useState(() => {
    try {
      return window.localStorage.getItem(`mindspark-forest-intro-${characterId ?? 'guest'}`) === '1'
    } catch {
      return true
    }
  })

  function dismissIntro() {
    playClickSound()
    try {
      window.localStorage.setItem(`mindspark-forest-intro-${characterId ?? 'guest'}`, '1')
    } catch { /* private mode — show it again next time */ }
    setIntroSeen(true)
  }

  function toggleSound() {
    playClickSound()
    setSoundMutedState(current => !current)
  }

  // Keep the audio engine in sync with the mute toggle
  useEffect(() => {
    setSoundMuted(soundMuted)
  }, [soundMuted])

  const level = levels[levelIndex] ?? levels[0]
  const heroTune = HERO_SPRITE_TUNING[playerClass] ?? HERO_SPRITE_TUNING.warrior
  const bossTune = BOSS_SPRITE_TUNING[level.number - 1] ?? BOSS_SPRITE_TUNING[0]
  const dbSet = dbSets[level.number]
  const questions = phase === 'boss'
    ? (dbSet?.boss ?? level.bossQuestions)
    : (dbSet?.normal ?? level.normalQuestions)
  const question = questions[Math.min(questionIndex, questions.length - 1)]
  const isResolving = selectedAnswer !== null
  const phaseLabel = phase === 'boss' ? 'Boss Battle' : 'Quiz Run' // eslint-disable-line @typescript-eslint/no-unused-vars
  const progressLabel = // eslint-disable-line @typescript-eslint/no-unused-vars
    phase === 'boss' ? `Boss ${questionIndex + 1}/${QUESTIONS_PER_PHASE}` : `Correct ${normalCorrectCount}/${QUESTIONS_PER_PHASE}`
  // Accessible if: already completed (replay), teacher unlocked the starting gate,
  // or Level 1 is passed — the teacher only ever opens Level 1; passing it
  // automatically opens Levels 2–5 for the student (panel revision).
  function isLevelAccessible(lvlNum: number): boolean {
    if (completedLevels.includes(lvlNum)) return true
    if (teacherUnlockedLevels.includes(lvlNum)) return true
    if (completedLevels.includes(1)) return true
    return false
  }
  const shouldShowBoss = phase === 'boss' || phase === 'levelComplete' || phase === 'gameComplete'
  // The enemy is clearly "defeated" once its HP hits zero or the level is cleared (req #15)
  const bossDefeated = phase === 'levelComplete' || phase === 'gameComplete' || (phase === 'boss' && bossHp <= 0)
  // Avatar color fades with each wrong answer; turns fully gray when all are wrong (req #16)
  const fadeRatio = Math.min(1, wrongCount / MAX_HEARTS)
  const heroFadeStyle: React.CSSProperties = {
    filter: `grayscale(${fadeRatio}) saturate(${Math.max(0, 1 - fadeRatio * 1.1)})`,
    opacity: Math.max(0.4, 1 - wrongCount * 0.12),
    transition: 'filter 0.5s ease, opacity 0.5s ease',
  }
  const heroAction: SpriteAction =
    feedback === 'correct' ? 'attack' : feedback === 'wrong' || phase === 'gameOver' ? 'hurt' : 'idle'
  const bossAction: SpriteAction =
    phase === 'levelComplete' || phase === 'gameComplete'
      ? 'defeat'
      : phase === 'boss' && feedback === 'correct'
        ? 'hurt'
        : phase === 'boss' && feedback === 'wrong'
          ? 'attack'
          : 'idle'

  // ── Background music (panel revision: music + voice) ─────────────────────
  useEffect(() => {
    if (soundMuted) {
      stopMusic()
      return
    }
    if (screen === 'battle' && phase === 'boss') startMusic('boss')
    else if (screen === 'battle' && phase === 'normal') startMusic('battle')
    else if (screen === 'map' || screen === 'story') startMusic('map')
    else stopMusic() // result phases — the fanfare/game-over jingle takes over
    return () => stopMusic()
  }, [screen, phase, soundMuted])

  // Stop all audio when the game unmounts (navigating away)
  useEffect(() => () => { stopMusic(); stopSpeaking() }, [])

  // Voice-over: read each question aloud
  useEffect(() => {
    if (soundMuted || screen !== 'battle') return
    if (phase !== 'normal' && phase !== 'boss') return
    if (!question?.prompt) return
    speak(question.prompt.replace(/_{2,}/g, ' blank '))
    return () => stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, screen, phase, soundMuted])

  // Voice-over: Forest Guardian narrates the story screen
  useEffect(() => {
    if (soundMuted || screen !== 'story') return
    const story = getLevelStory(level.number)
    speak(level.number === 1 && !introSeen ? overallStory.text : story.intro)
    return () => stopSpeaking()
  }, [screen, level.number, introSeen, soundMuted])

  // Voice-over: announce the level result once the popup appears
  useEffect(() => {
    if (soundMuted || !resultShown) return
    if (phase === 'levelComplete') {
      const story = getLevelStory(level.number)
      speak(`Level ${level.number} complete! You earned the ${story.trophyName}!`)
    } else if (phase === 'gameComplete') {
      speak('Congratulations, hero! You defeated the Dark Oracle and restored peace to the Enchanted Forest!')
    } else if (phase === 'gameOver') {
      speak('Oh no, your hearts ran out. Try again, hero!')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultShown, phase, soundMuted])

  useEffect(() => {
    if (!characterId) {
      setProgressLoaded(true)
      return
    }

    let active = true
    setProgressLoaded(false)
    setProgressError(null)

    fetch(`/api/progress?characterId=${characterId}`, { credentials: 'include' })
      .then(response => response.json())
      .then(json => {
        if (!active) return
        const loadedCompleted = normalizeCompletedLevels(json.data?.completedLevels)
        const loadedStars = Number(json.meta?.starBalance ?? 0)
        const loadedScore = Number(json.meta?.totalScore ?? 0)
        const loadedTeacherUnlocks: number[] = Array.isArray(json.meta?.teacherUnlockedLevels)
          ? json.meta.teacherUnlockedLevels.filter((n: unknown) => typeof n === 'number' && n >= 1 && n <= MAX_LEVELS)
          : []
        const loadedLevelStars: Record<number, number> = {}
        const rawLevelStars = json.data?.levelStars
        if (rawLevelStars && typeof rawLevelStars === 'object') {
          for (const [k, v] of Object.entries(rawLevelStars)) {
            const num = Number(v)
            if (Number.isFinite(num) && num >= 1 && num <= 3) loadedLevelStars[Number(k)] = num
          }
        }
        const loadedBadges: string[] = Array.isArray(json.meta?.earnedBadges) ? json.meta.earnedBadges : []
        const loadedDeadlines: Record<number, string> = {}
        if (Array.isArray(json.meta?.deadlines)) {
          for (const item of json.meta.deadlines) {
            const lvl = Number(item?.levelNumber)
            const dueAt = String(item?.dueAt ?? '')
            if (Number.isInteger(lvl) && lvl >= 1 && lvl <= MAX_LEVELS && dueAt) loadedDeadlines[lvl] = dueAt
          }
        }
        setDeadlines(loadedDeadlines)
        setCompletedLevels(loadedCompleted)
        setTeacherUnlockedLevels(loadedTeacherUnlocks)
        setStars(Number.isFinite(loadedStars) ? loadedStars : 0)
        setSavedStarBalance(Number.isFinite(loadedStars) ? loadedStars : 0)
        setScore(Number.isFinite(loadedScore) ? loadedScore : 0)
        setLevelStars(loadedLevelStars)
        setEarnedBadges(loadedBadges)
        setLevelIndex(nextPlayableLevelIndex(loadedCompleted))
        setPhase(loadedCompleted.length >= MAX_LEVELS ? 'gameComplete' : 'normal')
        setScreen(loadedCompleted.length >= MAX_LEVELS ? 'battle' : 'map')
        setQuestionIndex(0)
        setBossHp(MAX_BOSS_HP)
        setNormalCorrectCount(0)
        setSelectedAnswer(null)
        setFeedback(null)
      })
      .catch(() => {
        if (active) setProgressError('Saved progress could not be loaded. Starting at Level 1.')
      })
      .finally(() => {
        if (active) setProgressLoaded(true)
      })

    return () => {
      active = false
    }
  }, [characterId])

  async function saveLevelProgress(nextCompletedLevels: number[], starRating?: number, perfectRun?: boolean) {
    if (!characterId) return

    const stats = characterStats ?? FALLBACK_CHARACTER_STATS
    const nextLevel = Math.min(MAX_LEVELS, Math.max(stats.level, Math.min(level.number + 1, MAX_LEVELS)))

    // Build levelStars payload with the new rating
    const updatedLevelStars: Record<string, number> = {}
    for (const [k, v] of Object.entries(levelStars)) {
      updatedLevelStars[String(k)] = v
    }
    if (starRating && starRating > 0) {
      const existing = updatedLevelStars[String(level.number)] ?? 0
      updatedLevelStars[String(level.number)] = Math.max(existing, starRating)
    }

    setProgressSaving(true)
    setProgressError(null)
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          characterId,
          positionX: 0,
          positionY: 0,
          positionZ: 0,
          stats: {
            ...stats,
            hp: Math.max(1, hearts * 20),
            level: nextLevel,
            experience: stats.experience + level.rewards.exp,
          },
          currentZone: `zone_${nextLevel}`,
          questFlags: Object.fromEntries(nextCompletedLevels.map(item => [`level${item}BossDefeated`, true])),
          completedLevels: nextCompletedLevels,
          playtimeSeconds: 0,
          starsEarned: QUESTIONS_PER_PHASE,
          levelStars: updatedLevelStars,
          perfectRun: perfectRun === true,
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) {
        throw new Error(json.message ?? 'Failed to save progress')
      }
      // Handle newly earned badges
      if (Array.isArray(json.newBadges) && json.newBadges.length > 0) {
        setEarnedBadges(prev => [...prev, ...json.newBadges])
        setNewBadgeNotification(json.newBadges[0])
        window.setTimeout(() => setNewBadgeNotification(null), 4000)
      }
    } catch (err) {
      setProgressError(err instanceof Error ? err.message : 'Failed to save progress')
    } finally {
      setProgressSaving(false)
    }
  }

  // Fetch a freshly sampled question set (shuffled, one-per-category, backup pool)
  // for a level from the DB-backed question bank. Falls back to bundled content.
  async function loadQuizSet(levelNumber: number) {
    try {
      const res = await fetch(`/api/quiz?level=${levelNumber}`, { credentials: 'include' })
      const json = await res.json()
      if (!json.success || !json.data) return
      const mapDTO = (arr: unknown[]): QuizQuestion[] =>
        (Array.isArray(arr) ? arr : []).map(raw => {
          const d = asRecord(raw)
          return {
            id: String(d.id ?? ''),
            prompt: String(d.prompt ?? '').replace(/\bblank\b/gi, '____'),
            options: Array.isArray(d.options) ? d.options.map(o => String(o)) : [],
            correctAnswer: typeof d.correctIndex === 'number' ? d.correctIndex : 0,
          }
        })
      const normal = mapDTO(json.data.normal)
      const boss = mapDTO(json.data.boss)
      // Only adopt the DB set when both phases have a full fixed set of 5
      if (normal.length === QUESTIONS_PER_PHASE && boss.length === QUESTIONS_PER_PHASE) {
        setDbSets(prev => ({ ...prev, [levelNumber]: { normal, boss } }))
      }
    } catch {
      /* keep bundled fallback content */
    }
  }

  function resetGame() {
    setLevelIndex(0)
    setPhase('normal')
    setScreen('map')
    setQuestionIndex(0)
    setHearts(MAX_HEARTS)
    setStars(savedStarBalance)
    setBossHp(MAX_BOSS_HP)
    setNormalCorrectCount(0)
    setWrongCount(0)
    setSelectedAnswer(null)
    setFeedback(null)
    setCompletedLevels([])
    void loadQuizSet(1)
  }

  function retryLevel() {
    setPhase('normal')
    setScreen('battle')
    setQuestionIndex(0)
    setHearts(MAX_HEARTS)
    setBossHp(MAX_BOSS_HP)
    setNormalCorrectCount(0)
    setWrongCount(0)
    setSelectedAnswer(null)
    setFeedback(null)
    void loadQuizSet(level.number) // re-sample so retries aren't memorized
  }

  function startBossPhase() {
    playBossWarningSound()
    setPhase('boss')
    setQuestionIndex(0)
    setBossHp(MAX_BOSS_HP)
    // Boss battle starts with FULL life — quiz-phase mistakes must not carry
    // over into the boss fight (panel revision). Avatar fade resets with it.
    setHearts(MAX_HEARTS)
    setWrongCount(0)
    setSelectedAnswer(null)
    setFeedback(null)
  }

  function completeLevel(nextBossHp: number) {
    playLevelCompleteSound()
    const nextCompleted = Array.from(new Set([...completedLevels, level.number]))
    setCompletedLevels(nextCompleted)

    // Calculate star rating based on hearts remaining
    const starRating = hearts >= 5 ? 3 : hearts >= 3 ? 2 : 1
    setLevelStars(prev => {
      const existing = prev[level.number] ?? 0
      return { ...prev, [level.number]: Math.max(existing, starRating) }
    })

    // 10/10 run: every quiz answer correct AND the boss brought to 0 HP
    // (0 HP is only reachable when all 5 boss answers were correct)
    const perfectRun = normalCorrectCount >= QUESTIONS_PER_PHASE && Math.max(0, nextBossHp) <= 0

    void saveLevelProgress(nextCompleted, starRating, perfectRun)
    setSavedStarBalance(current => current + QUESTIONS_PER_PHASE)
    setBossHp(Math.max(0, nextBossHp))
    setScreen('battle')
    setPhase(levelIndex >= MAX_LEVELS - 1 ? 'gameComplete' : 'levelComplete')
    setSelectedAnswer(null)
    setFeedback(null)

    // Let the boss death animation play on screen BEFORE the result popup
    // (panel revision: the enemy must clearly be seen dying first).
    setResultShown(false)
    window.setTimeout(() => setResultShown(true), BOSS_DEFEAT_ANIM_MS)

    // Show Level Up celebration while the boss falls
    setShowLevelUp(true)
    window.setTimeout(() => setShowLevelUp(false), 3000)
  }

  function continueToNextLevel() {
    const nextLevelNumber = Math.min(level.number + 1, MAX_LEVELS)
    setLevelIndex(current => Math.min(current + 1, MAX_LEVELS - 1))
    setPhase('normal')
    setScreen('map')
    setQuestionIndex(0)
    setBossHp(MAX_BOSS_HP)
    setHearts(MAX_HEARTS)
    setNormalCorrectCount(0)
    setWrongCount(0)
    setSelectedAnswer(null)
    setFeedback(null)
    void loadQuizSet(nextLevelNumber) // preload the next level's fresh set
  }

  function enterLevel(targetIndex: number) {
    const targetLevel = levels[targetIndex]
    if (!targetLevel) return

    const unlocked = isLevelAccessible(targetLevel.number)
    if (!unlocked) return

    setLevelIndex(targetIndex)
    setPhase('normal')
    setScreen('story') // show the storyline before the battle begins (req #9)
    setQuestionIndex(0)
    setBossHp(MAX_BOSS_HP)
    setHearts(MAX_HEARTS)
    setNormalCorrectCount(0)
    setWrongCount(0)
    setSelectedAnswer(null)
    setFeedback(null)
    void loadQuizSet(targetLevel.number)
  }

  // Called from the story screen's "Begin Quest" button.
  function beginBattleFromStory() {
    playClickSound()
    setScreen('battle')
  }

  function handleAnswer(option: string, optionIndex: number) {
    if (screen === 'map' || isResolving || phase === 'levelComplete' || phase === 'gameComplete' || phase === 'gameOver') {
      return
    }

    const correct = isCorrectAnswer(question, option, optionIndex)
    setSelectedAnswer(option)
    setFeedback(correct ? 'correct' : 'wrong')
    if (correct) {
      const messages = ['Amazing!', 'Great job!', 'Correct!', 'Excellent!', 'Brilliant!']
      setFeedbackMessage(messages[Math.floor(Math.random() * messages.length)])
    } else {
      setFeedbackMessage('Try again!')
      setWrongCount(c => c + 1) // fades the avatar (req #16)
    }

    // Play sound effects
    if (correct) {
      if (phase === 'boss') playBossHitSound()
      else playCorrectSound()
      setShowParticles('correct')
      window.setTimeout(() => setShowParticles(null), 1000)
    } else {
      playWrongSound()
      setScreenShake(true)
      setShowParticles('wrong')
      window.setTimeout(() => { setScreenShake(false); setShowParticles(null) }, 500)
    }

    // Fire-and-forget: record attempt to the database
    if (characterId) {
      fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          characterId,
          levelNumber: level.number,
          phase,
          questionId: question.id,
          selectedAnswer: option,
          isCorrect: correct,
          heartsRemaining: correct ? hearts : Math.max(0, hearts - 1),
          scoreEarned: correct ? (phase === 'boss' ? NORMAL_POINTS * 2 : NORMAL_POINTS) : 0,
        }),
      })
        .then(response => response.json())
        .then(json => {
          // math_streak is awarded per-answer by the server
          if (Array.isArray(json?.newBadges) && json.newBadges.length > 0) {
            setEarnedBadges(prev => Array.from(new Set([...prev, ...json.newBadges])))
            setNewBadgeNotification(json.newBadges[0])
            window.setTimeout(() => setNewBadgeNotification(null), 4000)
          }
        })
        .catch(() => { /* silent fail — don't block gameplay */ })
    }

    window.setTimeout(() => {
      if (phase === 'normal') {
        if (correct) {
          setNormalCorrectCount(current => current + 1)
          setScore(current => current + NORMAL_POINTS)
          setStars(current => current + 1)
          setScorePopup(`+${NORMAL_POINTS} points, +1 star`)
          window.setTimeout(() => setScorePopup(null), 1500)
        } else {
          const nextHearts = Math.max(0, hearts - 1)
          setHearts(nextHearts)
          if (nextHearts === 0) {
            playGameOverSound()
            setPhase('gameOver')
            setSelectedAnswer(null)
            // Brief pause so the hero's defeat is visible before the popup
            setResultShown(false)
            window.setTimeout(() => setResultShown(true), HERO_DEFEAT_ANIM_MS)
            return
          }
        }

        // Fixed 5 questions — advance regardless of right/wrong
        if (questionIndex >= QUESTIONS_PER_PHASE - 1) {
          startBossPhase()
        } else {
          setQuestionIndex(current => current + 1)
          setSelectedAnswer(null)
          setFeedback(null)
        }

        return
      }

      if (phase === 'boss') {
        if (correct) {
          const nextBossHp = Math.max(0, bossHp - BOSS_DAMAGE)
          setBossHp(nextBossHp)
          setScore(current => current + NORMAL_POINTS * 2)
          setScorePopup(`+${NORMAL_POINTS * 2} points, ${BOSS_DAMAGE} damage`)
          window.setTimeout(() => setScorePopup(null), 1500)
        } else {
          const nextHearts = Math.max(0, hearts - 1)
          setHearts(nextHearts)
          if (nextHearts === 0) {
            playGameOverSound()
            setPhase('gameOver')
            setSelectedAnswer(null)
            // Brief pause so the hero's defeat is visible before the popup
            setResultShown(false)
            window.setTimeout(() => setResultShown(true), HERO_DEFEAT_ANIM_MS)
            return
          }
        }

        // Fixed 5 boss questions — complete level after last question
        if (questionIndex >= QUESTIONS_PER_PHASE - 1) {
          completeLevel(Math.max(0, bossHp - (correct ? BOSS_DAMAGE : 0)))
          return
        }

        setQuestionIndex(current => current + 1)
        setSelectedAnswer(null)
        setFeedback(null)
      }
    }, 3000)
  }

  if (!progressLoaded) {
    return (
      <section className="flex h-full items-center justify-center bg-[#1a1233] text-primary-100">
        <Sparkles className="mr-3 h-5 w-5 animate-pulse" />
        <span className="font-bold">Loading level progress...</span>
      </section>
    )
  }

  if (screen === 'map') {
    const levelMeta = [
      { env: 'Forest Gate', subtitle: 'Treasure Box Multiplication Quest' },
      { env: 'Crystal Bridge', subtitle: 'Division Heroes Adventure' },
      { env: 'Elven Ruins', subtitle: 'Fraction and Number Fun Quest' },
      { env: 'Moonlit Keep', subtitle: 'Shape Slide Explorer' },
      { env: 'Oracle Tower', subtitle: 'Symmetry Super Challenge' },
    ]

    function getLevelStatus(lvlNum: number): 'cleared' | 'open' | 'locked' {
      if (completedLevels.includes(lvlNum)) return 'cleared'
      if (isLevelAccessible(lvlNum)) return 'open' // teacher unlock OR prev level cleared (auto-progress)
      return 'locked'
    }

    // Single source of truth: the road path AND the node positions both derive
    // from these waypoints (viewBox 1000×400), so the road always passes
    // exactly through the center of every level node.
    const waypoints = [
      { x: 70, y: 262 },
      { x: 285, y: 128 },
      { x: 500, y: 235 },
      { x: 715, y: 128 },
      { x: 930, y: 262 },
    ]
    const roadPath = waypoints
      .map((point, pointIdx) => {
        if (pointIdx === 0) return `M ${point.x} ${point.y}`
        const prev = waypoints[pointIdx - 1]
        const midX = (prev.x + point.x) / 2
        return `C ${midX} ${prev.y}, ${midX} ${point.y}, ${point.x} ${point.y}`
      })
      .join(' ')
    const openIdx = levels.findIndex(lvl => getLevelStatus(lvl.number) === 'open')
    // ponytail: treats nodes as evenly spaced along the path — close enough visually
    const clearedFraction =
      openIdx > 0 ? openIdx / (MAX_LEVELS - 1) : completedLevels.length >= MAX_LEVELS ? 1 : 0

    return (
      <section className="game-screen map-stage text-white">
        {/* Forest adventure background — kept vivid, readability via vignette */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url('/vecteezy_deep-forest-scene-with-trail-in-the-woods-illustration_6079540.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-black/45 via-black/10 to-black/50" />

        <div className="ui-layer flex flex-col">
          {/* Forest Trophies collected banner (req #17) */}
          <div className="absolute left-1/2 top-2 z-20 -translate-x-1/2">
            <div className="flex items-center gap-1.5 rounded-full border-2 border-amber-400/60 bg-[#2a1a0a]/85 px-4 py-1.5 shadow-lg backdrop-blur-sm">
              <Trophy className="h-4 w-4 text-amber-300" />
              <span className="text-xs font-black text-amber-200">Trophies: {completedLevels.length}/{MAX_LEVELS}</span>
            </div>
          </div>
          {/* Sound toggle — music + voice-over on/off (left side: the nav rail owns top-right) */}
          <button
            type="button"
            onClick={toggleSound}
            className="absolute left-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-amber-400/60 bg-[#2a1a0a]/85 text-amber-200 shadow-lg backdrop-blur-sm hover:brightness-110"
            aria-label={soundMuted ? 'Turn sound on' : 'Turn sound off'}
            title={soundMuted ? 'Sound off' : 'Sound on'}
          >
            {soundMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          {/* Horizontal S-curve map - fits viewport on all screens */}
          <div className="absolute inset-0 z-[5] flex items-center justify-center px-2 sm:px-6">
            <div className="relative h-full w-full max-w-5xl">
              {/* SVG Winding Road — same waypoints as the nodes, so it always lines up */}
              <svg
                className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                viewBox="0 0 1000 400"
                preserveAspectRatio="none"
                fill="none"
              >
                {/* Road edge */}
                <path d={roadPath} stroke="#452c15" strokeWidth="50" strokeLinecap="round" fill="none" />
                {/* Road body — warm dirt trail */}
                <path d={roadPath} stroke="#8a5a33" strokeWidth="40" strokeLinecap="round" fill="none" />
                {/* Golden glow over the cleared part of the trail */}
                {clearedFraction > 0 && (
                  <path
                    d={roadPath}
                    stroke="rgba(251,191,36,0.5)"
                    strokeWidth="40"
                    strokeLinecap="round"
                    fill="none"
                    pathLength={100}
                    strokeDasharray={`${clearedFraction * 100} 100`}
                  />
                )}
                {/* Dashed center line */}
                <path
                  d={roadPath}
                  stroke="#f5e6c8"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="14 12"
                  fill="none"
                />
              </svg>

              {/* Level Nodes — centered on the same waypoints the road is drawn through.
                  Outer div owns the -50%,-50% centering; the inner motion.div only
                  animates, so framer-motion can't overwrite the centering transform. */}
              {levels.map((lvl, idx) => {
                const status = getLevelStatus(lvl.number)
                const meta = levelMeta[idx]
                const isUnlocked = status !== 'locked'
                const isOpen = status === 'open'
                // The hero stands only on the CURRENT stop: the first open level
                const isCurrent = isOpen && levels.findIndex(l => getLevelStatus(l.number) === 'open') === idx
                const pos = waypoints[idx]

                return (
                  <div
                    key={lvl.id}
                    className="absolute z-10"
                    style={{ left: `${pos.x / 10}%`, top: `${pos.y / 4}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <motion.div
                      className="relative flex flex-col items-center"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                    >
                      {/* Hero avatar standing on the current level */}
                      {isCurrent && (
                        <motion.div
                          className="pointer-events-none absolute -top-9 z-20 mx-auto h-10 w-10 drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] sm:-top-12 sm:h-14 sm:w-14"
                          style={{
                            backgroundImage: `url("${encodeURI(lvl.characterImage)}")`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center bottom',
                          }}
                          animate={{ y: [0, -6, 0] }}
                          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                        />
                      )}

                      <span className="relative">
                        {/* Pulsing ring calls attention to the playable level */}
                        {isOpen && (
                          <motion.span
                            className="pointer-events-none absolute -inset-1.5 rounded-full border-4 border-cyan-300/80"
                            animate={{ scale: [1, 1.18, 1], opacity: [0.9, 0.25, 0.9] }}
                            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => isUnlocked && enterLevel(idx)}
                          disabled={!isUnlocked}
                          className={[
                            'relative flex items-center justify-center rounded-full shadow-xl transition-transform overflow-hidden',
                            'w-[64px] h-[64px] sm:w-[88px] sm:h-[88px] lg:w-[104px] lg:h-[104px]',
                            'border-2 sm:border-[3px]',
                            isUnlocked
                              ? status === 'cleared'
                                ? 'border-yellow-400 cursor-pointer hover:scale-110 active:scale-95 shadow-yellow-500/60 ring-2 ring-yellow-300/50'
                                : 'border-cyan-300 cursor-pointer hover:scale-110 active:scale-95 shadow-cyan-500/50'
                              : 'border-[#3a4a40] bg-[#22302a]/95 cursor-not-allowed',
                          ].join(' ')}
                        >
                          {isUnlocked && (
                            <Image
                              src={lvl.backgroundImage}
                              alt={meta.env}
                              fill
                              sizes="104px"
                              className="rounded-full object-cover"
                              draggable={false}
                            />
                          )}
                          {!isUnlocked && (
                            <Lock className="h-5 w-5 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-[#78909c]" />
                          )}
                          <span className={[
                            'absolute -bottom-1 right-0 sm:bottom-0.5 sm:right-0.5 lg:bottom-1 lg:right-1 rounded px-1 py-0.5 text-[8px] sm:text-[10px] lg:text-xs font-black leading-none shadow-md',
                            isUnlocked
                              ? status === 'cleared'
                                ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                                : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                              : 'bg-[#37474f]/90 text-[#90a4ae]',
                          ].join(' ')}>
                            L{lvl.number}
                          </span>
                        </button>
                      </span>

                      {/* Text labels */}
                      <div className="mt-1 sm:mt-1.5 flex flex-col items-center text-center w-[80px] sm:w-[110px] lg:w-[136px]">
                        <p className="rounded-md bg-black/60 px-1.5 py-0.5 text-[8px] sm:text-[10px] lg:text-xs font-black text-white leading-tight backdrop-blur-[2px]">{meta.env}</p>
                        <p className="hidden sm:block text-[7px] sm:text-[8px] lg:text-[9px] font-semibold text-amber-100 leading-tight mt-0.5 line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{meta.subtitle}</p>
                        <span className={[
                          'inline-block mt-0.5 sm:mt-1 rounded px-1 sm:px-1.5 py-0.5 text-[6px] sm:text-[7px] lg:text-[8px] font-black uppercase tracking-wider shadow-sm',
                          status === 'cleared' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : '',
                          status === 'open' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : '',
                          status === 'locked' ? 'bg-[#37474f] text-[#b0bec5]' : '',
                        ].join(' ')}>
                          {status === 'cleared' && 'Cleared'}
                          {status === 'open' && 'Open'}
                          {status === 'locked' && 'Locked'}
                        </span>
                        {/* Teacher-set deadline (panel revision: student must see it) */}
                        {deadlines[lvl.number] && status !== 'cleared' && (
                          <span
                            className={[
                              'mt-0.5 inline-flex items-center gap-0.5 rounded px-1 sm:px-1.5 py-0.5 text-[6px] sm:text-[7px] lg:text-[8px] font-black shadow-sm',
                              isDeadlineOverdue(deadlines[lvl.number])
                                ? 'bg-red-600/90 text-white'
                                : 'bg-black/65 text-amber-200',
                            ].join(' ')}
                          >
                            <CalendarClock className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                            {isDeadlineOverdue(deadlines[lvl.number]) ? 'Overdue' : 'Due'} {formatDeadline(deadlines[lvl.number])}
                          </span>
                        )}
                        {status === 'cleared' && levelStars[lvl.number] && (
                          <div className="flex items-center justify-center gap-0.5 mt-0.5">
                            {[1, 2, 3].map(s => (
                              <Star
                                key={s}
                                className={[
                                  'h-2 w-2 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3',
                                  s <= (levelStars[lvl.number] ?? 0) ? 'fill-[#fbc02d] text-[#fbc02d]' : 'text-[#bdbdbd]',
                                ].join(' ')}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (screen === 'story') {
    const story = getLevelStory(level.number)
    return (
      <section className="game-screen quiz-stage bg-[#1a1233] text-white">
        <Image
          src={level.backgroundImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="background-layer"
          style={{ objectFit: 'cover', objectPosition: 'center center' }}
          draggable={false}
        />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#1a1233]/80 via-[#1a1233]/70 to-[#1a1233]/90" />

        {/* Overall story — shown once, the first time Level 1 is started */}
        {level.number === 1 && !introSeen ? (
          <div className="ui-layer flex overflow-y-auto p-3">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="relative m-auto w-full max-w-2xl rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-b from-[#052e16] via-[#14432d] to-[#1e1b4b] p-4 sm:p-5 text-center shadow-[0_0_30px_rgba(52,211,153,0.35)]"
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200">
                <TreePine className="h-3 w-3" /> {overallStory.speaker}
              </span>
              <h2 className="mt-1.5 text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-yellow-200 to-emerald-300">
                The Enchanted Forest
              </h2>
              <p className="mt-2 text-[13px] sm:text-sm leading-relaxed text-emerald-50/90">
                &ldquo;{overallStory.text}&rdquo;
              </p>
              <button
                type="button"
                onClick={dismissIntro}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-base font-black text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-teal-400 active:scale-95 transition"
              >
                <Sparkles className="h-5 w-5" /> Start the Adventure
              </button>
            </motion.div>
          </div>
        ) : (
        <div className="ui-layer flex overflow-y-auto p-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="relative m-auto w-full max-w-3xl rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-[#2e1065] via-[#3b0764] to-[#1e1b4b] p-4 sm:p-5 shadow-[0_0_30px_rgba(168,85,247,0.4)]"
          >
            <button
              type="button"
              onClick={() => { playClickSound(); setScreen('map') }}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg border border-purple-300/30 bg-purple-900/50 text-purple-200 hover:bg-purple-800/60"
              aria-label="Back to map"
            >
              <MapIcon className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-4 sm:gap-6">
              {/* Boss portrait */}
              <div className="relative hidden min-[480px]:block shrink-0 h-[clamp(90px,32vh,170px)] w-[clamp(90px,32vh,170px)]">
                <AnimatedSprite
                  frames={level.bossFrames}
                  action="idle"
                  fallbackSrc={level.bossImage}
                  alt={story.enemy}
                  fill
                  sizes="170px"
                  className="object-contain object-bottom -scale-x-100 scale-[1.25] drop-shadow-[0_8px_12px_rgba(0,0,0,0.5)]"
                  fps={10}
                />
              </div>

              {/* Story text */}
              <div className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-2 pr-9">
                  <span className="inline-block rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-200">
                    Level {level.number} • {story.place}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] font-bold text-purple-200/80">
                    <Trophy className="h-3 w-3" /> Trophies: {completedLevels.length}/{MAX_LEVELS}
                  </span>
                  {deadlines[level.number] && (
                    <span
                      className={[
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                        isDeadlineOverdue(deadlines[level.number])
                          ? 'bg-red-500/25 border border-red-400/50 text-red-200'
                          : 'bg-cyan-500/15 border border-cyan-400/40 text-cyan-200',
                      ].join(' ')}
                    >
                      <CalendarClock className="h-3 w-3" />
                      {isDeadlineOverdue(deadlines[level.number]) ? 'Overdue:' : 'Deadline:'} {formatDeadline(deadlines[level.number])}
                    </span>
                  )}
                </div>

                <h2 className="mt-1.5 text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300">
                  {level.title}
                </h2>

                <p className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300"><TreePine className="h-3 w-3" /> Forest Guardian</p>
                <p className="mt-0.5 text-[13px] sm:text-sm leading-relaxed text-purple-100/90">&ldquo;{story.intro}&rdquo;</p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 rounded-lg bg-red-500/15 border border-red-400/30 px-2.5 py-1 font-bold text-red-200">
                    <Swords className="h-3.5 w-3.5" /> Enemy: {story.enemy}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-yellow-500/15 border border-yellow-400/30 px-2.5 py-1 font-bold text-yellow-200">
                    <Trophy className="h-3.5 w-3.5" /> Earn the {story.trophyName}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={beginBattleFromStory}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-base font-black text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-teal-400 active:scale-95 transition"
            >
              <Flame className="h-5 w-5" /> Begin Quest — Answer 5 Questions
            </button>
          </motion.div>
        </div>
        )}
      </section>
    )
  }

  return (
    <section className="game-screen quiz-stage bg-[#1a1233] text-white">
      <Image
        src={level.backgroundImage}
        alt=""
        fill
        priority
        sizes="100vw"
        className="background-layer"
        style={{ objectFit: 'cover', objectPosition: 'center center' }}
        draggable={false}
      />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#1a1233]/45 via-[#1a1233]/10 to-[#1a1233]/72" />
      <div className="absolute inset-x-0 bottom-0 z-[1] h-20 bg-gradient-to-t from-[#1a1233] to-transparent" />

      {/* Screen flash on correct answer */}
      <AnimatePresence>
        {feedback === 'correct' && (
          <motion.div
            key="flash"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-[60] bg-white pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className={`ui-layer flex flex-col px-1.5 py-1 sm:px-4 sm:py-2 lg:px-6 transition-transform ${screenShake ? 'animate-[wiggle_0.3s_ease-in-out]' : ''}`}>
        {/* Particle effects overlay - enhanced celebrations */}
        <AnimatePresence>
          {showParticles === 'correct' && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
            >
              {/* Stars burst from center */}
              {Array.from({ length: 16 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: '50%', y: '40%', scale: 0, opacity: 1 }}
                  animate={{
                    x: `${15 + Math.random() * 70}%`,
                    y: `${5 + Math.random() * 90}%`,
                    scale: [0, 1.8, 0.5],
                    opacity: [1, 1, 0],
                    rotate: [0, Math.random() * 720],
                  }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: i * 0.03 }}
                  className="absolute"
                >
                  {i % 2 === 0
                    ? <Star className="h-5 w-5 sm:h-8 sm:w-8 fill-yellow-300 text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
                    : <Sparkles className="h-5 w-5 sm:h-8 sm:w-8 text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />}
                </motion.div>
              ))}
              {/* Golden ring burst */}
              <motion.div
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 border-yellow-400"
              />
            </motion.div>
          )}
          {showParticles === 'wrong' && (
            <motion.div
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="pointer-events-none absolute inset-0 z-50"
            >
              {/* Red vignette */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(220,38,38,0.4)_100%)]" />
              {/* Crack lines */}
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  className="absolute top-1/2 left-1/2 h-[2px] bg-red-400/60 origin-left"
                  style={{
                    width: `${30 + Math.random() * 40}%`,
                    transform: `translate(-50%, -50%) rotate(${i * 90 + Math.random() * 30}deg)`,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="shrink-0 flex flex-row items-center gap-1.5 sm:gap-2 lg:gap-2.5">
          <button
            type="button"
            onClick={() => setScreen('map')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-amber-700/60 bg-gradient-to-b from-[#4a3118] via-[#2f1d0f] to-[#1c1208] text-amber-200 shadow-[0_3px_0_#1a0f05,inset_0_1px_0_rgba(255,255,255,0.12)] hover:brightness-110"
            aria-label="Back to map"
            title="Home"
          >
            <Home className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggleSound}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-amber-700/60 bg-gradient-to-b from-[#4a3118] via-[#2f1d0f] to-[#1c1208] text-amber-200 shadow-[0_3px_0_#1a0f05,inset_0_1px_0_rgba(255,255,255,0.12)] hover:brightness-110"
            aria-label={soundMuted ? 'Turn sound on' : 'Turn sound off'}
            title={soundMuted ? 'Sound off' : 'Sound on'}
          >
            {soundMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <StatPill
            icon={<Crown className="h-4 w-4 sm:h-5 sm:w-5" />}
            label="Level"
            value={`${level.number}/5`}
            tone="bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/40"
          />
          <StatPill
            icon={<Swords className="h-4 w-4 sm:h-5 sm:w-5" />}
            label="Quiz"
            value={`${questionIndex + 1}/${QUESTIONS_PER_PHASE}`}
            tone="bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/40"
          />
          <StatPill
            icon={<Star className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />}
            label="Stars"
            value={stars}
            tone="bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/40"
          />
          <StatPill
            icon={<Trophy className="h-4 w-4 sm:h-5 sm:w-5" />}
            label="Points"
            value={score}
            tone="bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/40"
          />
        </div>

        <main className="relative flex min-h-0 flex-1 flex-col pt-0.5 sm:pt-1">
          {/* Characters at bottom of screen - expand when answering */}
          <div className={`pointer-events-none absolute bottom-0 left-0 right-0 z-[8] flex items-end justify-between px-2 sm:px-8 transition-all duration-300 ${isResolving ? 'h-[30%]' : 'h-[30%]'}`}>
            {/* Hero - left side */}
            {/* Height tracks the viewport so sprites stay proportional on short landscape phones */}
            <div className="relative h-[clamp(100px,26vh,220px)] w-[34%] sm:w-[30%]" style={{ transform: 'translate(-6%, 0)' }}>
              <motion.div
                key={`hero-${level.id}`}
                className="relative h-full w-full drop-shadow-[0_10px_15px_rgba(0,0,0,0.45)]"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                <div className="relative h-full w-full" style={heroFadeStyle}>
                  <div
                    className="absolute inset-0"
                    style={{ transform: `translateY(${heroTune.ty}) scale(${heroTune.scale})`, transformOrigin: 'bottom center' }}
                  >
                    <AnimatedSprite
                      frames={level.characterFrames}
                      action={heroAction}
                      fallbackSrc={level.characterImage}
                      alt="Player character"
                      fill
                      sizes="(min-width: 1024px) 600px, (min-width: 640px) 400px, 35vw"
                      className="object-contain object-bottom"
                      fps={12}
                      loop={heroAction === 'idle'}
                    />
                  </div>
                </div>
                {wrongCount >= MAX_HEARTS && (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-gray-700/90 px-2 py-0.5 text-[10px] font-black text-gray-200 shadow">
                    Faded out!
                  </span>
                )}
              </motion.div>
            </div>

            {/* Boss - right side */}
            {shouldShowBoss && (
              <div
                className="relative h-[clamp(100px,26vh,220px)] w-[34%] sm:w-[30%]"
                style={{ transform: 'translate(6%, 0)' }}
              >
                <motion.div
                  key={`boss-${level.id}`}
                  className="relative h-full w-full drop-shadow-[0_10px_15px_rgba(0,0,0,0.55)]"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{
                    x: 0,
                    opacity: 1,
                    scale: phase === 'boss' ? [1, 1.03, 1] : 1,
                  }}
                  transition={{
                    x: { duration: 0.4 },
                    opacity: { duration: 0.4 },
                    scale: { duration: 1.6, repeat: phase === 'boss' ? Infinity : 0 },
                  }}
                >
                  <div
                    className="relative h-full w-full"
                    style={{
                      filter: bossDefeated ? 'grayscale(1) brightness(0.6)' : 'none',
                      opacity: bossDefeated ? 0.7 : 1,
                      transition: 'filter 0.5s ease, opacity 0.5s ease',
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ transform: `translateY(${bossTune.ty}) scale(${bossTune.scale})`, transformOrigin: 'bottom center' }}
                    >
                      <AnimatedSprite
                        frames={level.bossFrames}
                        action={bossAction}
                        fallbackSrc={level.bossImage}
                        alt={level.bossName}
                        fill
                        sizes="(min-width: 1024px) 600px, (min-width: 640px) 400px, 35vw"
                        className="object-contain object-bottom -scale-x-100"
                        fps={bossAction === 'idle' ? 10 : 14}
                        loop={bossAction === 'idle'}
                      />
                    </div>
                  </div>
                  {bossDefeated && (
                    <motion.span
                      initial={{ scale: 0, rotate: -8, opacity: 0 }}
                      animate={{ scale: 1, rotate: -8, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                      className="absolute left-1/2 top-2 z-10 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border-2 border-red-300 bg-gradient-to-b from-red-500 to-rose-700 px-3 py-1 text-xs font-black text-white shadow-[0_3px_0_#7f1d1d] sm:text-sm"
                    >
                      <Skull className="h-3.5 w-3.5" /> {level.bossName} Defeated!
                    </motion.span>
                  )}
                </motion.div>
              </div>
            )}
          </div>

          {/* HP bars - compact floating above each character */}
          {phase === 'boss' && (
            <>
              {/* Hero HP - top left corner, clear of the sprites and question card */}
              <div className="absolute left-1 top-1 z-10 w-[16%] min-w-[92px]">
                <div className="rounded-lg border border-white/20 bg-black/50 px-1.5 py-1 backdrop-blur-sm">
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-cyan-300">Hero HP</span>
                    <span className="text-[9px] font-bold tabular-nums text-white">{hearts * 20} / {MAX_HEARTS * 20}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/40">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                      animate={{ width: `${Math.max(0, Math.min(100, (hearts / MAX_HEARTS) * 100))}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              </div>
              {/* Boss HP - top right corner, clear of the sprites and question card */}
              <div className="absolute right-1 top-1 z-10 w-[16%] min-w-[92px]">
                <div className="rounded-lg border border-white/20 bg-black/50 px-1.5 py-1 backdrop-blur-sm">
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-red-300">Boss HP</span>
                    <span className="text-[9px] font-bold tabular-nums text-white">{bossHp} / {MAX_BOSS_HP}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/40">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500"
                      animate={{ width: `${Math.max(0, Math.min(100, (bossHp / MAX_BOSS_HP) * 100))}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Feedback popup - centered overlay */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
              >
                <div
                  className={`rounded-2xl border-4 px-6 sm:px-10 py-3 sm:py-5 text-center shadow-2xl backdrop-blur-md ${
                    feedback === 'correct'
                      ? 'border-emerald-400 bg-gradient-to-br from-emerald-500/90 to-teal-600/90 shadow-emerald-500/50'
                      : 'border-red-400 bg-gradient-to-br from-red-500/90 to-rose-600/90 shadow-red-500/50'
                  }`}
                >
                  <p className="text-xl sm:text-3xl font-black text-white drop-shadow-lg">
                    {feedbackMessage}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Question + Answers - overlaid on top, hidden during feedback so characters are visible */}
          <div className={`relative z-[20] mx-auto flex w-[62%] max-w-[780px] min-w-[270px] translate-y-11 flex-col items-center px-2 transition-all duration-300 sm:translate-y-9 sm:px-3 ${isResolving ? 'pointer-events-none scale-95 opacity-0' : 'scale-[1.1] opacity-100'}`}>
            <AnimatePresence mode="wait">
              {(phase === 'normal' || phase === 'boss') && (
                <motion.div
                  key={`${phase}-${level.id}-${questionIndex}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22 }}
                  className="w-full"
                >
                  {/* Question Card - RPG parchment scroll style with pulsing glow */}
                  <motion.div
                    animate={{ boxShadow: ['0 0 15px rgba(251,191,36,0.2)', '0 0 25px rgba(251,191,36,0.4)', '0 0 15px rgba(251,191,36,0.2)'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative z-[30] rounded-2xl border-[3px] border-amber-600/60 bg-gradient-to-b from-[#fff8e7] via-[#fff3cd] to-[#ffeaa7] px-4 py-1.5 sm:px-5 sm:py-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.6)]"
                  >
                    {/* Inner highlight */}
                    <div className="absolute inset-[3px] rounded-xl border border-amber-200/50 pointer-events-none" />
                    <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-700/80">
                      {phase === 'boss' ? `${level.bossName} challenges you!` : `Question ${questionIndex + 1}:`}
                    </p>
                    <h2 className="mt-1 text-sm font-black leading-snug text-gray-800 sm:text-base lg:text-lg">
                      {question.prompt.replace(/\bblank\b/gi, '____')}
                    </h2>
                  </motion.div>

                  {/* 2x2 Answer Grid - Glossy RPG pill buttons */}
                  <div className="relative z-[22] mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2 sm:mt-1.5 sm:gap-x-4 sm:gap-y-2.5">
                    {question.options.map((option, optionIndex) => {
                      const selected = selectedAnswer === option
                      const correct = isCorrectAnswer(question, option, optionIndex)
                      const showCorrect = isResolving && correct
                      const showWrong = selected && feedback === 'wrong'

                      // RPG glossy pill button styles matching reference
                      const choiceStyles = [
                        { bg: 'bg-gradient-to-b from-[#4ade80] via-[#22c55e] to-[#15803d]', border: 'border-[#15803d]', shadow: 'shadow-[0_4px_0_#14532d,0_6px_12px_rgba(22,163,74,0.4)]', glow: 'shadow-green-500/30' },
                        { bg: 'bg-gradient-to-b from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8]', border: 'border-[#1e40af]', shadow: 'shadow-[0_4px_0_#1e3a5f,0_6px_12px_rgba(59,130,246,0.4)]', glow: 'shadow-blue-500/30' },
                        { bg: 'bg-gradient-to-b from-[#f87171] via-[#ef4444] to-[#b91c1c]', border: 'border-[#991b1b]', shadow: 'shadow-[0_4px_0_#7f1d1d,0_6px_12px_rgba(239,68,68,0.4)]', glow: 'shadow-red-500/30' },
                        { bg: 'bg-gradient-to-b from-[#c084fc] via-[#a855f7] to-[#7c3aed]', border: 'border-[#6d28d9]', shadow: 'shadow-[0_4px_0_#4c1d95,0_6px_12px_rgba(168,85,247,0.4)]', glow: 'shadow-purple-500/30' },
                      ]
                      const style = choiceStyles[optionIndex] ?? choiceStyles[0]

                      return (
                        <motion.button
                          key={`${option}-${optionIndex}`}
                          type="button"
                          onClick={() => { playClickSound(); handleAnswer(option, optionIndex) }}
                          disabled={isResolving}
                          whileTap={{ scale: 0.92, y: 3 }}
                          whileHover={{ scale: 1.03 }}
                          className={[
                            'relative flex min-h-[50px] w-full max-w-[30vw] items-center justify-center overflow-hidden rounded-full border-2 px-4 py-2 text-center font-black text-white transition-all sm:min-h-[56px] sm:py-2.5',
                            showCorrect
                              ? 'border-yellow-300 bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-500 scale-105 shadow-[0_4px_0_#b45309,0_0_20px_rgba(250,204,21,0.6)] ring-2 ring-yellow-200'
                              : showWrong
                                ? 'border-gray-500 bg-gradient-to-b from-gray-500 via-gray-600 to-gray-700 scale-95 opacity-50 shadow-none'
                                : `${style.bg} ${style.border} ${style.shadow}`,
                            isResolving ? 'cursor-default' : 'cursor-pointer',
                          ].join(' ')}
                        >
                          {/* Glossy highlight overlay */}
                          <span className="absolute inset-x-0 top-0 h-[45%] rounded-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
                          {/* Star decoration */}
                          <Star className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-white/30 fill-white/20" />
                          {/* Answer text */}
                          <span className="relative z-10 text-base sm:text-lg lg:text-xl font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">
                            {String.fromCharCode(65 + optionIndex)}. {option}
                          </span>
                          {showCorrect && <CheckCircle2 className="absolute top-1 right-1 h-5 w-5 text-yellow-100 drop-shadow z-10" />}
                          {showWrong && <XCircle className="absolute top-1 right-1 h-5 w-5 text-gray-200 z-10" />}
                        </motion.button>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {phase === 'levelComplete' && (<span className="hidden" />)}
              {phase === 'gameComplete' && (<span className="hidden" />)}
              {phase === 'gameOver' && (<span className="hidden" />)}
            </AnimatePresence>
          </div>
        </main>

      </div>

      {/* Score Popup Modal — appears only after the defeat animation played */}
      <AnimatePresence>
        {phase === 'levelComplete' && resultShown && (
          <motion.div
            key="level-complete-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] flex overflow-y-auto bg-black/70 backdrop-blur-sm p-3"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="relative m-auto w-[90vw] max-w-[340px] [@media(max-height:480px)]:max-w-[560px] rounded-xl border border-purple-400/50 bg-gradient-to-br from-[#2e1065] via-[#3b0764] to-[#1e1b4b] px-4 py-3 text-center shadow-[0_0_24px_rgba(168,85,247,0.35)]"
            >
              <div className="absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-2/3 rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

              <div className="flex justify-center gap-0.5 mb-1">
                {[1, 2, 3].map(s => (
                  <Star key={s} className={`h-6 w-6 ${s <= (hearts >= 5 ? 3 : hearts >= 3 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                ))}
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-0.5 text-sm font-bold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Passed</span>

              <h2 className="mt-1 text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300">
                Level {level.number} Result
              </h2>

              <div className="mt-2 grid grid-cols-2 [@media(max-height:480px)]:grid-cols-4 gap-1.5 text-left">
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">Correct</p>
                  <p className="text-lg font-black text-white">{QUESTIONS_PER_PHASE}/{QUESTIONS_PER_PHASE}</p>
                </div>
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">Stars</p>
                  <p className="text-lg font-black text-yellow-300">{stars}</p>
                </div>
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">Points</p>
                  <p className="text-lg font-black text-white">{score}</p>
                </div>
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">Hearts</p>
                  <p className="text-lg font-black text-cyan-300">{hearts}/{MAX_HEARTS}</p>
                </div>
              </div>

              {/* Badges Section */}
              <div className="mt-2 rounded-md border border-yellow-400/20 bg-yellow-400/5 px-2.5 py-2">
                <p className="mb-2 text-[10px] uppercase font-bold text-yellow-300/70 leading-none">Badges</p>
                {earnedBadges.length === 0 ? (
                  <p className="text-[11px] text-white/40 italic">No badges yet — keep playing!</p>
                ) : (
                  <div className="flex flex-wrap justify-center gap-3">
                    {BADGES.filter(b => earnedBadges.includes(b.id)).map(badge => {
                      const isNew = badge.id === newBadgeNotification
                      return (
                        <motion.div
                          key={badge.id}
                          animate={isNew ? { scale: [1, 1.15, 1] } : {}}
                          transition={{ repeat: Infinity, duration: 1.2 }}
                          className="flex flex-col items-center gap-0.5"
                        >
                          {/* Badge artwork */}
                          <Image
                            src={badge.image}
                            alt={badge.name}
                            width={52}
                            height={52}
                            unoptimized
                            className="h-12 w-12 object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.45)]"
                          />
                          <span className="mt-2 text-[9px] font-bold text-center leading-tight text-white/80 max-w-[48px]">{badge.name}</span>
                          {isNew && <span className="rounded-full bg-yellow-400 px-1.5 text-[7px] font-black text-black">NEW!</span>}
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Forest Guardian's "After the Boss" beat + trophy (req #17) */}
              <div className="mt-2 rounded-md border border-yellow-400/30 bg-yellow-400/10 px-3 py-2">
                <Image
                  src={getLevelStory(level.number).trophyImage}
                  alt={getLevelStory(level.number).trophyName}
                  width={140}
                  height={112}
                  unoptimized
                  className="mx-auto mb-1 h-16 w-auto object-contain drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
                />
                <p className="flex items-center justify-center gap-1 text-sm font-black text-yellow-200">
                  <Trophy className="h-4 w-4 shrink-0" /> You earned the {getLevelStory(level.number).trophyName}!
                </p>
                <p className="text-[11px] text-purple-100/80">&ldquo;{getLevelStory(level.number).afterBoss}&rdquo; — Forest Guardian</p>
              </div>

              {/* Passing Level 1 opens every remaining level (panel revision) */}
              {level.number === 1 && (
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                  className="mt-2 rounded-md border border-emerald-400/50 bg-emerald-500/15 px-3 py-2"
                >
                  <p className="text-sm font-black text-emerald-300">Levels 2, 3, 4 &amp; 5 are now OPEN!</p>
                  <p className="text-[11px] text-emerald-100/80">Go to the map and pick your next adventure.</p>
                </motion.div>
              )}

              <div className="mt-3 flex gap-2 justify-center">
                <button type="button" onClick={retryLevel} className="inline-flex items-center gap-1.5 rounded-md border border-purple-400/30 bg-purple-900/50 px-3.5 py-2 text-sm font-bold text-purple-200 hover:bg-purple-800/60">
                  <RotateCcw className="h-4 w-4" /> Retry
                </button>
                <button type="button" onClick={() => { setScreen('map'); setPhase('normal') }} className="inline-flex items-center gap-1.5 rounded-md border border-purple-400/30 bg-purple-900/50 px-3.5 py-2 text-sm font-bold text-purple-200 hover:bg-purple-800/60">
                  <MapIcon className="h-4 w-4" /> Map
                </button>
                <button type="button" onClick={continueToNextLevel} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-2 text-sm font-black text-white shadow-md shadow-emerald-500/30 hover:from-emerald-400 hover:to-teal-400">
                  <Flame className="h-4 w-4" /> Next
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {phase === 'gameComplete' && resultShown && (
          <motion.div
            key="game-complete-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] flex overflow-y-auto bg-black/70 backdrop-blur-sm p-3"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="relative m-auto rounded-xl border border-yellow-400/50 bg-gradient-to-br from-[#2e1065] via-[#3b0764] to-[#1e1b4b] px-4 py-3 text-center shadow-[0_0_24px_rgba(250,204,21,0.3)]"
              style={{ width: '90vw', maxWidth: '340px' }}
            >
              <div className="absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-2/3 rounded-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

              <Image
                src={getLevelStory(5).trophyImage}
                alt={getLevelStory(5).trophyName}
                width={220}
                height={176}
                unoptimized
                priority
                className="mx-auto h-24 w-auto object-contain drop-shadow-[0_0_14px_rgba(250,204,21,0.55)]"
              />

              <h2 className="mt-1 text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300">
                You are the Forest Hero!
              </h2>

              <p className="mt-1 text-sm font-semibold text-purple-200/80">&ldquo;{getLevelStory(5).afterBoss}&rdquo; — Forest Guardian</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-sm font-black text-yellow-300"><Trophy className="h-4 w-4 shrink-0" /> You earned the {getLevelStory(5).trophyName}!</p>

              <div className="mt-3 flex gap-2 justify-center">
                <button type="button" onClick={() => { setScreen('map'); setPhase('normal') }} className="inline-flex items-center gap-1.5 rounded-md border border-purple-400/30 bg-purple-900/50 px-3.5 py-2 text-sm font-bold text-purple-200 hover:bg-purple-800/60">
                  <MapIcon className="h-4 w-4" /> Map
                </button>
                <button type="button" onClick={resetGame} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-yellow-500 to-orange-500 px-3.5 py-2 text-sm font-black text-white shadow-md shadow-yellow-500/30 hover:from-yellow-400 hover:to-orange-400">
                  <RotateCcw className="h-4 w-4" /> Play Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {phase === 'gameOver' && resultShown && (
          <motion.div
            key="game-over-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] flex overflow-y-auto bg-black/70 backdrop-blur-sm p-3"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="relative m-auto rounded-xl border border-red-400/50 bg-gradient-to-br from-[#2e1065] via-[#3b0764] to-[#1e1b4b] px-4 py-3 text-center shadow-[0_0_24px_rgba(239,68,68,0.25)]"
              style={{ width: '90vw', maxWidth: '340px' }}
            >
              <div className="absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-2/3 rounded-full bg-gradient-to-r from-transparent via-red-400 to-transparent" />

              <XCircle className="mx-auto h-8 w-8 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />

              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-400/40 px-3 py-0.5 text-sm font-bold text-red-300"><XCircle className="h-4 w-4" /> Failed</span>

              <h2 className="mt-1 text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-pink-300 to-purple-300">
                Level {level.number} Result
              </h2>

              <div className="mt-2 grid grid-cols-2 [@media(max-height:480px)]:grid-cols-4 gap-1.5 text-left">
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">Correct</p>
                  <p className="text-lg font-black text-white">{normalCorrectCount}/{QUESTIONS_PER_PHASE}</p>
                </div>
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">Stars</p>
                  <p className="text-lg font-black text-yellow-300">{stars}</p>
                </div>
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">Points</p>
                  <p className="text-lg font-black text-white">{score}</p>
                </div>
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">Hearts</p>
                  <p className="text-lg font-black text-red-300">0/{MAX_HEARTS}</p>
                </div>
              </div>

              <p className="mt-2 text-sm font-semibold text-purple-200/80">Try again, hero!</p>

              <div className="mt-3 flex gap-2 justify-center">
                <button type="button" onClick={retryLevel} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 px-3.5 py-2 text-sm font-black text-white shadow-md shadow-purple-500/30 hover:from-purple-400 hover:to-pink-400">
                  <RotateCcw className="h-4 w-4" /> Retry
                </button>
                <button type="button" onClick={() => { setScreen('map'); setPhase('normal') }} className="inline-flex items-center gap-1.5 rounded-md border border-purple-400/30 bg-purple-900/50 px-3.5 py-2 text-sm font-bold text-purple-200 hover:bg-purple-800/60">
                  <MapIcon className="h-4 w-4" /> Map
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up Celebration Overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            key="level-up-overlay"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="relative flex flex-col items-center">
              <motion.div
                animate={{ rotate: [0, 5, -5, 3, -3, 0], scale: [1, 1.1, 1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: 'loop' }}
                className="absolute -inset-16 rounded-full bg-gradient-to-r from-yellow-400/20 via-primary-300/20 to-yellow-400/20 blur-2xl"
              />
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <Sparkles className="h-12 w-12 text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" />
              </motion.div>
              <motion.h2
                className="mt-2 font-game text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-orange-500 drop-shadow-[0_4px_12px_rgba(250,204,21,0.6)]"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                LEVEL UP!
              </motion.h2>
              <motion.p
                className="mt-1 text-lg sm:text-xl font-bold text-white/90"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Level {level.number} Complete
              </motion.p>
              {/* Sparkle particles */}
              {[...Array(8)].map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute h-2 w-2 rounded-full bg-yellow-300"
                  style={{ top: '50%', left: '50%' }}
                  animate={{
                    x: [0, Math.cos((i * Math.PI * 2) / 8) * 80],
                    y: [0, Math.sin((i * Math.PI * 2) / 8) * 80],
                    opacity: [1, 0],
                    scale: [1, 0.3],
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge Notification */}
      <AnimatePresence>
        {newBadgeNotification && (
          <motion.div
            key="badge-notification"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.4 }}
            className="absolute top-16 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-yellow-400/40 bg-[#2e215b]/95 px-5 py-3 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              {(() => { const b = BADGES.find(b => b.id === newBadgeNotification); return b ? <Image src={b.image} alt={b.name} width={44} height={44} unoptimized className="h-11 w-11 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" /> : <Trophy className="h-7 w-7 text-yellow-300" /> })()}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-yellow-300">Badge Earned!</p>
                <p className="text-sm font-black text-white">{(() => { const b = BADGES.find(b => b.id === newBadgeNotification); return b?.name ?? 'New Badge' })()}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
