'use client'
/**
 * components/game/Character.tsx
 *
 * 2D sprite character rendered on a Three.js plane mesh inside R3F.
 * Supports idle / walk / attack / hurt animations driven by a sprite sheet.
 *
 * Sprite sheet layout assumed (rows, 0-indexed):
 *   row 0 → idle   (4 frames)
 *   row 1 → walk   (6 frames)
 *   row 2 → attack (4 frames)
 *   row 3 → hurt   (3 frames)
 *   row 4 → death  (5 frames)
 *   row 5 → run    (6 frames)
 *
 * If you don't have a sprite sheet yet, the component falls back to a solid
 * colour plane so the rest of the scene still works.
 */
import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { TextureLoader, NearestFilter, ClampToEdgeWrapping } from 'three'
import type * as THREE from 'three'
import { useCharacter } from '@/hooks/useCharacter'
import { useKeyboard } from '@/hooks/useKeyboard'
import type { CharacterData, SpriteConfig, AnimationState } from '@/types/character'

// ─── Default sprite configuration ─────────────────────────────────────────────
const DEFAULT_SPRITE: SpriteConfig = {
  sheetPath:   '/sprites/character_sheet.png',
  frameWidth:  64,
  frameHeight: 64,
  columns:     6,
  rows:        6,
  fps:         10,
  animations: {
    idle:   { row: 0, frameCount: 4 },
    walk:   { row: 1, frameCount: 6 },
    attack: { row: 2, frameCount: 4 },
    hurt:   { row: 3, frameCount: 3 },
    death:  { row: 4, frameCount: 5 },
    run:    { row: 5, frameCount: 6 },
  },
}

interface CharacterProps {
  initialData:   CharacterData
  spriteConfig?: SpriteConfig
  /** Called every frame so parent can follow with camera */
  onPositionChange?: (x: number, z: number) => void
}

export default function Character({
  initialData,
  spriteConfig = DEFAULT_SPRITE,
  onPositionChange,
}: CharacterProps) {
  const meshRef    = useRef<THREE.Mesh>(null)
  const frameRef   = useRef(0)
  const elapsedRef = useRef(0)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  const keys                       = useKeyboard()
  const { character, applyMovement } = useCharacter(initialData)

  useEffect(() => {
    let cancelled = false
    let loadedTexture: THREE.Texture | null = null

    setTexture(null)

    const loader = new TextureLoader()
    loader.load(
      spriteConfig.sheetPath,
      (spriteTexture) => {
        if (cancelled) {
          spriteTexture.dispose()
          return
        }

        spriteTexture.magFilter = NearestFilter
        spriteTexture.minFilter = NearestFilter
        spriteTexture.wrapS     = ClampToEdgeWrapping
        spriteTexture.wrapT     = ClampToEdgeWrapping
        // Show a single frame cell
        spriteTexture.repeat.set(
          1 / spriteConfig.columns,
          1 / spriteConfig.rows,
        )
        spriteTexture.needsUpdate = true

        loadedTexture = spriteTexture
        setTexture(spriteTexture)
      },
      undefined,
      () => {
        if (!cancelled) setTexture(null)
      },
    )

    return () => {
      cancelled = true
      loadedTexture?.dispose()
    }
  }, [spriteConfig])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    // ── Move character ───────────────────────────────────────────────────────
    applyMovement(keys, delta)

    // ── Animate sprite sheet ─────────────────────────────────────────────────
    if (texture) {
      elapsedRef.current += delta
      const frameDuration = 1 / spriteConfig.fps
      if (elapsedRef.current >= frameDuration) {
        elapsedRef.current = 0
        const anim = spriteConfig.animations[character.animationState as AnimationState]
        frameRef.current = (frameRef.current + 1) % anim.frameCount

        // UV offset = (col / totalCols, (rows-1-row) / totalRows)
        texture.offset.set(
          frameRef.current / spriteConfig.columns,
          (spriteConfig.rows - 1 - anim.row) / spriteConfig.rows,
        )
        texture.needsUpdate = true
      }
    }

    // ── Sync mesh position with character state ───────────────────────────────
    meshRef.current.position.x = character.positionX
    meshRef.current.position.z = character.positionZ
    meshRef.current.position.y = 0.5 // hover slightly above floor

    // ── Flip sprite based on direction ───────────────────────────────────────
    meshRef.current.scale.x = character.direction === 'left' ? -1 : 1

    // ── Notify parent of new position ────────────────────────────────────────
    onPositionChange?.(character.positionX, character.positionZ)
  })

  return (
    <mesh ref={meshRef} castShadow>
      {/* Billboard-style plane: 1 unit wide, 1 unit tall */}
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        map={texture ?? undefined}
        color={texture ? '#ffffff' : '#c084fc'}
        transparent={Boolean(texture)}
        alphaTest={texture ? 0.1 : 0}
        depthWrite={!texture}
      />
    </mesh>
  )
}
