'use client'
/**
 * Teacher — Sections. Layout follows the panel's mockup (Nov 2026): banner,
 * a one-line create bar, and a card per section with "View Students", which
 * opens the Students page already filtered to that section.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarDays, Pencil, PlusCircle, School, Users } from 'lucide-react'
import PageHeader from '@/components/teacher/PageHeader'
import { currentSchoolYear, formatSchoolYear } from '@/lib/enrollment'

type Classroom = { id: number; name: string; schoolYear: string | null; studentCount: number; createdAt: string }

/** The current school year with one either side, plus any year already in use. */
function schoolYearOptions(existing: (string | null)[]): string[] {
  const start = Number(currentSchoolYear().slice(0, 4))
  const years = new Set([start - 1, start, start + 1].map(y => `${y}-${y + 1}`))
  existing.forEach(sy => sy && years.add(sy))
  return Array.from(years).sort()
}

export default function TeacherClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [classroomName, setClassroomName] = useState('')
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear())
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editSchoolYear, setEditSchoolYear] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadClassrooms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/teacher/classrooms', { credentials: 'include' })
      const json = await res.json()
      if (json.success) setClassrooms(json.data)
      else setError(json.message ?? 'Failed to load sections')
    } catch {
      setError('Failed to load sections')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClassrooms() }, [loadClassrooms])

  const yearOptions = useMemo(() => schoolYearOptions(classrooms.map(c => c.schoolYear)), [classrooms])

  async function createClassroom(e: React.FormEvent) {
    e.preventDefault()
    if (!classroomName.trim()) return
    setCreating(true)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setCreating(false)
    }
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return
    setSavingEdit(true)
    setError(null)
    try {
      const res = await fetch('/api/teacher/classrooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: editingId, name: editName.trim(), schoolYear: editSchoolYear.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      setClassrooms(prev => prev.map(c => (c.id === editingId ? json.data : c)))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSavingEdit(false)
    }
  }

  const field = 'rounded-xl border px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9B83F5]'

  return (
    <div className="space-y-5">
      <PageHeader icon={Users} title="Sections" subtitle="Manage your class sections here." />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {/* Create */}
      <form onSubmit={createClassroom} className="flex flex-wrap gap-3">
        <label className="relative">
          <span className="sr-only">School year</span>
          <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c58d8]" />
          <select value={schoolYear} onChange={e => setSchoolYear(e.target.value)} className={`${field} w-[190px] pl-10 font-semibold`}>
            {yearOptions.map(sy => <option key={sy} value={sy}>{sy.replace('-', '–')}</option>)}
          </select>
        </label>
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Section name</span>
          <Pencil className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa0b2]" />
          <input
            placeholder="Section name (Grade 5 - Gals)"
            value={classroomName}
            onChange={e => setClassroomName(e.target.value)}
            className={`${field} w-full pl-10`}
          />
        </label>
        <button
          type="submit"
          disabled={creating || !classroomName.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7c5cf0] to-[#5a3fd4] px-6 py-3 text-sm font-bold text-[#fff] shadow-lg shadow-[#6255E8]/25 transition hover:brightness-110 disabled:opacity-50"
        >
          <PlusCircle className="h-4 w-4" /> {creating ? 'Creating…' : 'Create'}
        </button>
      </form>

      {/* List */}
      {loading ? (
        <p className="text-sm text-[#8f88a1]">Loading…</p>
      ) : classrooms.length === 0 ? (
        <div className="rounded-2xl border border-[#ece8f5] bg-white p-8 text-center">
          <School className="mx-auto h-10 w-10 text-[#9B83F5]" />
          <p className="mt-3 font-bold text-[#1f2430]">No sections yet</p>
          <p className="text-sm text-[#8f88a1]">Create your first section above</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classrooms.map((classroom, idx) => (
            <motion.div
              key={classroom.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-2xl border border-[#ece8f5] border-l-4 border-l-[#7c5cf0] bg-white p-5 shadow-sm"
            >
              {editingId === classroom.id ? (
                <div className="space-y-2">
                  <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus className={`${field} w-full py-2`} aria-label="Section name" />
                  <select value={editSchoolYear} onChange={e => setEditSchoolYear(e.target.value)} className={`${field} w-full py-2`} aria-label="School year">
                    {yearOptions.map(sy => <option key={sy} value={sy}>{sy.replace('-', '–')}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={savingEdit} className="rounded-lg bg-[#6f54ba] px-4 py-2 text-xs font-bold text-[#fff] disabled:opacity-60">
                      {savingEdit ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingId(null)} className="rounded-lg border px-4 py-2 text-xs font-bold text-[#5f5677]">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-4">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#f0eaff] text-[#6f54ba]">
                      <Users className="h-8 w-8" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-black text-[#1f2430]">{classroom.name}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5f5677]">
                        <Users className="h-3.5 w-3.5" /> {classroom.studentCount} Student{classroom.studentCount === 1 ? '' : 's'}
                      </p>
                      {classroom.schoolYear && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#5f5677]">
                          <CalendarDays className="h-3.5 w-3.5" /> {formatSchoolYear(classroom.schoolYear)}
                        </p>
                      )}
                      <p className="mt-0.5 text-sm text-[#8f88a1]">
                        Created {new Date(classroom.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => { setEditingId(classroom.id); setEditName(classroom.name); setEditSchoolYear(classroom.schoolYear ?? currentSchoolYear()) }}
                      aria-label={`Edit ${classroom.name}`}
                      className="rounded-xl border border-[#ece8f5] p-2.5 text-[#6f54ba] transition hover:bg-[#f4efff]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  <Link
                    href={`/teacher/students?section=${classroom.id}`}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#cfc2ea] py-2.5 text-sm font-bold text-[#6f54ba] transition hover:bg-[#f4efff]"
                  >
                    <Users className="h-4 w-4" /> View Students
                  </Link>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
