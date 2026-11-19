'use client'
/**
 * Admin — Classrooms & Students (panel revision, Nov 2026b: "si admin dapat
 * makakita sa section ni teacher ug pila ang student and student report
 * information"). Every teacher's classroom and sections with student counts;
 * pick a section (or a teacher) to see each student's report.
 */
import { useEffect, useState } from 'react'
import { CalendarDays, ChevronRight, GraduationCap, School, Star, Users } from 'lucide-react'
import PageHeader from '@/components/teacher/PageHeader'
import { BAND_COLORS } from '@/lib/analytics'
import { formatSchoolYear } from '@/lib/enrollment'

type Section = { id: number; name: string; schoolYear: string | null; studentCount: number; average: number | null }
type Teacher = {
  id: number; name: string; username: string; isActive: boolean; studentCount: number
  classroom: { name: string; gradeLevel: string; schoolYear: string; isActive: boolean }
  sections: Section[]
}
type ReportRow = {
  id: number; name: string; username: string; section: string | null
  levels: Record<number, { score: number; attempts: number }>
  total: number; band: string; status: string; stars: number; levelsCompleted: number
}
type Selection = { kind: 'section' | 'teacher'; id: number; label: string }

const LEVELS = [1, 2, 3, 4, 5]

export default function AdminClassroomsPage() {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [rows, setRows] = useState<ReportRow[] | null>(null)

  useEffect(() => {
    fetch('/api/admin/classrooms', { credentials: 'include' })
      .then(r => r.json())
      .then(json => (json.success ? setTeachers(json.data) : setError(json.message)))
      .catch(() => setError('Could not load classrooms'))
  }, [])

  useEffect(() => {
    if (!selection) return
    setRows(null)
    const param = selection.kind === 'section' ? `classroomId=${selection.id}` : `teacherId=${selection.id}`
    fetch(`/api/admin/students?${param}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => (json.success ? setRows(json.data.students) : setError(json.message)))
      .catch(() => setError('Could not load the student report'))
  }, [selection])

  const isPicked = (kind: Selection['kind'], id: number) => selection?.kind === kind && selection.id === id

  return (
    <div className="space-y-5">
      <PageHeader icon={School} title="Classrooms & Students" subtitle="Every teacher's classroom, their sections, how many students, and each student's report." />
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        {/* Teachers → sections */}
        <div className="space-y-3">
          {!teachers ? (
            <p className="text-sm text-[#8f88a1]">Loading…</p>
          ) : teachers.length === 0 ? (
            <p className="rounded-2xl border border-[#ece8f5] bg-white p-6 text-center text-sm text-[#8f88a1]">No teacher accounts yet.</p>
          ) : teachers.map(t => (
            <section key={t.id} className="rounded-2xl border border-[#ece8f5] bg-white p-4 shadow-sm" data-testid="admin-teacher-card">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ede6ff] text-sm font-black text-[#6f54ba]">{t.name.charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[#1f2430]">{t.name} <span className="text-xs font-medium text-[#8f88a1]">@{t.username}</span></p>
                  <p className="truncate text-xs text-[#6f7187]">{t.classroom.name} · {t.classroom.gradeLevel} · {formatSchoolYear(t.classroom.schoolYear)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{t.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelection({ kind: 'teacher', id: t.id, label: `All of ${t.name}'s students` })}
                className={`mt-3 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${isPicked('teacher', t.id) ? 'bg-[#6f54ba] text-[#fff]' : 'bg-[#faf8ff] text-[#5f5677] hover:bg-[#f4efff]'}`}
              >
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {t.sections.length} section{t.sections.length === 1 ? '' : 's'} · {t.studentCount} student{t.studentCount === 1 ? '' : 's'}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <ul className="mt-2 space-y-1.5">
                {t.sections.map(s => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelection({ kind: 'section', id: s.id, label: `${s.name} — ${t.name}` })}
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${isPicked('section', s.id) ? 'border-[#6f54ba] bg-[#f4efff]' : 'border-[#f0ecf8] hover:border-[#cfc2ea]'}`}
                    >
                      <School className="h-4 w-4 shrink-0 text-[#7c58d8]" />
                      <span className="min-w-0 flex-1 truncate font-semibold text-[#1f2430]">{s.name}</span>
                      <span className="text-xs text-[#6f7187]">{s.studentCount} student{s.studentCount === 1 ? '' : 's'}</span>
                      <span className="w-12 text-right text-xs font-bold text-[#1f2430]">{s.average !== null ? `${s.average}%` : '—'}</span>
                    </button>
                  </li>
                ))}
                {t.sections.length === 0 && <li className="px-1 text-xs text-[#8f88a1]">No sections yet.</li>}
              </ul>
            </section>
          ))}
        </div>

        {/* Student report — min-w-0 lets the grid column shrink so the table scrolls inside it */}
        <section className="min-w-0 rounded-2xl border border-[#ece8f5] bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-bold text-[#1f2430]"><GraduationCap className="h-4 w-4 text-[#6255E8]" /> Student Report</h3>
          <p className="text-xs text-[#8f88a1]">
            {selection ? selection.label : 'Choose a section or a teacher on the left.'} · L1–L5: best run out of 10 · Total out of 50
          </p>
          {!selection ? (
            <div className="py-16 text-center text-sm text-[#8f88a1]"><School className="mx-auto mb-2 h-10 w-10 text-[#cfc2ea]" />No section selected</div>
          ) : !rows ? (
            <p className="py-8 text-sm text-[#8f88a1]">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#8f88a1]">No students enrolled here yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm" data-testid="admin-student-report">
                <thead>
                  <tr className="bg-[#faf8ff] text-left text-xs font-bold text-[#6f7187]">
                    <th className="rounded-l-lg px-3 py-2">Student</th>
                    <th className="px-3 py-2">Section</th>
                    {LEVELS.map(l => <th key={l} className="px-2 py-2 text-center">L{l}</th>)}
                    <th className="px-3 py-2 text-center">Total</th>
                    <th className="px-3 py-2">Proficiency</th>
                    <th className="px-3 py-2 text-center">Stars</th>
                    <th className="px-3 py-2 text-center">Levels</th>
                    <th className="rounded-r-lg px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ecf8]">
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-[#1f2430]">{r.name}</p>
                        <p className="text-[11px] text-[#8f88a1]">@{r.username}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[#5f5677]">{r.section ?? '—'}</td>
                      {LEVELS.map(l => (
                        <td key={l} className="px-2 py-2.5 text-center font-bold text-[#1f2430]">{r.levels[l]?.attempts ? r.levels[l].score : <span className="text-[#c0bccd]">—</span>}</td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-black text-[#1f2430]">{r.total}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#374151]">
                          <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: BAND_COLORS[r.band] ?? '#e5e7eb' }} />
                          {r.band}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center"><span className="inline-flex items-center gap-1 font-bold text-amber-600"><Star className="h-3.5 w-3.5 fill-current" />{r.stars}</span></td>
                      <td className="px-3 py-2.5 text-center text-[#5f5677]">{r.levelsCompleted}/5</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${r.status === 'enrolled' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{r.status === 'enrolled' ? 'Active' : 'Disabled'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selection && rows && rows.length > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#8f88a1]"><CalendarDays className="h-3.5 w-3.5" /> Read-only — teachers manage their own students.</p>
          )}
        </section>
      </div>
    </div>
  )
}
