'use client'
/**
 * components/game/Particles.tsx
 *
 * Ambient floating particles rendered as Points.
 * Cheap GPU-friendly background effect.
 */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 300

interface ParticlesProps {
  radius?: number
  color?:  string
  size?:   number
}

export default function Particles({
  radius = 12,
  color  = '#74c476',
  size   = 0.035,
}: ParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null)

  // Generate random positions once
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const vel = new Float32Array(PARTICLE_COUNT) // individual float speeds

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos((Math.random() * 2) - 1)
      const r     = Math.random() * radius

      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8   // spread vertically
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

      vel[i] = 0.2 + Math.random() * 0.5
    }

    return { positions: pos, velocities: vel }
  }, [radius])

  // Float particles upward, reset when they reach the top
  useFrame((_, delta) => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const arr     = posAttr.array as Float32Array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3 + 1] += velocities[i] * delta

      if (arr[i * 3 + 1] > 6) {
        arr[i * 3 + 1] = -4
      }
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
