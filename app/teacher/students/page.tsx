'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  KeyRound,
  Mail,
  Search,
  Shield,
  Star,
  Unlock,
  UserPlus,
  Users,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { PublicUser } from '@/types/user'

type StudentProgress = {
  levelsCompleted: number
  totalLevels: number
  completedLevels: number[]
  starBalance: number
  currentLevel: number
  performanceColor: 'none' | 'green' | 'yellow' | 'red'
}

type QuizScore = {
  levelNumber: number
  totalAttempts: number
  correctAttempts: number
  totalScore: number
  lastAttempt: string
}

type Student = PublicUser & {
  enrolledAt: string | null
  classroomId: number | null
  classroomName: string | null
  parentEmail: string | null
  progress: StudentProgress
  teacherUnlockedLevels: number[]
  quizScores: QuizScore[]
}

type Classroom = { id: number; name: string; studentCount: number }

const ITEMS_PER_PAGE = 10

const perfConfig: Record<string, { dot: string; bg: string; label: string; text: string }> = {
  none: { dot: 'bg-gray-400', bg: 'bg-gray-400/10 border-gray-400/30', label: 'Not Started', text: 'text-gray-300' },
  green: { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10 border-emerald-400/30', label: 'Good', text: 'text-emerald-300' },
  yellow: { dot: 'bg-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', label: 'Average', text: 'text-yellow-300' },
  red: { dot: 'bg-red-500', bg: 'bg-red-500/10 border-red-400/30', label: 'Needs Help', text: 'text-red-300' },
}

export default function TeacherStudentsPage() {
  useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [filterClassroom, setFilterClassroom] = useState<number | ''>('')
  const [filterPerformance, setFilterPerformance] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  // Pagination
  const [page, setPage] = useState(1)

  // Expanded student
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Action states
  const [passwordDraft, setPasswordDraft] = useState('')
  const [parentEmailDraft, setParentEmailDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [unlockingLevel, setUnlockingLevel] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [studRes, classRes] = await Promise.all([
        fetch('/api/teacher/students', { credentials: 'include' }),
        fetch('/api/teacher/classrooms', { credentials: 'include' }),
      ])
      const studJson = await studRes.json()
      const classJson = await classRes.json()
      if (studJson.success) setStudents(studJson.data)
      if (classJson.success) setClassrooms(classJson.data)
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Filtered + paginated
  const filtered = useMemo(() => {
    return students.filter(s => {
      if (search) {
        const q = search.toLowerCase()
        if (!s.username.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false
      }
      if (filterClassroom && s.classroomId !== filterClassroom) return false
      if (filterPerformance && s.progress.performanceColor !== filterPerformance) return false
      if (filterStatus && s.enrollmentStatus !== filterStatus) return false
      return true
    })
  }, [students, search, filterClassroom, filterPerformance, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, filterClassroom, filterPerformance, filterStatus])

  // Stats
  const totalStudents = students.length
  const activeStudents = students.filter(s => s.progress.performanceColor !== 'none').length
  const greenCount = students.filter(s => s.progress.performanceColor === 'green').length

  // Actions
  async function updateStudent(studentId: number, changes: Record<string, string>) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/teacher/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(changes),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...json.data } : s))
      setPasswordDraft('')
      setParentEmailDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function toggleLevelUnlock(studentId: number, levelNumber: number, currentlyUnlocked: boolean) {
    const key = `${studentId}-${levelNumber}`
    setUnlockingLevel(key)
    try {
      const method = currentlyUnlocked ? 'DELETE' : 'POST'
      const res = await fetch(`/api/teacher/students/${studentId}/unlock-level`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ levelNumber }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      const newUnlocks: number[] = json.data?.unlockedLevels ?? []
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, teacherUnlockedLevels: newUnlocks } : s))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setUnlockingLevel(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-purple-300">
          <Users className="h-5 w-5 animate-pulse" />
          <span className="text-sm font-bold">Loading students...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">All Students</h2>
          <p className="text-sm text-purple-300">Manage and monitor student accounts</p>
        </div>
        <button
          onClick={() => window.location.href = '/teacher/dashboard'}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition"
        >
          <UserPlus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-500/20 border border-red-400/30 px-4 py-2 text-sm text-red-200">{error}</div>}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card rounded-xl border border-[#d8e6ff] bg-[#eef5ff] p-3 shadow-lg">
          <p className="stat-title text-[10px] font-bold uppercase text-[#374151]">Total Students</p>
          <p className="stat-number text-2xl font-black text-[#111827]">{totalStudents}</p>
        </div>
        <div className="stat-card rounded-xl border border-[#e8dcff] bg-[#f5efff] p-3 shadow-lg">
          <p className="stat-title text-[10px] font-bold uppercase text-[#374151]">Active</p>
          <p className="stat-number text-2xl font-black text-[#111827]">{activeStudents}</p>
          <p className="stat-subtitle text-[9px] text-[#6B7280]">{totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}% of total</p>
        </div>
        <div className="stat-card rounded-xl border border-[#d4efd9] bg-[#eefaf2] p-3 shadow-lg">
          <p className="stat-title text-[10px] font-bold uppercase text-[#374151]">Performing Well</p>
          <p className="stat-number text-2xl font-black text-[#111827]">{greenCount}</p>
          <p className="stat-subtitle text-[9px] text-[#6B7280]">3+ levels completed</p>
        </div>
        <div className="stat-card rounded-xl border border-[#fce7ba] bg-[#fff9ec] p-3 shadow-lg">
          <p className="stat-title text-[10px] font-bold uppercase text-[#374151]">By Classroom</p>
          <p className="stat-number text-2xl font-black text-[#111827]">{classrooms.length}</p>
          <p className="stat-subtitle text-[9px] text-[#6B7280]">{classrooms.length} classrooms</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="rounded-xl border border-purple-400/20 bg-purple-950/40 backdrop-blur-md p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg bg-purple-900/50 border border-purple-400/20 text-white pl-10 pr-4 py-2 text-sm placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <select value={filterClassroom} onChange={e => setFilterClassroom(Number(e.target.value) || '')} className="rounded-lg bg-purple-900/50 border border-purple-400/20 text-purple-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">All Classrooms</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterPerformance} onChange={e => setFilterPerformance(e.target.value)} className="rounded-lg bg-purple-900/50 border border-purple-400/20 text-purple-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">All Performance</option>
            <option value="green">🟢 Good</option>
            <option value="yellow">🟡 Average</option>
            <option value="red">🔴 Needs Help</option>
            <option value="none">⚪ Not Started</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-lg bg-purple-900/50 border border-purple-400/20 text-purple-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">All Status</option>
            <option value="enrolled">Enrolled</option>
            <option value="disabled">Disabled</option>
          </select>
          <div className="flex items-center gap-1 text-xs text-purple-400">
            <Filter className="h-3.5 w-3.5" />
            <span>{filtered.length} results</span>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-xl border border-purple-400/20 bg-purple-950/40 backdrop-blur-md overflow-hidden">
        <div className="px-4 py-3 border-b border-purple-400/15">
          <h3 className="font-bold text-white">Students List</h3>
        </div>

        {/* Table Header (desktop) */}
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_80px] gap-2 px-4 py-2 border-b border-purple-400/10 text-xs font-bold uppercase text-purple-400">
          <span>Student</span>
          <span>Classroom</span>
          <span>Status</span>
          <span>Progress</span>
          <span>Stars</span>
          <span>Actions</span>
        </div>

        {/* Rows */}
        {paginated.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-10 w-10 text-purple-500" />
            <p className="mt-3 font-bold text-purple-200">No students found</p>
            <p className="text-sm text-purple-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-purple-400/10">
            {paginated.map(student => {
              const perf = perfConfig[student.progress.performanceColor] ?? perfConfig.none
              const expanded = expandedId === student.id
              const progressPct = Math.round((student.progress.levelsCompleted / student.progress.totalLevels) * 100)

              return (
                <div key={student.id}>
                  {/* Main Row */}
                  <button
                    type="button"
                    onClick={() => { setExpandedId(expanded ? null : student.id); setPasswordDraft(''); setParentEmailDraft('') }}
                    className="w-full grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_80px] gap-2 items-center px-4 py-3 text-left hover:bg-purple-500/5 transition"
                  >
                    {/* Student */}
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full shrink-0 ${perf.dot}`} />
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{student.username}</p>
                        <p className="text-xs text-purple-300 truncate">{student.email}</p>
                      </div>
                    </div>
                    {/* Classroom */}
                    <span className="hidden md:block text-sm text-purple-200">{student.classroomName ?? '—'}</span>
                    {/* Status */}
                    <span className="hidden md:block">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${student.enrollmentStatus === 'enrolled' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-red-400/30 bg-red-500/10 text-red-300'}`}>
                        {student.enrollmentStatus === 'enrolled' ? 'Active' : 'Disabled'}
                      </span>
                    </span>
                    {/* Progress */}
                    <div className="hidden md:block">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-purple-800/50 overflow-hidden">
                          <div className={`h-full rounded-full ${perf.dot}`} style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-purple-200">{progressPct}%</span>
                      </div>
                      <p className="text-[10px] text-purple-400 mt-0.5">{student.progress.levelsCompleted}/{student.progress.totalLevels} levels</p>
                    </div>
                    {/* Stars */}
                    <span className="hidden md:flex items-center gap-1 text-sm font-bold text-yellow-300">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {student.progress.starBalance}
                    </span>
                    {/* Expand */}
                    <span className="hidden md:flex justify-end">
                      {expanded ? <ChevronUp className="h-4 w-4 text-purple-400" /> : <ChevronDown className="h-4 w-4 text-purple-400" />}
                    </span>
                  </button>

                  {/* Expanded Actions Panel */}
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-purple-400/15 bg-purple-900/20 px-4 py-4"
                      >
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {/* Unlock Levels */}
                          <div className="rounded-lg border border-purple-400/15 bg-purple-950/30 p-3">
                            <p className="text-xs font-bold text-purple-200 mb-2 flex items-center gap-1"><Unlock className="h-3.5 w-3.5" /> Unlock Levels</p>
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5].map(lvl => {
                                const isCompleted = student.progress.completedLevels.includes(lvl)
                                const isUnlocked = student.teacherUnlockedLevels.includes(lvl)
                                const isLoading = unlockingLevel === `${student.id}-${lvl}`
                                const tipText = isCompleted ? `Level ${lvl} Completed` : isUnlocked ? `Level ${lvl} Unlocked` : `Level ${lvl} Locked`
                                return (
                                  <button
                                    key={lvl}
                                    onClick={() => !isCompleted && toggleLevelUnlock(student.id, lvl, isUnlocked)}
                                    disabled={isCompleted || isLoading}
                                    title={tipText}
                                    aria-label={tipText}
                                    className={[
                                      'group relative z-0 flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-950',
                                      isCompleted ? 'bg-emerald-600 text-white cursor-default focus:ring-emerald-400' :
                                      isUnlocked ? 'bg-purple-600 text-white hover:bg-purple-500 focus:ring-purple-300' :
                                      'bg-purple-900/60 border border-purple-400/20 text-[#374151] hover:bg-purple-800/60 focus:ring-purple-400',
                                      isLoading ? 'animate-pulse' : '',
                                    ].join(' ')}
                                  >
                                    <span className="font-bold">{isCompleted ? '✓' : lvl}</span>
                                    <span
                                      role="tooltip"
                                      className="pointer-events-none absolute -top-9 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1a1233] px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg ring-1 ring-purple-400/30 transition group-hover:opacity-100 group-focus:opacity-100"
                                    >
                                      {tipText}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Reset Password */}
                          <div className="rounded-lg border border-purple-400/15 bg-purple-950/30 p-3">
                            <p className="text-xs font-bold text-purple-200 mb-2 flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> Reset Password</p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="New password..."
                                value={passwordDraft}
                                onChange={e => setPasswordDraft(e.target.value)}
                                className="flex-1 rounded-lg bg-purple-900/50 border border-purple-400/20 text-white px-3 py-2 text-xs placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                              />
                              <button
                                onClick={() => passwordDraft && updateStudent(student.id, { password: passwordDraft })}
                                disabled={!passwordDraft || saving}
                                className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-70 transition"
                              >
                                Save
                              </button>
                            </div>
                          </div>

                          {/* Parent Email */}
                          <div className="rounded-lg border border-purple-400/15 bg-purple-950/30 p-3">
                            <p className="text-xs font-bold text-purple-200 mb-2 flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Parent Email</p>
                            <div className="flex gap-2">
                              <input
                                type="email"
                                placeholder={student.parentEmail ?? 'parent@email.com'}
                                value={parentEmailDraft}
                                onChange={e => setParentEmailDraft(e.target.value)}
                                className="flex-1 rounded-lg bg-purple-900/50 border border-purple-400/20 text-white px-3 py-2 text-xs placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                              />
                              <button
                                onClick={() => parentEmailDraft && updateStudent(student.id, { parentEmail: parentEmailDraft })}
                                disabled={!parentEmailDraft || saving}
                                className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-70 transition"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Quiz Scores Per Level */}
                        {student.quizScores && student.quizScores.length > 0 && (
                          <div className="mt-3 rounded-lg border border-purple-400/15 bg-purple-950/30 p-3">
                            <p className="text-xs font-bold text-purple-200 mb-2 flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> Quiz Scores</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                              {student.quizScores.map(qs => {
                                const accuracy = qs.totalAttempts > 0 ? Math.round((qs.correctAttempts / qs.totalAttempts) * 100) : 0
                                const accColor = accuracy >= 70 ? 'text-emerald-300' : accuracy >= 40 ? 'text-yellow-300' : 'text-red-300'
                                return (
                                  <div key={qs.levelNumber} className="rounded-md bg-purple-800/30 border border-purple-400/10 px-2.5 py-2">
                                    <p className="text-[10px] font-bold text-purple-400">Level {qs.levelNumber}</p>
                                    <p className={`text-sm font-black ${accColor}`}>{qs.correctAttempts}/{qs.totalAttempts} <span className="text-[10px] font-bold">({accuracy}%)</span></p>
                                    <p className="text-[9px] text-purple-400 mt-0.5">Score: {qs.totalScore} • {new Date(qs.lastAttempt).toLocaleDateString()}</p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Status Toggle */}
                        <div className="mt-3 flex items-center justify-between rounded-lg border border-purple-400/15 bg-purple-950/30 px-3 py-2">
                          <p className="text-xs text-purple-200 flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Account Status: <span className="font-bold text-white capitalize ml-1">{student.enrollmentStatus}</span></p>
                          <button
                            onClick={() => updateStudent(student.id, { enrollmentStatus: student.enrollmentStatus === 'enrolled' ? 'disabled' : 'enrolled' })}
                            disabled={saving}
                            aria-label={student.enrollmentStatus === 'enrolled' ? 'Disable Account' : 'Enable Account'}
                            className={student.enrollmentStatus === 'enrolled'
                              ? 'btn-account-danger rounded-lg px-5 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:ring-offset-2 focus:ring-offset-white shadow-md shadow-red-500/30'
                              : 'btn-account-success rounded-lg px-5 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-white shadow-md shadow-emerald-500/30'
                            }
                            style={student.enrollmentStatus === 'enrolled'
                              ? { background: '#DC2626', color: '#ffffff', border: '1px solid #EF4444' }
                              : { background: '#059669', color: '#ffffff', border: '1px solid #10B981' }
                            }
                          >
                            {student.enrollmentStatus === 'enrolled' ? 'Disable Account' : 'Enable Account'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-purple-400/15 px-4 py-3">
            <p className="text-xs text-purple-400">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} students
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={[
                      'h-8 w-8 rounded-lg text-xs font-bold transition',
                      page === pageNum ? 'bg-purple-500 text-white' : 'text-purple-300 hover:bg-purple-500/20',
                    ].join(' ')}
                  >
                    {pageNum}
                  </button>
                )
              })}
              {totalPages > 5 && <span className="text-purple-400 px-1">...</span>}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
