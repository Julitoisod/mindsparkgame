/**
 * app/login/page.tsx — STUDENT sign-in
 *
 * 2026-10 revision (items 12-13): the student login is fully separated from
 * the teacher's. It has its own artwork and carries no teacher links; teachers
 * sign in at /teacher-login, which is reachable from the landing page only.
 */
import Image from 'next/image'
import LoginForm from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Student Sign In' }

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      <Image
        src="/revision/student-login-bg.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[#22326f]/35" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-wide text-white drop-shadow-[0_3px_6px_rgba(34,50,111,0.85)] font-game">
            MINDSPARK
          </h1>
          <span className="mt-1 inline-block rounded-full bg-[#6255E8] px-4 py-0.5 text-sm font-bold tracking-widest text-[#F4F2FF] shadow-lg">
            MATH
          </span>
        </div>

        {/* Form card */}
        <div className="rounded-3xl border-2 border-[#9B83F5]/60 bg-[#F4F2FF]/95 p-7 shadow-2xl backdrop-blur-sm">
          <div className="mb-5 text-center">
            <h2 className="text-2xl font-black text-[#3459C7]">✦ Welcome Back! ✦</h2>
            <p className="mt-1 text-sm text-[#22326f]/70">Log in to continue your learning journey.</p>
          </div>
          <LoginForm theme="student" />
        </div>
      </div>
    </main>
  )
}
