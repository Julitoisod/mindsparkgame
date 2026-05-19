// ─── Character Types ──────────────────────────────────────────────────────────

export type CharacterClass = 'warrior' | 'mage' | 'rogue' | 'archer'
export type AnimationState = 'idle' | 'walk' | 'attack' | 'hurt' | 'death' | 'run'
export type Direction = 'left' | 'right'

export interface CharacterStats {
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  attack: number
  defense: number
  speed: number
  level: number
  experience: number
  experienceToNext: number
}

export interface CharacterData {
  id: number
  userId: number
  name: string
  class: CharacterClass
  stats: CharacterStats
  positionX: number
  positionY: number
  positionZ: number
  direction: Direction
  animationState: AnimationState
  created_at: string
  updated_at: string
}

export interface SpriteConfig {
  /** path relative to /public */
  sheetPath: string
  /** pixel width of a single frame */
  frameWidth: number
  /** pixel height of a single frame */
  frameHeight: number
  /** total columns in the sprite sheet */
  columns: number
  /** total rows in the sprite sheet */
  rows: number
  /** frames per second for playback */
  fps: number
  /** map of animation name → row index in the sheet */
  animations: Record<AnimationState, { row: number; frameCount: number }>
}

export interface CharacterPosition {
  x: number
  y: number
  z: number
}

export interface MovementInput {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  attack: boolean
}
