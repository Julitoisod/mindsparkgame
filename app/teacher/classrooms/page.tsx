'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Pencil, PlusCircle, School, Users } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { currentSchoolYear, formatSchoolYear } from '@/lib/enrollment'

type Classroom = { id: number; name: string; schoolYear: string | null; studentCount: number; createdAt: string }

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
    } catch {
      setError('Failed to load sections')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClassrooms() }, [loadClassrooms])

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
      setClassrooms(prev => prev.map(c => c.id === editingId ? json.data : c))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Sections</h2>
          <p className="text-sm text-purple-300">Manage your sections</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-500/20 border border-red-400/30 px-4 py-2 text-sm text-red-200">{error}</div>}

      {/* Create */}
      <form onSubmit={createClassroom} className="flex flex-wrap gap-2">
        <Input placeholder="School Year (2026-2027)" value={schoolYear} onChange={e => setSchoolYear(e.target.value)} className="w-[170px]" />
        <Input placeholder="Section name (Grade 3 - Gals)" value={classroomName} onChange={e => setClassroomName(e.target.value)} className="flex-1 min-w-[180px]" />
        <Button type="submit" loading={creating} icon={<PlusCircle className="h-4 w-4" />}>Create</Button>
      </form>

      {/* List */}
      {loading ? (
        <p className="text-purple-300 text-sm">Loading...</p>
      ) : classrooms.length === 0 ? (
        <div className="rounded-xl border border-purple-400/20 bg-purple-950/30 p-8 text-center">
          <School className="mx-auto h-10 w-10 text-purple-400" />
          <p className="mt-3 font-bold text-purple-200">No sections yet</p>
          <p className="text-sm text-purple-400">Create your first section above</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom, idx) => (
            <motion.div
              key={classroom.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-xl border border-purple-400/25 bg-purple-950/40 backdrop-blur-md p-4"
            >
              {editingId === classroom.id ? (
                <div className="space-y-2">
                  <Input value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                  <Input value={editSchoolYear} onChange={e => setEditSchoolYear(e.target.value)} placeholder="School Year (2026-2027)" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} loading={savingEdit}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-lg">{classroom.name}</h3>
                      <div className="flex items-center gap-1 mt-1 text-purple-300 text-sm">
                        <Users className="h-3.5 w-3.5" />
                        <span>{classroom.studentCount} Students</span>
                      </div>
                      {classroom.schoolYear && (
                        <div className="flex items-center gap-1 mt-0.5 text-purple-300 text-sm">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{formatSchoolYear(classroom.schoolYear)}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { setEditingId(classroom.id); setEditName(classroom.name); setEditSchoolYear(classroom.schoolYear ?? currentSchoolYear()) }}
                      className="rounded-lg p-2 text-purple-300 hover:bg-purple-500/20 transition"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-purple-400">
                    Created {new Date(classroom.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
