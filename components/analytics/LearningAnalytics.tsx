'use client'
/**
 * The learning-analytics block shared by the teacher Dashboard and the admin
 * Dashboard (panel revision, Nov 2026b): Student Proficiency Distribution,
 * Level Performance (renamed from "Lesson Performance"), Student Performance
 * (renamed from "Student Performance Trend"), Learning Gaps and Recent Student
 * Activity. Data comes from lib/analytics.ts via the overview APIs.
 */
import type { ReactNode } from 'react'
import { BarChart3, CheckCircle2, Clock, Lightbulb, Medal, PieChart, TrendingUp, XCircle } from 'lucide-react'
import { BAND_COLORS, type Analytics } from '@/lib/analytics'
import { timeAgo } from '@/lib/utils'
import { Donut, LineChart, SERIES } from './Charts'

export type Activity = { kind: 'completed' | 'badge'; studentId: number; text: string; detail: string; at: string }

export function Card({ icon: Icon, title, aside, children, className = '' }: {
  icon: typeof BarChart3
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-[#ece8f5] bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold text-[#1f2430]"><Icon className="h-4 w-4 text-[#6255E8]" /> {title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0)

function ProficiencyCard({ analytics }: { analytics: Analytics }) {
  const { bands, notStarted } = analytics.proficiency
  const started = bands.reduce((s, b) => s + b.count, 0)
  return (
    <Card icon={PieChart} title="Student Proficiency Distribution" aside={<span className="text-[11px] font-semibold text-[#8f88a1]">DepEd bands</span>}>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <Donut
          segments={bands.map(b => ({ label: b.band, value: b.count, color: BAND_COLORS[b.band] }))}
          centerValue={analytics.classAverage !== null ? `${analytics.classAverage}%` : '—'}
          centerLabel="Class average"
        />
        <ul className="min-w-[220px] flex-1 space-y-2 text-sm">
          {bands.map(b => (
            <li key={b.band} className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/5" style={{ background: BAND_COLORS[b.band] }} />
              <span className="flex-1 text-[#374151]">{b.band}</span>
              <span className="w-20 text-right text-xs text-[#6f7187]">{b.count} student{b.count === 1 ? '' : 's'}</span>
              <span className="w-10 text-right text-xs font-bold text-[#1f2430]">{pct(b.count, started)}%</span>
            </li>
          ))}
          {notStarted > 0 && <li className="pt-1 text-xs text-[#8f88a1]">{notStarted} student{notStarted === 1 ? ' has' : 's have'} not started yet</li>}
        </ul>
      </div>
    </Card>
  )
}

function LevelPerformanceCard({ analytics }: { analytics: Analytics }) {
  return (
    <Card icon={BarChart3} title="Level Performance" aside={<span className="text-[11px] font-semibold text-[#8f88a1]">Average score (out of 10)</span>}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {analytics.levelAverages.map(l => (
          <div key={l.level} className="rounded-xl border border-[#f0ecf8] bg-[#faf8ff] p-3" title={`${l.students} student${l.students === 1 ? '' : 's'} played Level ${l.level}`}>
            <p className="text-xs font-black text-[#6255E8]">L{l.level}</p>
            <p className="line-clamp-2 min-h-[28px] text-[11px] font-semibold leading-tight text-[#5f5677]">{l.title}</p>
            <p className="mt-1 text-xl font-black text-[#1f2430]">{l.average ?? '—'}<span className="text-xs font-bold text-[#8f88a1]">{l.average !== null ? '/10' : ''}</span></p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#ebe7f5]">
              <div className="h-full rounded-full" style={{ width: `${(l.average ?? 0) * 10}%`, background: SERIES }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function StudentPerformanceCard({ analytics }: { analytics: Analytics }) {
  return (
    <Card icon={TrendingUp} title="Student Performance">
      <p className="text-xs text-[#8f88a1]">Class average per level — each student&apos;s best run, out of 10</p>
      <LineChart
        points={analytics.levelAverages.map(l => ({
          label: `L${l.level}`,
          value: l.average,
          tip: l.average === null ? `Level ${l.level}: not played yet` : `Level ${l.level}: ${l.average}/10 (${l.students} student${l.students === 1 ? '' : 's'})`,
        }))}
        max={10}
        ticks={[0, 2, 4, 6, 8, 10]}
        ariaLabel={`Student performance per level: ${analytics.levelAverages.map(l => `Level ${l.level} ${l.average ?? 'not played'}`).join(', ')}`}
      />
    </Card>
  )
}

function LearningGapsCard({ analytics }: { analytics: Analytics }) {
  const { hardestLevel, commonMistake } = analytics.gaps
  return (
    <Card icon={Lightbulb} title="Learning Gaps">
      <p className="mt-3 text-xs font-bold text-[#6f7187]">Most Challenging Level</p>
      {hardestLevel ? (
        <div className="mt-1.5 flex items-center gap-3 rounded-xl bg-[#f4efff] p-3">
          <span className="text-2xl font-black text-[#6255E8]">L{hardestLevel.level}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#1f2430]">{hardestLevel.title}</p>
            <p className="text-xs text-[#6f7187]">Avg. score {hardestLevel.average}/10</p>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-sm text-[#8f88a1]">No level played yet.</p>
      )}
      <p className="mt-4 text-xs font-bold text-[#6f7187]">Common Mistakes</p>
      {commonMistake ? (
        <p className="mt-1.5 flex items-start gap-2 text-sm text-[#374151]">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>Incorrect <b>{commonMistake.category}</b> answers <span className="text-[#6f7187]">({commonMistake.wrongPct}% of those questions)</span></span>
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-[#8f88a1]">No mistakes recorded yet.</p>
      )}
    </Card>
  )
}

export function RecentStudentActivity({ items, viewAllHref }: { items: Activity[] | null; viewAllHref?: string }) {
  return (
    <Card icon={Clock} title="Recent Student Activity" aside={viewAllHref && <a href={viewAllHref} className="text-xs font-bold text-[#6255E8] hover:underline">View All</a>}>
      {!items ? (
        <p className="mt-3 text-sm text-[#8f88a1]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#8f88a1]">No activity yet — it appears as students play.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.kind === 'completed' ? 'bg-[#dcf5e6] text-[#178a4c]' : 'bg-[#fdecc8] text-[#c27803]'}`}>
                {item.kind === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : <Medal className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1f2430]">
                  {item.text}{item.detail && <span className="ml-1.5 text-xs font-bold text-[#6f7187]">({item.detail})</span>}
                </p>
                <p className="text-[11px] text-[#9aa0b2]">{timeAgo(item.at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function LearningAnalytics({ analytics, recent, viewAllHref }: {
  analytics: Analytics | null
  recent: Activity[] | null
  viewAllHref?: string
}) {
  if (!analytics) return <p className="text-sm text-[#8f88a1]">Loading analytics…</p>
  return (
    <div className="space-y-4" data-testid="learning-analytics">
      <div className="grid gap-4 xl:grid-cols-[1fr_1.25fr]">
        <ProficiencyCard analytics={analytics} />
        <LevelPerformanceCard analytics={analytics} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <StudentPerformanceCard analytics={analytics} />
        <LearningGapsCard analytics={analytics} />
        <RecentStudentActivity items={recent} viewAllHref={viewAllHref} />
      </div>
    </div>
  )
}
