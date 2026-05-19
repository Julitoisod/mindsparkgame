'use client'
/**
 * hooks/useCharacter.ts
 * Manages character state, animation transitions, and persists progress.
 */
import { useState, useCallback, useRef } from 'react'
import type { CharacterData, AnimationState, Direction, CharacterStats } from '@/types/character'
import type { MovementInput } from '@/types/character'
import toast from 'react-hot-toast'

const MOVE_SPEED = 0.05
const WORLD_BOUNDS = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 }

export function useCharacter(initial: CharacterData) {
  const [character, setCharacter] = useState<CharacterData>(initial)
  const attackCooldown = useRef(false)

  // ─── Determine animation from inputs ──────────────────────────────────────
  function resolveAnimation(input: MovementInput, isMoving: boolean): AnimationState {
    if (input.attack && !attackCooldown.current) return 'attack'
    if (isMoving) return 'walk'
    return 'idle'
  }

  // ─── Apply movement each frame (called from R3F useFrame) ─────────────────
  const applyMovement = useCallback((input: MovementInput, delta: number) => {
    setCharacter(prev => {
      const speed = prev.stats.speed * MOVE_SPEED * delta * 60
      let x = prev.positionX
      let z = prev.positionZ
      let direction: Direction = prev.direction
      let isMoving = false

      if (input.up)    { z -= speed; isMoving = true }
      if (input.down)  { z += speed; isMoving = true }
      if (input.left)  { x -= speed; direction = 'left';  isMoving = true }
      if (input.right) { x += speed; direction = 'right'; isMoving = true }

      // Clamp to world bounds (collision)
      x = Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, x))
      z = Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, z))

      const animationState = resolveAnimation(input, isMoving)

      // Handle attack cooldown
      if (animationState === 'attack') {
        attackCooldown.current = true
        setTimeout(() => { attackCooldown.current = false }, 600)
      }

      return { ...prev, positionX: x, positionZ: z, direction, animationState }
    })
  }, [])

  // ─── Update stats ──────────────────────────────────────────────────────────
  const updateStats = useCallback((partial: Partial<CharacterStats>) => {
    setCharacter(prev => ({
      ...prev,
      stats: { ...prev.stats, ...partial },
    }))
  }, [])

  // ─── Save progress to API ──────────────────────────────────────────────────
  const saveProgress = useCallback(async (zone: string) => {
    try {
      const res = await fetch('/api/progress', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          characterId:      character.id,
          positionX:        character.positionX,
          positionY:        character.positionY,
          positionZ:        character.positionZ,
          stats:            character.stats,
          currentZone:      zone,
          questFlags:       {},
          completedLevels:  [],
          playtimeSeconds:  0,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Progress saved!')
      } else {
        toast.error('Failed to save progress')
      }
    } catch {
      toast.error('Network error while saving')
    }
  }, [character])

  return { character, applyMovement, updateStats, saveProgress }
}
