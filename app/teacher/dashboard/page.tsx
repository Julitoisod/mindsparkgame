'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  GraduationCap,
  PlusCircle,
  RefreshCw,
  School,
  Star,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

type Classroom = { id: number; name: string; studentCount: number; createdAt: string }
type Student = { id: number; username: string; email: string; classroomName: string | null; enrolledAt: string | null; progress: { performanceColor: string; levelsCompleted: number; starBalance: number } }
type BulkResult = { row: number; name: string; status: 'enrolled' | 'skipped'; reason?: string }

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [classroomName, setClassroomName] = useState('')
  const [creatingClassroom, setCreatingClassroom] = useState(false)
  const [enrollForm, setEnrollForm] = useState({ username: '', email: '', password: '' })
  const [selectedClassroomId, setSelectedClassroomId] = useState<number | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // CSV bulk upload state
  const [csvClassroomId, setCsvClassroomId] = useState<number | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResults, setCsvResults] = useState<BulkResult[] | null>(null)
  const [csvSummary, setCsvSummary] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      if (classJson.data?.length && !selectedClassroomId) {
        setSelectedClassroomId(classJson.data[0].id)
        setCsvClassroomId(classJson.data[0].id)
      }
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [selectedClassroomId])

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
        body: JSON.stringify({ name: classroomName.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      setClassrooms(prev => [json.data, ...prev])
      setSelectedClassroomId(json.data.id)
      setCsvClassroomId(json.data.id)
      setClassroomName('')
      setSuccess('Classroom created!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create classroom')
    } finally {
      setCreatingClassroom(false)
    }
  }

  async function enrollStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClassroomId) { setError('Select a classroom first'); return }
    setEnrolling(true)
    setError(null)
    try {
      const res = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...enrollForm, classroomId: selectedClassroomId }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      setStudents(prev => [json.data, ...prev])
      setEnrollForm({ username: '', email: '', password: '' })
      setSuccess('Student enrolled successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll student')
    } finally {
      setEnrolling(false)
    }
  }

  function parseCSV(text: string): Record<string, string>[] {
    // Remove BOM if present (Excel adds this)
    const cleaned = text.replace(/^\uFEFF/, '').trim()
    const lines = cleaned.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return []

    // Parse a single CSV line handling quoted fields
    function parseLine(line: string): string[] {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          inQuotes = !inQuotes
        } else if (ch === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
      result.push(current.trim())
      return result
    }

    const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
    return lines.slice(1).map(line => {
      const values = parseLine(line)
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] ?? '' })
      return row
    }).filter(row => Object.values(row).some(v => v.trim()))
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!csvClassroomId) { setError('Select a classroom for CSV upload first'); return }

    setCsvUploading(true)
    setCsvResults(null)
    setCsvSummary(null)
    setError(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)

      if (rows.length === 0) {
        setError('CSV file is empty or has no valid rows')
        return
      }

      // Map CSV columns to API fields — flexible column name matching
      const students = rows.map(row => {
        // Try multiple possible column name variations
        const name = row.name ?? row.username ?? row.student_name ?? row.fullname ?? row.full_name ?? ''
        const email = row.gmail ?? row.email ?? row.student_gmail ?? row.student_email ?? ''
        const password = row.password ?? row.pass ?? row.passwd ?? ''
        const parentEmail = row.parents_gmail ?? row.parent_gmail ?? row.parentsgmail ?? row.parentgmail ?? row.parent_email ?? row.parents_email ?? row.parentemail ?? ''
        return { name, email, password, parentEmail }
      })

      const res = await fetch('/api/teacher/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ classroomId: csvClassroomId, students }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) throw new Error(json.message)

      setCsvResults(json.data.results)
      setCsvSummary(json.message)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV upload failed')
    } finally {
      setCsvUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function downloadTemplate() {
    const csv = 'Name,Gmail,Password,Parents Gmail\nJuan Dela Cruz,juan@gmail.com,password123,parent@gmail.com\nMaria Santos,maria@gmail.com,pass456,mom@gmail.com'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_enrollment_template.csv'
    a.click()
    URL.revokeObjectURL(url)
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
          <h2 className="text-2xl font-black">Welcome back, {user?.username}! 👋</h2>
          <p className="text-sm text-purple-300 mt-1">Here&apos;s your classroom overview</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-purple-400/20 bg-gradient-to-br from-purple-900/60 to-pink-900/30 backdrop-blur-md p-4"
        >
          <p className="text-xs font-bold text-purple-200 mb-2">✨ Welcome to Teacher Management</p>
          <div className="space-y-1.5">
            {[
              'Create and manage classrooms',
              'Add students one-by-one or via CSV',
              'Track and manage student accounts',
              'Generate reports and insights',
              'Unlock levels for students',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-purple-100">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<School className="h-5 w-5" />} label="Classrooms" value={classrooms.length} sub="Total classrooms" color="from-blue-500 to-cyan-500" delay={0} />
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

      {/* Quick Actions — 3 columns */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Create Classroom */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30">
              <School className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-white">Create Classroom</h3>
              <p className="text-[10px] text-purple-400">Add a new classroom</p>
            </div>
          </div>
          <form onSubmit={createClassroom} className="space-y-3">
            <Input placeholder="e.g. Grade 3 Math" value={classroomName} onChange={e => setClassroomName(e.target.value)} />
            <Button type="submit" loading={creatingClassroom} icon={<PlusCircle className="h-4 w-4" />} className="w-full">
              Create Classroom
            </Button>
          </form>
          {classrooms.length > 0 && (
            <div className="mt-4 pt-4 border-t border-purple-400/15">
              <p className="text-xs font-bold text-purple-300 mb-2">Your Classrooms ({classrooms.length})</p>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {classrooms.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg bg-purple-900/30 px-3 py-2">
                    <span className="text-xs font-bold text-white">{c.name}</span>
                    <span className="text-[10px] text-purple-400">{c.studentCount} students</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Enroll Student (single) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-white">Enroll Student</h3>
              <p className="text-[10px] text-purple-400">Add one student manually</p>
            </div>
          </div>
          <form onSubmit={enrollStudent} className="space-y-3">
            <select
              value={selectedClassroomId ?? ''}
              onChange={e => setSelectedClassroomId(Number(e.target.value) || null)}
              className="w-full rounded-xl bg-purple-900/50 border border-purple-400/20 text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">Select classroom...</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input placeholder="Username" value={enrollForm.username} onChange={e => setEnrollForm(f => ({ ...f, username: e.target.value }))} />
            <Input placeholder="Email (Gmail)" type="email" value={enrollForm.email} onChange={e => setEnrollForm(f => ({ ...f, email: e.target.value }))} />
            <Input placeholder="Assigned Password" type="password" value={enrollForm.password} onChange={e => setEnrollForm(f => ({ ...f, password: e.target.value }))} />
            <Button type="submit" loading={enrolling} icon={<UserPlus className="h-4 w-4" />} className="w-full">
              Enroll Student
            </Button>
          </form>
        </motion.div>

        {/* CSV Bulk Upload */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-white">CSV Bulk Enroll</h3>
              <p className="text-[10px] text-purple-400">Upload multiple students at once</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Classroom selector */}
            <select
              value={csvClassroomId ?? ''}
              onChange={e => setCsvClassroomId(Number(e.target.value) || null)}
              className="w-full rounded-xl bg-purple-900/50 border border-purple-400/20 text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">Select classroom...</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* CSV format info */}
            <div className="rounded-lg bg-purple-900/30 border border-purple-400/15 p-3 text-xs text-purple-300 space-y-1">
              <p className="font-bold text-purple-200">📋 Required CSV columns:</p>
              <p className="font-mono text-[10px] bg-purple-950/50 rounded px-2 py-1">Name, Gmail, Password, Parents Gmail</p>
              <p className="text-[10px] text-purple-400">Parents Gmail is optional. Max 100 students per file.</p>
            </div>

            {/* Download template */}
            <button
              type="button"
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-purple-400/30 bg-purple-900/30 px-3 py-2 text-xs font-bold text-purple-200 hover:bg-purple-800/40 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV Template
            </button>

            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={csvUploading || !csvClassroomId}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-500/30 hover:from-orange-400 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {csvUploading ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4" /> Upload CSV File</>
              )}
            </button>
          </div>

          {/* CSV Results */}
          <AnimatePresence>
            {csvSummary && csvResults && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-purple-400/15"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white">📊 Upload Results</p>
                  <span className="text-[10px] text-purple-400">{csvSummary}</span>
                </div>
                <div className="max-h-[160px] overflow-y-auto space-y-1">
                  {csvResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] ${r.status === 'enrolled' ? 'bg-emerald-500/10 border border-emerald-400/20' : 'bg-red-500/10 border border-red-400/20'}`}>
                      {r.status === 'enrolled'
                        ? <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                        : <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />}
                      <span className={`font-bold ${r.status === 'enrolled' ? 'text-emerald-300' : 'text-red-300'}`}>Row {r.row}</span>
                      <span className="text-purple-200 truncate">{r.name}</span>
                      {r.reason && <span className="text-red-400 ml-auto shrink-0">{r.reason}</span>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
            <h3 className="font-bold text-white">Recent Enrollments</h3>
            <Link href="/teacher/students" className="text-xs text-purple-300 hover:text-white flex items-center gap-1 transition">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentStudents.length === 0 ? (
            <p className="text-sm text-purple-400 text-center py-6">No students enrolled yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-400/15 text-xs font-bold uppercase text-purple-400">
                    <th className="pb-2 text-left">Student</th>
                    <th className="pb-2 text-left">Classroom</th>
                    <th className="pb-2 text-left">Stars</th>
                    <th className="pb-2 text-left">Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-400/10">
                  {recentStudents.map(s => (
                    <tr key={s.id} className="text-purple-100">
                      <td className="py-2.5">
                        <p className="font-bold text-white text-xs">{s.username}</p>
                        <p className="text-[10px] text-purple-400">{s.email}</p>
                      </td>
                      <td className="py-2.5 text-xs">{s.classroomName ?? '—'}</td>
                      <td className="py-2.5 text-xs flex items-center gap-1 text-yellow-300">
                        <Star className="h-3 w-3 fill-current" /> {s.progress.starBalance}
                      </td>
                      <td className="py-2.5 text-[10px] text-purple-400">
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
          <QuickLink href="/teacher/classrooms" icon={<School className="h-4 w-4" />} label="Manage Classrooms" sub="Create & edit" color="from-blue-500 to-cyan-500" />
          <QuickLink href="/teacher/reports" icon={<BarChart3 className="h-4 w-4" />} label="View Reports" sub="Performance data" color="from-orange-500 to-red-500" />
          <button
            onClick={loadData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-purple-400/20 bg-purple-950/30 px-4 py-3 text-xs font-bold text-purple-200 transition hover:bg-purple-500/15"
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
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className={`rounded-xl bg-gradient-to-br ${color} p-4 shadow-lg`}
    >
      <div className="flex items-center gap-2 text-white/80">
        {icon}
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </div>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
      <p className="text-[10px] text-white/60">{sub}</p>
    </motion.div>
  )
}

function QuickLink({ href, icon, label, sub, color }: { href: string; icon: React.ReactNode; label: string; sub: string; color: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-purple-400/20 bg-purple-950/40 backdrop-blur-md p-3 transition hover:bg-purple-500/15 hover:border-purple-400/40 group"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white shadow-md`}>
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-[10px] text-purple-400">{sub}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-purple-400 group-hover:text-white transition" />
    </Link>
  )
}
