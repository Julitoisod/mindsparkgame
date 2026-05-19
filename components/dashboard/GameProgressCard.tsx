'use client'
/**
 * components/dashboard/GameProgressCard.tsx
 * Shows the latest save-slot info and lets the player load/reset progress.
 */
import { motion } from 'framer-motion'
import { MapPin, Clock, Trophy, RefreshCw } from 'lucide-react'
import Card   from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { GameProgress } from '@/types/game'
import { formatTime, timeAgo } from '@/lib/utils'

interface GameProgressCardProps {
  progress:   GameProgress | null
  onLoad:     () => void
  loading?:   boolean
}

export default function GameProgressCard({ progress, onLoad, loading = false }: GameProgressCardProps) {
  if (!progress) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <Trophy className="w-10 h-10 text-primary-100/35" />
        <p className="text-primary-100/45 text-sm">No saved progress yet.</p>
        <p className="text-primary-100/35 text-xs">Start a game to create your first save.</p>
      </Card>
    )
  }

  const completedCount = progress.completedLevels?.length ?? 0

  return (
    <Card glow="green" className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white font-game flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary-200" />
          Game Progress
        </h3>
        <span className="text-xs text-primary-100/45">Last saved {timeAgo(progress.lastSaved)}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-primary-800/50 rounded-xl p-3 space-y-1"
        >
          <div className="flex items-center gap-1.5 text-xs text-primary-100/45">
            <MapPin className="w-3.5 h-3.5" />
            Current Zone
          </div>
          <p className="text-white font-semibold text-sm capitalize">
            {progress.currentZone.replace(/_/g, ' ')}
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-primary-800/50 rounded-xl p-3 space-y-1"
        >
          <div className="flex items-center gap-1.5 text-xs text-primary-100/45">
            <Clock className="w-3.5 h-3.5" />
            Play Time
          </div>
          <p className="text-white font-semibold text-sm">
            {formatTime(progress.playtimeSeconds)}
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-primary-800/50 rounded-xl p-3 space-y-1 col-span-2"
        >
          <div className="flex items-center gap-1.5 text-xs text-primary-100/45">
            <Trophy className="w-3.5 h-3.5" />
            Levels Cleared
          </div>
          <p className="text-white font-semibold">{completedCount}</p>
        </motion.div>
      </div>

      <Button
        variant="primary"
        icon={<RefreshCw className="w-4 h-4" />}
        loading={loading}
        onClick={onLoad}
        className="w-full"
      >
        Load Save
      </Button>
    </Card>
  )
}
