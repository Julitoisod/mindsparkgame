'use client'
/**
 * Admin — Teacher Management (panel revision, Nov 2026):
 * add, view, edit, reset password, activate and deactivate teacher accounts.
 * Deactivating keeps their sections, students and questions; it only blocks
 * sign-in. Teachers can no longer sign themselves up — accounts start here.
 */
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Copy, Eye, KeyRound, Pencil, Power, School, UserPlus, Users, X } from 'lucide-react'
import PageHeader from '@/components/teacher/PageHeader'

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

type Panel = { id: number; mode: 'view' | 'edit' | 'reset' } | null

const EMPTY_FORM = { username: '', fullName: '', email: '', password: '' }

/** A readable temporary password: letters + digits, always passes the rules. */
function temporaryPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyz'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  const word = Array.from(bytes.slice(0, 4), b => letters[b % letters.length]).join('')
  const digits = String(1000 + ((bytes[4] << 8) | bytes[5]) % 9000)
  return `Ms-${word}${digits}`
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const [editForm, setEditForm] = useState({ username: '', fullName: '', email: '' })
  const [resetResult, setResetResult] = useState<{ id: number; password: string } | null>(null)

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

  async function resetPassword(t: Teacher) {
    if (!window.confirm(`Reset the password for ${t.fullName ?? t.username}? Their current password will stop working.`)) return
    const password = temporaryPassword()
    if (await patchTeacher(t.id, { password }, 'Password reset')) {
      setResetResult({ id: t.id, password })
      setPanel({ id: t.id, mode: 'reset' })
    }
  }

  function togglePanel(t: Teacher, mode: 'view' | 'edit') {
    if (panel?.id === t.id && panel.mode === mode) { setPanel(null); return }
    setEditForm({ username: t.username, fullName: t.fullName ?? '', email: t.email })
    setPanel({ id: t.id, mode })
  }

  const activeCount = teachers.filter(t => t.isActive).length

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        title="Teacher Management"
        subtitle="Add, view, edit, reset, activate and deactivate teacher accounts."
        actions={
          <button
            onClick={() => setShowAdd(v => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6f54ba] px-4 py-2.5 text-sm font-bold text-[#fff] shadow hover:bg-[#5d44a6]"
          >
            {showAdd ? <><X className="h-4 w-4" /> Cancel</> : <><UserPlus className="h-4 w-4" /> Add Teacher</>}
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Teachers', value: teachers.length, icon: <Users className="h-4 w-4" /> },
          { label: 'Active', value: activeCount, icon: <CheckCircle2 className="h-4 w-4" /> },
          { label: 'Sections', value: teachers.reduce((n, t) => n + Number(t.sectionCount), 0), icon: <School className="h-4 w-4" /> },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-[#ece8f5] bg-white p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#8f88a1]">{card.icon}{card.label}</p>
            <p className="mt-1 text-2xl font-black text-[#1f2430]">{card.value}</p>
          </div>
        ))}
      </div>

      {showAdd && (
        <form onSubmit={createTeacher} className="space-y-3 rounded-2xl border border-[#ece8f5] bg-white p-5 shadow-sm">
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
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B83F5]"
                />
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving} className="rounded-xl bg-[#6f54ba] px-4 py-2 text-sm font-bold text-[#fff] hover:bg-[#5d44a6] disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Account'}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#ece8f5] bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-[#faf8ff] text-[11px] uppercase text-[#8f88a1]">
            <tr>
              <th className="px-4 py-3 text-left">Teacher</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-center">Sections</th>
              <th className="px-4 py-3 text-center">Students</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ecf8]">
            {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
            {!loading && teachers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No teacher accounts yet.</td></tr>
            )}
            {teachers.map(t => {
              const open = panel?.id === t.id ? panel.mode : null
              return (
                <tr key={t.id} className={t.isActive ? '' : 'bg-gray-50/70'}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-bold text-gray-900">{t.fullName ?? t.username}</p>
                    <p className="text-xs text-gray-500">@{t.username}</p>
                  </td>
                  <td className="px-4 py-3 align-top text-gray-700">{t.email}</td>
                  <td className="px-4 py-3 text-center align-top text-gray-700">{t.sectionCount}</td>
                  <td className="px-4 py-3 text-center align-top text-gray-700">{t.studentCount}</td>
                  <td className="px-4 py-3 text-center align-top">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                      {t.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <ActionButton icon={Eye} label="View" onClick={() => togglePanel(t, 'view')} active={open === 'view'} />
                      <ActionButton icon={Pencil} label="Edit" onClick={() => togglePanel(t, 'edit')} active={open === 'edit'} />
                      <ActionButton icon={KeyRound} label="Reset" onClick={() => resetPassword(t)} active={open === 'reset'} />
                      <button
                        onClick={() => patchTeacher(t.id, { isActive: !t.isActive }, t.isActive ? 'Teacher deactivated' : 'Teacher reactivated')}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                          t.isActive ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" /> {t.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>

                    {open === 'view' && (
                      <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-[#ece8f5] bg-[#faf8ff] p-3 text-left text-xs">
                        {[
                          ['Full name', t.fullName ?? '—'],
                          ['Username', `@${t.username}`],
                          ['Email', t.email],
                          ['Status', t.isActive ? 'Active' : 'Deactivated'],
                          ['Sections', String(t.sectionCount)],
                          ['Students', String(t.studentCount)],
                          ['Account created', new Date(t.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="font-bold uppercase text-[#8f88a1]">{label}</dt>
                            <dd className="truncate font-semibold text-[#1f2430]">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {open === 'edit' && (
                      <div className="mt-3 space-y-2 rounded-xl border border-[#ece8f5] bg-[#faf8ff] p-3 text-left">
                        {([['fullName', 'Full name'], ['username', 'Username'], ['email', 'Email']] as const).map(([field, label]) => (
                          <div key={field}>
                            <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">{label}</label>
                            <input
                              type="text"
                              value={editForm[field]}
                              onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
                              className="w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B83F5]"
                            />
                          </div>
                        ))}
                        <button
                          onClick={async () => { if (await patchTeacher(t.id, editForm, 'Teacher updated')) setPanel(null) }}
                          className="w-full rounded-lg bg-[#6f54ba] px-3 py-1.5 text-xs font-bold text-[#fff] hover:bg-[#5d44a6]"
                        >
                          Save Changes
                        </button>
                      </div>
                    )}

                    {open === 'reset' && resetResult?.id === t.id && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900">
                        <p className="font-bold">Temporary password — shown only once</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <code className="flex-1 rounded-lg bg-white px-3 py-1.5 text-sm font-black text-[#1f2430]">{resetResult.password}</code>
                          <button
                            onClick={() => { void navigator.clipboard?.writeText(resetResult.password); toast.success('Copied') }}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 font-bold"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </button>
                        </div>
                        <p className="mt-1.5">Give it to the teacher; they can change it under My Account → Change Password.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ActionButton({ icon: Icon, label, onClick, active }: { icon: typeof Eye; label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${active ? 'border-[#cfc2ea] bg-[#f4efff] text-[#6f54ba]' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}
