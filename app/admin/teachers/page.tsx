'use client'
/**
 * Admin — teacher accounts (2026-10b revision, item 1).
 * View, add, edit and deactivate teachers. Deactivating keeps their sections,
 * students and questions; it only blocks sign-in.
 */
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Pencil, Power, School, UserPlus, Users, X } from 'lucide-react'

type Teacher = {
  id: number
  username: string
  fullName: string | null
  email: string
  isActive: boolean
  sectionCount: number
  studentCount: number
  createdAt: string
}

const EMPTY_FORM = { username: '', fullName: '', email: '', password: '' }

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ username: '', fullName: '', email: '', password: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/teachers', { credentials: 'include' })
      const json = await res.json()
      if (json.success) setTeachers(json.data)
      else toast.error(json.message ?? 'Could not load teachers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function createTeacher(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      toast.success('Teacher account created')
      setForm(EMPTY_FORM)
      setShowAdd(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the account')
    } finally {
      setSaving(false)
    }
  }

  async function patchTeacher(id: number, body: Record<string, unknown>, okMessage: string) {
    const res = await fetch(`/api/admin/teachers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok || !json.success) { toast.error(json.message ?? 'Update failed'); return false }
    toast.success(okMessage)
    load()
    return true
  }

  const activeCount = teachers.filter(t => t.isActive).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#1f2430]">Teacher Accounts</h1>
          <p className="text-sm text-gray-500">Add, edit and deactivate the teachers who use MindSpark</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6255E8] px-4 py-2 text-sm font-bold text-white hover:bg-[#3459C7]"
        >
          {showAdd ? <><X className="h-4 w-4" /> Cancel</> : <><UserPlus className="h-4 w-4" /> Add Teacher</>}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Teachers', value: teachers.length, icon: <Users className="h-4 w-4" /> },
          { label: 'Active', value: activeCount, icon: <CheckCircle2 className="h-4 w-4" /> },
          { label: 'Sections', value: teachers.reduce((n, t) => n + Number(t.sectionCount), 0), icon: <School className="h-4 w-4" /> },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-gray-500">{card.icon}{card.label}</p>
            <p className="mt-1 text-2xl font-black text-[#1f2430]">{card.value}</p>
          </div>
        ))}
      </div>

      {showAdd && (
        <form onSubmit={createTeacher} className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <p className="font-bold text-[#1f2430]">New teacher account</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['fullName', 'Full name', 'Maria Santos', 'text'],
              ['username', 'Username', 'msantos', 'text'],
              ['email', 'Email', 'msantos@school.edu.ph', 'email'],
              ['password', 'Password', 'min 8 chars, a letter & a number', 'text'],
            ] as const).map(([field, label, placeholder, type]) => (
              <div key={field}>
                <label className="mb-1 block text-[11px] font-bold uppercase text-gray-500">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[field]}
                  onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#9B83F5]"
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#6255E8] px-4 py-2 text-sm font-bold text-white hover:bg-[#3459C7] disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create Account'}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Teacher</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-center">Sections</th>
              <th className="px-4 py-3 text-center">Students</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {!loading && teachers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No teacher accounts yet.</td></tr>
            )}
            {teachers.map(t => (
              <tr key={t.id} className={t.isActive ? '' : 'bg-gray-50/70'}>
                <td className="px-4 py-3">
                  <p className="font-bold text-gray-900">{t.fullName ?? t.username}</p>
                  <p className="text-xs text-gray-500">@{t.username}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{t.email}</td>
                <td className="px-4 py-3 text-center text-gray-700">{t.sectionCount}</td>
                <td className="px-4 py-3 text-center text-gray-700">{t.studentCount}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {t.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingId(editingId === t.id ? null : t.id)
                        setEditForm({ username: t.username, fullName: t.fullName ?? '', email: t.email, password: '' })
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => patchTeacher(t.id, { isActive: !t.isActive },
                        t.isActive ? 'Teacher deactivated' : 'Teacher reactivated')}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                        t.isActive
                          ? 'border border-red-200 text-red-600 hover:bg-red-50'
                          : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" /> {t.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>

                  {editingId === t.id && (
                    <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-left">
                      {([
                        ['fullName', 'Full name'],
                        ['username', 'Username'],
                        ['email', 'Email'],
                        ['password', 'New password (blank = keep)'],
                      ] as const).map(([field, label]) => (
                        <div key={field}>
                          <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">{label}</label>
                          <input
                            type="text"
                            value={editForm[field]}
                            onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#9B83F5]"
                          />
                        </div>
                      ))}
                      <button
                        onClick={async () => {
                          const body: Record<string, unknown> = {
                            fullName: editForm.fullName,
                            username: editForm.username,
                            email: editForm.email,
                          }
                          if (editForm.password) body.password = editForm.password
                          if (await patchTeacher(t.id, body, 'Teacher updated')) setEditingId(null)
                        }}
                        className="w-full rounded-lg bg-[#6255E8] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#3459C7]"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
