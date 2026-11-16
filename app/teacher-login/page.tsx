/**
 * app/teacher-login/page.tsx — the teachers' sign-in link.
 *
 * Adviser request (Nov 2026): the administrator has a separate link
 * (/admin-login); this page signs in teachers only and the server refuses
 * admin and student accounts here (`portal: 'teacher'`). Teachers no longer
 * sign themselves up — the admin creates their accounts.
 */
import LoginForm from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Teacher Sign In' }

export default function PortalLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#22326f] via-[#3459C7] to-[#6255E8] flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/mindspark-logo.webp"
            alt="MindSpark Math"
            width={112}
            height={112}
            className="mx-auto h-28 w-28 rounded-[26px] shadow-2xl shadow-[#22326f]/50"
          />
          <h1 className="mt-4 text-3xl font-bold text-[#F4F2FF]">Teacher Sign In</h1>
          <p className="mt-1 text-sm text-[#F4F2FF]/75">Manage your sections, students, questions and reports.</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <LoginForm portal="teacher" />
        </div>

        <p className="text-center text-xs text-[#F4F2FF]/60">
          Need an account or forgot your password? Ask your MindSpark administrator.
        </p>
      </div>
    </main>
  )
}
