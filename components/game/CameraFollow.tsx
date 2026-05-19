'use client'
/**
 * components/game/CameraFollow.tsx
 *
 * Smoothly moves the camera behind/above the character position.
 * Must be used inside a <Canvas> context.
 */
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface CameraFollowProps {
  /** Current character position (updated every frame via callback in Character) */
  targetRef: React.MutableRefObject<{ x: number; z: number }>
  /** Camera height above target */
  height?: number
  /** Camera distance behind target */
  distance?: number
  /** Lerp factor (0 = instant, 1 = never moves) */
  smoothing?: number
}

export default function CameraFollow({
  targetRef,
  height    = 8,
  distance  = 6,
  smoothing = 0.1,
}: CameraFollowProps) {
  const { camera } = useThree()
  const lookAtPos  = useRef(new THREE.Vector3())

  useFrame(() => {
    const tx = targetRef.current.x
    const tz = targetRef.current.z

    // Desired camera position: behind + above the character
    const desiredX = tx
    const desiredY = height
    const desiredZ = tz + distance

    // Smooth lerp toward desired position
    camera.position.x += (desiredX - camera.position.x) * smoothing
    camera.position.y += (desiredY - camera.position.y) * smoothing
    camera.position.z += (desiredZ - camera.position.z) * smoothing

    // Look at the character (slightly above ground)
    lookAtPos.current.set(tx, 0.5, tz)
    camera.lookAt(lookAtPos.current)
  })

  return null
}
