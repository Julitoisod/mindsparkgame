/**
 * app/admin-login/page.tsx — the administrator's own sign-in link.
 *
 * Adviser request (Nov 2026): the admin no longer shares the teacher page —
 * one link for the admin, another for teachers, one database behind both.
 * The server refuses teacher accounts here (`portal: 'admin'`); the landing
 * page has an "Admin Login" button beside "Teacher Login". Same background as /teacher-login
 * (adviser, Nov 2026); the badge and shield mark it as the admin page.
 */
import { ShieldCheck } from 'lucide-react'
import LoginForm from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Administrator Sign In' }

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#22326f] via-[#3459C7] to-[#6255E8] flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-[26px] bg-gradient-to-br from-[#7c5cf0] to-[#5a3fd4] shadow-2xl shadow-[#22326f]/50 ring-1 ring-white/20">
            <ShieldCheck className="h-12 w-12 text-[#fff]" />
          </span>
          <p className="mt-4 inline-block rounded-full bg-[#D9B8FF]/15 px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#D9B8FF]">
            ADMINISTRATOR
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#F4F2FF]">Admin Sign In</h1>
          <p className="mt-1 text-sm text-[#F4F2FF]/75">MindSpark Math · Administrator Panel</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <LoginForm portal="admin" />
        </div>

        <p className="text-center text-xs text-[#F4F2FF]/60">
          Authorized administrator access only.
        </p>
      </div>
    </main>
  )
}
