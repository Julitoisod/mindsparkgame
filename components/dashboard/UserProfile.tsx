'use client'
/**
 * components/dashboard/UserProfile.tsx
 * Avatar + username + account info card.
 */
import { motion } from 'framer-motion'
import { User, Mail, Calendar, LogOut } from 'lucide-react'
import Card   from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { PublicUser } from '@/types/user'
import { timeAgo } from '@/lib/utils'

interface UserProfileProps {
  user:     PublicUser
  onLogout: () => void
}

export default function UserProfile({ user, onLogout }: UserProfileProps) {
  const initials = user.username.slice(0, 2).toUpperCase()

  return (
    <Card glow="green" className="space-y-5">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <motion.div
          animate={{ boxShadow: ['0 0 10px #41ab5d', '0 0 25px #74c476', '0 0 10px #41ab5d'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#238b45] to-[#74c476] flex items-center justify-center shrink-0"
        >
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-full h-full rounded-2xl object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-white font-game">{initials}</span>
          )}
        </motion.div>

        <div className="min-w-0">
          <h3 className="text-xl font-bold text-white font-game truncate">{user.username}</h3>
          <p className="text-sm text-primary-100/65 truncate">{user.email}</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-primary-100/65">
          <User className="w-4 h-4 text-primary-300 shrink-0" />
          <span className="truncate">ID #{user.id}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-primary-100/65">
          <Mail className="w-4 h-4 text-primary-300 shrink-0" />
          <span className="truncate">{user.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-primary-100/65">
          <Calendar className="w-4 h-4 text-primary-300 shrink-0" />
          <span>Joined {timeAgo(user.created_at)}</span>
        </div>
      </div>

      <Button
        variant="danger"
        size="sm"
        icon={<LogOut className="w-3.5 h-3.5" />}
        onClick={onLogout}
        className="w-full"
      >
        Sign Out
      </Button>
    </Card>
  )
}
