'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BookOpenCheck,
  GraduationCap,
  KeyRound,
  Lock,
  LogOut,
  Pencil,
  PlusCircle,
  RefreshCw,
  School,
  ShieldCheck,
  Star,
  Unlock,
  UserPlus,
  Users,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { EnrollmentStatus, PublicUser } from '@/types/user'

type StudentProgress = {
  levelsCompleted: number
  totalLevels: number
  completedLevels: number[]
  starBalance: number
  currentLevel: number
  performanceColor: 'green' | 'yellow' | 'red'
}

type Student = PublicUser & {
  enrolledAt: string | null
  classroomId: number | null
  classroomName: string | null
  parentEmail: string | null
  progress: StudentProgress
  teacherUnlockedLevels: number[]
}

type Classroom = {
  id: number
  name: string
  studentCount: number
  createdAt: string
  updatedAt: string
}

const statusTone: Record<EnrollmentStatus, string> = {
  enrolled: 'border-primary-300/25 bg-primary-400/10 text-primary-100',
  pending: 'border-primary-300/25 bg-primary-400/10 text-primary-100',
  disabled: 'border-primary-200/30 bg-primary-950/45 text-primary-50',
}

const performanceColors: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
}

function isFieldErrors(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every(item => typeof item === 'string')
}

