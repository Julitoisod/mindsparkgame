'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileQuestion,
  GraduationCap,
  PlusCircle,
  RefreshCw,
  School,
  Star,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import { currentSchoolYear, formatSchoolYear } from '@/lib/enrollment'

type Classroom = { id: number; name: string; schoolYear: string | null; studentCount: number; createdAt: string }
type Student = { id: number; username: string; fullName: string | null; classroomName: string | null; enrolledAt: string | null; progress: { performanceColor: string; levelsCompleted: number; starBalance: number } }

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [classroomName, setClassroomName] = useState('')
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear())
  const [creatingClassroom, setCreatingClassroom] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)


  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [classRes, studRes] = await Promise.all([
        fetch('/api/teacher/classrooms', { credentials: 'include' }),
        fetch('/api/teacher/students', { credentials: 'include' }),
      ])
      const classJson = await classRes.json()
      const studJson = await studRes.json()
      if (classJson.success) setClassrooms(classJson.data)
      if (studJson.success) setStudents(studJson.data)
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function createClassroom(e: React.FormEvent) {
    e.preventDefault()
    if (!classroomName.trim()) return
    setCreatingClassroom(true)
    setError(null)
    try {
      const res = await fetch('/api/teacher/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: classroomName.trim(), schoolYear }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      setClassrooms(prev => [json.data, ...prev])
      setClassroomName('')
      setSuccess('Section created!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create section')
    } finally {
      setCreatingClassroom(false)
    }
  }

  const totalStudents = students.length
  const activeStudents = students.filter(s => s.progress.performanceColor !== 'none').length
  const greenStudents = students.filter(s => s.progress.performanceColor === 'green').length
  const recentStudents = [...students].sort((a, b) => new Date(b.enrolledAt ?? 0).getTime() - new Date(a.enrolledAt ?? 0).getTime()).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Welcome + Feature Card */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-black">Welcome back, {user?.username}!</h2>
          <p className="mt-1 text-sm text-[#6B7280]">Here&apos;s your sections overview</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-purple-400/20 bg-gradient-to-br from-purple-900/60 to-pink-900/30 backdrop-blur-md p-4"
        >
          <p className="mb-2 text-xs font-bold text-[#374151]">Welcome to Teacher Management</p>
          <div className="space-y-1.5">
            {[
              'Create and manage sections',
              'Enroll students from the Registrar CSV class list',
              'Track and manage student accounts',
              'Generate reports and insights',
              'Unlock levels for students',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[#4B5563]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<School className="h-5 w-5" />} label="Sections" value={classrooms.length} sub="Total sections" color="from-blue-500 to-cyan-500" delay={0} />
        <StatCard icon={<Users className="h-5 w-5" />} label="All Students" value={totalStudents} sub="Total enrolled" color="from-purple-500 to-pink-500" delay={0.05} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Active" value={activeStudents} sub={`${totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}% playing`} color="from-yellow-400 to-orange-500" delay={0.1} />
        <StatCard icon={<GraduationCap className="h-5 w-5" />} label="Performing Well" value={greenStudents} sub="3+ levels done" color="from-emerald-500 to-teal-500" delay={0.15} />
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-400/30 px-4 py-2 text-sm text-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-4 py-2 text-sm text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </motion.div>
      )}

      {/* Create Section — enrolment lives on its own Enrollment page (item 2) */}
      <div className="grid gap-4">
        {/* Create Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dbeafe] text-[#3B82F6]">
              <School className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-[#111827]">Create Section</h3>
              <p className="text-[10px] text-[#6B7280]">Add a new section</p>
            </div>
          </div>
          <form onSubmit={createClassroom} className="space-y-3">
            <div>
              <label htmlFor="dash-school-year" className="mb-1 block text-[11px] font-bold uppercase text-[#6B7280]">School Year *</label>
              <input
                id="dash-school-year"
                type="text"
                inputMode="numeric"
                placeholder="2026-2027"
                value={schoolYear}
                onChange={e => setSchoolYear(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label htmlFor="dash-section-name" className="mb-1 block text-[11px] font-bold uppercase text-[#6B7280]">Section Name *</label>
              <input
                id="dash-section-name"
                type="text"
                placeholder="e.g. Grade 5 - Gals"
                value={classroomName}
                onChange={e => setClassroomName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <Button type="submit" loading={creatingClassroom} icon={<PlusCircle className="h-4 w-4" />} className="w-full">
              Create Section
            </Button>
          </form>
          {classrooms.length > 0 && (
            <div className="mt-4 pt-4 border-t border-purple-400/15">
              <p className="mb-2 text-xs font-bold text-[#374151]">Your Sections ({classrooms.length})</p>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {classrooms.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg bg-purple-900/30 px-3 py-2">
                    <span className="text-xs font-bold text-[#111827]">
                      {c.name}
                      {c.schoolYear && <span className="ml-1.5 font-medium text-[#6B7280]">{formatSchoolYear(c.schoolYear)}</span>}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">{c.studentCount} students</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

      </div>

      {/* Recent Enrollments + Quick Links */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#111827]">Recent Enrollments</h3>
            <Link href="/teacher/students" className="flex items-center gap-1 text-xs text-[#6B7280] transition hover:text-[#374151]">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentStudents.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#6B7280]">No students enrolled yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-400/15 text-xs font-bold uppercase text-[#4B5563]">
                    <th className="pb-2 text-left">Student</th>
                    <th className="pb-2 text-left">Section</th>
                    <th className="pb-2 text-left">Stars</th>
                    <th className="pb-2 text-left">Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-400/10">
                  {recentStudents.map(s => (
                    <tr key={s.id} className="text-[#374151]">
                      <td className="py-2.5">
                        <p className="text-xs font-bold text-[#111827]">{s.fullName ?? s.username}</p>
                        <p className="text-[10px] text-[#6B7280]">@{s.username}</p>
                      </td>
                      <td className="py-2.5 text-xs">{s.classroomName ?? '—'}</td>
                      <td className="py-2.5 text-xs flex items-center gap-1 text-yellow-300">
                        <Star className="h-3 w-3 fill-current" /> {s.progress.starBalance}
                      </td>
                      <td className="py-2.5 text-[10px] text-[#6B7280]">
                        {s.enrolledAt ? new Date(s.enrolledAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <QuickLink href="/teacher/students" icon={<Users className="h-4 w-4" />} label="Manage Students" sub="View all students" color="from-purple-500 to-pink-500" />
          <QuickLink href="/teacher/classrooms" icon={<School className="h-4 w-4" />} label="Manage Sections" sub="Create & edit" color="from-blue-500 to-cyan-500" />
          <QuickLink href="/teacher/questions" icon={<FileQuestion className="h-4 w-4" />} label="Question Bank" sub="Add & edit questions" color="from-purple-500 to-pink-500" />
          <QuickLink href="/teacher/reports" icon={<BarChart3 className="h-4 w-4" />} label="View Reports" sub="Performance data" color="from-orange-500 to-red-500" />
          <button
            onClick={loadData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-purple-400/20 bg-white px-4 py-3 text-xs font-bold text-[#374151] transition hover:bg-[#f4efff]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color, delay }: { icon: React.ReactNode; label: string; value: number; sub: string; color: string; delay: number }) {
  const statStyles: Record<string, { card: string; border: string; iconWrap: string; iconColor: string }> = {
    'from-blue-500 to-cyan-500': {
      card: 'bg-[#eef5ff]',
      border: 'border-[#d8e6ff]',
      iconWrap: 'bg-[#dbeafe]',
      iconColor: 'text-[#3B82F6]',
    },
    'from-purple-500 to-pink-500': {
      card: 'bg-[#f5efff]',
      border: 'border-[#e8dcff]',
      iconWrap: 'bg-[#e6dcff]',
      iconColor: 'text-[#7C58D8]',
    },
    'from-yellow-400 to-orange-500': {
      card: 'bg-[#fff9ec]',
      border: 'border-[#fce7ba]',
      iconWrap: 'bg-[#fdecc8]',
      iconColor: 'text-[#d97706]',
    },
    'from-emerald-500 to-teal-500': {
      card: 'bg-[#eefaf2]',
      border: 'border-[#d4efd9]',
      iconWrap: 'bg-[#d9f3df]',
      iconColor: 'text-[#16A34A]',
    },
  }

  const style = statStyles[color] ?? statStyles['from-purple-500 to-pink-500']

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className={`stat-card rounded-xl border p-4 shadow-lg ${style.card} ${style.border}`}
    >
      <div className="flex items-center gap-2">
        <span className={`icon-circle flex h-9 w-9 items-center justify-center rounded-full ${style.iconWrap} ${style.iconColor}`}>
          {icon}
        </span>
        <span className="stat-title text-[10px] font-bold uppercase text-[#374151]">{label}</span>
      </div>
      <p className="stat-number mt-1 text-3xl font-black text-[#111827]">{value}</p>
      <p className="stat-subtitle text-[10px] text-[#6B7280]">{sub}</p>
    </motion.div>
  )
}

function QuickLink({ href, icon, label, sub, color }: { href: string; icon: React.ReactNode; label: string; sub: string; color: string }) {
  const iconStyles: Record<string, { wrap: string; icon: string }> = {
    'from-purple-500 to-pink-500': { wrap: 'bg-[#e6dcff]', icon: 'text-[#7C58D8]' },
    'from-blue-500 to-cyan-500': { wrap: 'bg-[#dbeafe]', icon: 'text-[#3B82F6]' },
    'from-orange-500 to-red-500': { wrap: 'bg-[#ffedd5]', icon: 'text-[#ea580c]' },
  }

  const style = iconStyles[color] ?? iconStyles['from-purple-500 to-pink-500']

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-purple-400/20 bg-purple-950/40 p-3 transition hover:bg-[#f4efff] hover:border-purple-400/40"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.wrap} ${style.icon}`}>
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-bold text-[#111827]">{label}</p>
        <p className="text-[10px] text-[#6B7280]">{sub}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-[#6B7280] transition group-hover:text-[#374151]" />
    </Link>
  )
}
