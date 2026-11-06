'use client'
/**
 * My Profile / Edit Account Information / Change Password — one component
 * shared by /teacher/account and /admin/profile (panel revision, Nov 2026).
 * The tab follows the URL hash, so the header menu can deep-link to each one.
 *
 * ChangePasswordForm is also used, dark-themed, on the student's Profile.
 */
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarDays, Eye, EyeOff, KeyRound, Mail, Pencil, School, ShieldCheck, UserRound, Users } from 'lucide-react'
import { passwordError } from '@/lib/validations'

type Account = {
  id: number
  username: string
  fullName: string | null
  email: string
  role: 'admin' | 'teacher' | 'student'
  createdAt: string
  sectionCount: number
  studentCount: number
}

type Tab = 'profile' | 'edit' | 'password'
const TABS: { id: Tab; label: string; icon: typeof UserRound }[] = [
  { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'edit', label: 'Edit Account Information', icon: Pencil },
  { id: 'password', label: 'Change Password', icon: KeyRound },
]

function readHash(): Tab {
  const hash = window.location.hash.slice(1)
  return hash === 'edit' || hash === 'password' ? hash : 'profile'
}

export default function AccountSettings({ roleLabel }: { roleLabel: string }) {
  const [tab, setTab] = useState<Tab>('profile')
  const [account, setAccount] = useState<Account | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState({ fullName: '', username: '', email: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const sync = () => setTab(readHash())
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/account', { credentials: 'include' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      setAccount(json.data)
      setForm({ fullName: json.data.fullName ?? '', username: json.data.username, email: json.data.email })
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load your account')
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openTab(next: Tab) {
    window.history.replaceState(null, '', `#${next}`)
    setTab(next)
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      setAccount(json.data)
      toast.success(json.message ?? 'Account updated')
      // the header shows the username — let the layout refresh it
      window.dispatchEvent(new Event('account-updated'))
      openTab('profile')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your changes')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>
  if (!account) return <p className="text-sm text-[#8f88a1]">Loading your account…</p>

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      {/* Tabs */}
      <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Account sections">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => openTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
              tab === t.id ? 'bg-[#6f54ba] text-[#fff] shadow-md' : 'bg-white text-[#5f5677] hover:bg-[#f4efff]'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </nav>

      <section className="rounded-2xl border border-[#ece8f5] bg-white p-6 shadow-sm">
        {tab === 'profile' && (
          <div data-testid="account-profile">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7c5cf0] to-[#5a3fd4] text-2xl font-black text-[#fff]">
                {(account.fullName ?? account.username).slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h3 className="text-xl font-black text-[#1f2430]">{account.fullName ?? account.username}</h3>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#f4efff] px-2.5 py-0.5 text-xs font-bold text-[#6f54ba]">
                  <ShieldCheck className="h-3.5 w-3.5" /> {roleLabel}
                </span>
              </div>
            </div>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <ProfileRow icon={UserRound} label="Username" value={`@${account.username}`} />
              <ProfileRow icon={Mail} label="Email" value={account.email} />
              <ProfileRow icon={CalendarDays} label="Member since" value={new Date(account.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} />
              {account.role === 'teacher' && (
                <>
                  <ProfileRow icon={School} label="Sections" value={String(account.sectionCount)} />
                  <ProfileRow icon={Users} label="Students enrolled" value={String(account.studentCount)} />
                </>
              )}
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => openTab('edit')} className="inline-flex items-center gap-2 rounded-xl bg-[#6f54ba] px-4 py-2.5 text-sm font-bold text-[#fff] hover:bg-[#5d44a6]">
                <Pencil className="h-4 w-4" /> Edit Account Information
              </button>
              <button type="button" onClick={() => openTab('password')} className="inline-flex items-center gap-2 rounded-xl border border-[#d8cdf3] px-4 py-2.5 text-sm font-bold text-[#6f54ba] hover:bg-[#f4efff]">
                <KeyRound className="h-4 w-4" /> Change Password
              </button>
            </div>
          </div>
        )}

        {tab === 'edit' && (
          <form onSubmit={saveAccount} className="max-w-lg space-y-4" data-testid="account-edit">
            <h3 className="text-lg font-black text-[#1f2430]">Edit Account Information</h3>
            {([
              ['fullName', 'Full name', 'text'],
              ['username', 'Username', 'text'],
              ['email', 'Email', 'email'],
            ] as const).map(([field, label, type]) => (
              <label key={field} className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-[#6f7187]">{label}</span>
                <input
                  type={type}
                  value={form[field]}
                  onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B83F5]"
                />
              </label>
            ))}
            <button type="submit" disabled={saving} className="rounded-xl bg-[#6f54ba] px-5 py-2.5 text-sm font-bold text-[#fff] hover:bg-[#5d44a6] disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        )}

        {tab === 'password' && (
          <div className="max-w-lg" data-testid="account-password">
            <h3 className="mb-4 text-lg font-black text-[#1f2430]">Change Password</h3>
            <ChangePasswordForm onDone={() => openTab('profile')} />
          </div>
        )}
      </section>
    </div>
  )
}

function ProfileRow({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#f0ecf8] bg-[#faf8ff] px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-[#7c58d8]" />
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase text-[#8f88a1]">{label}</dt>
        <dd className="truncate text-sm font-bold text-[#1f2430]">{value}</dd>
      </div>
    </div>
  )
}

/** Current + new + confirm. `tone="dark"` styles it for the student app. */
export function ChangePasswordForm({ tone = 'light', onDone }: { tone?: 'light' | 'dark'; onDone?: () => void }) {
  const dark = tone === 'dark'
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const problem = !values.currentPassword
      ? 'Enter your current password.'
      : passwordError(values.newPassword) ?? (values.newPassword !== values.confirm ? 'The new passwords do not match.' : null)
    if (problem) { setError(problem); return }

    setSaving(true)
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      toast.success('Password changed')
      setValues({ currentPassword: '', newPassword: '', confirm: '' })
      onDone?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change your password')
    } finally {
      setSaving(false)
    }
  }

  const input = dark
    ? 'w-full rounded-xl border border-[#9B83F5]/30 bg-[#22326f]/70 px-3 py-2 pr-10 text-sm text-[#F4F2FF] placeholder-[#F4F2FF]/40 focus:border-[#9B83F5] focus:outline-none'
    : 'w-full rounded-xl border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B83F5]'
  const label = dark ? 'mb-1 block text-[10px] font-bold uppercase text-[#D9B8FF]/80' : 'mb-1 block text-[11px] font-bold uppercase text-[#6f7187]'

  return (
    <form onSubmit={submit} className={dark ? 'space-y-2' : 'space-y-4'} noValidate>
      {([
        ['currentPassword', 'Current password', 'current-password'],
        ['newPassword', 'New password', 'new-password'],
        ['confirm', 'Confirm new password', 'new-password'],
      ] as const).map(([field, text, autoComplete]) => (
        <label key={field} className="block">
          <span className={label}>{text}</span>
          <span className="relative block">
            <input
              type={show ? 'text' : 'password'}
              autoComplete={autoComplete}
              value={values[field]}
              onChange={e => setValues(prev => ({ ...prev, [field]: e.target.value }))}
              className={input}
            />
            {field === 'currentPassword' && (
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                aria-label={show ? 'Hide passwords' : 'Show passwords'}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${dark ? 'text-[#D9B8FF]' : 'text-[#8f88a1]'}`}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
          </span>
        </label>
      ))}
      <p className={dark ? 'text-[10px] text-[#F4F2FF]/55' : 'text-xs text-[#8f88a1]'}>At least 8 characters, with a letter and a number.</p>
      {error && (
        <p role="alert" className={dark ? 'rounded-lg bg-pink-500/15 px-3 py-1.5 text-xs font-semibold text-pink-200' : 'rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700'}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className={dark
          ? 'w-full rounded-xl bg-gradient-to-r from-[#3459C7] to-[#6255E8] py-2 text-sm font-black text-white shadow-lg hover:brightness-110 disabled:opacity-60'
          : 'rounded-xl bg-[#6f54ba] px-5 py-2.5 text-sm font-bold text-[#fff] hover:bg-[#5d44a6] disabled:opacity-60'}
      >
        {saving ? 'Saving…' : 'Change Password'}
      </button>
    </form>
  )
}
