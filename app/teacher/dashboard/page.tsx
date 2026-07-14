'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Copy,
  Download,
  FileQuestion,
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
import Button from '@/components/ui/Button'

type Classroom = { id: number; name: string; studentCount: number; createdAt: string }
type Student = { id: number; username: string; fullName: string | null; classroomName: string | null; enrolledAt: string | null; progress: { performanceColor: string; levelsCompleted: number; starBalance: number } }
type BulkResult = { row: number; name: string; status: 'enrolled' | 'skipped'; reason?: string }

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [classroomName, setClassroomName] = useState('')
  const [creatingClassroom, setCreatingClassroom] = useState(false)
  const [enrollForm, setEnrollForm] = useState({ fullName: '', username: '', password: '' })
  const [selectedClassroomId, setSelectedClassroomId] = useState<number | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [enrolledCredentials, setEnrolledCredentials] = useState<{ fullName: string; username: string; password: string } | null>(null)

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
      setSuccess('Section created!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create section')
    } finally {
      setCreatingClassroom(false)
    }
  }

  async function enrollStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClassroomId) { setError('Select a section first'); return }
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
      setEnrolledCredentials({
        fullName: enrollForm.fullName,
        username: enrollForm.username,
        password: enrollForm.password,
      })
      setEnrollForm({ fullName: '', username: '', password: '' })
      setSuccess('Student enrolled successfully! Credentials shown below.')
      setTimeout(() => setSuccess(null), 6000)
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
    if (!csvClassroomId) { setError('Select a section for CSV upload first'); return }

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

      // Map CSV columns — full name + username
      const students = rows.map(row => {
        const fullName = row.full_name ?? row.fullname ?? row.name ?? row.student_name ?? ''
        const username = row.username ?? row.user_name ?? ''
        return { fullName, username }
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
    const csv = 'Full Name,Username\nJohn Mark Santos,johnmark\nMaria Santos,mariasantos'
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
              'Add students one-by-one or via CSV',
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

      {/* New Student Credentials Card */}
      <AnimatePresence>
        {enrolledCredentials && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border-2 border-purple-400 bg-gradient-to-r from-purple-50 to-white p-5 shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
                <h3 className="text-sm font-black text-purple-800">New Student Credentials</h3>
              </div>
              <button
                onClick={() => setEnrolledCredentials(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-purple-100 hover:text-purple-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {enrolledCredentials.fullName && (
                <div className="rounded-lg bg-white border border-purple-200 p-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Full Name</p>
                  <p className="text-sm font-black text-purple-700">{enrolledCredentials.fullName}</p>
                </div>
              )}
              <div className="rounded-lg bg-white border border-purple-200 p-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Username</p>
                <p className="text-sm font-black text-purple-700">{enrolledCredentials.username}</p>
              </div>
              <div className="rounded-lg bg-white border border-purple-200 p-3 relative">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Password</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-purple-700">{enrolledCredentials.password}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(enrolledCredentials.password)
                        .then(() => alert('Password copied to clipboard!'))
                        .catch(() => alert('Failed to copy'))
                    }}
                    className="rounded-md p-1 text-purple-400 hover:bg-purple-100 hover:text-purple-600 transition"
                    title="Copy password"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-gray-500">Share these credentials with the student. This card will disappear when you close it.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions — 3 columns */}
      <div className="grid gap-4 lg:grid-cols-3">
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
            <input
              type="text"
              placeholder="e.g. Grade 3 - Section A"
              value={classroomName}
              onChange={e => setClassroomName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
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
                    <span className="text-xs font-bold text-[#111827]">{c.name}</span>
                    <span className="text-[10px] text-[#6B7280]">{c.studentCount} students</span>
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
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dcfce7] text-[#16A34A]">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-[#111827]">Enroll Student</h3>
              <p className="text-[10px] text-[#6B7280]">Add one student manually</p>
            </div>
          </div>
          <form onSubmit={enrollStudent} className="space-y-3">
            <select
              value={selectedClassroomId ?? ''}
              onChange={e => setSelectedClassroomId(Number(e.target.value) || null)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="" className="text-gray-500">Select section...</option>
              {classrooms.map(c => <option key={c.id} value={c.id} className="text-gray-900">{c.name}</option>)}
            </select>
            <input
              type="text"
              placeholder="Full Name"
              value={enrollForm.fullName}
              onChange={e => setEnrollForm(f => ({ ...f, fullName: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <input
              type="text"
              placeholder="Username"
              value={enrollForm.username}
              onChange={e => setEnrollForm(f => ({ ...f, username: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <input
              type="text"
              placeholder="Assigned Password"
              value={enrollForm.password}
              onChange={e => setEnrollForm(f => ({ ...f, password: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
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
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffedd5] text-[#ea580c]">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-[#111827]">CSV Bulk Enroll</h3>
              <p className="text-[10px] text-[#6B7280]">Upload multiple students at once</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Classroom selector */}
            <select
              value={csvClassroomId ?? ''}
              onChange={e => setCsvClassroomId(Number(e.target.value) || null)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="" className="text-gray-500">Select section...</option>
              {classrooms.map(c => <option key={c.id} value={c.id} className="text-gray-900">{c.name}</option>)}
            </select>

            {/* CSV format info */}
            <div className="space-y-1 rounded-lg border border-purple-400/15 bg-purple-900/30 p-3 text-xs text-[#4B5563]">
              <p className="font-bold text-[#374151]">Required CSV columns:</p>
              <p className="rounded bg-[#f8fafc] px-2 py-1 font-mono text-[10px] text-[#4B5563]">Full Name, Username</p>
              <p className="text-[10px] text-[#6B7280]">Password is auto-generated as username + &quot;123&quot;. Max 100 students per file.</p>
            </div>

            {/* Download template */}
            <button
              type="button"
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-purple-400/30 bg-white px-3 py-2 text-xs font-bold text-[#374151] transition hover:bg-[#f4efff]"
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
                  <p className="text-xs font-bold text-[#111827]">Upload Results</p>
                  <span className="text-[10px] text-[#6B7280]">{csvSummary}</span>
                </div>
                <div className="max-h-[160px] overflow-y-auto space-y-1">
                  {csvResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] ${r.status === 'enrolled' ? 'bg-emerald-500/10 border border-emerald-400/20' : 'bg-red-500/10 border border-red-400/20'}`}>
                      {r.status === 'enrolled'
                        ? <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                        : <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />}
                      <span className={`font-bold ${r.status === 'enrolled' ? 'text-emerald-700' : 'text-red-700'}`}>Row {r.row}</span>
                      <span className="truncate text-[#374151]">{r.name}</span>
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
