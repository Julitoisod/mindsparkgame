'use client'
/**
 * components/game/GameCanvas.tsx
 *
 * Root R3F canvas that wires together the 3D environment, sprite character,
 * particle system, camera follow, and the 2D HUD overlay.
 *
 * Lazy-loaded via next/dynamic to skip SSR (Three.js is browser-only).
 */
import { Suspense, useRef, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stats, PerformanceMonitor } from '@react-three/drei'

import Environment  from './Environment'
import Character    from './Character'
import Particles    from './Particles'
import CameraFollow from './CameraFollow'
import GameHUD      from './GameHUD'

import type { CharacterData } from '@/types/character'
import { useCharacter } from '@/hooks/useCharacter'

interface GameCanvasProps {
  characterData: CharacterData
  debugMode?:    boolean
}

export default function GameCanvas({ characterData, debugMode = false }: GameCanvasProps) {
  // Shared target that CameraFollow reads each frame
  const charPos = useRef({ x: characterData.positionX, z: characterData.positionZ })

  const { character, saveProgress } = useCharacter(characterData)
  const [saving, setSaving] = useState(false)

  const handlePositionChange = useCallback((x: number, z: number) => {
    charPos.current = { x, z }
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    await saveProgress('zone_1')
    setSaving(false)
  }, [saveProgress])

  return (
    <div className="relative w-full h-full">
      {/* ── 3D Canvas ─────────────────────────────────────────────────── */}
      <Canvas
        shadows
        camera={{ position: [0, 8, 6], fov: 50, near: 0.1, far: 100 }}
        gl={{
          antialias:         true,
          powerPreference:   'high-performance',
          // Limit pixel ratio for performance on mobile
        }}
        dpr={[1, 2]}
        style={{ background: '#1a1233' }}
      >
        {/* Lower DPR when GPU is stressed */}
        <PerformanceMonitor
          onDecline={() => { /* could lower quality */ }}
        />

        <Suspense fallback={null}>
          <Environment />

          <Particles color="#c084fc" size={0.04} />
          <Particles color="#e9d5ff" size={0.025} radius={15} />

          <Character
            initialData={characterData}
            onPositionChange={handlePositionChange}
          />

          <CameraFollow targetRef={charPos} />
        </Suspense>

        {debugMode && <Stats />}
      </Canvas>

      {/* ── 2D HUD overlay ────────────────────────────────────────────── */}
      <GameHUD character={character} onSave={handleSave} saving={saving} />
    </div>
  )
}
