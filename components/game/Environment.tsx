'use client'
/**
 * components/game/Environment.tsx
 *
 * Simple 3D game world:
 *  - Tiled floor plane
 *  - Ambient + directional lighting with shadows
 *  - A few decorative boxes / pillars for depth
 *  - Fog for atmosphere
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, Plane, Cylinder, Grid } from '@react-three/drei'
import type * as THREE from 'three'

// Boundary half-extents that match WORLD_BOUNDS in useCharacter.ts
const WORLD_SIZE = 10

function Pillar({ position }: { position: [number, number, number] }) {
  return (
    <Cylinder
      args={[0.2, 0.25, 3, 8]}
      position={position}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color="#2e215b" roughness={0.7} metalness={0.3} />
    </Cylinder>
  )
}

function DecorBox({ position, scale }: {
  position: [number, number, number]
  scale:    [number, number, number]
}) {
  return (
    <Box args={scale} position={position} castShadow receiveShadow>
      <meshStandardMaterial color="#3b2a73" roughness={0.8} metalness={0.2} />
    </Box>
  )
}

function RotatingCrystal({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.8
      ref.current.position.y = position[1] + Math.sin(Date.now() * 0.001) * 0.15
    }
  })
  return (
    <mesh ref={ref} position={position} castShadow>
      <octahedronGeometry args={[0.25, 0]} />
      <meshStandardMaterial
        color="#c084fc"
        emissive="#a855f7"
        emissiveIntensity={0.6}
        roughness={0.1}
        metalness={0.9}
        transparent
        opacity={0.85}
      />
    </mesh>
  )
}

export default function Environment() {
  return (
    <>
      {/* ── Fog ──────────────────────────────────────────────────────────── */}
      <fog attach="fog" args={['#1a1233', 15, 40]} />

      {/* ── Lighting ─────────────────────────────────────────────────────── */}
      <ambientLight intensity={0.4} color="#e9d5ff" />

      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={40}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Green fill lights */}
      <pointLight position={[-8, 3, -8]} intensity={2} color="#c084fc" distance={12} />
      <pointLight position={[8,  3,  8]} intensity={2} color="#a855f7" distance={12} />
      <pointLight position={[0,  5,  0]} intensity={0.8} color="#e9d5ff" distance={15} />

      {/* ── Floor ────────────────────────────────────────────────────────── */}
      <Plane
        args={[WORLD_SIZE * 2, WORLD_SIZE * 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#1a1233" roughness={0.9} metalness={0.1} />
      </Plane>

      {/* Grid overlay */}
      <Grid
        args={[WORLD_SIZE * 2, WORLD_SIZE * 2]}
        position={[0, 0.001, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#4c3690"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9333ea"
        fadeDistance={20}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* ── Boundary walls (invisible collision) ─────────────────────────── */}
      {/* These are just visual decorative pillars at corners */}
      <Pillar position={[-WORLD_SIZE,  1.5, -WORLD_SIZE]} />
      <Pillar position={[ WORLD_SIZE,  1.5, -WORLD_SIZE]} />
      <Pillar position={[-WORLD_SIZE,  1.5,  WORLD_SIZE]} />
      <Pillar position={[ WORLD_SIZE,  1.5,  WORLD_SIZE]} />

      {/* Mid pillars */}
      <Pillar position={[0,  1.5, -WORLD_SIZE]} />
      <Pillar position={[0,  1.5,  WORLD_SIZE]} />
      <Pillar position={[-WORLD_SIZE, 1.5, 0]} />
      <Pillar position={[ WORLD_SIZE, 1.5, 0]} />

      {/* ── Decorative boxes ─────────────────────────────────────────────── */}
      <DecorBox position={[-7, 0.5, -7]} scale={[1.5, 1, 1.5]} />
      <DecorBox position={[ 7, 0.5, -7]} scale={[1,   2, 1  ]} />
      <DecorBox position={[-6, 0.5,  6]} scale={[2,   1, 1  ]} />
      <DecorBox position={[ 5, 0.5,  5]} scale={[1.2, 1.5, 1.2]} />
      <DecorBox position={[ 0, 0.5, -8]} scale={[3, 1, 0.5]} />

      {/* ── Floating crystals ────────────────────────────────────────────── */}
      <RotatingCrystal position={[-4, 1.5, -4]} />
      <RotatingCrystal position={[ 4, 1.5,  4]} />
      <RotatingCrystal position={[-4, 1.5,  4]} />
      <RotatingCrystal position={[ 4, 1.5, -4]} />
      <RotatingCrystal position={[ 0, 1.5,  0]} />
    </>
  )
}
