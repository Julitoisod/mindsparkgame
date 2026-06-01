'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BarChart3, CheckCircle2, TrendingUp, Users } from 'lucide-react'

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

  const total = students.length
  const green = students.filter(s => s.progress.performanceColor === 'green').length
  const yellow = students.filter(s => s.progress.performanceColor === 'yellow').length
  const red = students.filter(s => s.progress.performanceColor === 'red').length
  const none = students.filter(s => s.progress.performanceColor === 'none').length
  const completionRate = total > 0 ? Math.round((green / total) * 100) : 0
  const activeRate = total > 0 ? Math.round(((total - none) / total) * 100) : 0
  const needsAttention = red + yellow

  // Level completion data
  const levelData = [1, 2, 3, 4, 5].map(lvl => {
    const completed = students.filter(s => s.progress.levelsCompleted >= lvl).length
    return { level: lvl, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 }
  })

  if (loading) {
    return <p className="text-purple-300 text-sm animate-pulse">Loading reports...</p>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black">Quiz & Boss Battle Intervention Report</h2>
        <p className="text-sm text-purple-300">Track student performance and intervention status</p>
      </div>

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
                <th className="pb-3 pr-4">Classroom</th>
                <th className="pb-3 pr-4">Levels</th>
                <th className="pb-3 pr-4">Stars</th>
                <th className="pb-3 pr-4">Quiz Accuracy</th>
                <th className="pb-3 pr-4">Points</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-400/10">
              {students.map(student => {
                const perf = student.progress.performanceColor
                const statusLabel = perf === 'green' ? 'Good' : perf === 'yellow' ? 'Average' : perf === 'red' ? 'Low' : 'Not Started'
                const statusColor = perf === 'green' ? 'text-emerald-400' : perf === 'yellow' ? 'text-yellow-400' : perf === 'red' ? 'text-red-400' : 'text-gray-400'
                const intervention = perf === 'red' ? 'Teacher Intervention' : perf === 'yellow' ? 'Practice Recommended' : perf === 'green' ? 'None' : 'None'
                const totalCorrect = (student.quizScores ?? []).reduce((sum, qs) => sum + qs.correctAttempts, 0)
                const totalAttempts = (student.quizScores ?? []).reduce((sum, qs) => sum + qs.totalAttempts, 0)
                const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0
                const totalScoreEarned = (student.quizScores ?? []).reduce((sum, qs) => sum + qs.totalScore, 0)
                const accColor = accuracy >= 70 ? 'text-emerald-400' : accuracy >= 40 ? 'text-yellow-400' : totalAttempts > 0 ? 'text-red-400' : 'text-gray-400'
                return (
                  <tr key={student.id} className="text-purple-100">
                    <td className="py-3 pr-4">
                      <p className="font-bold text-white">{student.username}</p>
                    </td>
                    <td className="py-3 pr-4 text-purple-200">{student.classroomName ?? '—'}</td>
                    <td className="py-3 pr-4">{student.progress.levelsCompleted}/{student.progress.totalLevels}</td>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-1 text-yellow-300">
                        <span className="text-xs">⭐</span> {student.progress.starBalance}
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
                    <td className="py-3 text-xs text-purple-300">{intervention}</td>
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

      {/* Quiz Attempts & Scores Detail — per session */}
      <div className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5">
        <h3 className="font-bold text-white mb-1">📊 Quiz Attempts & Scores</h3>
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
                          <p className="text-[10px] text-purple-400">{first.classroom_name ?? 'No classroom'} • {userSessions.length} attempt{userSessions.length > 1 ? 's' : ''}</p>
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
                            <span className="shrink-0 text-xs font-bold text-yellow-300">⭐ {session.total_score}</span>
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

      {/* Key Insights */}
      {total > 0 && (
        <div className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5">
          <h3 className="font-bold text-white mb-3">💡 Key Insights</h3>
          <div className="grid gap-2 sm:grid-cols-2 text-sm text-purple-200">
            {green > 0 && <p>✅ Quiz performance is strong with {total > 0 ? Math.round((green / total) * 100) : 0}% of students in the green zone.</p>}
            {red > 0 && <p>⚠️ Focus on targeted interventions for the {red} student{red > 1 ? 's' : ''} in red.</p>}
            {none > 0 && <p>📋 {none} student{none > 1 ? 's' : ''} haven&apos;t started — consider unlocking Level 1.</p>}
            {yellow > 0 && <p>📊 Consistent practice can help improve outcomes for {yellow} average student{yellow > 1 ? 's' : ''}.</p>}
            {completionRate >= 50 && <p>🎉 Over half your students have completed all levels!</p>}
            {activeRate < 50 && total > 2 && <p>� Encourage inactive students to start playing.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Components ───────────────────────────────────────────────────────────────

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
