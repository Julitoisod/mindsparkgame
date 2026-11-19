'use client'

import ClassRecord from '@/components/teacher/ClassRecord'
import PageHeader from '@/components/teacher/PageHeader'
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BarChart3, CheckCircle2, Download, FileSpreadsheet, FileText, Star, TrendingUp, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { buildFullReportCsv, reportSummary, studentPerformance } from '@/lib/reportExport'

const bandTone: Record<string, string> = {
  gray: 'text-gray-400', red: 'text-red-400', orange: 'text-orange-400', yellow: 'text-yellow-400', blue: 'text-blue-400', green: 'text-emerald-400',
}

type QuizScore = {
  levelNumber: number
  totalAttempts: number
  correctAttempts: number
  totalScore: number
  lastAttempt: string
}

type QuizSession = {
  user_id: number
  username: string
  classroom_name: string | null
  level_number: number
  session_date: string
  total_questions: number
  correct_answers: number
  total_score: number
}

type Student = {
  id: number
  username: string
  classroomId: number | null
  classroomName: string | null
  progress: {
    levelsCompleted: number
    totalLevels: number
    starBalance: number
    currentLevel: number
    performanceColor: 'none' | 'green' | 'yellow' | 'red'
  }
  quizScores: QuizScore[]
}

export default function TeacherReportsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [studRes, sessRes] = await Promise.all([
        fetch('/api/teacher/students', { credentials: 'include' }),
        fetch('/api/teacher/attempts', { credentials: 'include' }),
      ])
      const studJson = await studRes.json()
      const sessJson = await sessRes.json()
      if (studJson.success) setStudents(studJson.data)
      if (sessJson.success) setSessions(sessJson.data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Same numbers the downloaded report carries (lib/reportExport.ts)
  const { total, green, yellow, red, none, completionRate, activeRate, needsAttention, levelCompletion: levelData } = reportSummary(students)

  if (loading) {
    return <p className="text-purple-300 text-sm animate-pulse">Loading reports...</p>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Reports"
        subtitle="Quiz & boss battle intervention report — student performance, the class record, and every attempt."
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Completion Rate" value={`${completionRate}%`} sub={`${green}/${total} students`} color="from-emerald-500 to-teal-500" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Active Rate" value={`${activeRate}%`} sub={`${total - none} active`} color="from-blue-500 to-cyan-500" />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Needs Attention" value={String(needsAttention)} sub={`${total > 0 ? Math.round((needsAttention / total) * 100) : 0}% of total`} color="from-orange-500 to-red-500" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Total Students" value={String(total)} sub={`${students.length} enrolled`} color="from-purple-500 to-pink-500" />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Donut Chart — Performance Distribution */}
        <div className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5">
          <h3 className="font-bold text-white mb-4">Performance Distribution</h3>
          <div className="flex items-center justify-center gap-6">
            <DonutChart
              segments={[
                { value: green, color: '#10b981', label: 'Good' },
                { value: yellow, color: '#facc15', label: 'Average' },
                { value: red, color: '#ef4444', label: 'Low' },
                { value: none, color: '#9ca3af', label: 'Not Started' },
              ]}
              total={total}
            />
            <div className="space-y-2">
              <LegendItem color="bg-emerald-500" label="Good (3+ levels)" value={green} pct={total > 0 ? Math.round((green / total) * 100) : 0} />
              <LegendItem color="bg-yellow-400" label="Average (1-2)" value={yellow} pct={total > 0 ? Math.round((yellow / total) * 100) : 0} />
              <LegendItem color="bg-red-500" label="Needs Help" value={red} pct={total > 0 ? Math.round((red / total) * 100) : 0} />
              <LegendItem color="bg-gray-400" label="Not Started" value={none} pct={total > 0 ? Math.round((none / total) * 100) : 0} />
            </div>
          </div>
        </div>

        {/* Bar Chart — Level Completion */}
        <div className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5">
          <h3 className="font-bold text-white mb-4">Level Completion Overview</h3>
          <div className="space-y-3">
            {levelData.map(d => (
              <div key={d.level} className="flex items-center gap-3">
                <span className="text-xs font-bold text-purple-300 w-14">Level {d.level}</span>
                <div className="flex-1 h-6 rounded-full bg-purple-800/40 overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${d.pct}%` }}
                    transition={{ duration: 0.6, delay: d.level * 0.1 }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                    {d.pct}% ({d.completed})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Intervention Summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <InterventionCard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Needing Immediate Intervention"
          count={red}
          total={total}
          color="from-red-500 to-orange-500"
          description="Students who started but are stuck with 0 levels completed"
        />
        <InterventionCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Needing Support"
          count={yellow}
          total={total}
          color="from-yellow-400 to-orange-400"
          description="Students with 1-2 levels completed, need encouragement"
        />
        <InterventionCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Performing Well"
          count={green}
          total={total}
          color="from-emerald-500 to-teal-500"
          description="Students with 3+ levels completed, on track"
        />
      </div>

      {/* Student Performance Table */}
      <div className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5">
        <h3 className="font-bold text-white mb-4">Student Performance & Intervention Status</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-400/20 text-left text-xs font-bold uppercase text-purple-400">
                <th className="pb-3 pr-4">Student</th>
                <th className="pb-3 pr-4">Section</th>
                <th className="pb-3 pr-4">Levels</th>
                <th className="pb-3 pr-4">Stars</th>
                <th className="pb-3 pr-4">Quiz Accuracy</th>
                <th className="pb-3 pr-4">Points</th>
                <th className="pb-3 pr-4">Proficiency</th>
                <th className="pb-3">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-400/10">
              {students.map(student => {
                // Proficiency band from quiz accuracy (req #13) + recommendation (req #14)
                const { correct: totalCorrect, attempts: totalAttempts, accuracy, points: totalScoreEarned, proficiency: prof, recommendation: intervention } = studentPerformance(student)
                const accColor = accuracy >= 70 ? 'text-emerald-400' : accuracy >= 40 ? 'text-yellow-400' : totalAttempts > 0 ? 'text-red-400' : 'text-gray-400'
                const statusLabel = prof.band
                const statusColor = bandTone[prof.tone] ?? 'text-gray-400'
                return (
                  <tr key={student.id} className="text-purple-100">
                    <td className="py-3 pr-4">
                      <p className="font-bold text-white">{student.username}</p>
                    </td>
                    <td className="py-3 pr-4 text-purple-200">{student.classroomName ?? '—'}</td>
                    <td className="py-3 pr-4">{student.progress.levelsCompleted}/{student.progress.totalLevels}</td>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-1 text-yellow-300">
                        <Star className="h-3 w-3 fill-current" /> {student.progress.starBalance}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`font-bold ${accColor}`}>
                        {totalAttempts > 0 ? `${totalCorrect}/${totalAttempts} (${accuracy}%)` : '—'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-bold text-white">{totalScoreEarned > 0 ? totalScoreEarned : '—'}</span>
                    </td>
                    <td className={`py-3 pr-4 font-bold text-xs ${statusColor}`}>{statusLabel}</td>
                    <td className="py-3 text-xs text-purple-300 min-w-[220px] max-w-[320px]">{intervention}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {students.length === 0 && (
          <p className="text-center text-purple-400 py-8">No students enrolled yet</p>
        )}
      </div>

      {/* Electronic class record + export (2026-10b revision, item 4) */}
      <ClassRecord />

      {/* Scores Per Level — matrix (panel req: each student's scores per level) */}
      <div className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5">
        <h3 className="font-bold text-white mb-1">Scores Per Level</h3>
        <p className="text-xs text-purple-400 mb-4">Each student&apos;s quiz accuracy and points for every level — a basis for awarding additional points</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-400/20 text-left text-xs font-bold uppercase text-purple-400">
                <th className="pb-3 pr-4">Student</th>
                <th className="pb-3 pr-4">Section</th>
                {[1, 2, 3, 4, 5].map(lvl => <th key={lvl} className="pb-3 pr-4 text-center">Level {lvl}</th>)}
                <th className="pb-3 pr-4 text-center">Total Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-400/10">
              {students.map(student => {
                const byLevel = new Map((student.quizScores ?? []).map(qs => [qs.levelNumber, qs]))
                const totalPoints = (student.quizScores ?? []).reduce((sum, qs) => sum + qs.totalScore, 0)
                return (
                  <tr key={student.id} className="text-purple-100">
                    <td className="py-3 pr-4 font-bold text-white">{student.username}</td>
                    <td className="py-3 pr-4 text-purple-200">{student.classroomName ?? '—'}</td>
                    {[1, 2, 3, 4, 5].map(lvl => {
                      const qs = byLevel.get(lvl)
                      if (!qs || qs.totalAttempts === 0) {
                        return <td key={lvl} className="py-3 pr-4 text-center text-purple-500">—</td>
                      }
                      const acc = Math.round((qs.correctAttempts / qs.totalAttempts) * 100)
                      const accColor = acc >= 70 ? 'text-emerald-400' : acc >= 40 ? 'text-yellow-400' : 'text-red-400'
                      return (
                        <td key={lvl} className="py-3 pr-4 text-center">
                          <span className={`font-bold ${accColor}`}>{qs.correctAttempts}/{qs.totalAttempts}</span>
                          <span className="block text-[10px] text-purple-400">{acc}% · {qs.totalScore}pt</span>
                        </td>
                      )
                    })}
                    <td className="py-3 pr-4 text-center font-black text-yellow-300">{totalPoints > 0 ? totalPoints : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {students.length === 0 && <p className="text-center text-purple-400 py-8">No students enrolled yet</p>}
      </div>

      {/* Quiz Attempts & Scores Detail — per session */}
      <div className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5">
        <h3 className="font-bold text-white mb-1">Quiz Attempts & Scores</h3>
        <p className="text-xs text-purple-400 mb-4">Every quiz attempt by each student — track their progress over time</p>

        {sessions.length === 0 ? (
          <p className="text-center text-purple-400 py-6">No quiz attempts recorded yet. Scores will appear here after students answer questions.</p>
        ) : (
          <div className="space-y-3">
            {/* Group sessions by student */}
            {(() => {
              const grouped: Record<number, QuizSession[]> = {}
              for (const s of sessions) {
                if (!grouped[s.user_id]) grouped[s.user_id] = []
                grouped[s.user_id].push(s)
              }
              return Object.entries(grouped).map(([userId, userSessions]) => {
                const first = userSessions[0]
                const totalCorrect = userSessions.reduce((sum, s) => sum + Number(s.correct_answers), 0)
                const totalQs = userSessions.reduce((sum, s) => sum + Number(s.total_questions), 0)
                const overallAcc = totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0

                return (
                  <div key={userId} className="rounded-lg border border-purple-400/15 bg-purple-900/20 p-4">
                    {/* Student header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-black text-white">
                          {first.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{first.username}</p>
                          <p className="text-[10px] text-purple-400">{first.classroom_name ?? 'No section'} • {userSessions.length} attempt{userSessions.length > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${overallAcc >= 70 ? 'text-emerald-400' : overallAcc >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{overallAcc}% overall</p>
                        <p className="text-[10px] text-purple-400">{totalCorrect}/{totalQs} correct</p>
                      </div>
                    </div>

                    {/* Individual attempts list */}
                    <div className="space-y-1.5">
                      {userSessions.map((session, idx) => {
                        const acc = Number(session.total_questions) > 0 ? Math.round((Number(session.correct_answers) / Number(session.total_questions)) * 100) : 0
                        const accColor = acc >= 70 ? 'bg-emerald-500' : acc >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        const accText = acc >= 70 ? 'text-emerald-300' : acc >= 40 ? 'text-yellow-300' : 'text-red-300'
                        const attemptNum = userSessions.length - idx

                        return (
                          <div key={idx} className="flex items-center gap-3 rounded-lg bg-purple-950/40 border border-purple-400/10 px-3 py-2">
                            {/* Attempt number */}
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-700/50 text-[10px] font-bold text-purple-200">
                              #{attemptNum}
                            </span>
                            {/* Level badge */}
                            <span className="shrink-0 rounded-md bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                              Level {session.level_number}
                            </span>
                            {/* Score bar */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-purple-800/50 overflow-hidden">
                                  <div className={`h-full rounded-full ${accColor}`} style={{ width: `${acc}%` }} />
                                </div>
                                <span className={`text-xs font-black ${accText} w-16 text-right`}>{session.correct_answers}/{session.total_questions}</span>
                              </div>
                            </div>
                            {/* Score */}
                            <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-yellow-300"><Star className="h-3 w-3 fill-current" /> {session.total_score}</span>
                            {/* Date */}
                            <span className="shrink-0 text-[10px] text-purple-400 hidden sm:block">
                              {new Date(session.session_date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>

      {/* Download Report — replaces Key Insights (panel revision, Nov 2026b) */}
      <DownloadReport students={students} sessions={sessions} />
    </div>
  )
}

// ─── Components ───────────────────────────────────────────────────────────────

const MODULES = [
  'Summary', 'Performance Distribution', 'Level Completion', 'Intervention Summary',
  'Student Performance', 'Class Record', 'Scores Per Level', 'Quiz Attempts',
]

/**
 * "Download Report": every module on this page in one Excel-ready CSV — not
 * just the class record — for all sections or one (Nov 2026b).
 */
function DownloadReport({ students, sessions }: { students: Student[]; sessions: QuizSession[] }) {
  const [sectionId, setSectionId] = useState<number | 'all'>('all')
  const [busy, setBusy] = useState(false)
  const sections = Array.from(new Map(students.filter(s => s.classroomId).map(s => [s.classroomId!, s.classroomName ?? 'Section'])).entries())

  async function download() {
    setBusy(true)
    try {
      const res = await fetch(`/api/teacher/class-record${sectionId === 'all' ? '' : `?classroomId=${sectionId}`}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      const scoped = sectionId === 'all' ? students : students.filter(s => s.classroomId === sectionId)
      const ids = new Set(scoped.map(s => s.id))
      const scopeLabel = sectionId === 'all' ? 'All sections' : (sections.find(([id]) => id === sectionId)?.[1] ?? 'Section')
      const csv = buildFullReportCsv({
        students: scoped,
        sessions: sessions.filter(a => ids.has(a.user_id)),
        record: json.data,
        scopeLabel,
        generatedAt: new Date(),
      })
      // BOM so Excel reads the UTF-8 (ñ, –) correctly
      const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `mindspark-report_${scopeLabel.replace(/\W+/g, '-').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not build the report')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-purple-400/25 bg-purple-950/40 p-5 backdrop-blur-md" data-testid="download-report">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="icon-circle flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d9f3df] text-[#16A34A]"><FileSpreadsheet className="h-5 w-5" /></span>
          <div>
            <h3 className="font-bold text-white">Download Report</h3>
            <p className="text-xs text-purple-300">One Excel-ready file with every report module on this page:</p>
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {MODULES.map(m => <span key={m} className="rounded-md bg-[#f4efff] px-2 py-0.5 text-[10px] font-bold text-[#6f54ba]">{m}</span>)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Report scope"
            value={sectionId}
            onChange={e => setSectionId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all">All sections</option>
            {sections.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <button
            onClick={download}
            disabled={busy || students.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7c5cf0] to-[#5a3fd4] px-4 py-2.5 text-sm font-black text-[#fff] shadow hover:brightness-110 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {busy ? 'Building…' : 'Download Report (CSV / Excel)'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const statStyles: Record<string, { card: string; border: string; iconWrap: string; iconColor: string }> = {
    'from-emerald-500 to-teal-500': {
      card: 'bg-[#eefaf2]',
      border: 'border-[#d4efd9]',
      iconWrap: 'bg-[#d9f3df]',
      iconColor: 'text-[#16A34A]',
    },
    'from-blue-500 to-cyan-500': {
      card: 'bg-[#eef5ff]',
      border: 'border-[#d8e6ff]',
      iconWrap: 'bg-[#dbeafe]',
      iconColor: 'text-[#3B82F6]',
    },
    'from-orange-500 to-red-500': {
      card: 'bg-[#fff9ec]',
      border: 'border-[#fce7ba]',
      iconWrap: 'bg-[#fdecc8]',
      iconColor: 'text-[#d97706]',
    },
    'from-purple-500 to-pink-500': {
      card: 'bg-[#f5efff]',
      border: 'border-[#e8dcff]',
      iconWrap: 'bg-[#e6dcff]',
      iconColor: 'text-[#7C58D8]',
    },
  }

  const style = statStyles[color] ?? statStyles['from-purple-500 to-pink-500']

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`stat-card rounded-xl border p-4 shadow-lg ${style.card} ${style.border}`}
    >
      <div className="flex items-center gap-2">
        <span className={`icon-circle flex h-9 w-9 items-center justify-center rounded-full ${style.iconWrap} ${style.iconColor}`}>
          {icon}
        </span>
        <span className="stat-title text-[10px] font-bold uppercase text-[#374151]">{label}</span>
      </div>
      <p className="stat-number mt-1 text-2xl font-black text-[#111827]">{value}</p>
      <p className="stat-subtitle text-[10px] text-[#6B7280]">{sub}</p>
    </motion.div>
  )
}

function InterventionCard({ icon, title, count, total, color, description }: { icon: React.ReactNode; title: string; count: number; total: number; color: string; description: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const iconStyles: Record<string, { wrap: string; icon: string }> = {
    'from-red-500 to-orange-500': { wrap: 'bg-[#fde2d6]', icon: 'text-[#dc2626]' },
    'from-yellow-400 to-orange-400': { wrap: 'bg-[#fdecc8]', icon: 'text-[#d97706]' },
    'from-emerald-500 to-teal-500': { wrap: 'bg-[#d9f3df]', icon: 'text-[#16A34A]' },
  }
  const style = iconStyles[color] ?? iconStyles['from-emerald-500 to-teal-500']

  return (
    <div className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-4">
      <div className="flex items-center gap-3">
        <span className={`icon-circle flex h-10 w-10 items-center justify-center rounded-xl ${style.wrap} ${style.icon}`}>
          {icon}
        </span>
        <div>
          <p className="text-xs font-bold text-[#374151]">{title}</p>
          <p className="text-2xl font-black text-[#111827]">{count}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-[#6B7280]">{pct}% of total students</p>
      <p className="mt-1 text-[10px] text-[#6B7280]">{description}</p>
    </div>
  )
}

function DonutChart({ segments, total }: { segments: { value: number; color: string; label: string }[]; total: number }) {
  const size = 160
  const strokeWidth = 28
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  if (total === 0) {
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#3b2a73" strokeWidth={strokeWidth} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black text-white">0</p>
          <p className="text-[10px] text-purple-400">Total</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {segments.map((seg, i) => {
          const pct = seg.value / total
          const dashLength = pct * circumference
          const dashOffset = -offset
          offset += dashLength
          return (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-black text-white">{total}</p>
        <p className="text-[10px] text-purple-400">Total Students</p>
      </div>
    </div>
  )
}

function LegendItem({ color, label, value, pct }: { color: string; label: string; value: number; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="text-xs text-purple-200">{label}</span>
      <span className="text-xs font-bold text-white ml-auto">{pct}% ({value})</span>
    </div>
  )
}
