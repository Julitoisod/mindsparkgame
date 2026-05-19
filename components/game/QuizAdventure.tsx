'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Award,
  CheckCircle2,
  Coins,
  Crown,
  Flame,
  Gem,
  Heart,
  Lock,
  Map as MapIcon,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Swords,
  Trophy,
  XCircle,
} from 'lucide-react'

import * as quizContent from '@/lib/quizContent'
import { BADGES } from '@/lib/badges'
import {
  bossSpriteAnimations,
  heroSpriteAnimationsByClass,
  heroSpriteImageByClass,
  type SpriteAction,
  type SpriteFrameSet,
} from '@/lib/quizSprites'
import type { CharacterClass, CharacterStats } from '@/types/character'

type Phase = 'normal' | 'boss' | 'levelComplete' | 'gameComplete' | 'gameOver'
type Screen = 'map' | 'battle'

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
const NORMAL_EXP = 12
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
    bossName: ['Root Warden', 'Rune Knight', 'Mirror Mage', 'Storm Captain', 'Dark Oracle'][index],
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

function ProgressBar({
  value,
  max,
  color,
  label,
}: {
  value: number
  max: number
  color: string
  label: string
}) {
  const width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-primary-50/75">
        <span>{label}</span>
        <span>
          {value} / {max}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-primary-100/15 bg-[#041008]/35">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
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
      className="flex min-w-0 items-center gap-1 sm:gap-1.5 lg:gap-2 rounded-md sm:rounded-lg border border-primary-100/15 bg-[#041008]/35 px-1 sm:px-2 lg:px-3 shadow-card backdrop-blur-md"
      style={{ height: 'clamp(24px, 5.5dvh, 44px)' }}
    >
      <span className={`flex shrink-0 items-center justify-center rounded sm:rounded-md ${tone}`} style={{ height: 'clamp(14px, 3.5dvh, 28px)', width: 'clamp(14px, 3.5dvh, 28px)' }}>{icon}</span>
      <span className="min-w-0">
        <span className="hidden sm:block font-semibold uppercase tracking-wide text-primary-50/55" style={{ fontSize: 'clamp(6px, 1.4dvh, 10px)' }}>{label}</span>
        <span className="block truncate font-bold text-primary-50" style={{ fontSize: 'clamp(9px, 2dvh, 14px)' }}>{value}</span>
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
  playerName = 'Hero',
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
  const [exp, setExp] = useState(0)
  const [gems, setGems] = useState(0)
  const [coins, setCoins] = useState(0)
  const [bossHp, setBossHp] = useState(MAX_BOSS_HP)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [screen, setScreen] = useState<Screen>('map')
  const [normalCorrectCount, setNormalCorrectCount] = useState(0)
  const [completedLevels, setCompletedLevels] = useState<number[]>([])
  const [teacherUnlockedLevels, setTeacherUnlockedLevels] = useState<number[]>([])
  const [progressLoaded, setProgressLoaded] = useState(!characterId)
  const [progressSaving, setProgressSaving] = useState(false) // eslint-disable-line @typescript-eslint/no-unused-vars
  const [progressError, setProgressError] = useState<string | null>(null) // eslint-disable-line @typescript-eslint/no-unused-vars
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [levelStars, setLevelStars] = useState<Record<number, number>>({})
  const [earnedBadges, setEarnedBadges] = useState<string[]>([])
  const [newBadgeNotification, setNewBadgeNotification] = useState<string | null>(null)

  const level = levels[levelIndex] ?? levels[0]
  const questions = phase === 'boss' ? level.bossQuestions : level.normalQuestions
  const question = questions[Math.min(questionIndex, questions.length - 1)]
  const isResolving = selectedAnswer !== null
  const phaseLabel = phase === 'boss' ? 'Boss Battle' : 'Quiz Run'
  const progressLabel =
    phase === 'boss' ? `Boss ${questionIndex + 1}/${QUESTIONS_PER_PHASE}` : `Correct ${normalCorrectCount}/${QUESTIONS_PER_PHASE}`
  // Merge automatic progression with teacher-granted unlocks
  const automaticUnlocked = Math.min(MAX_LEVELS, completedLevels.length + 1)
  const teacherMaxUnlocked = teacherUnlockedLevels.length > 0 ? Math.max(...teacherUnlockedLevels) : 0
  const unlockedLevelNumber = Math.max(automaticUnlocked, teacherMaxUnlocked)
  const shouldShowBoss = phase === 'boss' || phase === 'levelComplete' || phase === 'gameComplete'
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
        setCompletedLevels(loadedCompleted)
        setTeacherUnlockedLevels(loadedTeacherUnlocks)
        setStars(Number.isFinite(loadedStars) ? loadedStars : 0)
        setSavedStarBalance(Number.isFinite(loadedStars) ? loadedStars : 0)
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

  async function saveLevelProgress(nextCompletedLevels: number[], starRating?: number) {
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

  function resetGame() {
    setLevelIndex(0)
    setPhase('normal')
    setScreen('map')
    setQuestionIndex(0)
    setHearts(MAX_HEARTS)
    setScore(0)
    setStars(savedStarBalance)
    setExp(0)
    setGems(0)
    setCoins(0)
    setBossHp(MAX_BOSS_HP)
    setNormalCorrectCount(0)
    setSelectedAnswer(null)
    setFeedback(null)
    setCompletedLevels([])
  }

  function startBossPhase() {
    setPhase('boss')
    setQuestionIndex(0)
    setBossHp(MAX_BOSS_HP)
    setSelectedAnswer(null)
    setFeedback(null)
  }

  function completeLevel(nextBossHp: number) {
    const nextCompleted = Array.from(new Set([...completedLevels, level.number]))
    setCompletedLevels(nextCompleted)

    // Calculate star rating based on hearts remaining
    const starRating = hearts >= 5 ? 3 : hearts >= 3 ? 2 : 1
    setLevelStars(prev => {
      const existing = prev[level.number] ?? 0
      return { ...prev, [level.number]: Math.max(existing, starRating) }
    })

    void saveLevelProgress(nextCompleted, starRating)
    setCoins(current => current + level.rewards.coins)
    setGems(current => current + level.rewards.gems)
    setExp(current => current + level.rewards.exp)
    setSavedStarBalance(current => current + QUESTIONS_PER_PHASE)
    setBossHp(Math.max(0, nextBossHp))
    setScreen('battle')
    setPhase(levelIndex >= MAX_LEVELS - 1 ? 'gameComplete' : 'levelComplete')
    setSelectedAnswer(null)
    setFeedback(null)

    // Show Level Up celebration
    setShowLevelUp(true)
    window.setTimeout(() => setShowLevelUp(false), 3000)
  }

  function continueToNextLevel() {
    setLevelIndex(current => Math.min(current + 1, MAX_LEVELS - 1))
    setPhase('normal')
    setScreen('map')
    setQuestionIndex(0)
    setBossHp(MAX_BOSS_HP)
    setHearts(MAX_HEARTS)
    setNormalCorrectCount(0)
    setSelectedAnswer(null)
    setFeedback(null)
  }

  function enterLevel(targetIndex: number) {
    const targetLevel = levels[targetIndex]
    if (!targetLevel) return

    const unlocked = targetLevel.number <= unlockedLevelNumber || completedLevels.includes(targetLevel.number) || teacherUnlockedLevels.includes(targetLevel.number)
    if (!unlocked) return

    setLevelIndex(targetIndex)
    setPhase('normal')
    setScreen('battle')
    setQuestionIndex(0)
    setBossHp(MAX_BOSS_HP)
    setHearts(MAX_HEARTS)
    setNormalCorrectCount(0)
    setSelectedAnswer(null)
    setFeedback(null)
  }

  function handleAnswer(option: string, optionIndex: number) {
    if (screen === 'map' || isResolving || phase === 'levelComplete' || phase === 'gameComplete' || phase === 'gameOver') {
      return
    }

    const correct = isCorrectAnswer(question, option, optionIndex)
    setSelectedAnswer(option)
    setFeedback(correct ? 'correct' : 'wrong')

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
      }).catch(() => { /* silent fail — don't block gameplay */ })
    }

    window.setTimeout(() => {
      if (phase === 'normal') {
        const nextCorrectCount = correct ? Math.min(QUESTIONS_PER_PHASE, normalCorrectCount + 1) : normalCorrectCount

        if (correct) {
          setScore(current => current + NORMAL_POINTS)
          setStars(current => current + 1)
          setExp(current => current + NORMAL_EXP)
          setNormalCorrectCount(nextCorrectCount)
        } else {
          const nextHearts = Math.max(0, hearts - 1)
          setHearts(nextHearts)
          if (nextHearts === 0) {
            setPhase('gameOver')
            setSelectedAnswer(null)
            return
          }
        }

        if (nextCorrectCount >= QUESTIONS_PER_PHASE) {
          startBossPhase()
        } else {
          setQuestionIndex(current => (current + 1) % QUESTIONS_PER_PHASE)
          setSelectedAnswer(null)
          setFeedback(null)
        }

        return
      }

      if (phase === 'boss') {
        if (correct) {
          const nextBossHp = Math.max(0, bossHp - BOSS_DAMAGE)
          setScore(current => current + NORMAL_POINTS * 2)

          if (nextBossHp === 0) {
            completeLevel(nextBossHp)
            return
          }

          setBossHp(nextBossHp)
        } else {
          const nextHearts = Math.max(0, hearts - 1)
          setHearts(nextHearts)
          if (nextHearts === 0) {
            setPhase('gameOver')
            setSelectedAnswer(null)
            return
          }
        }

        if (questionIndex >= QUESTIONS_PER_PHASE - 1 && bossHp > BOSS_DAMAGE) {
          setQuestionIndex(0)
        } else {
          setQuestionIndex(current => Math.min(current + 1, QUESTIONS_PER_PHASE - 1))
        }

        setSelectedAnswer(null)
        setFeedback(null)
      }
    }, 760)
  }

  if (!progressLoaded) {
    return (
      <section className="flex h-full items-center justify-center bg-[#041008] text-primary-100">
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
      if (lvlNum <= unlockedLevelNumber) return 'open'
      return 'locked'
    }

    return (
      <section className="relative h-full overflow-hidden text-[#1b5e20]">
        {/* Light misty green background matching reference */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#d4e6d8] via-[#dceee0] to-[#c8e0cc]" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url(/BACKGROUND FOREST 1/FOREST 1/2304x1296.png)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(4px)' }} />

        <div className="relative z-10 flex h-full w-full flex-col">
          {/* Header */}
          <header className="shrink-0 flex items-center justify-between gap-2 px-2 py-1 sm:px-4 sm:py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border-2 border-[#2e7d32] bg-[#c8e6c9]">
                <MapIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#1b5e20]" />
              </span>
              <h1 className="font-game text-xs sm:text-base font-black text-[#1b5e20]">MindSpark Isles</h1>
            </div>

            <div className="flex items-center gap-1">
              <div className="rounded-md border border-[#2e7d32]/20 bg-white/60 px-1.5 py-0.5 text-center backdrop-blur-sm">
                <p className="text-[6px] sm:text-[7px] font-bold uppercase text-[#388e3c] leading-none">Stars</p>
                <p className="text-[10px] sm:text-xs font-black text-[#1b5e20] leading-tight">{stars}</p>
              </div>
              <div className="rounded-md border border-[#2e7d32]/20 bg-white/60 px-1.5 py-0.5 text-center backdrop-blur-sm">
                <p className="text-[6px] sm:text-[7px] font-bold uppercase text-[#388e3c] leading-none">Badges</p>
                <p className="text-[10px] sm:text-xs font-black text-[#1b5e20] leading-tight">{earnedBadges.length}/6</p>
              </div>
              <button
                type="button"
                onClick={resetGame}
                className="rounded-md border border-[#2e7d32]/20 bg-white/60 p-1 sm:p-1.5 backdrop-blur-sm transition hover:bg-white/80"
              >
                <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#1b5e20]" />
              </button>
            </div>
          </header>

          {/* Horizontal S-curve map - fits viewport on all screens */}
          <div
            className="flex-1 min-h-0 flex items-start justify-center px-2 sm:px-4 pt-4 sm:pt-8 relative"
            style={{
              backgroundImage: "url('/vecteezy_deep-forest-scene-with-trail-in-the-woods-illustration_6079540.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Soft overlay so the road and nodes remain readable */}
            <div className="absolute inset-0 bg-white/35 backdrop-blur-[1px] pointer-events-none" />

            <div className="relative w-full h-full max-w-5xl scale-[0.78] sm:scale-[0.85] lg:scale-100 origin-center">
              {/* SVG Winding Road - path passes exactly through each node */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
                viewBox="0 0 1000 400"
                preserveAspectRatio="none"
                fill="none"
              >
                {/* Road shadow */}
                <path
                  d="M 80 148 C 185 148, 185 -20, 290 -20 C 395 -20, 395 100, 500 100 C 605 100, 605 -20, 710 -20 C 815 -20, 815 148, 920 148"
                  stroke="rgba(0,0,0,0.18)"
                  strokeWidth="50"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Road body */}
                <path
                  d="M 80 148 C 185 148, 185 -20, 290 -20 C 395 -20, 395 100, 500 100 C 605 100, 605 -20, 710 -20 C 815 -20, 815 148, 920 148"
                  stroke="#3d5245"
                  strokeWidth="42"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Dashed center line */}
                <path
                  d="M 80 148 C 185 148, 185 -20, 290 -20 C 395 -20, 395 100, 500 100 C 605 100, 605 -20, 710 -20 C 815 -20, 815 148, 920 148"
                  stroke="#9ab89a"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="14 10"
                  fill="none"
                />
              </svg>

              {/* Level Nodes positioned along the S-curve */}
              {levels.map((lvl, idx) => {
                const status = getLevelStatus(lvl.number)
                const meta = levelMeta[idx]
                const isUnlocked = status !== 'locked'

                // Positions exactly aligned to SVG road waypoints
                // Road: M 80 148 ... 290 -20 ... 500 100 ... 710 -20 ... 920 148 (viewBox 1000x400)
                // Node X% = svgX/1000, Node Y% = svgY/400
                const positions = [
                  { left: '8%', top: '37%' },   // 148/400 = 37%
                  { left: '29%', top: '0%' },   // peak (at -5% but clamped to 0)
                  { left: '50%', top: '25%' },  // 100/400 = 25%
                  { left: '71%', top: '0%' },   // peak
                  { left: '92%', top: '37%' },  // 148/400 = 37%
                ]
                const pos = positions[idx]

                return (
                  <motion.div
                    key={lvl.id}
                    className="absolute z-10 flex flex-col items-center"
                    style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <button
                      type="button"
                      onClick={() => isUnlocked && enterLevel(idx)}
                      disabled={!isUnlocked}
                      className={[
                        'relative flex items-center justify-center rounded-full shadow-xl transition-transform overflow-hidden',
                        'w-[64px] h-[64px] sm:w-[88px] sm:h-[88px] lg:w-[112px] lg:h-[112px]',
                        'border-2 sm:border-[3px]',
                        isUnlocked
                          ? 'border-[#2e7d32] cursor-pointer hover:scale-110 active:scale-95'
                          : 'border-[#4a5e52] bg-[#2a3830] cursor-not-allowed',
                      ].join(' ')}
                    >
                      {isUnlocked && (
                        <Image
                          src={lvl.backgroundImage}
                          alt={meta.env}
                          fill
                          sizes="112px"
                          className="rounded-full object-cover"
                          draggable={false}
                        />
                      )}
                      {!isUnlocked && (
                        <Lock className="h-5 w-5 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-[#78909c]" />
                      )}
                      <span className={[
                        'absolute -bottom-1 right-0 sm:bottom-0.5 sm:right-0.5 lg:bottom-1 lg:right-1 rounded px-1 py-0.5 text-[8px] sm:text-[10px] lg:text-xs font-black leading-none',
                        isUnlocked ? 'bg-[#1b5e20]/90 text-white' : 'bg-[#37474f]/90 text-[#90a4ae]',
                      ].join(' ')}>
                        L{lvl.number}
                      </span>
                    </button>

                    {/* Text labels */}
                    <div className="mt-1 sm:mt-1.5 lg:mt-2 text-center w-[64px] sm:w-[100px] lg:w-[130px]">
                      <p className="text-[8px] sm:text-[10px] lg:text-xs font-black text-[#1b5e20] leading-tight">{meta.env}</p>
                      <p className="hidden sm:block text-[7px] sm:text-[8px] lg:text-[9px] text-[#4a635a] leading-tight mt-0.5 line-clamp-2">{meta.subtitle}</p>
                      <span className={[
                        'inline-block mt-0.5 sm:mt-1 rounded px-1 sm:px-1.5 py-0.5 text-[6px] sm:text-[7px] lg:text-[8px] font-black uppercase tracking-wider',
                        status === 'cleared' ? 'bg-[#2e7d32] text-white' : '',
                        status === 'open' ? 'bg-[#1b5e20] text-white' : '',
                        status === 'locked' ? 'bg-[#37474f] text-[#b0bec5]' : '',
                      ].join(' ')}>
                        {status === 'cleared' && 'Cleared'}
                        {status === 'open' && 'Open'}
                        {status === 'locked' && 'Locked'}
                      </span>
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
                )
              })}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative h-full overflow-hidden bg-[#041008] text-white">
      <Image
        src={level.backgroundImage}
        alt=""
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#041008]/45 via-[#041008]/10 to-[#041008]/72" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#041008] to-transparent" />

      <div className="relative z-10 flex h-full w-full flex-col px-1.5 py-1 sm:px-4 sm:py-2 lg:px-6">
        <div className="shrink-0 grid grid-cols-8 gap-1 sm:gap-1.5 lg:gap-2">
          <StatPill
            icon={<Crown className="h-3 w-3 sm:h-4 sm:w-4" />}
            label="Level"
            value={`${level.number}/5`}
            tone="bg-primary-300/20 text-primary-100"
          />
          <StatPill
            icon={<Heart className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />}
            label="Hearts"
            value={`${hearts}/${MAX_HEARTS}`}
            tone="bg-primary-400/20 text-primary-100"
          />
          <StatPill
            icon={<Star className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />}
            label="Stars"
            value={stars}
            tone="bg-primary-200/20 text-primary-100"
          />
          <StatPill
            icon={<Gem className="h-3 w-3 sm:h-4 sm:w-4" />}
            label="Gems"
            value={gems}
            tone="bg-primary-400/20 text-primary-100"
          />
          <StatPill
            icon={<Coins className="h-3 w-3 sm:h-4 sm:w-4" />}
            label="Coins"
            value={coins}
            tone="bg-primary-500/20 text-primary-100"
          />
          <StatPill
            icon={<Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />}
            label="EXP"
            value={exp}
            tone="bg-primary-400/20 text-primary-100"
          />
          <StatPill
            icon={<Trophy className="h-3 w-3 sm:h-4 sm:w-4" />}
            label="Score"
            value={score}
            tone="bg-primary-300/20 text-primary-100"
          />
          <button
            type="button"
            onClick={resetGame}
            className="flex items-center justify-center gap-1 rounded-md sm:rounded-lg border border-primary-200/20 bg-primary-950/40 px-1.5 font-bold text-white shadow-card backdrop-blur-md transition hover:bg-primary-200/10 focus:outline-none focus:ring-2 focus:ring-primary-300"
            style={{ height: 'clamp(24px, 5.5dvh, 44px)', fontSize: 'clamp(8px, 1.8dvh, 14px)' }}
          >
            <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        <main className="flex-1 min-h-0 flex flex-row gap-[1dvh] sm:gap-3 lg:gap-4 pt-[0.5dvh] sm:pt-2 pb-[0.5dvh]">
          {/* Character arena - 70% width */}
          <div className="relative flex-[7] overflow-hidden rounded-lg border border-primary-200/15 bg-primary-950/15 min-h-0">
            <div className="absolute left-1 top-1 z-20 rounded-md border border-primary-200/20 bg-primary-950/50 px-1.5 py-1 backdrop-blur-md sm:left-5 sm:top-5 sm:px-3 sm:py-2 sm:rounded-lg">
              <p className="text-[8px] sm:text-[11px] font-bold uppercase tracking-wide text-primary-100">{level.environment}</p>
              <h1 className="mt-0.5 max-w-[80px] sm:max-w-[260px] truncate text-[10px] sm:text-xl lg:text-2xl font-black text-white">{level.title}</h1>
              <p className="hidden sm:block mt-0.5 max-w-[260px] truncate text-xs font-semibold text-white/65">{playerName}&apos;s quest</p>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-between px-1 sm:px-4">
              {/* Hero - left side, facing right */}
              <div
                className="relative h-full w-[55%] sm:w-[50%]"
                style={{ maxWidth: shouldShowBoss ? '50%' : '100%', transform: 'translateY(15%)' }}
              >
                <motion.div
                  key={`hero-${level.id}`}
                  className="relative h-full w-full drop-shadow-[0_10px_15px_rgba(0,0,0,0.45)]"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                >
                  <AnimatedSprite
                    frames={level.characterFrames}
                    action={heroAction}
                    fallbackSrc={level.characterImage}
                    alt="Player character"
                    fill
                    sizes="(min-width: 1024px) 1400px, (min-width: 640px) 1000px, 42vw"
                    className="object-contain object-bottom scale-[1.8] origin-bottom sm:scale-150"
                    fps={12}
                    loop={heroAction === 'idle'}
                  />
                </motion.div>
              </div>

              {/* Boss - right side, facing left (flipped) */}
              {shouldShowBoss && (
                <div
                  className="relative h-full w-[45%] sm:w-[45%]"
                  style={{ transform: 'translateY(15%)' }}
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
                    <AnimatedSprite
                      frames={level.bossFrames}
                      action={bossAction}
                      fallbackSrc={level.bossImage}
                      alt={level.bossName}
                      fill
                      sizes="(min-width: 1024px) 1000px, (min-width: 640px) 700px, 40vw"
                      className="object-contain object-bottom -scale-x-100 scale-y-150 origin-bottom sm:scale-y-150"
                      fps={bossAction === 'idle' ? 10 : 14}
                      loop={bossAction === 'idle'}
                    />
                  </motion.div>
                </div>
              )}
            </div>
          </div>

          {/* Quiz panel - 30% width */}
          <div className="flex-[3] flex flex-col min-h-0 min-w-0 rounded-lg border border-primary-200/20 bg-[#0d2b18]/92 p-[1dvh] sm:p-3 shadow-card backdrop-blur-xl">
            <div className="shrink-0 mb-[0.5dvh] sm:mb-3 flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-primary-400/15 px-1.5 sm:px-2 py-0.5 text-[clamp(8px,1.8dvh,12px)] font-bold uppercase tracking-wide text-primary-100">
                  {phase === 'boss' ? <Swords className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                  {phaseLabel}
                </span>
                <span className="rounded-md bg-primary-200/10 px-1.5 sm:px-2 py-0.5 text-[clamp(8px,1.8dvh,12px)] font-bold text-white/75">{progressLabel}</span>
              </div>
              <div className="hidden min-w-16 text-right sm:block">
                <p className="text-[10px] font-bold uppercase text-white/50">Reward</p>
                <p className="text-xs font-black text-primary-100">{level.rewards.coins}c+{level.rewards.gems}g</p>
              </div>
            </div>

            {phase === 'boss' && (
              <div className="shrink-0 mb-[0.5dvh] sm:mb-3 rounded-lg border border-primary-200/20 bg-primary-950/35 p-[1dvh] sm:p-3">
                <ProgressBar value={bossHp} max={MAX_BOSS_HP} color="from-primary-200 to-primary-700" label="Boss HP" />
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <AnimatePresence mode="wait">
              {(phase === 'normal' || phase === 'boss') && (
                <motion.div
                  key={`${phase}-${level.id}-${questionIndex}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="rounded-lg border border-primary-200/15 bg-primary-100/[0.06] p-[1dvh] sm:p-3">
                    <p className="text-[clamp(8px,1.6dvh,12px)] font-bold uppercase tracking-wide text-primary-100">
                      {phase === 'boss' ? `${level.bossName} challenges you` : `Question ${questionIndex + 1}`}
                    </p>
                    <h2 className="mt-[0.3dvh] font-black leading-tight text-white" style={{ fontSize: 'clamp(11px, 2.8dvh, 20px)' }}>{question.prompt}</h2>
                  </div>

                  <div className="mt-[1dvh] sm:mt-3 grid gap-[0.8dvh] sm:gap-2">
                    {question.options.map((option, optionIndex) => {
                      const selected = selectedAnswer === option
                      const correct = isCorrectAnswer(question, option, optionIndex)
                      const showCorrect = isResolving && correct
                      const showWrong = selected && feedback === 'wrong'

                      return (
                        <button
                          key={`${option}-${optionIndex}`}
                          type="button"
                          onClick={() => handleAnswer(option, optionIndex)}
                          disabled={isResolving}
                          className={[
                            'group flex w-full items-center gap-2 sm:gap-3 rounded-lg border px-2 sm:px-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary-300',
                            showCorrect
                              ? 'border-primary-300/70 bg-primary-500/25 text-primary-50'
                              : showWrong
                                ? 'border-primary-200/70 bg-primary-950/50 text-primary-50'
                                : 'border-primary-200/20 bg-primary-950/30 text-white hover:border-primary-200/50 hover:bg-primary-300/10',
                            isResolving ? 'cursor-default' : 'cursor-pointer',
                          ].join(' ')}
                          style={{ paddingTop: 'clamp(4px, 1.2dvh, 10px)', paddingBottom: 'clamp(4px, 1.2dvh, 10px)' }}
                        >
                          <span className="flex shrink-0 items-center justify-center rounded-md bg-primary-200/10 font-black" style={{ height: 'clamp(20px, 4dvh, 32px)', width: 'clamp(20px, 4dvh, 32px)', fontSize: 'clamp(10px, 2dvh, 14px)' }}>
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span className="min-w-0 flex-1 font-bold leading-snug" style={{ fontSize: 'clamp(10px, 2.2dvh, 14px)' }}>{option}</span>
                          {showCorrect && <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />}
                          {showWrong && <XCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>

                  <AnimatePresence>
                    {feedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`mt-[0.8dvh] sm:mt-2 rounded-lg border px-2 sm:px-3 py-[0.6dvh] sm:py-2 font-semibold ${
                          feedback === 'correct'
                            ? 'border-primary-300/30 bg-primary-500/15 text-primary-50'
                            : 'border-primary-200/30 bg-primary-950/45 text-primary-50'
                        }`}
                        style={{ fontSize: 'clamp(9px, 2dvh, 14px)' }}
                      >
                        {feedback === 'correct'
                          ? phase === 'boss'
                            ? `Direct hit! ${BOSS_DAMAGE} dmg`
                            : `+${NORMAL_POINTS} pts, +1★, +${NORMAL_EXP} EXP`
                          : phase === 'boss'
                            ? `${level.bossName} strikes! -1♥`
                            : 'Miss! -1♥'}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {phase === 'levelComplete' && (
                <motion.div
                  key="level-complete"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-lg border border-primary-200/30 bg-primary-500/15 p-3 sm:p-5 text-center"
                >
                  <Award className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-primary-100" />
                  <h2 className="mt-2 text-lg sm:text-2xl font-black text-white">Boss Defeated</h2>
                  <p className="mt-1 text-xs sm:text-sm font-semibold text-white/70">
                    {level.rewards.title}. Next zone unlocked.
                  </p>
                  <div className="mt-2 sm:mt-4 grid grid-cols-3 gap-1.5 text-xs font-bold">
                    <span className="rounded-lg bg-primary-950/30 px-2 py-1.5">+{level.rewards.coins}c</span>
                    <span className="rounded-lg bg-primary-950/30 px-2 py-1.5">+{level.rewards.gems}g</span>
                    <span className="rounded-lg bg-primary-950/30 px-2 py-1.5">+{level.rewards.exp}xp</span>
                  </div>
                  <button
                    type="button"
                    onClick={continueToNextLevel}
                    className="mt-3 sm:mt-5 inline-flex h-9 sm:h-11 items-center justify-center gap-2 rounded-lg bg-primary-200 px-4 text-xs sm:text-sm font-black text-[#00441b] transition hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-white"
                  >
                    <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    View Map
                  </button>
                </motion.div>
              )}

              {phase === 'gameComplete' && (
                <motion.div
                  key="game-complete"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-lg border border-primary-200/30 bg-primary-400/15 p-3 sm:p-5 text-center"
                >
                  <Trophy className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-primary-100" />
                  <h2 className="mt-2 text-lg sm:text-2xl font-black text-white">All Levels Cleared!</h2>
                  <p className="mt-1 text-xs sm:text-sm font-semibold text-white/70">
                    Every boss defeated. All zones unlocked.
                  </p>
                  <button
                    type="button"
                    onClick={resetGame}
                    className="mt-3 sm:mt-5 inline-flex h-9 sm:h-11 items-center justify-center gap-2 rounded-lg bg-primary-200 px-4 text-xs sm:text-sm font-black text-[#00441b] transition hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Play Again
                  </button>
                </motion.div>
              )}

              {phase === 'gameOver' && (
                <motion.div
                  key="game-over"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-lg border border-primary-200/30 bg-primary-950/45 p-3 sm:p-5 text-center"
                >
                  <XCircle className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-primary-100" />
                  <h2 className="mt-2 text-lg sm:text-2xl font-black text-white">Quest Failed</h2>
                  <p className="mt-1 text-xs sm:text-sm font-semibold text-white/70">
                    Hearts depleted on level {level.number}.
                  </p>
                  <button
                    type="button"
                    onClick={resetGame}
                    className="mt-3 sm:mt-5 inline-flex h-9 sm:h-11 items-center justify-center gap-2 rounded-lg bg-primary-300 px-4 text-xs sm:text-sm font-black text-[#00441b] transition hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Retry
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>
        </main>

      </div>

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
            className="absolute top-16 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-yellow-400/40 bg-[#0d2b18]/95 px-5 py-3 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{(() => { const b = BADGES.find(b => b.id === newBadgeNotification); return b?.icon ?? '🏅' })()}</span>
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
