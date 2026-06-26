'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  FileQuestion,
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
  { id: 'classrooms', label: 'Sections', icon: School, href: '/teacher/classrooms' },
  { id: 'students', label: 'Students', icon: Users, href: '/teacher/students' },
  { id: 'questions', label: 'Question Bank', icon: FileQuestion, href: '/teacher/questions' },
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
    if (!authLoading && !isAuthed) router.replace('/teacher-login')
    if (!authLoading && isAuthed && user?.role !== 'teacher') router.replace('/dashboard/map')
  }, [authLoading, isAuthed, user?.role, router])

  if (authLoading || !isAuthed || user?.role !== 'teacher') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafc]">
        <div className="flex items-center gap-3 text-[#7c58d8]">
          <GraduationCap className="h-6 w-6 animate-pulse" />
          <span className="text-sm font-semibold">Loading...</span>
        </div>
      </div>
    )
  }

  const activeItem = navItems.find(item => pathname.startsWith(item.href))?.id ?? 'dashboard'

  function handleLogout() {
    logout()
    router.replace('/teacher-login')
  }

  return (
    <div className="teacher-theme flex h-[100dvh] overflow-hidden bg-[#fafafc] text-[#1f2430]">
      {/* Desktop Sidebar — always visible on lg+ */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-[#ece8f5] bg-white p-4">
        <SidebarContent activeItem={activeItem} username={user.username} onLogout={handleLogout} />
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#1d133d]/20 lg:hidden"
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
            className="fixed bottom-0 left-0 top-0 z-50 w-[280px] flex flex-col border-r border-[#ece8f5] bg-white p-4 lg:hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-[#6f6784]">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-[#8d81a8] transition hover:bg-[#f4efff]">
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
        <header className="shrink-0 flex items-center justify-between border-b border-[#ece8f5] bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7c58d8] text-white shadow-[0_8px_20px_rgba(124,88,216,0.25)]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-[#1f2430]">Teacher Management</h1>
              <p className="text-[10px] text-[#8f88a1]">{user.username}</p>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex shrink-0 items-center justify-between border-b border-[#ece8f5] bg-white px-6 py-3">
          <div>
            <h1 className="text-lg font-bold text-[#1f2430]">{navItems.find(i => i.id === activeItem)?.label ?? 'Dashboard'}</h1>
            <p className="text-xs text-[#8f88a1]">Teacher Management</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#5f5677]">{user.username}</span>
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
    'bg-[#eaf3ff] text-[#5a78cf]',
    'bg-[#fff8e9] text-[#c88a30]',
    'bg-[#edf9f1] text-[#3f9f69]',
    'bg-[#fdeef6] text-[#c0568f]',
    'bg-[#f4efff] text-[#7c58d8]',
  ]

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c58d8] text-white shadow-[0_8px_20px_rgba(124,88,216,0.25)]">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-sm font-bold text-[#1f2430]">MindSpark</h1>
          <p className="text-[10px] text-[#8f88a1]">{username}&apos;s sections</p>
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
                  ? 'bg-[#f4efff] text-[#6f54ba]'
                  : 'text-[#5f5677] hover:bg-[#f8f5ff] hover:text-[#6f54ba]',
              ].join(' ')}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-[#dfd2ff] text-[#6f54ba]' : navColors[idx]}`}>
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
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#cfc2ea] bg-white py-3 text-sm font-semibold text-[#6b5a92] transition hover:bg-[#f6f1ff]"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </>
  )
}