export default function TeacherStudentsPage() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthed, logout } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroomId, setSelectedClassroomId] = useState<number | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loadingClassrooms, setLoadingClassrooms] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [creatingClassroom, setCreatingClassroom] = useState(false)
  const [saving, setSaving] = useState(false)
  const [classroomName, setClassroomName] = useState('')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [classroomError, setClassroomError] = useState<string | null>(null)
  const [passwordDrafts, setPasswordDrafts] = useState<Record<number, string>>({})
  const [parentEmailDrafts, setParentEmailDrafts] = useState<Record<number, string>>({})
  const [notifyingParent, setNotifyingParent] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Edit classroom state
  const [editingClassroomId, setEditingClassroomId] = useState<number | null>(null)
  const [editClassroomName, setEditClassroomName] = useState('')
  const [savingClassroomEdit, setSavingClassroomEdit] = useState(false)

  // Level unlock loading state
  const [unlockingLevel, setUnlockingLevel] = useState<string | null>(null)

  const selectedClassroom = useMemo(
    () => classrooms.find(classroom => classroom.id === selectedClassroomId) ?? null,
    [classrooms, selectedClassroomId],
  )

  const totalStudents = useMemo(
    () => classrooms.reduce((sum, classroom) => sum + Number(classroom.studentCount ?? 0), 0),
    [classrooms],
  )

  const enrolledCount = useMemo(
    () => students.filter(student => student.enrollmentStatus === 'enrolled').length,
    [students],
  )

  const loadClassrooms = useCallback(async () => {
    setLoadingClassrooms(true)
    setError(null)
    try {
      const response = await fetch('/api/teacher/classrooms', { credentials: 'include' })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message ?? 'Failed to load classrooms')

      const next = (json.data ?? []) as Classroom[]
      setClassrooms(next)
      setSelectedClassroomId(current => {
        if (current && next.some(classroom => classroom.id === current)) return current
        return next[0]?.id ?? null
      })
      if (next.length === 0) setStudents([])
      return next
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classrooms')
      return []
    } finally {
      setLoadingClassrooms(false)
    }
  }, [])

  const loadStudents = useCallback(async (classroomId: number | null) => {
    if (!classroomId) {
      setStudents([])
      return
    }

    setLoadingStudents(true)
    setError(null)
    try {
      const response = await fetch(`/api/teacher/students?classroomId=${classroomId}`, { credentials: 'include' })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message ?? 'Failed to load students')
      setStudents(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students')
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthed) {
      router.replace('/login')
      return
    }
    if (user?.role !== 'teacher') {
      router.replace('/character-select')
    }
  }, [authLoading, isAuthed, router, user?.role])

  useEffect(() => {
    if (user?.role !== 'teacher') return
    void loadClassrooms()
  }, [loadClassrooms, user?.role])

  useEffect(() => {
    if (user?.role !== 'teacher') return
    if (!selectedClassroomId) {
      setStudents([])
      setLoadingStudents(false)
      return
    }
    void loadStudents(selectedClassroomId)
  }, [loadStudents, selectedClassroomId, user?.role])

  async function refreshData() {
    const next = await loadClassrooms()
    const selectedStillExists = selectedClassroomId && next.some(classroom => classroom.id === selectedClassroomId)
    const nextClassroomId = selectedStillExists ? selectedClassroomId : next[0]?.id
    if (nextClassroomId) await loadStudents(nextClassroomId)
  }

  async function createClassroom(event: React.FormEvent) {
    event.preventDefault()
    const name = classroomName.trim()
    if (name.length < 2 || name.length > 80) {
      setClassroomError('Classroom name must be 2-80 characters')
      return
    }

    setCreatingClassroom(true)
    setClassroomError(null)
    setError(null)
    try {
      const response = await fetch('/api/teacher/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) {
        if (isFieldErrors(json.data)) setClassroomError(json.data.name ?? null)
        throw new Error(json.message ?? 'Failed to create classroom')
      }

      const classroom = json.data as Classroom
      setClassrooms(current => [classroom, ...current])
      setSelectedClassroomId(classroom.id)
      setClassroomName('')
      setStudents([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create classroom')
    } finally {
      setCreatingClassroom(false)
    }
  }

  async function renameClassroom(event: React.FormEvent) {
    event.preventDefault()
    if (!editingClassroomId) return
    const name = editClassroomName.trim()
    if (name.length < 2 || name.length > 80) {
      setError('Classroom name must be 2-80 characters')
      return
    }

    setSavingClassroomEdit(true)
    setError(null)
    try {
      const response = await fetch('/api/teacher/classrooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: editingClassroomId, name }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message ?? 'Failed to rename classroom')

      const updated = json.data as Classroom
      setClassrooms(current => current.map(c => (c.id === updated.id ? updated : c)))
      setEditingClassroomId(null)
      setEditClassroomName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename classroom')
    } finally {
      setSavingClassroomEdit(false)
    }
  }

  async function enrollStudent(event: React.FormEvent) {
    event.preventDefault()
    const errs: Record<string, string> = {}

    if (!selectedClassroomId) errs.classroomId = 'Create and select a classroom before enrolling students.'
    if (form.username.trim().length < 3 || form.username.trim().length > 32 || !/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
      errs.username = 'Username must be 3-32 letters, numbers, or underscores.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'A valid email address is required.'
    }
    if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/\d/.test(form.password)) {
      errs.password = 'Password must be at least 8 characters and include a letter and a number.'
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      setError(errs.classroomId ?? null)
      return
    }

    setSaving(true)
    setError(null)
    setFormErrors({})
    try {
      const response = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          username: form.username.trim(),
          email: form.email.trim(),
          classroomId: selectedClassroomId,
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) {
        if (isFieldErrors(json.data)) {
          setFormErrors(json.data)
          if (json.data.classroomId) setError(json.data.classroomId)
        }
        throw new Error(json.message ?? 'Failed to enroll student')
      }

      setStudents(current => [json.data, ...current])
      setClassrooms(current =>
        current.map(classroom =>
          classroom.id === selectedClassroomId
            ? { ...classroom, studentCount: Number(classroom.studentCount ?? 0) + 1 }
            : classroom,
        ),
      )
      setForm({ username: '', email: '', password: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll student')
    } finally {
      setSaving(false)
    }
  }

  async function updateStudent(studentId: number, changes: Record<string, string>) {
    setError(null)
    const response = await fetch(`/api/teacher/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(changes),
    })
    const json = await response.json()
    if (!response.ok || !json.success) {
      setError(json.message ?? 'Failed to update student')
      return
    }

    setStudents(current => current.map(student => (student.id === studentId ? { ...student, ...json.data } : student)))
    if (changes.password) {
      setPasswordDrafts(current => ({ ...current, [studentId]: '' }))
    }
  }

  async function toggleLevelUnlock(studentId: number, levelNumber: number, currentlyUnlocked: boolean) {
    const key = `${studentId}-${levelNumber}`
    setUnlockingLevel(key)
    setError(null)
    try {
      const method = currentlyUnlocked ? 'DELETE' : 'POST'
      const response = await fetch(`/api/teacher/students/${studentId}/unlock-level`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ levelNumber }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message ?? 'Failed to toggle level unlock')

      const newUnlocks: number[] = json.data?.unlockedLevels ?? []
      setStudents(current =>
        current.map(student =>
          student.id === studentId ? { ...student, teacherUnlockedLevels: newUnlocks } : student,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle level unlock')
    } finally {
      setUnlockingLevel(null)
    }
  }

  async function notifyParent(studentId: number) {
    setNotifyingParent(studentId)
    setError(null)
    try {
      const response = await fetch(`/api/teacher/students/${studentId}/notify-parent`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message ?? 'Failed to send notification')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to notify parent')
    } finally {
      setNotifyingParent(null)
    }
  }

  if (authLoading || loadingClassrooms || user?.role !== 'teacher') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-game-gradient text-primary-300">
        <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
        <span className="font-game text-sm">Loading teacher workspace...</span>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-game-gradient text-white">
      <nav className="sticky top-0 z-20 border-b border-primary-200/10 bg-dark-900/85 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <GraduationCap className="h-6 w-6 shrink-0 text-primary-300" />
            <div className="min-w-0">
              <h1 className="truncate font-game text-lg font-black">Teacher Management</h1>
              <p className="truncate text-xs text-primary-100/45">
                {selectedClassroom ? `${user.username} / ${selectedClassroom.name}` : `${user.username} classroom setup`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={<LogOut className="h-3.5 w-3.5" />} onClick={logout}>
            Sign Out
          </Button>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-lg border border-primary-200/15 bg-primary-900/80 p-5 shadow-card backdrop-blur-md">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary-300">Classroom</p>
                <h2 className="text-xl font-black">Create Classroom</h2>
              </div>
              <School className="h-6 w-6 text-primary-300" />
            </div>

            <form onSubmit={createClassroom} className="space-y-4">
              <Input
                label="Classroom Name"
                value={classroomName}
                onChange={event => setClassroomName(event.target.value)}
                placeholder="Grade 5 Math"
                autoComplete="off"
                error={classroomError ?? undefined}
              />
              <Button
                type="submit"
                className="w-full"
                size="lg"
                variant="neon"
                loading={creatingClassroom}
                icon={<PlusCircle className="h-4 w-4" />}
              >
                Create Classroom
              </Button>
            </form>

            <div className="mt-5 space-y-2">
              {classrooms.length === 0 ? (
                <div className="rounded-lg border border-dashed border-primary-200/20 p-4 text-center text-sm text-primary-100/45">
                  No classrooms yet.
                </div>
              ) : (
                classrooms.map(classroom => {
                  const active = classroom.id === selectedClassroomId
                  const isEditing = editingClassroomId === classroom.id
                  return (
                    <div key={classroom.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelectedClassroomId(classroom.id)}
                          className={[
                            'flex flex-1 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition',
                            active
                              ? 'border-primary-300/60 bg-primary-500/15 text-white'
                              : 'border-primary-200/15 bg-primary-950/25 text-primary-100 hover:bg-primary-200/10',
                          ].join(' ')}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold">{classroom.name}</span>
                            <span className="text-xs text-primary-100/45">{classroom.studentCount} students</span>
                          </span>
                          <BookOpenCheck className={active ? 'h-4 w-4 text-primary-300' : 'h-4 w-4 text-primary-100/45'} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClassroomId(isEditing ? null : classroom.id)
                            setEditClassroomName(classroom.name)
                          }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary-200/15 bg-primary-950/25 text-primary-100/65 transition hover:bg-primary-200/10 hover:text-white"
                          title="Rename classroom"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {isEditing && (
                        <form onSubmit={renameClassroom} className="flex items-center gap-2 pl-1">
                          <Input
                            containerClassName="flex-1"
                            value={editClassroomName}
                            onChange={e => setEditClassroomName(e.target.value)}
                            placeholder="New name"
                            autoComplete="off"
                          />
                          <Button type="submit" size="sm" variant="neon" loading={savingClassroomEdit}>
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingClassroomId(null)}>
                            Cancel
                          </Button>
                        </form>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </section>

          <section className="rounded-lg border border-primary-200/15 bg-primary-900/80 p-5 shadow-card backdrop-blur-md">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary-300">Enrollment</p>
                <h2 className="text-xl font-black">Create Student Login</h2>
              </div>
              <UserPlus className="h-6 w-6 text-primary-300" />
            </div>

            <form onSubmit={enrollStudent} className="space-y-4">
              <Input
                label="Username"
                value={form.username}
                onChange={event => setForm(current => ({ ...current, username: event.target.value }))}
                placeholder="StudentName"
                autoComplete="off"
                disabled={!selectedClassroom}
                error={formErrors.username}
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
                placeholder="student@example.com"
                autoComplete="off"
                disabled={!selectedClassroom}
                error={formErrors.email}
              />
              <Input
                label="Assigned Password"
                type="text"
                value={form.password}
                onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
                placeholder="At least 8 characters"
                autoComplete="off"
                disabled={!selectedClassroom}
                error={formErrors.password}
              />
              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={saving}
                disabled={!selectedClassroom}
                icon={<ShieldCheck className="h-4 w-4" />}
              >
                Enroll Student
              </Button>
            </form>

            {error && (
              <p className="mt-4 rounded-lg border border-primary-200/35 bg-primary-950/45 px-3 py-2 text-sm text-primary-50">
                {error}
              </p>
            )}
          </section>
        </div>

        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-primary-200/15 bg-primary-900/75 p-4">
              <p className="text-xs font-bold uppercase text-primary-100/45">Classrooms</p>
              <p className="mt-1 text-2xl font-black text-white">{classrooms.length}</p>
            </div>
            <div className="rounded-lg border border-primary-200/15 bg-primary-900/75 p-4">
              <p className="text-xs font-bold uppercase text-primary-100/45">All Students</p>
              <p className="mt-1 text-2xl font-black text-white">{totalStudents}</p>
            </div>
            <div className="rounded-lg border border-primary-200/15 bg-primary-900/75 p-4">
              <p className="text-xs font-bold uppercase text-primary-100/45">Selected</p>
              <p className="mt-1 text-2xl font-black text-primary-200">{enrolledCount}</p>
            </div>
            <button
              type="button"
              onClick={refreshData}
              className="flex min-h-20 items-center justify-center gap-2 rounded-lg border border-primary-200/15 bg-primary-900/75 px-4 text-sm font-bold text-white transition hover:bg-primary-200/10"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {/* Performance Summary */}
          {students.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <p className="text-xs font-bold uppercase text-emerald-300">Good Performance</p>
                </div>
                <p className="mt-1 text-2xl font-black text-emerald-200">{students.filter(s => s.progress.performanceColor === 'green').length}</p>
                <p className="text-xs text-primary-100/45">3+ levels completed</p>
              </div>
              <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <p className="text-xs font-bold uppercase text-yellow-300">Average Performance</p>
                </div>
                <p className="mt-1 text-2xl font-black text-yellow-200">{students.filter(s => s.progress.performanceColor === 'yellow').length}</p>
                <p className="text-xs text-primary-100/45">1-2 levels completed</p>
              </div>
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <p className="text-xs font-bold uppercase text-red-300">Needs Attention</p>
                </div>
                <p className="mt-1 text-2xl font-black text-red-200">{students.filter(s => s.progress.performanceColor === 'red').length}</p>
                <p className="text-xs text-primary-100/45">0 levels completed</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-primary-200/15 bg-primary-900/70 p-4 shadow-card backdrop-blur-md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Users className="h-5 w-5 shrink-0 text-primary-300" />
                <h2 className="truncate text-lg font-black">
                  {selectedClassroom ? selectedClassroom.name : 'Student Accounts'}
                </h2>
              </div>
              {loadingStudents && <RefreshCw className="h-4 w-4 animate-spin text-primary-300" />}
            </div>

            {!selectedClassroom ? (
              <div className="rounded-lg border border-dashed border-primary-200/20 p-8 text-center text-sm text-primary-100/45">
                Create a classroom first.
              </div>
            ) : students.length === 0 ? (
              <div className="rounded-lg border border-dashed border-primary-200/20 p-8 text-center text-sm text-primary-100/45">
                No enrolled students in this classroom yet.
              </div>
            ) : (
              <div className="grid gap-3">
                {students.map(student => (
                  <motion.article
                    key={student.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-primary-200/15 bg-primary-950/25 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`h-3 w-3 rounded-full ${performanceColors[student.progress.performanceColor]}`} title={`Performance: ${student.progress.performanceColor}`} />
                          <h3 className="truncate text-base font-black">{student.username}</h3>
                          <span className={`rounded-md border px-2 py-1 text-xs font-bold ${statusTone[student.enrollmentStatus]}`}>
                            {student.enrollmentStatus}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-primary-100/65">{student.email}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-primary-100/45">
                          <School className="h-3 w-3" />
                          {student.classroomName ?? selectedClassroom.name}
                        </p>

                        {/* Progress Stats */}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5 rounded-md border border-primary-200/15 bg-primary-950/40 px-2.5 py-1.5">
                            <BookOpenCheck className="h-3.5 w-3.5 text-primary-300" />
                            <span className="text-xs font-bold text-primary-100">
                              {student.progress.levelsCompleted}/{student.progress.totalLevels} levels
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 rounded-md border border-primary-200/15 bg-primary-950/40 px-2.5 py-1.5">
                            <Star className="h-3.5 w-3.5 text-yellow-400" />
                            <span className="text-xs font-bold text-primary-100">
                              {student.progress.starBalance} stars
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 rounded-md border border-primary-200/15 bg-primary-950/40 px-2.5 py-1.5">
                            <GraduationCap className="h-3.5 w-3.5 text-primary-300" />
                            <span className="text-xs font-bold text-primary-100">
                              Lv. {student.progress.currentLevel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={student.enrollmentStatus === 'disabled' ? 'primary' : 'secondary'}
                          onClick={() =>
                            updateStudent(student.id, {
                              enrollmentStatus: student.enrollmentStatus === 'disabled' ? 'enrolled' : 'disabled',
                            })
                          }
                        >
                          {student.enrollmentStatus === 'disabled' ? 'Reactivate' : 'Disable'}
                        </Button>
                      </div>
                    </div>

                    {/* Level Unlock Controls */}
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary-100/55">Unlock Levels</p>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map(levelNum => {
                          const completedByStudent = student.progress.completedLevels.includes(levelNum)
                          const unlockedByTeacher = student.teacherUnlockedLevels.includes(levelNum)
                          const autoUnlocked = levelNum <= student.progress.levelsCompleted + 1
                          const _isUnlocked = completedByStudent || unlockedByTeacher || autoUnlocked // eslint-disable-line @typescript-eslint/no-unused-vars
                          const loadingKey = `${student.id}-${levelNum}`
                          const isLoading = unlockingLevel === loadingKey

                          return (
                            <button
                              key={levelNum}
                              type="button"
                              disabled={completedByStudent || isLoading}
                              onClick={() => toggleLevelUnlock(student.id, levelNum, unlockedByTeacher)}
                              className={[
                                'flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold transition',
                                completedByStudent
                                  ? 'cursor-default border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                  : unlockedByTeacher
                                    ? 'border-yellow-400/40 bg-yellow-400/15 text-yellow-300 hover:bg-yellow-400/25'
                                    : autoUnlocked
                                      ? 'cursor-default border-primary-300/30 bg-primary-500/10 text-primary-200'
                                      : 'border-primary-200/20 bg-primary-950/40 text-primary-100/50 hover:border-primary-300/40 hover:text-primary-100',
                              ].join(' ')}
                              title={
                                completedByStudent
                                  ? `Level ${levelNum} completed`
                                  : unlockedByTeacher
                                    ? `Level ${levelNum} unlocked by teacher (click to lock)`
                                    : autoUnlocked
                                      ? `Level ${levelNum} auto-unlocked`
                                      : `Click to unlock level ${levelNum}`
                              }
                            >
                              {isLoading ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : completedByStudent ? (
                                <span>✓</span>
                              ) : unlockedByTeacher ? (
                                <Unlock className="h-3.5 w-3.5" />
                              ) : autoUnlocked ? (
                                <span>{levelNum}</span>
                              ) : (
                                <Lock className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Input
                        containerClassName="flex-1"
                        label="Reset Password"
                        type="text"
                        value={passwordDrafts[student.id] ?? ''}
                        onChange={event =>
                          setPasswordDrafts(current => ({ ...current, [student.id]: event.target.value }))
                        }
                        placeholder="New assigned password"
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        variant="neon"
                        className="sm:mt-7"
                        icon={<KeyRound className="h-3.5 w-3.5" />}
                        disabled={!passwordDrafts[student.id]}
                        onClick={() => updateStudent(student.id, { password: passwordDrafts[student.id] })}
                      >
                        Save
                      </Button>
                    </div>

                    {/* Parent Email & Notify */}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Input
                        containerClassName="flex-1"
                        label="Parent Email"
                        type="email"
                        value={parentEmailDrafts[student.id] ?? student.parentEmail ?? ''}
                        onChange={event =>
                          setParentEmailDrafts(current => ({ ...current, [student.id]: event.target.value }))
                        }
                        placeholder="parent@example.com"
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        variant="neon"
                        className="sm:mt-7"
                        disabled={!(parentEmailDrafts[student.id] ?? student.parentEmail)}
                        onClick={() => {
                          const email = parentEmailDrafts[student.id] ?? student.parentEmail ?? ''
                          if (email !== (student.parentEmail ?? '')) {
                            updateStudent(student.id, { parentEmail: email })
                          }
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="sm:mt-7"
                        disabled={!student.parentEmail || notifyingParent === student.id}
                        onClick={() => notifyParent(student.id)}
                      >
                        {notifyingParent === student.id ? 'Sending...' : 'Notify Parent'}
                      </Button>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
