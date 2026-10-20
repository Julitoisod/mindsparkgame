'use client'
/**
 * Student enrollment — Registrar CSV class list + manual entry.
 *
 * 2026-10b revision (item 2): this used to sit on the teacher dashboard. It
 * moved to its own Enrollment page to keep the dashboard readable; the design,
 * the review-before-enrol step and the generated credentials are unchanged,
 * and it still writes through the same /api/teacher/students endpoints.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  UserPlus,
  X,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatSchoolYear } from '@/lib/enrollment'

type Classroom = { id: number; name: string; schoolYear: string | null; studentCount: number }
type BulkResult = { row: number; name: string; status: 'enrolled' | 'skipped'; reason?: string; username?: string; password?: string }
/** One row of the Registrar's class list, held for review before enrolment. */
type PreviewStudent = { lastName: string; firstName: string; middleName: string }

const EMPTY_MANUAL_FORM = { lastName: '', firstName: '', middleName: '', username: '', password: '' }

export default function EnrollmentPanel() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [csvClassroomId, setCsvClassroomId] = useState<number | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResults, setCsvResults] = useState<BulkResult[] | null>(null)
  const [csvSummary, setCsvSummary] = useState<string | null>(null)
  const [csvPreview, setCsvPreview] = useState<PreviewStudent[] | null>(null)
  const [csvFileName, setCsvFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM)
  const [manualClassroomId, setManualClassroomId] = useState<number | null>(null)
  const [manualSaving, setManualSaving] = useState(false)

  const loadClassrooms = useCallback(async () => {
    try {
      const res = await fetch('/api/teacher/classrooms', { credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setClassrooms(json.data)
        if (json.data?.length) {
          setCsvClassroomId(prev => prev ?? json.data[0].id)
          setManualClassroomId(prev => prev ?? json.data[0].id)
        }
      }
    } catch {
      setError('Failed to load sections')
    }
  }, [])

  useEffect(() => { loadClassrooms() }, [loadClassrooms])

  function parseCSV(text: string): Record<string, string>[] {
    // Remove BOM if present (Excel adds this)
    const cleaned = text.replace(/^﻿/, '').trim()
    const lines = cleaned.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return []

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

  /** Step 1 — pick the Registrar's file. Nothing is enrolled yet: the records
   *  are only displayed for review. */
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
      await loadClassrooms()
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
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mindspark_login_credentials.csv'
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
      await loadClassrooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed')
    } finally {
      setManualSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-400/30 bg-red-500/20 px-4 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}
      {classrooms.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" /> Create a section first — sections live under the Section menu.
        </div>
      )}

      {/* Registrar CSV class list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-purple-400/25 bg-purple-950/40 p-5 backdrop-blur-md"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffedd5] text-[#ea580c]">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-[#111827]">Student Enrollment</h3>
            <p className="text-[10px] text-[#6B7280]">Upload the official student list provided by the Registrar.</p>
          </div>
        </div>

        <div className="space-y-3">
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

          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleClassListSelected} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={csvUploading || !csvClassroomId}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="mt-4 border-t border-purple-400/15 pt-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-[#111827]">Review student records</p>
                <span className="truncate text-[10px] text-[#6B7280]">{csvFileName} • {csvPreview.length} students</span>
              </div>
              <div className="max-h-[260px] overflow-y-auto rounded-lg border border-purple-400/15">
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
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50"
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
              className="mt-4 border-t border-purple-400/15 pt-4"
            >
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Enrollment complete — {csvSummary}
              </div>
              <div className="max-h-[220px] space-y-1 overflow-y-auto">
                {csvResults.map((r, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] ${r.status === 'enrolled' ? 'border border-emerald-400/20 bg-emerald-500/10' : 'border border-red-400/20 bg-red-500/10'}`}>
                    {r.status === 'enrolled'
                      ? <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                      : <AlertTriangle className="h-3 w-3 shrink-0 text-red-400" />}
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
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-purple-500/30 transition hover:from-purple-400 hover:to-fuchsia-400"
              >
                <Download className="h-4 w-4" /> Export Login Credentials (CSV)
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Manual Enrollment — Last / First / Middle / Username / Password */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-purple-400/25 bg-purple-950/40 p-5 backdrop-blur-md"
      >
        <div className="mb-4 flex items-center gap-3">
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
    </div>
  )
}

function ManualField({ label, value, onChange, placeholder, required }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}) {
  const id = `manual-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[11px] font-bold uppercase text-[#6B7280]">{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
      />
    </div>
  )
}
