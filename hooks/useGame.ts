'use client'
/**
 * hooks/useGame.ts
 * Top-level game state: inventory, progress loading, save flow.
 */
import { useState, useEffect, useCallback } from 'react'
import type { InventorySlot, GameProgress } from '@/types/game'
import toast from 'react-hot-toast'

export function useGame(characterId: number) {
  const [inventory,  setInventory]  = useState<InventorySlot[]>([])
  const [progress,   setProgress]   = useState<GameProgress | null>(null)
  const [loadingInv, setLoadingInv] = useState(true)
  const [loadingPro, setLoadingPro] = useState(true)

  // ─── Load inventory ────────────────────────────────────────────────────────
  const loadInventory = useCallback(async () => {
    if (!characterId || characterId <= 0) return
    setLoadingInv(true)
    try {
      const res  = await fetch(`/api/inventory?characterId=${characterId}`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) setInventory(json.data ?? [])
    } catch {
      toast.error('Failed to load inventory')
    } finally {
      setLoadingInv(false)
    }
  }, [characterId])

  // ─── Load progress ─────────────────────────────────────────────────────────
  const loadProgress = useCallback(async () => {
    if (!characterId || characterId <= 0) return
    setLoadingPro(true)
    try {
      const res  = await fetch(`/api/progress?characterId=${characterId}`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) setProgress(json.data ?? null)
    } catch {
      toast.error('Failed to load progress')
    } finally {
      setLoadingPro(false)
    }
  }, [characterId])

  useEffect(() => {
    if (characterId && characterId > 0) {
      loadInventory()
      loadProgress()
    }
  }, [characterId, loadInventory, loadProgress])

  // ─── Equip / unequip item ──────────────────────────────────────────────────
  const toggleEquip = useCallback(async (slotId: number, equipped: boolean) => {
    try {
      const res  = await fetch(`/api/inventory/${slotId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ equipped: !equipped }),
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success) {
        setInventory(prev =>
          prev.map(s => s.id === slotId ? { ...s, equipped: !equipped } : s)
        )
        toast.success(equipped ? 'Item unequipped' : 'Item equipped')
      }
    } catch {
      toast.error('Failed to update item')
    }
  }, [])

  return {
    inventory,
    progress,
    loadingInv,
    loadingPro,
    loadInventory,
    loadProgress,
    toggleEquip,
  }
}
