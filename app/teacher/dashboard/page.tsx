'use client'
/**
 * Teacher Dashboard — laid out after the panel's mockup (Nov 2026): welcome
 * banner with the chosen section, four stat cards, the class performance chart
 * (average best-run score per level, out of 10), recent student activity,
 * students who need attention, and a way into Reports. Sections are created on
 * the Section page and students enrolled on the Enrollment page.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Medal,
  School,
  Trophy,
  Users,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { currentSchoolYear, formatSchoolYear } from '@/lib/enrollment'
import { timeAgo } from '@/lib/utils'

type Classroom = { id: number; name: string; schoolYear: string | null; studentCount: number }
type Overview = {
  stats: { totalStudents: number; sections: number; classAverage: number | null; finishedAll: number }
  levelAverages: { level: number; average: number | null; students: number }[]
  needsAttention: { studentId: number; name: string; level: number | null; score: number | null; status: string }[]
  recent: { kind: 'completed' | 'badge'; studentId: number; text: string; detail: string; at: string }[]
}

const statusTone: Record<string, string> = {
  'Needs Help': 'bg-red-100 text-red-700',
  Moderate: 'bg-amber-100 text-amber-700',
  'Not Started': 'bg-gray-100 text-gray-600',
}

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [classroomId, setClassroomId] = useState<number | ''>('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/teacher/classrooms', { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setClassrooms(json.data) })
      .catch(() => {})
    fetch('/api/account', { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setFullName(json.data.fullName) })
      .catch(() => {})
  }, [])

  const loadOverview = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/teacher/overview${classroomId ? `?classroomId=${classroomId}` : ''}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      setOverview(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the dashboard')
    }
  }, [classroomId])

  useEffect(() => { loadOverview() }, [loadOverview])

  const section = classrooms.find(c => c.id === classroomId)
  const stats = overview?.stats
  const cards = [
    { label: 'Total Students', value: stats ? String(stats.totalStudents) : '—', sub: 'Currently enrolled', icon: Users, card: 'bg-[#f5efff] border-[#e8dcff]', icon_: 'bg-[#e6dcff] text-[#7C58D8]' },
    { label: 'Total Sections', value: stats ? String(stats.sections) : '—', sub: 'Managed by you', icon: School, card: 'bg-[#eef5ff] border-[#d8e6ff]', icon_: 'bg-[#dbeafe] text-[#3B82F6]' },
    { label: 'Class Average', value: stats?.classAverage != null ? `${stats.classAverage}%` : '—', sub: 'Best-run scores, all levels', icon: BarChart3, card: 'bg-[#eefaf2] border-[#d4efd9]', icon_: 'bg-[#d9f3df] text-[#16A34A]' },
    { label: 'Students Completed', value: stats ? `${stats.finishedAll} / ${stats.totalStudents}` : '—', sub: 'Completed all 5 levels', icon: Trophy, card: 'bg-[#fff9ec] border-[#fce7ba]', icon_: 'bg-[#fdecc8] text-[#d97706]' },
  ]

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6a4fe0] via-[#7458e6] to-[#8c74f0] px-6 py-5 shadow-lg shadow-[#6255E8]/20"
      >
        <span className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute right-24 top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-[#6255E8] shadow">
            <BookOpen className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-[#fff]">Welcome back, {fullName || user?.username || 'Teacher'}!</h2>
            <p className="mt-0.5 text-sm font-medium text-[#fff]/90">
              Grade 5 Mathematics <span className="mx-1.5 opacity-60">|</span>
              {formatSchoolYear(section?.schoolYear ?? currentSchoolYear())} <span className="mx-1.5 opacity-60">|</span>
              {section ? `${section.name} Section` : 'All Sections'}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-xs font-bold text-[#6f7187]">
          Section
          <select
            value={classroomId}
            onChange={e => setClassroomId(Number(e.target.value) || '')}
            className="rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9B83F5]"
          >
            <option value="">All Sections</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-2xl border p-4 shadow-sm ${card.card}`}
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${card.icon_}`}>
                <card.icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#374151]">{card.label}</p>
                <p className="text-2xl font-black text-[#111827]">{card.value}</p>
                <p className="text-[11px] text-[#6B7280]">{card.sub}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        {/* Class Performance Overview */}
        <section className="rounded-2xl border border-[#ece8f5] bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-bold text-[#1f2430]">
            <BarChart3 className="h-4 w-4 text-[#6255E8]" /> Class Performance Overview
          </h3>
          <p className="text-xs text-[#8f88a1]">Average score per level (out of 10) — each student&apos;s best run, students who played that level</p>
          <LevelChart data={overview?.levelAverages ?? []} />
        </section>

        {/* Recent Student Activity */}
        <section className="rounded-2xl border border-[#ece8f5] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-[#1f2430]"><Clock className="h-4 w-4 text-[#6255E8]" /> Recent Student Activity</h3>
            <Link href="/teacher/reports" className="text-xs font-bold text-[#6255E8] hover:underline">View All</Link>
          </div>
          {!overview ? (
            <p className="text-sm text-[#8f88a1]">Loading…</p>
          ) : overview.recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#8f88a1]">No activity yet — it appears as students play.</p>
          ) : (
            <ul className="space-y-2.5">
              {overview.recent.map((item, i) => (
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
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        {/* Students Who Need Attention */}
        <section className="rounded-2xl border border-[#ece8f5] bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-bold text-[#1f2430]"><AlertTriangle className="h-4 w-4 text-red-500" /> Students Who Need Attention</h3>
          <p className="mb-3 text-xs text-[#8f88a1]">Lowest best-run level score (7/10 or below), then students who have not started</p>
          {!overview ? (
            <p className="text-sm text-[#8f88a1]">Loading…</p>
          ) : overview.needsAttention.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#8f88a1]">Everyone is doing well.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="bg-[#faf8ff] text-left text-xs font-bold text-[#6f7187]">
                    <th className="rounded-l-lg px-3 py-2">Student Name</th>
                    <th className="px-3 py-2">Level</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="rounded-r-lg px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ecf8]">
                  {overview.needsAttention.map(row => (
                    <tr key={row.studentId}>
                      <td className="px-3 py-2.5 font-semibold text-[#1f2430]">{row.name}</td>
                      <td className="px-3 py-2.5 text-[#5f5677]">{row.level ? `Level ${row.level}` : '—'}</td>
                      <td className="px-3 py-2.5 text-[#5f5677]">{row.score != null ? `${row.score} / 10` : '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${statusTone[row.status] ?? statusTone['Not Started']}`}>{row.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/teacher/students?student=${row.studentId}`} className="rounded-lg border border-[#cfc2ea] px-3 py-1 text-xs font-bold text-[#6255E8] hover:bg-[#f4efff]">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link href="/teacher/reports" className="mt-3 flex items-center justify-end gap-1 text-xs font-bold text-[#6255E8] hover:underline">
            View All in Reports <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        {/* Go to Reports */}
        <section className="relative overflow-hidden rounded-2xl border border-[#e3dbff] bg-gradient-to-br from-[#f5f1ff] to-[#ebe4ff] p-6 shadow-sm">
          <span className="pointer-events-none absolute -right-8 -top-10 h-40 w-24 rotate-[35deg] rounded-3xl bg-[#d9ccff]/60" />
          <div className="relative flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#6255E8] shadow"><FileText className="h-6 w-6" /></span>
            <div>
              <h3 className="font-black text-[#1e1b4b]">Need the Full Details?</h3>
              <p className="mt-1 text-sm text-[#5b5675]">View complete student performance, class records, and assessment results in the Reports page.</p>
            </div>
          </div>
          <Link
            href="/teacher/reports"
            className="relative mt-5 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c5cf0] to-[#5a3fd4] py-3 text-sm font-bold text-[#fff] shadow-lg shadow-[#6255E8]/25 hover:brightness-110"
          >
            <ArrowRight className="h-4 w-4" /> Go to Reports
          </Link>
        </section>
      </div>
    </div>
  )
}

/** Average best-run score per level — one series, one hue, labelled bars. */
function LevelChart({ data }: { data: Overview['levelAverages'] }) {
  const ticks = [10, 8, 6, 4, 2, 0]
  return (
    <figure
      className="mt-8"
      aria-label={`Average score per level out of 10: ${data.map(d => `Level ${d.level} ${d.average ?? 'not played'}`).join(', ')}`}
    >
      <div className="relative flex h-52">
        {/* y-axis + recessive grid */}
        <div className="flex w-7 flex-col justify-between pb-6 text-right text-[10px] text-[#9aa0b2]">
          {ticks.map(t => <span key={t} className="-translate-y-1.5 leading-none">{t}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between">
            {ticks.map(t => <span key={t} className={`border-t ${t === 0 ? 'border-[#c9c3da]' : 'border-dashed border-[#efedf5]'}`} />)}
          </div>
          <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-around pl-2">
            {(data.length ? data : [1, 2, 3, 4, 5].map(level => ({ level, average: null, students: 0 }))).map(d => (
              <div key={d.level} className="group flex h-full w-12 flex-col items-center justify-end">
                <div className="relative flex w-full flex-1 items-end justify-center pb-px">
                  {d.average != null ? (
                    <div
                      title={`Level ${d.level}: ${d.average} / 10 average (${d.students} student${d.students === 1 ? '' : 's'})`}
                      className="relative w-9 rounded-t-[4px] bg-[#6255E8] transition group-hover:bg-[#4b3fc4]"
                      style={{ height: `${(d.average / 10) * 100}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-black text-[#1f2430]">{d.average}</span>
                    </div>
                  ) : (
                    <span title={`Level ${d.level}: not played yet`} className="mb-1 text-xs font-bold text-[#c0bccd]">—</span>
                  )}
                </div>
                <span className="mt-1.5 h-4 text-xs font-bold text-[#6f7187]">L{d.level}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </figure>
  )
}
