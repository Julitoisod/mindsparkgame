'use client'
/**
 * Student leaderboard (2026-10b revision, item 7).
 * Rank · Username · Section · Total Points, with the viewer's own row
 * highlighted. Rankings follow the points recorded during play.
 */
import { useEffect, useState } from 'react'
import { Crown, Medal, RefreshCw, Trophy } from 'lucide-react'

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

  const medal = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-300" />
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-300" />
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />
    return null
  }

  const outsideTop = me && !rows.some(r => r.isMe)

  return (
    <div className="student-scroll-area px-3 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-[#D9B8FF]" />
        <div>
          <h2 className="font-game text-base font-bold text-white">Leaderboard</h2>
          <p className="text-[10px] text-white/60">Top heroes by points earned in the game</p>
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-6 text-xs text-white/70">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading rankings…
        </p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-white/60">No one has scored points yet — be the first!</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#9B83F5]/20 bg-[#22326f]/55">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#3459C7]/45 text-[10px] uppercase tracking-wide text-[#D9B8FF]">
              <tr>
                <th className="px-3 py-2">Rank</th>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2 text-right">Total Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map(r => (
                <tr
                  key={r.id}
                  className={r.isMe ? 'bg-[#6255E8]/45 font-bold text-white' : 'text-white/85'}
                >
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">{medal(r.rank)} {r.rank}</span>
                  </td>
                  <td className="px-3 py-2">
                    {r.username}
                    {r.isMe && <span className="ml-1.5 rounded-full bg-[#D9B8FF] px-1.5 py-0.5 text-[9px] font-black text-[#22326f]">YOU</span>}
                  </td>
                  <td className="px-3 py-2 text-white/70">{r.section ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-black text-[#D9B8FF]">{r.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {outsideTop && me && (
        <div className="rounded-lg border border-[#D9B8FF]/40 bg-[#6255E8]/40 px-3 py-2 text-xs font-bold text-white">
          Your standing: #{me.rank} · {me.totalPoints} points
        </div>
      )}
    </div>
  )
}
