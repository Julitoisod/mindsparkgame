'use client'
/**
 * Teacher — Classroom (panel revision, Nov 2026b: "change Section to Classroom;
 * the teacher can update the classroom information"). Layout follows the
 * panel's suggested output: a classroom banner with "Update Classroom", tabs
 * for Sections and Class Details, a card per section ("View Students" opens
 * only that section's students) and an "Add Section" card.
 * Pahabol (Nov 24): "Classroom Name" became the Section, shown in Class
 * Details and editable in Update Classroom, where the old read-only list was.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CalendarDays, GraduationCap, Info, Layers, MoreVertical, Pencil, Plus, Save, School, UserRound, Users, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { currentSchoolYear, formatSchoolYear } from '@/lib/enrollment'

type Section = { id: number; name: string; schoolYear: string | null; studentCount: number; createdAt: string }
type ClassroomInfo = { name: string; gradeLevel: string; schoolYear: string; isActive: boolean }

const GRADE_LEVELS = ['Grade 4', 'Grade 5', 'Grade 6']

/** The current school year with one either side, plus any year already in use. */
function schoolYearOptions(existing: (string | null)[]): string[] {
  const start = Number(currentSchoolYear().slice(0, 4))
  const years = new Set([start - 1, start, start + 1].map(y => `${y}-${y + 1}`))
  existing.forEach(sy => sy && years.add(sy))
  return Array.from(years).sort()
}

/** A JSON request that throws the server's message when it fails. */
async function sendJson(url: string, method: 'POST' | 'PATCH', body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok || !json.success) throw new Error(json.message)
  return json
}

const field = 'w-full rounded-xl border border-[#ddd5f0] bg-white px-3 py-2.5 text-sm text-[#1f2430] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9B83F5] disabled:bg-[#f6f4fb] disabled:text-[#6f7187]'
const label = 'mb-1 block text-xs font-bold text-[#374151]'

