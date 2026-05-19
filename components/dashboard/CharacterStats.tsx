'use client'
/**
 * components/dashboard/CharacterStats.tsx
 * Full character stats card with animated bars.
 */
import { motion } from 'framer-motion'
import { Sword, Shield, Zap, Star, Heart, Sparkles } from 'lucide-react'
import Card    from '@/components/ui/Card'
import StatBar from '@/components/ui/StatBar'
import Badge   from '@/components/ui/Badge'
import type { CharacterData } from '@/types/character'
import { capitalize } from '@/lib/utils'

interface CharacterStatsProps {
  character: CharacterData
}

const statIcons = {
  attack:  { icon: Sword,    color: 'text-primary-200',   label: 'Attack'  },
  defense: { icon: Shield,   color: 'text-primary-300',   label: 'Defense' },
  speed:   { icon: Zap,      color: 'text-primary-200', label: 'Speed'   },
  level:   { icon: Star,     color: 'text-primary-300',   label: 'Level'   },
  hp:      { icon: Heart,    color: 'text-primary-300',     label: 'HP'      },
  mp:      { icon: Sparkles, color: 'text-primary-300',  label: 'MP'      },
}

export default function CharacterStats({ character }: CharacterStatsProps) {
  const { stats } = character

  return (
    <Card glow="green" className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white font-game">{character.name}</h3>
          <p className="text-sm text-primary-100/65 mt-0.5">
            {capitalize(character.class)} · Zone 1
          </p>
        </div>
        <Badge variant={character.class === 'warrior' ? 'rare' : 'epic'}>
          {capitalize(character.class)}
        </Badge>
      </div>

      {/* Vital bars */}
      <div className="space-y-3">
        <StatBar label="HP" value={stats.hp}          max={stats.maxHp}          color="green" />
        <StatBar label="MP" value={stats.mp}          max={stats.maxMp}          color="green" />
        <StatBar label="XP" value={stats.experience}  max={stats.experienceToNext} color="green" />
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries({
          attack:  stats.attack,
          defense: stats.defense,
          speed:   stats.speed,
        }) as [keyof typeof statIcons, number][]).map(([key, val], i) => {
          const { icon: Icon, color, label } = statIcons[key]
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-1 bg-primary-800/60 rounded-xl p-3"
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-lg font-bold text-white">{val}</span>
              <span className="text-xs text-primary-100/45">{label}</span>
            </motion.div>
          )
        })}
      </div>

      {/* Level display */}
      <div className="flex items-center justify-between bg-primary-800/40 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary-300" />
          <span className="text-sm text-primary-100">Level</span>
        </div>
        <span className="text-2xl font-bold text-primary-300 font-game">{stats.level}</span>
      </div>
    </Card>
  )
}
