'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Edit3,
  Filter,
  Search,
  Send,
  Shield,
  Star,
  Unlock,
  UserPlus,
  Users,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { PublicUser } from '@/types/user'
import toast from 'react-hot-toast'

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
  const [savingId, setSavingId] = useState<number | null>(null)
  const [unlockingLevel, setUnlockingLevel] = useState<string | null>(null)
  const [notifyingParent, setNotifyingParent] = useState<number | null>(null)
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  /** Form state for the currently expanded student's account edit. */
  const [draft, setDraft] = useState({ username: '', password: '', parentEmail: '' })
  useEffect(() => {
    if (expandedId !== null) {
      const s = students.find(st => st.id === expandedId)
      if (s) setDraft({ username: s.username, password: '', parentEmail: s.parentEmail ?? '' })
    }
  }, [expandedId, students])

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
  async function updateStudent(studentId: number, changes: Record<string, string | undefined>, showSuccess = true) {
    setSavingId(studentId)
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
      setDraft(prev => ({ ...prev, password: '' }))
      if (showSuccess) {
        setSuccess('Student account updated successfully')
        setTimeout(() => setSuccess(null), 4000)
        toast.success('Student account updated successfully')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update'
      setError(msg)
      toast.error(msg)
    } finally {
      setSavingId(null)
    }
  }

  async function notifyParent(studentId: number) {
    setNotifyingParent(studentId)
    setNotifySuccess(null)
    try {
      const res = await fetch(`/api/teacher/students/${studentId}/notify-parent`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      setNotifySuccess(`Email sent to parent of student #${studentId}`)
      setTimeout(() => setNotifySuccess(null), 4000)
      toast.success('Parent notified successfully')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to notify parent'
      setError(msg)
      toast.error(msg)
    } finally {
      setNotifyingParent(null)
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
      toast.success(json.message ?? (currentlyUnlocked ? 'Level locked' : 'Level unlocked'))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setUnlockingLevel(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-600">
          <Users className="h-5 w-5 animate-pulse" />
          <span className="text-sm font-bold">Loading students...</span>
        </div>
      </div>
    )
  }

  return (
    <div data-page="teacher-students" className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">All Students</h2>
          <p className="text-sm text-gray-500">Manage and monitor student accounts</p>
        </div>
        <button
          onClick={() => window.location.href = '/teacher/dashboard'}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-purple-700 transition"
        >
          <UserPlus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-100 border border-red-300 px-4 py-2.5 text-sm text-red-800 font-medium">{error}</div>}
      {success && (
        <div className="rounded-lg bg-emerald-100 border border-emerald-300 px-4 py-2.5 text-sm text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}
      {notifySuccess && (
        <div className="rounded-lg bg-blue-100 border border-blue-300 px-4 py-2.5 text-sm text-blue-800 font-medium flex items-center gap-2">
          <Send className="h-4 w-4" /> {notifySuccess}
        </div>
      )}

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
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg bg-gray-50 border border-gray-300 text-gray-900 pl-10 pr-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <select value={filterClassroom} onChange={e => setFilterClassroom(Number(e.target.value) || '')} className="rounded-lg bg-gray-50 border border-gray-300 text-gray-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">All Classrooms</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterPerformance} onChange={e => setFilterPerformance(e.target.value)} className="rounded-lg bg-gray-50 border border-gray-300 text-gray-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">All Performance</option>
            <option value="green">🟢 Good</option>
            <option value="yellow">🟡 Average</option>
            <option value="red">🔴 Needs Help</option>
            <option value="none">⚪ Not Started</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-lg bg-gray-50 border border-gray-300 text-gray-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">All Status</option>
            <option value="enrolled">Enrolled</option>
            <option value="disabled">Disabled</option>
          </select>
          <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
            <Filter className="h-3.5 w-3.5" />
            <span>{filtered.length} results</span>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Students List</h3>
        </div>

        {/* Table Header (desktop) */}
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_80px] gap-2 px-4 py-2 border-b border-gray-200 text-xs font-bold uppercase text-gray-500">
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
            <Users className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-3 font-bold text-gray-900">No students found</p>
            <p className="text-sm text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginated.map(student => {
              const perf = perfConfig[student.progress.performanceColor] ?? perfConfig.none
              const expanded = expandedId === student.id
              const progressPct = Math.round((student.progress.levelsCompleted / student.progress.totalLevels) * 100)

              return (
                <div key={student.id}>
                  {/* Main Row */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(expanded ? null : student.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(expanded ? null : student.id) } }}
                    className="w-full grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_80px] gap-2 items-center px-4 py-3 text-left hover:bg-gray-50 transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-purple-300 rounded-xl"
                  >
                    {/* Student */}
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full shrink-0 ${perf.dot}`} />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{student.username}</p>
                        <p className="text-xs text-gray-500 font-medium truncate">{student.email}</p>
                      </div>
                    </div>
                    {/* Classroom */}
                    <span className="hidden md:block text-sm text-gray-700">{student.classroomName ?? '—'}</span>
                    {/* Status */}
                    <span className="hidden md:block">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${student.enrollmentStatus === 'enrolled' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-red-400/30 bg-red-500/10 text-red-300'}`}>
                        {student.enrollmentStatus === 'enrolled' ? 'Active' : 'Disabled'}
                      </span>
                    </span>
                    {/* Progress */}
                    <div className="hidden md:block">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div className={`h-full rounded-full ${perf.dot}`} style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-800">{progressPct}%</span>
                      </div>
                      <p className="text-xs text-gray-600 font-semibold mt-0.5">{student.progress.levelsCompleted}/{student.progress.totalLevels} levels</p>
                    </div>
                    {/* Stars */}
                    <span className="hidden md:flex items-center gap-1 text-sm font-bold text-yellow-600">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {student.progress.starBalance}
                    </span>
                    {/* Expand */}
                    <span className="hidden md:flex justify-end">
                      {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </span>
                  </div>

                  {/* Expanded Actions Panel */}
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="border-t border-gray-200 bg-gray-50/50 px-4 py-4"
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* Unlock Levels */}
                          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                            <p className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                              <Unlock className="h-4 w-4 text-purple-600" /> Unlock Levels
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {[1, 2, 3, 4, 5].map(lvl => {
                                const isCompleted = student.progress.completedLevels.includes(lvl)
                                const isUnlocked = student.teacherUnlockedLevels.includes(lvl)
                                const isLoading = unlockingLevel === `${student.id}-${lvl}`
                                return (
                                  <button
                                    key={lvl}
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation()
                                      if (!isCompleted) toggleLevelUnlock(student.id, lvl, isUnlocked)
                                    }}
                                    disabled={isCompleted || isLoading}
                                    className={[
                                      'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black transition-all duration-150',
                                      isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default' :
                                      isUnlocked ? 'bg-purple-600 text-white border border-purple-700 shadow-md hover:bg-purple-700 hover:shadow-lg hover:-translate-y-0.5' :
                                      'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5',
                                      isLoading ? 'animate-pulse' : '',
                                    ].join(' ')}
                                    title={isCompleted ? `Level ${lvl} Completed` : isUnlocked ? `Level ${lvl} Unlocked` : `Level ${lvl} Locked`}
                                  >
                                    {isCompleted ? '✓' : lvl}
                                  </button>
                                )
                              })}
                            </div>
                            <p className="mt-3 text-[10px] text-gray-500">Click a number to unlock/lock. ✓ = completed.</p>
                          </div>

                          {/* Account Details */}
                          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                            <p className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                              <Edit3 className="h-4 w-4 text-purple-600" /> Account Details
                            </p>
                            {error && (
                              <div className="rounded-lg bg-red-100 border border-red-300 px-3 py-2 text-xs text-red-800 font-medium mb-3 flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5" /> {error}
                              </div>
                            )}
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Username</label>
                                <input
                                  type="text"
                                  value={draft.username}
                                  onChange={e => setDraft(prev => ({ ...prev, username: e.target.value }))}
                                  className="w-full rounded-lg bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Password</label>
                                <input
                                  type="text"
                                  placeholder="Leave blank to keep current"
                                  value={draft.password}
                                  onChange={e => setDraft(prev => ({ ...prev, password: e.target.value }))}
                                  className="w-full rounded-lg bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                                <p className="text-[10px] text-gray-400 mt-0.5">Min 8 chars, with a letter & a number</p>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Parent Gmail</label>
                                <input
                                  type="email"
                                  placeholder="parent@gmail.com"
                                  value={draft.parentEmail}
                                  onChange={e => setDraft(prev => ({ ...prev, parentEmail: e.target.value }))}
                                  className="w-full rounded-lg bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                              </div>
                              <button
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  setError(null)
                                  const trimmedUsername = draft.username.trim()
                                  if (!trimmedUsername) {
                                    toast.error('Username is required')
                                    return setError('Username is required')
                                  }
                                  if (trimmedUsername.length < 3 || trimmedUsername.length > 32 || !/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
                                    toast.error('Username must be 3-32 letters, numbers, or underscores.')
                                    return setError('Username must be 3-32 letters, numbers, or underscores.')
                                  }
                                  if (draft.password) {
                                    if (draft.password.length < 8 || !/[a-zA-Z]/.test(draft.password) || !/\d/.test(draft.password)) {
                                      toast.error('Password must be at least 8 characters and include a letter and a number.')
                                      return setError('Password must be at least 8 characters and include a letter and a number.')
                                    }
                                  }
                                  const changes: Record<string, string | undefined> = { username: trimmedUsername }
                                  if (draft.password) changes.password = draft.password
                                  if (draft.parentEmail) changes.parentEmail = draft.parentEmail.trim()
                                  updateStudent(student.id, changes)
                                }}
                                disabled={savingId === student.id}
                                className="w-full rounded-lg bg-purple-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                {savingId === student.id ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Quiz Scores Per Level */}
                        {student.quizScores && student.quizScores.length > 0 && (
                          <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                            <p className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                              <BarChart3 className="h-4 w-4 text-purple-600" /> Quiz Scores
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                              {student.quizScores.map(qs => {
                                const accuracy = qs.totalAttempts > 0 ? Math.round((qs.correctAttempts / qs.totalAttempts) * 100) : 0
                                const accColor = accuracy >= 70 ? 'text-emerald-700' : accuracy >= 40 ? 'text-yellow-700' : 'text-red-700'
                                return (
                                  <div key={qs.levelNumber} className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
                                    <p className="text-[10px] font-bold text-gray-500">Level {qs.levelNumber}</p>
                                    <p className={`text-sm font-black ${accColor}`}>{qs.correctAttempts}/{qs.totalAttempts} <span className="text-[10px] font-bold">({accuracy}%)</span></p>
                                    <p className="text-[9px] text-gray-500 mt-0.5">Score: {qs.totalScore} • {new Date(qs.lastAttempt).toLocaleDateString()}</p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Status Toggle + Notify Parent */}
                        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="text-sm text-gray-700 flex items-center gap-1.5">
                              <Shield className="h-4 w-4 text-purple-600" /> Account Status: <span className="font-bold text-gray-900 capitalize">{student.enrollmentStatus}</span>
                            </p>
                            {student.parentEmail && (
                              <button
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); notifyParent(student.id) }}
                                disabled={notifyingParent === student.id}
                                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                              >
                                {notifyingParent === student.id ? (
                                  <><span className="animate-pulse">Sending...</span></>
                                ) : (
                                  <><Send className="h-3.5 w-3.5" /> Notify Parent</>
                                )}
                              </button>
                            )}
                          </div>
                          <button
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              updateStudent(student.id, { enrollmentStatus: student.enrollmentStatus === 'enrolled' ? 'disabled' : 'enrolled' }, false)
                            }}
                            disabled={savingId !== null}
                            className={[
                              'rounded-lg px-4 py-2 text-sm font-bold transition shadow-sm whitespace-nowrap',
                              student.enrollmentStatus === 'enrolled'
                                ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800',
                            ].join(' ')}
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
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} students
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"
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
                      page === pageNum ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100',
                    ].join(' ')}
                  >
                    {pageNum}
                  </button>
                )
              })}
              {totalPages > 5 && <span className="text-gray-400 px-1">...</span>}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"
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
