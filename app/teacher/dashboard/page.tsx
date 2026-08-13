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
import { currentSchoolYear, formatSchoolYear } from '@/lib/enrollment'

type Classroom = { id: number; name: string; schoolYear: string | null; studentCount: number; createdAt: string }
type Student = { id: number; username: string; fullName: string | null; classroomName: string | null; enrolledAt: string | null; progress: { performanceColor: string; levelsCompleted: number; starBalance: number } }
type BulkResult = { row: number; name: string; status: 'enrolled' | 'skipped'; reason?: string; username?: string; password?: string }
/** One row of the Registrar's class list, held for review before enrolment. */
type PreviewStudent = { lastName: string; firstName: string; middleName: string }

const EMPTY_MANUAL_FORM = { lastName: '', firstName: '', middleName: '', username: '', password: '' }

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

  // Registrar class-list upload: preview -> Cancel / Confirm Enrollment -> credentials
  const [csvClassroomId, setCsvClassroomId] = useState<number | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResults, setCsvResults] = useState<BulkResult[] | null>(null)
  const [csvSummary, setCsvSummary] = useState<string | null>(null)
  const [csvPreview, setCsvPreview] = useState<PreviewStudent[] | null>(null)
  const [csvFileName, setCsvFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual enrolment (Last / First / Middle / Username / Password)
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM)
  const [manualClassroomId, setManualClassroomId] = useState<number | null>(null)
  const [manualSaving, setManualSaving] = useState(false)

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
      if (classJson.data?.length) {
        setCsvClassroomId(prev => prev ?? classJson.data[0].id)
        setManualClassroomId(prev => prev ?? classJson.data[0].id)
      }
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
      setCsvClassroomId(json.data.id)
      setManualClassroomId(json.data.id)
      setClassroomName('')
      setSuccess('Section created!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create section')
    } finally {
      setCreatingClassroom(false)
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

  /**
   * Step 1 — the teacher picks the Registrar's file. Nothing is enrolled yet:
   * the records are only displayed for review (panel revision, Aug 2026).
   */
  async function handleClassListSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!csvClassroomId) { setError('Select a section first'); return }

    setCsvResults(null)
    setCsvSummary(null)
    setError(null)

    try {
      const rows = parseCSV(await file.text())
      if (rows.length === 0) {
        setError('That file is empty or has no student rows')
        return
      }

      // Map the Registrar's official columns: Last Name, First Name, Middle Name.
      const preview: PreviewStudent[] = rows.map(row => ({
        lastName: row.last_name ?? row.lastname ?? row.surname ?? '',
        firstName: row.first_name ?? row.firstname ?? row.given_name ?? '',
        middleName: row.middle_name ?? row.middlename ?? row.middle_initial ?? '',
      })).filter(s => s.lastName || s.firstName)

      if (preview.length === 0) {
        setError('No Last Name / First Name columns found in that file')
        return
      }

      setCsvFileName(file.name)
      setCsvPreview(preview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  /** Step 2b — Cancel: nothing is enrolled and another file can be picked. */
  function cancelClassList() {
    setCsvPreview(null)
    setCsvFileName('')
  }

  /** Step 2a — Confirm Enrollment: accounts are generated by the system. */
  async function confirmEnrollment() {
    if (!csvPreview || !csvClassroomId) return
    setCsvUploading(true)
    setError(null)
    try {
      const res = await fetch('/api/teacher/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ classroomId: csvClassroomId, students: csvPreview }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)

      setCsvResults(json.data.results)
      setCsvSummary(json.message)
      setCsvPreview(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed')
    } finally {
      setCsvUploading(false)
    }
  }

  /** Step 3 — hand the generated usernames/passwords back to the teacher. */
  function exportCredentials() {
    const enrolled = (csvResults ?? []).filter(r => r.status === 'enrolled' && r.username)
    if (enrolled.length === 0) return
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
    const csv = [
      'Student Name,Username,Password',
      ...enrolled.map(r => [r.name, r.username ?? '', r.password ?? ''].map(escape).join(',')),
    ].join('\n')
    downloadCSV(csv, 'mindspark_login_credentials.csv')
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Manual enrolment — Last / First / Middle / Username / Password. */
  async function enrollManually(e: React.FormEvent) {
    e.preventDefault()
    if (!manualClassroomId) { setError('Select a section first'); return }
    setManualSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...manualForm, classroomId: manualClassroomId }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        const fieldError = json.data && typeof json.data === 'object' ? Object.values(json.data)[0] : null
        throw new Error(typeof fieldError === 'string' ? fieldError : json.message)
      }
      setManualForm(EMPTY_MANUAL_FORM)
      setSuccess(`${json.data.fullName ?? json.data.username} enrolled`)
      setTimeout(() => setSuccess(null), 4000)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed')
    } finally {
      setManualSaving(false)
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

      {/* Quick Actions — Create Section + Registrar CSV enrolment */}
      <div className="grid gap-4 lg:grid-cols-2">
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
                placeholder="e.g. Grade 3 - Gals"
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
              <h3 className="font-bold text-[#111827]">Student Enrollment</h3>
              <p className="text-[10px] text-[#6B7280]">Upload the official student list provided by the Registrar.</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Section selector */}
            <select
              value={csvClassroomId ?? ''}
              onChange={e => setCsvClassroomId(Number(e.target.value) || null)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="" className="text-gray-500">Select section...</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id} className="text-gray-900">
                  {c.name}{c.schoolYear ? ` — ${formatSchoolYear(c.schoolYear)}` : ''}
                </option>
              ))}
            </select>

            <div className="space-y-1 rounded-lg border border-purple-400/15 bg-purple-900/30 p-3 text-xs text-[#4B5563]">
              <p className="font-bold text-[#374151]">Columns read from the class list:</p>
              <p className="rounded bg-[#f8fafc] px-2 py-1 font-mono text-[10px] text-[#4B5563]">Last Name, First Name, Middle Name</p>
              <p className="text-[10px] text-[#6B7280]">MindSpark generates each username and a default password (username + &quot;123&quot;). Max 100 students per file.</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleClassListSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={csvUploading || !csvClassroomId}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-500/30 hover:from-orange-400 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Upload className="h-4 w-4" /> Upload Official Class List (CSV)
            </button>
          </div>

          {/* Review step — records are shown before anything is enrolled */}
          <AnimatePresence>
            {csvPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-purple-400/15"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-[#111827]">Review student records</p>
                  <span className="truncate text-[10px] text-[#6B7280]">{csvFileName} • {csvPreview.length} students</span>
                </div>
                <div className="max-h-[200px] overflow-y-auto rounded-lg border border-purple-400/15">
                  <table className="w-full text-left text-[10px]">
                    <thead className="sticky top-0 bg-[#f4efff] text-[#374151]">
                      <tr>
                        <th className="px-2 py-1.5 font-bold">#</th>
                        <th className="px-2 py-1.5 font-bold">Last Name</th>
                        <th className="px-2 py-1.5 font-bold">First Name</th>
                        <th className="px-2 py-1.5 font-bold">Middle Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-400/10">
                      {csvPreview.map((s, i) => (
                        <tr key={i} className="text-[#374151]">
                          <td className="px-2 py-1.5 text-[#6B7280]">{i + 1}</td>
                          <td className="px-2 py-1.5 font-bold text-[#111827]">{s.lastName || '—'}</td>
                          <td className="px-2 py-1.5">{s.firstName || '—'}</td>
                          <td className="px-2 py-1.5">{s.middleName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={cancelClassList}
                    disabled={csvUploading}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-[#374151] transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmEnrollment}
                    disabled={csvUploading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50"
                  >
                    {csvUploading
                      ? <><RefreshCw className="h-4 w-4 animate-spin" /> Enrolling...</>
                      : <><CheckCircle2 className="h-4 w-4" /> Confirm Enrollment</>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success + generated credentials */}
          <AnimatePresence>
            {csvSummary && csvResults && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-purple-400/15"
              >
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Enrollment complete — {csvSummary}
                </div>
                <div className="max-h-[160px] overflow-y-auto space-y-1">
                  {csvResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] ${r.status === 'enrolled' ? 'bg-emerald-500/10 border border-emerald-400/20' : 'bg-red-500/10 border border-red-400/20'}`}>
                      {r.status === 'enrolled'
                        ? <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                        : <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />}
                      <span className="truncate font-bold text-[#111827]">{r.name}</span>
                      {r.status === 'enrolled'
                        ? <span className="ml-auto shrink-0 font-mono text-[#4B5563]">{r.username} / {r.password}</span>
                        : <span className="ml-auto shrink-0 text-red-500">{r.reason}</span>}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={exportCredentials}
                  className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-purple-500/30 transition hover:from-purple-400 hover:to-fuchsia-400"
                >
                  <Download className="h-4 w-4" /> Export Login Credentials (CSV)
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Manual Enrollment — Last / First / Middle / Username / Password */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6dcff] text-[#7C58D8]">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-[#111827]">Manual Enrollment</h3>
            <p className="text-[10px] text-[#6B7280]">Enroll one student at a time</p>
          </div>
        </div>

        <form onSubmit={enrollManually} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ManualField label="Last Name *" value={manualForm.lastName} onChange={v => setManualForm(f => ({ ...f, lastName: v }))} placeholder="Santos" required />
          <ManualField label="First Name *" value={manualForm.firstName} onChange={v => setManualForm(f => ({ ...f, firstName: v }))} placeholder="John Mark" required />
          <ManualField label="Middle Name" value={manualForm.middleName} onChange={v => setManualForm(f => ({ ...f, middleName: v }))} placeholder="Cruz" />
          <ManualField label="Username *" value={manualForm.username} onChange={v => setManualForm(f => ({ ...f, username: v }))} placeholder="jsantos" required />
          <ManualField label="Password *" value={manualForm.password} onChange={v => setManualForm(f => ({ ...f, password: v }))} placeholder="At least 8 chars, 1 letter + 1 number" required />
          <div>
            <label htmlFor="manual-section" className="mb-1 block text-[11px] font-bold uppercase text-[#6B7280]">Section *</label>
            <select
              id="manual-section"
              value={manualClassroomId ?? ''}
              onChange={e => setManualClassroomId(Number(e.target.value) || null)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">Select section...</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.schoolYear ? ` — ${formatSchoolYear(c.schoolYear)}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" loading={manualSaving} icon={<UserPlus className="h-4 w-4" />} className="w-full sm:w-auto">
              Enroll Student
            </Button>
          </div>
        </form>
      </motion.div>

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

function ManualField({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  const id = `manual-${label.replace(/[^a-zA-Z]/g, '').toLowerCase()}`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[11px] font-bold uppercase text-[#6B7280]">{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
      />
    </div>
  )
}

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
