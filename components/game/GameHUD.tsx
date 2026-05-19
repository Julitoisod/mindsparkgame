'use client'
/**
 * components/game/GameHUD.tsx
 *
 * In-game heads-up display: HP / MP bars, level badge, keybind hints,
 * and a save button.  Rendered as normal React DOM on top of the canvas.
 */
import { motion } from 'framer-motion'
import { Save, Sword, Shield, Zap } from 'lucide-react'
import StatBar from '@/components/ui/StatBar'
import Button  from '@/components/ui/Button'
import type { CharacterData } from '@/types/character'

interface GameHUDProps {
  character:  CharacterData
  onSave:     () => void
  saving?:    boolean
}

export default function GameHUD({ character, onSave, saving = false }: GameHUDProps) {
  const { stats } = character

  return (
    <>
      {/* ── Top-left: HP / MP / Level ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x:  0  }}
        className="absolute top-4 left-4 z-10 space-y-2 w-56"
      >
        <div className="bg-primary-900/80 backdrop-blur-sm rounded-xl border border-primary-200/15 p-3 space-y-2">
          {/* Character name + level */}
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-white font-semibold text-sm font-game">
              {character.name}
            </span>
            <span className="shrink-0 text-xs text-primary-300 font-bold">LV {stats.level}</span>
          </div>

          <StatBar label="HP" value={stats.hp}   max={stats.maxHp} color="green" />
          <StatBar label="MP" value={stats.mp}   max={stats.maxMp} color="green" />
          <StatBar label="XP" value={stats.experience} max={stats.experienceToNext} color="green" />
        </div>

        {/* Stat badges */}
        <div className="flex gap-2">
          <div className="flex items-center gap-1 bg-primary-900/80 rounded-lg px-2 py-1 border border-primary-200/15">
            <Sword  className="w-3 h-3 text-primary-200"   />
            <span className="text-xs text-primary-100">{stats.attack}</span>
          </div>
          <div className="flex items-center gap-1 bg-primary-900/80 rounded-lg px-2 py-1 border border-primary-200/15">
            <Shield className="w-3 h-3 text-primary-300"   />
            <span className="text-xs text-primary-100">{stats.defense}</span>
          </div>
          <div className="flex items-center gap-1 bg-primary-900/80 rounded-lg px-2 py-1 border border-primary-200/15">
            <Zap    className="w-3 h-3 text-primary-200" />
            <span className="text-xs text-primary-100">{stats.speed}</span>
          </div>
        </div>
      </motion.div>

      {/* ── Top-right: Save button ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x:  0 }}
        className="absolute top-4 right-4 z-10"
      >
        <Button
          variant="neon"
          size="sm"
          icon={<Save className="w-3.5 h-3.5" />}
          loading={saving}
          onClick={onSave}
        >
          Save
        </Button>
      </motion.div>

      {/* ── Bottom: keybind hints ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y:  0 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
      >
        <div className="flex gap-3 bg-primary-900/70 backdrop-blur-sm rounded-xl border border-primary-200/15 px-4 py-2">
          {[
            { key: 'WASD / ↑↓←→', label: 'Move' },
            { key: 'Space / J',    label: 'Attack' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-primary-100/65">
              <kbd className="px-1.5 py-0.5 rounded bg-primary-800 border border-primary-200/15 text-primary-100 font-mono text-[10px]">
                {key}
              </kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  )
}
