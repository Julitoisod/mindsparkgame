'use client'
/**
 * Administrator panel shell. Guards the whole /admin tree: only a signed-in
 * admin gets through. Navigation follows the panel's structure (Nov 2026):
 * Dashboard · Teacher Management · Admin Profile · Logout.
 */
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, LogOut, ShieldCheck, UserRound, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import AccountMenu from '@/components/account/AccountMenu'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', sub: 'Account statistics and recent activities', icon: LayoutDashboard, href: '/admin/dashboard' },
  { id: 'teachers', label: 'Teacher Management', sub: 'Add, view, edit, reset, activate and deactivate accounts', icon: Users, href: '/admin/teachers' },
  { id: 'profile', label: 'Admin Profile', sub: 'Account information and password settings', icon: UserRound, href: '/admin/profile' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, isAuthed, logout, refresh } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!isAuthed) { router.replace('/teacher-login'); return }
    if (user?.role !== 'admin') {
      router.replace(user?.role === 'teacher' ? '/teacher/dashboard' : '/login')
    }
  }, [loading, isAuthed, user?.role, router])

  useEffect(() => {
    const reload = () => { void refresh() }
    window.addEventListener('account-updated', reload)
    return () => window.removeEventListener('account-updated', reload)
  }, [refresh])

  if (loading || !isAuthed || user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#22326f] text-[#D9B8FF]">
        <ShieldCheck className="mr-2 h-5 w-5 animate-pulse" />
        <span className="font-game text-sm">Loading admin…</span>
      </div>
    )
  }

  async function handleLogout() {
    await logout()
    router.replace('/teacher-login')
  }

  const active = navItems.find(item => pathname.startsWith(item.href)) ?? navItems[0]

  return (
    <div className="teacher-theme flex min-h-screen bg-[#fafafc] text-[#1f2430]">
      {/* Sidebar */}
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-[#ece8f5] bg-white p-4 lg:flex">
        <div className="mb-6 flex items-center gap-3 border-b border-[#f0ecf8] pb-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c5cf0] to-[#5a3fd4] text-[#fff] shadow-[0_8px_20px_rgba(124,88,216,0.3)]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="whitespace-nowrap text-sm font-black leading-tight text-[#1f2430]">MindSpark Math</p>
            <p className="text-[11px] text-[#8f88a1]">Administrator Panel</p>
          </div>
          <span className="rounded-full bg-[#ede6ff] px-2 py-0.5 text-[10px] font-black tracking-wide text-[#6f54ba]">ADMIN</span>
        </div>

        <nav className="flex-1 space-y-1.5">
          {navItems.map(item => {
            const isActive = item.id === active.id
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`block rounded-xl px-3 py-3 transition ${isActive ? 'bg-[#f4efff]' : 'hover:bg-[#f8f5ff]'}`}
              >
                <span className={`flex items-center gap-2 text-sm font-bold ${isActive ? 'text-[#6f54ba]' : 'text-[#3d3654]'}`}>
                  <item.icon className="h-4 w-4 text-[#7c58d8]" /> {item.label}
                </span>
                <span className="mt-0.5 block pl-6 text-[11px] leading-snug text-[#8f88a1]">{item.sub}</span>
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#cfc2ea] bg-white py-3 text-sm font-semibold text-[#6b5a92] transition hover:bg-[#f6f1ff]"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#ece8f5] bg-white px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-[#1f2430]">{active.label}</h1>
            <p className="text-xs text-[#8f88a1]">Administrator Panel</p>
          </div>
          <AccountMenu name={user.username} roleLabel="Administrator" accountHref="/admin/profile" onLogout={handleLogout} />
        </header>

        {/* Compact nav for small screens */}
        <nav className="flex gap-2 overflow-x-auto border-b border-[#ece8f5] bg-white px-4 py-2 lg:hidden">
          {navItems.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${item.id === active.id ? 'bg-[#6f54ba] text-[#fff]' : 'text-[#5f5677]'}`}
            >
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
