/**
 * app/teacher-login/page.tsx — Teacher sign-in (web portal)
 *
 * Separate from the student /login page (req #1). Lives outside the /teacher
 * route group so it isn't caught by the teacher layout's auth guard.
 * Uses the same LoginForm + /api/auth/login; teachers are routed to the
 * teacher dashboard after a successful sign-in.
 */
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import LoginForm from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Teacher Sign In' }

export default function TeacherLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#22326f] via-[#3459C7] to-[#6255E8] flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <GraduationCap className="w-8 h-8 text-[#D9B8FF]" />
            <span className="text-2xl font-black font-game text-[#F4F2FF]">MindSpark</span>
          </div>
          <h1 className="text-3xl font-bold text-[#F4F2FF]">Teacher Sign In</h1>
          <p className="text-[#F4F2FF]/70 text-sm">Manage your sections, students, questions, and reports</p>
        </div>

        {/* Form card */}
        <div className="glass rounded-2xl p-8 space-y-6">
          <LoginForm />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary-200/15" />
            </div>
            <div className="relative text-center">
              <span className="px-3 bg-transparent text-xs text-primary-100/55">new here?</span>
            </div>
          </div>

          <p className="text-center text-sm text-primary-100/65">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#D9B8FF] hover:underline font-semibold">
              Create teacher account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-primary-100/45">
          Are you a student?{' '}
          <Link href="/login" className="text-primary-300 hover:underline font-semibold">
            Student sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
