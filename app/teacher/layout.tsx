'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  School,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/teacher/dashboard' },
  { id: 'classrooms', label: 'Classrooms', icon: School, href: '/teacher/classrooms' },
  { id: 'students', label: 'Students', icon: Users, href: '/teacher/students' },
  { id: 'reports', label: 'Reports', icon: BarChart3, href: '/teacher/reports' },
]

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading, isAuthed, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Close sidebar on outside click (mobile)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false)
      }
    }
    if (sidebarOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sidebarOpen])

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthed) router.replace('/login')
    if (!authLoading && isAuthed && user?.role !== 'teacher') router.replace('/dashboard/map')
  }, [authLoading, isAuthed, user?.role, router])

  if (authLoading || !isAuthed || user?.role !== 'teacher') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0a1f]">
        <div className="flex items-center gap-3 text-purple-400">
          <GraduationCap className="h-6 w-6 animate-pulse" />
          <span className="font-game text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  const activeItem = navItems.find(item => pathname.startsWith(item.href))?.id ?? 'dashboard'

  function handleLogout() {
    logout()
    router.replace('/login')
  }

  return (
    <div className="flex h-[100dvh] bg-gradient-to-br from-[#0f0a1f] via-[#1a1233] to-[#3b2a73] text-white overflow-hidden">
      {/* Desktop Sidebar — always visible on lg+ */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-purple-500/20 bg-[#0f0a1f]/80 backdrop-blur-xl p-4">
        <SidebarContent activeItem={activeItem} username={user.username} onLogout={handleLogout} />
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            ref={sidebarRef}
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 top-0 z-50 w-[280px] flex flex-col border-r border-purple-500/20 bg-[#0f0a1f] p-4 lg:hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-game text-sm text-purple-200">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-purple-300 hover:bg-purple-500/20">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent activeItem={activeItem} username={user.username} onLogout={handleLogout} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="shrink-0 flex items-center justify-between border-b border-purple-500/20 bg-[#0f0a1f]/80 backdrop-blur-xl px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-game text-base font-black bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-300 bg-clip-text text-transparent">Teacher Management</h1>
              <p className="text-[10px] text-purple-300">{user.username}</p>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex shrink-0 items-center justify-between border-b border-purple-500/20 bg-[#0f0a1f]/50 backdrop-blur-xl px-6 py-3">
          <div>
            <h1 className="text-lg font-black text-white">{navItems.find(i => i.id === activeItem)?.label ?? 'Dashboard'}</h1>
            <p className="text-xs text-purple-300">Teacher Management</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-purple-200">{user.username}</span>
            <button
              onClick={handleLogout}
              className="flex h-9 items-center gap-2 rounded-lg border border-pink-400/30 bg-pink-500/10 px-3 text-xs font-bold text-pink-200 transition hover:bg-pink-500/25"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ activeItem, username, onLogout }: { activeItem: string; username: string; onLogout: () => void }) {
  const navColors = [
    'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/40',
    'bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/40',
    'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/40',
    'bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/40',
  ]

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-purple-500/40">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-game text-sm font-black bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-200 bg-clip-text text-transparent">MindSpark</h1>
          <p className="text-[10px] text-purple-300">{username}&apos;s classroom</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item, idx) => {
          const Icon = item.icon
          const active = activeItem === item.id
          return (
            <Link
              key={item.id}
              href={item.href}
              className={[
                'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-all',
                active
                  ? 'bg-gradient-to-r from-pink-500/90 to-purple-500/90 text-white shadow-lg shadow-purple-500/30'
                  : 'text-purple-200 hover:bg-purple-500/15 hover:text-white',
              ].join(' ')}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-md ${active ? 'bg-white/20' : navColors[idx]}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <button
        onClick={onLogout}
        className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-pink-400/25 bg-pink-500/10 py-3 text-sm font-bold text-pink-200 transition hover:bg-pink-500/20"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </>
  )
}
