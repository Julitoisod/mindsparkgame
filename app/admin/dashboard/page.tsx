'use client'
/**
 * Admin Dashboard. Nov 2026: account statistics + recent activities. Nov 2026b
 * (REVISIONSS.pdf): the admin sees the same analytics as the teacher Dashboard
 * — over the whole school, or one teacher / section — plus a student
 * enrollment trend, top-performing sections and quick actions.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Award, GraduationCap, Info, LayoutDashboard, School, Settings, ShieldCheck, TrendingUp,
  UserCheck, UserPlus, Users,
} from 'lucide-react'
import PageHeader from '@/components/teacher/PageHeader'
import LearningAnalytics, { Card, type Activity } from '@/components/analytics/LearningAnalytics'
import { BarChart, LineChart } from '@/components/analytics/Charts'
import type { Analytics } from '@/lib/analytics'
import { timeAgo } from '@/lib/utils'

type Overview = {
  stats: {
    teachers: number; activeTeachers: number; inactiveTeachers: number; students: number; sections: number; questions: number
    studentsThisMonth: number; teachersThisMonth: number; sectionsThisMonth: number
  }
  recent: { kind: 'teacher' | 'section' | 'enrollment'; title: string; detail: string; at: string }[]
  scope: { students: number; finishedAll: number }
  analytics: Analytics
  enrollmentTrend: { month: string; students: number; added: number }[]
  topSections: { id: number; name: string; teacher: string; students: number; average: number }[]
  studentActivity: Activity[]
}
type TeacherOption = { id: number; name: string; sections: { id: number; name: string }[] }

const kindStyle = {
  teacher: { icon: UserPlus, tone: 'bg-[#ede6ff] text-[#6f54ba]' },
  section: { icon: School, tone: 'bg-[#e0ecff] text-[#3b6fd8]' },
  enrollment: { icon: GraduationCap, tone: 'bg-[#dcf5e6] text-[#178a4c]' },
}

const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' })

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [teacherId, setTeacherId] = useState<number | ''>('')
  const [classroomId, setClassroomId] = useState<number | ''>('')

  useEffect(() => {
    fetch('/api/admin/classrooms', { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setTeachers(json.data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const qs = new URLSearchParams()
    if (teacherId) qs.set('teacherId', String(teacherId))
    if (classroomId) qs.set('classroomId', String(classroomId))
    setError(null)
    fetch(`/api/admin/overview?${qs}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => (json.success ? setData(json.data) : setError(json.message)))
      .catch(() => setError('Could not load the dashboard'))
  }, [teacherId, classroomId])

  const sectionOptions = useMemo(() => teachers.find(t => t.id === teacherId)?.sections ?? [], [teachers, teacherId])
  const stats = data?.stats
  const cards = [
    { label: 'Total Students', value: stats?.students, sub: `+${stats?.studentsThisMonth ?? 0} this month`, icon: GraduationCap, tone: 'bg-[#eef5ff] border-[#d8e6ff]', iconTone: 'bg-[#dbeafe] text-[#3B82F6]' },
    { label: 'Total Teachers', value: stats?.teachers, sub: `+${stats?.teachersThisMonth ?? 0} this month`, icon: Users, tone: 'bg-[#f5efff] border-[#e8dcff]', iconTone: 'bg-[#e6dcff] text-[#7C58D8]' },
    { label: 'Total Sections', value: stats?.sections, sub: `+${stats?.sectionsThisMonth ?? 0} this month`, icon: School, tone: 'bg-[#eefaf2] border-[#d4efd9]', iconTone: 'bg-[#d9f3df] text-[#16A34A]' },
    { label: 'Active Teachers', value: stats?.activeTeachers, sub: `${stats?.inactiveTeachers ?? 0} deactivated`, icon: UserCheck, tone: 'bg-[#fff9ec] border-[#fce7ba]', iconTone: 'bg-[#fdecc8] text-[#d97706]' },
  ]
  const trendMax = Math.max(10, ...(data?.enrollmentTrend.map(t => t.students) ?? [0]))
  const trendStep = Math.ceil(trendMax / 5 / 5) * 5 || 2
  const select = 'rounded-xl border border-[#ddd5f0] bg-white px-3 py-2 text-sm font-semibold text-[#1f2430] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9B83F5]'

  return (
    <div className="space-y-5">
      <PageHeader
        icon={LayoutDashboard}
        title="Admin Dashboard"
        subtitle="Monitor. Manage. Inspire. — every teacher, section and student in one place."
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card icon={TrendingUp} title="Student Enrollment Overview" aside={<span className="text-[11px] font-semibold text-[#8f88a1]">Last 6 months</span>}>
          <p className="text-xs text-[#8f88a1]">Total students enrolled by the end of each month</p>
          {data && (
            <LineChart
              points={data.enrollmentTrend.map(t => ({ label: monthLabel(t.month), value: t.students, tip: `${monthLabel(t.month)}: ${t.students} students (+${t.added})` }))}
              max={trendStep * 5}
              ticks={[0, 1, 2, 3, 4, 5].map(i => i * trendStep)}
              ariaLabel={`Students enrolled per month: ${data.enrollmentTrend.map(t => `${t.month} ${t.students}`).join(', ')}`}
            />
          )}
        </Card>
        <Card icon={Award} title="Top Performing Sections" aside={<span className="text-[11px] font-semibold text-[#8f88a1]">Class average</span>}>
          {!data ? null : data.topSections.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#8f88a1]">No section has played yet.</p>
          ) : (
            <BarChart
              bars={data.topSections.map(s => ({ label: s.name, value: s.average, tip: `${s.name} (${s.teacher}): ${s.average}% · ${s.students} students` }))}
              max={100}
              unit="%"
              ariaLabel={`Top sections by class average: ${data.topSections.map(s => `${s.name} ${s.average}%`).join(', ')}`}
            />
          )}
        </Card>
      </div>

      {/* Same analytics as the teacher Dashboard, scoped by teacher / section */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ece8f5] bg-white px-4 py-3 shadow-sm">
        <p className="text-sm font-bold text-[#1f2430]">
          Learning analytics <span className="font-medium text-[#8f88a1]">· {data?.scope.students ?? '—'} students · {data?.scope.finishedAll ?? 0} completed all 5 levels</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Teacher" value={teacherId} onChange={e => { setTeacherId(Number(e.target.value) || ''); setClassroomId('') }} className={select}>
            <option value="">All teachers</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select aria-label="Section" value={classroomId} onChange={e => setClassroomId(Number(e.target.value) || '')} disabled={!teacherId} className={`${select} disabled:opacity-50`}>
            <option value="">All sections</option>
            {sectionOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <LearningAnalytics analytics={data?.analytics ?? null} recent={data?.studentActivity ?? null} viewAllHref="/admin/classrooms" />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card icon={ShieldCheck} title="Recent Activities">
          {!data ? (
            <p className="mt-3 text-sm text-[#8f88a1]">Loading…</p>
          ) : data.recent.length === 0 ? (
            <p className="mt-3 text-sm text-[#8f88a1]">No account activity yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[#f0ecf8]">
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
        </Card>

        <section className="rounded-2xl border border-[#ece8f5] bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-bold text-[#1f2430]">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/admin/teachers', icon: Users, label: 'Manage Teachers', tone: 'bg-[#3b82f6]' },
              { href: '/admin/classrooms', icon: School, label: 'View Reports', tone: 'bg-[#7c5cf0]' },
              { href: '/admin/about', icon: Info, label: 'About MindSpark', tone: 'bg-[#16a34a]' },
              { href: '/admin/profile', icon: Settings, label: 'Settings', tone: 'bg-[#d97706]' },
            ].map(a => (
              <Link key={a.label} href={a.href} className={`group flex flex-col items-center justify-center gap-1.5 rounded-xl ${a.tone} px-2 py-4 text-center text-xs font-bold text-[#fff] shadow-sm transition hover:brightness-110`}>
                <a.icon className="h-5 w-5" /> {a.label}
              </Link>
            ))}
          </div>
          <Link href="/admin/teachers" className="mt-3 flex items-center justify-between rounded-xl border border-[#ece8f5] px-3 py-2.5 text-xs font-bold text-[#6f54ba] hover:bg-[#faf8ff]">
            Add a teacher account <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
    </div>
  )
}
