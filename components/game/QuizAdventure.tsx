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
} from '@/lib/sounds'
import {
  Award, // eslint-disable-line @typescript-eslint/no-unused-vars
  CheckCircle2,
  Crown,
  Flame,
  Lock,
  Map as MapIcon,
  RotateCcw,
  Shield, // eslint-disable-line @typescript-eslint/no-unused-vars
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
  const percentage = Math.round((value / max) * 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-bold uppercase tracking-wide text-white" style={{ fontSize: 'clamp(10px, 2dvh, 13px)' }}>
        <span>{label}</span>
        <span className="tabular-nums">
          {value} / {max} ({percentage}%)
        </span>
      </div>
      <div className="h-4 sm:h-5 overflow-hidden rounded-full border-2 border-white/20 bg-black/30 shadow-inner">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color} shadow-lg`}
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

  const level = levels[levelIndex] ?? levels[0]
  const questions = phase === 'boss' ? level.bossQuestions : level.normalQuestions
  const question = questions[Math.min(questionIndex, questions.length - 1)]
  const isResolving = selectedAnswer !== null
  const phaseLabel = phase === 'boss' ? 'Boss Battle' : 'Quiz Run' // eslint-disable-line @typescript-eslint/no-unused-vars
  const progressLabel = // eslint-disable-line @typescript-eslint/no-unused-vars
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
    setStars(savedStarBalance)
    setBossHp(MAX_BOSS_HP)
    setNormalCorrectCount(0)
    setSelectedAnswer(null)
    setFeedback(null)
    setCompletedLevels([])
  }

  function retryLevel() {
    setPhase('normal')
    setScreen('battle')
    setQuestionIndex(0)
    setHearts(MAX_HEARTS)
    setBossHp(MAX_BOSS_HP)
    setNormalCorrectCount(0)
    setSelectedAnswer(null)
    setFeedback(null)
  }

  function startBossPhase() {
    playBossWarningSound()
    setPhase('boss')
    setQuestionIndex(0)
    setBossHp(MAX_BOSS_HP)
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

    void saveLevelProgress(nextCompleted, starRating)
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
    if (correct) {
      const messages = ['✅ Amazing!', '🌟 Great job!', '🎉 Correct!', '⭐ Excellent!', '🏆 Brilliant!']
      setFeedbackMessage(messages[Math.floor(Math.random() * messages.length)])
    } else {
      setFeedbackMessage('❌ Try again!')
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
      }).catch(() => { /* silent fail — don't block gameplay */ })
    }

    window.setTimeout(() => {
      if (phase === 'normal') {
        const nextCorrectCount = correct ? Math.min(QUESTIONS_PER_PHASE, normalCorrectCount + 1) : normalCorrectCount

        if (correct) {
          setScore(current => current + NORMAL_POINTS)
          setStars(current => current + 1)
          setNormalCorrectCount(nextCorrectCount)
          setScorePopup(`+${NORMAL_POINTS} ⭐+1`)
          window.setTimeout(() => setScorePopup(null), 1500)
        } else {
          const nextHearts = Math.max(0, hearts - 1)
          setHearts(nextHearts)
          if (nextHearts === 0) {
            playGameOverSound()
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
          setScorePopup(`+${NORMAL_POINTS * 2} 💥${BOSS_DAMAGE}dmg`)
          window.setTimeout(() => setScorePopup(null), 1500)

          if (nextBossHp === 0) {
            completeLevel(nextBossHp)
            return
          }

          setBossHp(nextBossHp)
        } else {
          const nextHearts = Math.max(0, hearts - 1)
          setHearts(nextHearts)
          if (nextHearts === 0) {
            playGameOverSound()
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
      if (lvlNum <= unlockedLevelNumber) return 'open'
      return 'locked'
    }

    return (
      <section className="relative h-full overflow-hidden text-white">
        {/* Magical purple/pink sky background - kid-friendly */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#3b2a73] via-[#6b21a8] to-[#a855f7]" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url(/BACKGROUND FOREST 1/FOREST 1/2304x1296.png)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(4px)' }} />

        <div className="relative z-10 flex h-full w-full flex-col">
          {/* Header */}
          <header className="shrink-0 flex items-center justify-between gap-2 px-2 py-1 sm:px-4 sm:py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 shadow-lg shadow-purple-500/40">
                <MapIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
              </span>
              <h1 className="font-game text-xs sm:text-base font-black bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-200 bg-clip-text text-transparent drop-shadow-md">MindSpark Isles</h1>
            </div>

            <div className="flex items-center gap-1">
              <div className="rounded-md bg-gradient-to-br from-yellow-400 to-orange-500 px-1.5 py-0.5 text-center shadow-md shadow-yellow-500/40">
                <p className="text-[6px] sm:text-[7px] font-bold uppercase text-white leading-none">⭐ Stars</p>
                <p className="text-[10px] sm:text-xs font-black text-white leading-tight">{stars}</p>
              </div>
              <div className="rounded-md bg-gradient-to-br from-purple-500 to-pink-500 px-1.5 py-0.5 text-center shadow-md shadow-purple-500/40">
                <p className="text-[6px] sm:text-[7px] font-bold uppercase text-white leading-none">🏅 Badges</p>
                <p className="text-[10px] sm:text-xs font-black text-white leading-tight">{earnedBadges.length}/6</p>
              </div>
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
                          ? status === 'cleared'
                            ? 'border-yellow-400 cursor-pointer hover:scale-110 active:scale-95 shadow-yellow-500/60 ring-2 ring-yellow-300/50'
                            : 'border-cyan-400 cursor-pointer hover:scale-110 active:scale-95 shadow-cyan-500/50'
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
                        'absolute -bottom-1 right-0 sm:bottom-0.5 sm:right-0.5 lg:bottom-1 lg:right-1 rounded px-1 py-0.5 text-[8px] sm:text-[10px] lg:text-xs font-black leading-none shadow-md',
                        isUnlocked
                          ? status === 'cleared'
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                            : 'bg-gradient-to-br from-[#9333ea]lue-500 to-purple-500 text-white'
                          : 'bg-[#37474f]/90 text-[#90a4ae]',
                      ].join(' ')}>
                        L{lvl.number}
                      </span>
                    </button>

                    {/* Text labels */}
                    <div className="mt-1 sm:mt-1.5 lg:mt-2 text-center w-[64px] sm:w-[100px] lg:w-[130px]">
                      <p className="text-[8px] sm:text-[10px] lg:text-xs font-black text-white drop-shadow-md leading-tight">{meta.env}</p>
                      <p className="hidden sm:block text-[7px] sm:text-[8px] lg:text-[9px] text-purple-100 leading-tight mt-0.5 line-clamp-2">{meta.subtitle}</p>
                      <span className={[
                        'inline-block mt-0.5 sm:mt-1 rounded px-1 sm:px-1.5 py-0.5 text-[6px] sm:text-[7px] lg:text-[8px] font-black uppercase tracking-wider shadow-sm',
                        status === 'cleared' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : '',
                        status === 'open' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' : '',
                        status === 'locked' ? 'bg-[#37474f] text-[#b0bec5]' : '',
                      ].join(' ')}>
                        {status === 'cleared' && '✨ Cleared'}
                        {status === 'open' && '▶ Open'}
                        {status === 'locked' && '🔒 Locked'}
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
    <section className="relative h-full overflow-hidden bg-[#1a1233] text-white">
      <Image
        src={level.backgroundImage}
        alt=""
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1233]/45 via-[#1a1233]/10 to-[#1a1233]/72" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#1a1233] to-transparent" />

      {/* Floating ambient particles - gems/sparkles */}
      <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute text-2xl sm:text-3xl"
            style={{ left: `${5 + (i * 8) % 90}%`, top: `${10 + (i * 17) % 75}%` }}
            animate={{
              y: [0, -25, 0],
              x: [0, (i % 2 === 0 ? 10 : -10), 0],
              opacity: [0.6, 1, 0.6],
              scale: [0.9, 1.2, 0.9],
            }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
          >
            {['💎', '✨', '🔮', '⭐', '💫', '🌟', '💰', '🪙', '✨', '💎', '⭐', '🌟'][i]}
          </motion.div>
        ))}
      </div>

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

      <div className={`relative z-10 flex h-full w-full flex-col px-1.5 py-1 sm:px-4 sm:py-2 lg:px-6 transition-transform ${screenShake ? 'animate-[wiggle_0.3s_ease-in-out]' : ''}`}>
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
                  className="absolute text-xl sm:text-3xl"
                >
                  {['⭐', '✨', '🌟', '💫', '🎉', '🎊', '💰', '🪙'][i % 8]}
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
            tone="bg-gradient-to-br from-[#9333ea]lue-500 to-[#c084fc]yan-500 text-white shadow-lg shadow-blue-500/40"
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

        <main className="flex-1 min-h-0 flex flex-col relative pt-0.5 sm:pt-1">
          {/* Characters at bottom of screen - expand when answering */}
          <div className={`absolute bottom-0 left-0 right-0 flex items-end justify-between px-2 sm:px-8 pointer-events-none z-0 transition-all duration-300 ${isResolving ? 'h-[75%]' : 'h-[40%]'}`}>
            {/* Hero - left side */}
            <div className="relative h-full w-[35%] sm:w-[30%]" style={{ transform: 'translateY(10%)' }}>
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
                  sizes="(min-width: 1024px) 600px, (min-width: 640px) 400px, 35vw"
                  className="object-contain object-bottom scale-[1.5] origin-bottom sm:scale-[1.3]"
                  fps={12}
                  loop={heroAction === 'idle'}
                />
              </motion.div>
            </div>

            {/* Boss - right side */}
            {shouldShowBoss && (
              <div className="relative h-full w-[35%] sm:w-[30%]" style={{ transform: 'translateY(10%)' }}>
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
                    sizes="(min-width: 1024px) 600px, (min-width: 640px) 400px, 35vw"
                    className="object-contain object-bottom -scale-x-100 scale-y-[1.3] origin-bottom sm:scale-y-[1.2]"
                    fps={bossAction === 'idle' ? 10 : 14}
                    loop={bossAction === 'idle'}
                  />
                </motion.div>
              </div>
            )}
          </div>

          {/* HP bars - floating above characters during boss */}
          {phase === 'boss' && (
            <div className="absolute bottom-[63%] left-3 right-3 sm:left-8 sm:right-8 z-10 flex items-center gap-3 sm:gap-6">
              <div className="flex-1 min-w-0">
                <ProgressBar value={hearts * 20} max={MAX_HEARTS * 20} color="from-cyan-400 to-blue-500" label="⚡ HP" />
              </div>
              <div className="flex-1 min-w-0">
                <ProgressBar value={bossHp} max={MAX_BOSS_HP} color="from-red-500 to-orange-500" label="👹 Boss" />
              </div>
            </div>
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
          <div className={`relative z-10 flex flex-col items-center w-full max-w-lg mx-auto px-2 sm:px-4 transition-all duration-300 ${isResolving ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
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
                    className="relative rounded-2xl border-[3px] border-amber-600/60 bg-gradient-to-b from-[#fff8e7] via-[#fff3cd] to-[#ffeaa7] px-4 py-3 sm:px-5 sm:py-4 shadow-[inset_0_2px_0_rgba(255,255,255,0.6)]"
                  >
                    {/* Inner highlight */}
                    <div className="absolute inset-[3px] rounded-xl border border-amber-200/50 pointer-events-none" />
                    <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-700/80">
                      {phase === 'boss' ? `⚔️ ${level.bossName} challenges you!` : `✨ Question ${questionIndex + 1}:`}
                    </p>
                    <h2 className="mt-1 sm:mt-1.5 text-sm sm:text-lg lg:text-xl font-black leading-snug text-gray-800">
                      {question.prompt}
                    </h2>
                  </motion.div>

                  {/* 2x2 Answer Grid - Glossy RPG pill buttons */}
                  <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-2 sm:gap-3">
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
                            'relative flex items-center justify-center rounded-full border-2 px-3 py-3 sm:py-3.5 text-center font-black text-white transition-all overflow-hidden',
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

      {/* Score Popup Modal — compact centered card */}
      <AnimatePresence>
        {phase === 'levelComplete' && (
          <motion.div
            key="level-complete-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="relative rounded-xl border border-purple-400/50 bg-gradient-to-br from-[#2e1065] via-[#3b0764] to-[#1e1b4b] px-4 py-3 text-center shadow-[0_0_24px_rgba(168,85,247,0.35)]"
              style={{ width: '90vw', maxWidth: '340px' }}
            >
              <div className="absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-2/3 rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

              <div className="flex justify-center gap-0.5 mb-1">
                {[1, 2, 3].map(s => (
                  <Star key={s} className={`h-6 w-6 ${s <= (hearts >= 5 ? 3 : hearts >= 3 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                ))}
              </div>

              <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-0.5 text-sm font-bold text-emerald-300">✅ Passed</span>

              <h2 className="mt-1 text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300">
                Level {level.number} Result
              </h2>

              <div className="mt-2 grid grid-cols-2 gap-1.5 text-left">
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">Correct</p>
                  <p className="text-lg font-black text-white">{QUESTIONS_PER_PHASE}/{QUESTIONS_PER_PHASE}</p>
                </div>
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">⭐ Stars</p>
                  <p className="text-lg font-black text-yellow-300">{stars}</p>
                </div>
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">🏆 Points</p>
                  <p className="text-lg font-black text-white">{score}</p>
                </div>
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">❤️ Hearts</p>
                  <p className="text-lg font-black text-cyan-300">{hearts}/{MAX_HEARTS}</p>
                </div>
              </div>

              <p className="mt-2 text-sm font-semibold text-purple-200/80">🎉 Amazing job!</p>

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

        {phase === 'gameComplete' && (
          <motion.div
            key="game-complete-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="relative rounded-xl border border-yellow-400/50 bg-gradient-to-br from-[#2e1065] via-[#3b0764] to-[#1e1b4b] px-4 py-3 text-center shadow-[0_0_24px_rgba(250,204,21,0.3)]"
              style={{ width: '90vw', maxWidth: '340px' }}
            >
              <div className="absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-2/3 rounded-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

              <Trophy className="mx-auto h-9 w-9 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" />

              <h2 className="mt-1 text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300">
                🎊 All Levels Cleared!
              </h2>

              <p className="mt-1 text-sm font-semibold text-purple-200/80">You are a MindSpark champion!</p>

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

        {phase === 'gameOver' && (
          <motion.div
            key="game-over-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="relative rounded-xl border border-red-400/50 bg-gradient-to-br from-[#2e1065] via-[#3b0764] to-[#1e1b4b] px-4 py-3 text-center shadow-[0_0_24px_rgba(239,68,68,0.25)]"
              style={{ width: '90vw', maxWidth: '340px' }}
            >
              <div className="absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-2/3 rounded-full bg-gradient-to-r from-transparent via-red-400 to-transparent" />

              <XCircle className="mx-auto h-8 w-8 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />

              <span className="mt-1 inline-block rounded-full bg-red-500/20 border border-red-400/40 px-3 py-0.5 text-sm font-bold text-red-300">❌ Failed</span>

              <h2 className="mt-1 text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-pink-300 to-purple-300">
                Level {level.number} Result
              </h2>

              <div className="mt-2 grid grid-cols-2 gap-1.5 text-left">
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">Correct</p>
                  <p className="text-lg font-black text-white">{normalCorrectCount}/{QUESTIONS_PER_PHASE}</p>
                </div>
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">⭐ Stars</p>
                  <p className="text-lg font-black text-yellow-300">{stars}</p>
                </div>
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">🏆 Points</p>
                  <p className="text-lg font-black text-white">{score}</p>
                </div>
                <div className="rounded-md bg-white/5 border border-white/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase text-white/50 font-bold leading-none">❤️ Hearts</p>
                  <p className="text-lg font-black text-red-300">0/{MAX_HEARTS}</p>
                </div>
              </div>

              <p className="mt-2 text-sm font-semibold text-purple-200/80">💪 Try again, hero!</p>

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
