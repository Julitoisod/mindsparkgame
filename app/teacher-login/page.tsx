/**
 * app/teacher-login/page.tsx — the teachers' sign-in link.
 *
 * Adviser request (Nov 2026): the administrator has a separate link
 * (/admin-login); this page signs in teachers only and the server refuses
 * admin and student accounts here (`portal: 'teacher'`). Teachers no longer
 * sign themselves up — the admin creates their accounts.
 * Nov 2026b: laid out after the panel's suggested design — the MindSpark crest,
 * a ribbon title, a guide character with math books, the partner school.
 */
import { ShieldCheck } from 'lucide-react'
import BackToHome from '@/components/auth/BackToHome'
import LoginForm from '@/components/auth/LoginForm'
import { AuthScene, BookStack, SchoolPolaroid } from '@/components/auth/AuthScene'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Teacher Sign In' }

export default function PortalLoginPage() {
  return (
    <AuthScene>
      <BackToHome />
      <div className="pointer-events-none absolute bottom-6 left-4 hidden flex-col items-start xl:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/hero-fairy.png" alt="" className="ml-6 w-[230px] drop-shadow-[0_14px_16px_rgba(0,0,0,0.35)]" />
        <BookStack className="-mt-4" labels={[{ text: 'Mathematics', tone: 'bg-[#3b82f6]' }, { text: 'Grade 5', tone: 'bg-[#f97316]' }]} />
      </div>
      <SchoolPolaroid className="pointer-events-none absolute bottom-10 right-8 hidden w-[280px] xl:block" />

      <div className="flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mindspark-logo.webp" alt="MindSpark Math" width={96} height={96} className="mx-auto h-24 w-24 rounded-[24px] shadow-2xl ring-4 ring-white/50" />
            <h1 className="relative mx-auto mt-3 w-fit rounded-2xl bg-gradient-to-b from-[#7c5cf0] to-[#4c32c4] px-5 py-2 font-display text-3xl font-bold text-white shadow-[0_6px_0_#2e1f80] sm:px-7 sm:text-4xl ring-2 ring-white/40">
              <span className="mr-2 text-2xl text-[#fde047]">★</span>Teacher <span className="text-[#facc15]">Sign In</span><span className="ml-2 text-2xl text-[#fde047]">★</span>
            </h1>
            <p className="mx-auto -mt-1.5 w-fit rounded-b-xl bg-[#facc15] px-5 pb-1.5 pt-3 text-xs font-black text-[#3b2a00] shadow">
              Manage your sections, students, questions and reports.
            </p>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/85 p-7 shadow-2xl backdrop-blur-md">
            <LoginForm portal="teacher" />
          </div>

          <p className="mx-auto flex w-fit items-center gap-2 rounded-2xl bg-[#1e1b6b]/75 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#facc15]" />
            Need an account or forgot your password? Ask your MindSpark administrator.
          </p>
        </div>
      </div>
    </AuthScene>
  )
}