export default function TeacherClassroomPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [room, setRoom] = useState<ClassroomInfo | null>(null)
  const [teacherName, setTeacherName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'sections' | 'details'>('sections')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [menuId, setMenuId] = useState<number | null>(null)
  // Section create / edit
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', schoolYear: currentSchoolYear() })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  // Update Classroom modal: its Section field edits the section names
  const [modalOpen, setModalOpen] = useState(false)
  const [roomDraft, setRoomDraft] = useState<ClassroomInfo | null>(null)
  const [sectionDrafts, setSectionDrafts] = useState<{ id: number; name: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [secRes, roomRes] = await Promise.all([
        fetch('/api/teacher/classrooms', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/teacher/classroom', { credentials: 'include' }).then(r => r.json()),
      ])
      if (secRes.success) setSections(secRes.data)
      else setError(secRes.message ?? 'Failed to load sections')
      if (roomRes.success) { setRoom(roomRes.data.classroom); setTeacherName(roomRes.data.teacherName) }
      else setError(roomRes.message ?? 'Failed to load the classroom')
    } catch {
      setError('Failed to load the classroom')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const yearOptions = useMemo(() => schoolYearOptions([...sections.map(s => s.schoolYear), room?.schoolYear ?? null]), [sections, room])
  const visible = yearFilter === 'all' ? sections : sections.filter(s => s.schoolYear === yearFilter)

  async function saveSection(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      const json = await sendJson('/api/teacher/classrooms', editingId ? 'PATCH' : 'POST', {
        id: editingId ?? undefined, name: draft.name.trim(), schoolYear: draft.schoolYear,
      })
      setSections(prev => (editingId ? prev.map(s => (s.id === editingId ? json.data : s)) : [json.data, ...prev]))
      toast.success(editingId ? 'Section updated' : 'Section added')
      closeSectionForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the section')
    } finally {
      setSaving(false)
    }
  }

  function closeSectionForm() {
    setAdding(false)
    setEditingId(null)
    setDraft({ name: '', schoolYear: currentSchoolYear() })
  }

  async function saveClassroom(e: React.FormEvent) {
    e.preventDefault()
    if (!roomDraft) return
    setSaving(true)
    try {
      // The Section field renames sections (pahabol, Nov 24), through the same
      // endpoint as "Edit section", so its checks (2-80 chars, no duplicate) hold
      for (const { id, name } of sectionDrafts) {
        if (name.trim() === sections.find(s => s.id === id)?.name) continue
        const renamed = await sendJson('/api/teacher/classrooms', 'PATCH', { id, name: name.trim() })
        setSections(prev => prev.map(s => (s.id === id ? renamed.data : s)))
      }
      const json = await sendJson('/api/teacher/classroom', 'PATCH', {
        gradeLevel: roomDraft.gradeLevel, schoolYear: roomDraft.schoolYear, isActive: roomDraft.isActive,
      })
      setRoom(json.data.classroom)
      setModalOpen(false)
      toast.success('Classroom updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the classroom')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-[#8f88a1]">Loading…</p>

  return (
    <div className="space-y-5" data-page="teacher-classroom">
      {/* Classroom banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6a4fe0] via-[#7458e6] to-[#8c74f0] px-6 py-5 shadow-lg shadow-[#6255E8]/20"
      >
        <span className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-[#6255E8] shadow"><School className="h-7 w-7" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-[#fff]">{room?.name ?? 'Grade 5 Mathematics'}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm font-medium text-[#fff]/90">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Academic Year: {formatSchoolYear(room?.schoolYear)}</span>
              <span className="inline-flex items-center gap-1"><UserRound className="h-4 w-4" /> Teacher: {teacherName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setRoomDraft(room); setSectionDrafts(sections.map(s => ({ id: s.id, name: s.name }))); setModalOpen(true) }}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#5a3fd4] shadow hover:bg-[#f4efff]"
          >
            <Pencil className="h-4 w-4" /> Update Classroom
          </button>
        </div>
      </motion.div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {/* Tabs + year filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece8f5]">
        <div className="flex gap-1">
          {([
            { id: 'sections', label: `Sections (${sections.length})`, icon: Users },
            { id: 'details', label: 'Class Details', icon: Info },
          ] as const).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-bold transition ${tab === t.id ? 'border-[#6f54ba] text-[#6f54ba]' : 'border-transparent text-[#6f7187] hover:text-[#6f54ba]'}`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
        {tab === 'sections' && (
          <select aria-label="School year" value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="mb-1.5 rounded-xl border border-[#ddd5f0] bg-white px-3 py-2 text-sm font-semibold text-[#1f2430] shadow-sm">
            <option value="all">All school years</option>
            {yearOptions.map(sy => <option key={sy} value={sy}>{formatSchoolYear(sy)}</option>)}
          </select>
        )}
      </div>

      {tab === 'sections' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((section, idx) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="relative rounded-2xl border border-[#ece8f5] border-l-4 border-l-[#7c5cf0] bg-white p-5 shadow-sm"
              data-testid="section-card"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f0eaff] text-[#6f54ba]"><Users className="h-7 w-7" /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-black text-[#1f2430]">{section.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#5f5677]"><Users className="h-3.5 w-3.5" /> {section.studentCount} Student{section.studentCount === 1 ? '' : 's'}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#5f5677]"><GraduationCap className="h-3.5 w-3.5" /> Teacher: {teacherName}</p>
                  {section.schoolYear && <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#8f88a1]"><CalendarDays className="h-3.5 w-3.5" /> {formatSchoolYear(section.schoolYear)}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setMenuId(menuId === section.id ? null : section.id)}
                  aria-label={`Options for ${section.name}`}
                  className="rounded-lg p-1.5 text-[#6f54ba] transition hover:bg-[#f4efff]"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuId === section.id && (
                  <div className="absolute right-4 top-12 z-10 w-40 overflow-hidden rounded-xl border border-[#ece8f5] bg-white text-sm shadow-lg">
                    <button
                      type="button"
                      onClick={() => { setEditingId(section.id); setAdding(true); setDraft({ name: section.name, schoolYear: section.schoolYear ?? currentSchoolYear() }); setMenuId(null) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-[#374151] hover:bg-[#faf8ff]"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit section
                    </button>
                    <Link href={`/teacher/students?section=${section.id}`} className="flex items-center gap-2 px-3 py-2 font-semibold text-[#374151] hover:bg-[#faf8ff]">
                      <Users className="h-3.5 w-3.5" /> View students
                    </Link>
                  </div>
                )}
              </div>
              <Link
                href={`/teacher/students?section=${section.id}`}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#cfc2ea] py-2.5 text-sm font-bold text-[#6f54ba] transition hover:bg-[#f4efff]"
              >
                <Users className="h-4 w-4" /> View Students
              </Link>
            </motion.div>
          ))}

          {/* Add / edit section */}
          {adding ? (
            <form onSubmit={saveSection} className="space-y-3 rounded-2xl border-2 border-dashed border-[#cfc2ea] bg-[#faf8ff] p-5">
              <p className="font-bold text-[#1f2430]">{editingId ? 'Edit section' : 'Add Section'}</p>
              <div>
                <label className={label} htmlFor="section-name">Section name *</label>
                <input id="section-name" autoFocus placeholder="e.g. Rizal" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className={field} />
              </div>
              <div>
                <label className={label} htmlFor="section-sy">School year *</label>
                <select id="section-sy" value={draft.schoolYear} onChange={e => setDraft(d => ({ ...d, schoolYear: e.target.value }))} className={field}>
                  {yearOptions.map(sy => <option key={sy} value={sy}>{formatSchoolYear(sy)}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving || !draft.name.trim()} className="rounded-xl bg-[#6f54ba] px-4 py-2 text-sm font-bold text-[#fff] disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Save' : 'Add Section'}</button>
                <button type="button" onClick={closeSectionForm} className="rounded-xl border border-[#ddd5f0] px-4 py-2 text-sm font-bold text-[#5f5677]">Cancel</button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex min-h-[180px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#cfc2ea] bg-white p-5 text-[#6f54ba] transition hover:bg-[#faf8ff]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0eaff]"><Plus className="h-5 w-5" /></span>
              <span className="font-bold">Add Section</span>
              <span className="text-xs text-[#8f88a1]">Create a new section for this classroom</span>
            </button>
          )}
          {visible.length === 0 && sections.length > 0 && (
            <p className="text-sm text-[#8f88a1] md:col-span-2">No sections in {formatSchoolYear(yearFilter)}.</p>
          )}
        </div>
      ) : (
        <section className="rounded-2xl border border-[#ece8f5] bg-white p-5 shadow-sm" data-testid="class-details">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-[#1f2430]"><Layers className="h-4 w-4 text-[#6255E8]" /> Classroom Information</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${room?.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>● {room?.isActive ? 'Active' : 'Inactive'}</span>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              // "Classroom Name" → the section (pahabol, Nov 24)
              { icon: Users, k: sections.length > 1 ? 'Sections' : 'Section', v: sections.map(s => s.name).join(', ') },
              { icon: GraduationCap, k: 'Grade Level', v: room?.gradeLevel },
              { icon: CalendarDays, k: 'Academic Year', v: formatSchoolYear(room?.schoolYear) },
              { icon: UserRound, k: 'Assigned Teacher', v: teacherName },
            ].map(item => (
              <div key={item.k} className="flex items-center gap-3 rounded-xl bg-[#faf8ff] p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0eaff] text-[#6f54ba]"><item.icon className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold text-[#8f88a1]">{item.k}</dt>
                  <dd className="truncate text-sm font-bold text-[#1f2430]" title={item.v || undefined}>{item.v || '—'}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Update Classroom modal */}
      {modalOpen && roomDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d133d]/40 p-4" role="dialog" aria-modal="true" aria-label="Update Classroom">
          <form onSubmit={saveClassroom} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" data-testid="update-classroom">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-black text-[#1f2430]"><School className="h-5 w-5 text-[#6f54ba]" /> Update Classroom</h3>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-[#8f88a1] hover:bg-[#f4efff]"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {/* Section, editable, where "Classroom Name" was (pahabol, Nov 24) */}
              <div>
                <label className={label} htmlFor={sectionDrafts[0] ? `room-section-${sectionDrafts[0].id}` : undefined}>Section *</label>
                {sectionDrafts.length ? (
                  <div className="space-y-2">
                    {sectionDrafts.map((d, i) => (
                      <input
                        key={d.id}
                        id={`room-section-${d.id}`}
                        aria-label={i ? `Section ${i + 1}` : undefined}
                        value={d.name}
                        maxLength={80}
                        onChange={e => setSectionDrafts(prev => prev.map(p => (p.id === d.id ? { ...p, name: e.target.value } : p)))}
                        className={field}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-[#ece8f5] bg-[#f6f4fb] px-3 py-2.5 text-sm text-[#6f7187]">No section yet: add one under Sections</p>
                )}
              </div>
              <div>
                <label className={label} htmlFor="room-sy">Academic Year *</label>
                <select id="room-sy" value={roomDraft.schoolYear} onChange={e => setRoomDraft({ ...roomDraft, schoolYear: e.target.value })} className={field}>
                  {yearOptions.map(sy => <option key={sy} value={sy}>{formatSchoolYear(sy)}</option>)}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="room-teacher">Assigned Teacher *</label>
                {/* The admin assigns teachers; a teacher's classroom is always their own */}
                <select id="room-teacher" disabled value="me" className={field}><option value="me">{teacherName}</option></select>
              </div>
              <div>
                <label className={label} htmlFor="room-grade">Grade Level *</label>
                <select id="room-grade" value={roomDraft.gradeLevel} onChange={e => setRoomDraft({ ...roomDraft, gradeLevel: e.target.value })} className={field}>
                  {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <span className={label}>Status</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={roomDraft.isActive}
                  onClick={() => setRoomDraft({ ...roomDraft, isActive: !roomDraft.isActive })}
                  className="flex items-center gap-2 py-2 text-sm font-semibold text-[#374151]"
                >
                  <span className={`relative h-6 w-11 rounded-full transition ${roomDraft.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${roomDraft.isActive ? 'left-[22px]' : 'left-0.5'}`} />
                  </span>
                  {roomDraft.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-[#ddd5f0] px-4 py-2.5 text-sm font-bold text-[#5f5677]">Cancel</button>
              <button type="submit" disabled={saving || sectionDrafts.some(d => d.name.trim().length < 2)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7c5cf0] to-[#5a3fd4] px-5 py-2.5 text-sm font-bold text-[#fff] shadow disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
