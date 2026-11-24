'use client'
/**
 * Student leaderboard (2026-10b revision, item 7).
 * Rank · Username · Section · Total Points, with the viewer's own row
 * highlighted. Rankings follow the points recorded during play.
 * Suggested design (Nov 24): hero + trophy art, a gold ribbon, medal badges
 * for the top three and a gold-framed row for the viewer.
 */
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Crown, Layers, RefreshCw, Star, User } from 'lucide-react'

const MEDAL: Record<number, string> = { 1: 'game-badge-gold', 2: 'game-badge-silver', 3: 'game-badge-bronze' }

type Row = {
  rank: number
  id: number
  username: string
  name: string
  section: string | null
  totalPoints: number
  isMe: boolean
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [me, setMe] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard', { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (json.success) { setRows(json.data.rows); setMe(json.data.me) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const outsideTop = me && !rows.some(r => r.isMe)

  return (
    <div className="student-scroll-area px-3 py-3 space-y-2.5">
      <div className="student-page-head -mt-1 flex items-center gap-1.5">
        <div className="relative h-14 w-14 shrink-0">
          <Image src="/brand/hero-fairy.png" alt="" fill sizes="56px" className="drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]" unoptimized />
        </div>
        <div className="relative h-11 w-12 shrink-0">
          <Image src="/rewards/trophies/forest_hero.png" alt="" fill sizes="48px" unoptimized />
        </div>
        <div className="min-w-0">
          <h2 className="game-title text-2xl">Leaderboard</h2>
          <p className="game-pill-gold mt-0.5 text-[10px]">
            <Star className="h-3 w-3 fill-current" /> Top heroes by points earned in the game <Star className="h-3 w-3 fill-current" />
          </p>
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-6 text-xs text-white/80">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading rankings…
        </p>
      ) : rows.length === 0 ? (
        <p className="game-panel py-6 text-center text-xs text-white/80">No one has scored points yet — be the first!</p>
      ) : (
        <div className="game-panel px-1.5 pb-1.5 pt-0.5">
          <table className="w-full border-separate border-spacing-y-[3px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-[#ffd76a]">
              <tr>
                <th className="px-2.5 py-1.5"><span className="flex items-center gap-1"><Crown className="h-3.5 w-3.5 fill-current" /> Rank</span></th>
                <th className="px-2.5 py-1.5"><span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Username</span></th>
                <th className="px-2.5 py-1.5"><span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> Section</span></th>
                <th className="px-2.5 py-1.5 text-right"><span className="flex items-center justify-end gap-1"><Star className="h-3.5 w-3.5 fill-current" /> Total Points</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                // the viewer's row: a gold frame drawn on its cells (a <tr> takes no border)
                const cell = r.isMe
                  ? 'border-y-2 border-[color:var(--ms-gold)] bg-[#5b21b6]/85 first:rounded-l-lg first:border-l-2 last:rounded-r-lg last:border-r-2'
                  : 'bg-[#0a1a55]/70 first:rounded-l-lg last:rounded-r-lg'
                return (
                  <tr key={r.id} className={r.isMe ? 'font-black text-white' : 'text-white/90'}>
                    <td className={`px-2.5 py-1 ${cell}`}>
                      {MEDAL[r.rank]
                        ? <span className={`game-badge ${MEDAL[r.rank]} h-6 w-6 text-[11px] font-black`}>{r.rank}</span>
                        : <span className="inline-block w-6 text-center font-black">{r.rank}</span>}
                    </td>
                    <td className={`px-2.5 py-1 ${cell}`}>
                      {r.username}
                      {r.isMe && <span className="ml-1.5 rounded-full bg-gradient-to-b from-[#ede9fe] to-[#a78bfa] px-1.5 py-0.5 text-[9px] font-black text-[#2e1065]">YOU</span>}
                    </td>
                    <td className={`px-2.5 py-1 text-white/75 ${cell}`}>{r.section ?? '—'}</td>
                    <td className={`px-2.5 py-1 text-right text-sm font-black text-[#ffd76a] ${cell}`}>{r.totalPoints}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {outsideTop && me && (
        <div className="game-panel game-panel-gold px-3 py-2 text-xs font-bold text-white">
          Your standing: #{me.rank} · {me.totalPoints} points
        </div>
      )}
    </div>
  )
}
