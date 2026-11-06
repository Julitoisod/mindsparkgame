'use client'
/** Admin Dashboard — account statistics and recent activities (Nov 2026). */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, FileQuestion, GraduationCap, LayoutDashboard, School, UserCheck, UserPlus, UserX, Users } from 'lucide-react'
import PageHeader from '@/components/teacher/PageHeader'
import { timeAgo } from '@/lib/utils'

type Overview = {
  stats: { teachers: number; activeTeachers: number; inactiveTeachers: number; students: number; sections: number; questions: number }
  recent: { kind: 'teacher' | 'section' | 'enrollment'; title: string; detail: string; at: string }[]
}

const kindStyle = {
  teacher: { icon: UserPlus, tone: 'bg-[#ede6ff] text-[#6f54ba]' },
  section: { icon: School, tone: 'bg-[#e0ecff] text-[#3b6fd8]' },
  enrollment: { icon: GraduationCap, tone: 'bg-[#dcf5e6] text-[#178a4c]' },
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/overview', { credentials: 'include' })
      .then(r => r.json())
      .then(json => (json.success ? setData(json.data) : setError(json.message)))
      .catch(() => setError('Could not load the dashboard'))
  }, [])

  const stats = data?.stats
  const cards = [
    { label: 'Teacher Accounts', value: stats?.teachers, sub: 'Created by the admin', icon: Users, tone: 'bg-[#f5efff] border-[#e8dcff]', iconTone: 'bg-[#e6dcff] text-[#7C58D8]' },
    { label: 'Active Teachers', value: stats?.activeTeachers, sub: `${stats?.inactiveTeachers ?? 0} deactivated`, icon: UserCheck, tone: 'bg-[#eefaf2] border-[#d4efd9]', iconTone: 'bg-[#d9f3df] text-[#16A34A]' },
    { label: 'Students', value: stats?.students, sub: 'Enrolled by teachers', icon: GraduationCap, tone: 'bg-[#eef5ff] border-[#d8e6ff]', iconTone: 'bg-[#dbeafe] text-[#3B82F6]' },
    { label: 'Sections', value: stats?.sections, sub: `${stats?.questions ?? 0} active questions`, icon: School, tone: 'bg-[#fff9ec] border-[#fce7ba]', iconTone: 'bg-[#fdecc8] text-[#d97706]' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle="Account statistics and recent activities."
        actions={
          <Link href="/admin/teachers" className="inline-flex items-center gap-2 rounded-xl bg-[#6f54ba] px-4 py-2.5 text-sm font-bold text-[#fff] shadow hover:bg-[#5d44a6]">
            <Users className="h-4 w-4" /> Teacher Management
          </Link>
        }
      />

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className={`rounded-2xl border p-4 shadow-sm ${card.tone}`}>
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${card.iconTone}`}>
                <card.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-[#374151]">{card.label}</p>
                <p className="text-2xl font-black text-[#111827]">{card.value ?? '—'}</p>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-[#6B7280]">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-[#ece8f5] bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-bold text-[#1f2430]">Recent Activities</h3>
          {!data ? (
            <p className="text-sm text-[#8f88a1]">Loading…</p>
          ) : data.recent.length === 0 ? (
            <p className="text-sm text-[#8f88a1]">No account activity yet.</p>
          ) : (
            <ul className="divide-y divide-[#f0ecf8]">
              {data.recent.map((item, i) => {
                const style = kindStyle[item.kind]
                return (
                  <li key={i} className="flex items-center gap-3 py-2.5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.tone}`}>
                      <style.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#1f2430]">{item.title}</p>
                      <p className="truncate text-xs text-[#6f7187]">{item.detail}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-[#9aa0b2]">{timeAgo(item.at)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          {[
            { href: '/admin/teachers', icon: UserPlus, label: 'Add a teacher account', sub: 'Teachers sign in once you create them' },
            { href: '/admin/teachers', icon: UserX, label: 'Activate or deactivate', sub: 'Deactivating keeps their sections and students' },
            { href: '/admin/profile#password', icon: FileQuestion, label: 'Change your password', sub: 'Keep the admin account secure' },
          ].map(link => (
            <Link key={link.label} href={link.href} className="group flex items-center gap-3 rounded-2xl border border-[#ece8f5] bg-white p-4 shadow-sm transition hover:border-[#cfc2ea] hover:bg-[#faf8ff]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4efff] text-[#7c58d8]"><link.icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#1f2430]">{link.label}</span>
                <span className="block text-[11px] text-[#8f88a1]">{link.sub}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-[#9aa0b2] transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
