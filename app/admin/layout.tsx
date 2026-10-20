'use client'
/**
 * Admin area shell (2026-10b revision, item 1).
 * Guards the whole /admin tree: only a signed-in admin gets through.
 */
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { id: 'teachers', label: 'Teacher Accounts', icon: Users, href: '/admin/teachers' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, isAuthed, logout } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!isAuthed) { router.replace('/admin-login'); return }
    if (user?.role !== 'admin') {
      router.replace(user?.role === 'teacher' ? '/teacher/dashboard' : '/login')
    }
  }, [loading, isAuthed, user?.role, router])

  if (loading || !isAuthed || user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#22326f] text-[#D9B8FF]">
        <ShieldCheck className="mr-2 h-5 w-5 animate-pulse" />
        <span className="font-game text-sm">Loading admin…</span>
      </div>
    )
  }

  return (
    <div className="teacher-theme min-h-screen bg-[#f6f5fb]">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6255E8] text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-[#1f2430]">MindSpark Admin</p>
            <p className="text-[11px] text-gray-500">Signed in as {user.username}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 p-6">
        <nav className="w-52 shrink-0 space-y-1">
          {navItems.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                  active ? 'bg-[#6255E8] text-white' : 'text-gray-600 hover:bg-white'
                }`}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            )
          })}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
