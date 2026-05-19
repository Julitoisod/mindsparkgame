'use client'
/**
 * hooks/useKeyboard.ts
 * Tracks which game-control keys are currently pressed.
 */
import { useEffect, useRef, useState } from 'react'
import type { MovementInput } from '@/types/character'

const KEY_MAP: Record<string, keyof MovementInput> = {
  ArrowUp:    'up',
  ArrowDown:  'down',
  ArrowLeft:  'left',
  ArrowRight: 'right',
  KeyW:       'up',
  KeyS:       'down',
  KeyA:       'left',
  KeyD:       'right',
  Space:      'attack',
  KeyJ:       'attack',
}

export function useKeyboard(): MovementInput {
  const [keys, setKeys] = useState<MovementInput>({
    up:     false,
    down:   false,
    left:   false,
    right:  false,
    attack: false,
  })

  // Track via ref as well to avoid stale closure in event handlers
  const keysRef = useRef(keys)
  keysRef.current = keys

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code]
      if (action && !keysRef.current[action]) {
        e.preventDefault()
        setKeys(prev => ({ ...prev, [action]: true }))
      }
    }
    const handleUp = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code]
      if (action) {
        setKeys(prev => ({ ...prev, [action]: false }))
      }
    }

    window.addEventListener('keydown', handleDown)
    window.addEventListener('keyup',   handleUp)
    return () => {
      window.removeEventListener('keydown', handleDown)
      window.removeEventListener('keyup',   handleUp)
    }
  }, [])

  return keys
}
