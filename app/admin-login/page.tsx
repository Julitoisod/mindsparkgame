/**
 * app/admin-login/page.tsx — the administrator's own sign-in link.
 *
 * Adviser request (Nov 2026): the admin no longer shares the teacher page —
 * one link for the admin, another for teachers, one database behind both.
 * The server refuses teacher accounts here (`portal: 'admin'`).
 * Nov 2026b: laid out after the panel's suggested design — the kingdom
 * castle behind, a glowing shield, a stack of math books, a light glass card.
 */
import { Calculator, ShieldCheck } from 'lucide-react'
import BackToHome from '@/components/auth/BackToHome'
import LoginForm from '@/components/auth/LoginForm'
import { AuthScene, BookStack } from '@/components/auth/AuthScene'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Administrator Sign In' }

export default function AdminLoginPage() {
  return (
    <AuthScene>
      <BackToHome />
      <div className="pointer-events-none absolute bottom-8 left-6 hidden items-end gap-3 lg:flex">
        <BookStack labels={[{ text: 'MATH', tone: 'bg-[#3b82f6]' }, { text: 'Grade 5', tone: 'bg-[#22c55e]' }, { text: 'Geometry', tone: 'bg-[#f59e0b]' }]} />
        <span className="flex h-20 w-16 -rotate-6 items-center justify-center rounded-2xl bg-gradient-to-b from-[#6366f1] to-[#4338ca] text-white shadow-[0_6px_0_rgba(0,0,0,0.2)]"><Calculator className="h-10 w-10" /></span>
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center">
            <span className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#8b5cf6] to-[#5a3fd4] shadow-[0_0_40px_rgba(139,92,246,0.75)] ring-4 ring-white/40">
              <ShieldCheck className="h-12 w-12 text-white" />
              <span className="absolute -right-2 -top-2 text-xl text-[#fde047]">✦</span>
            </span>
            <p className="mt-4 inline-block rounded-full bg-gradient-to-r from-[#7c3aed] to-[#5b21b6] px-4 py-1 text-[11px] font-black tracking-[0.25em] text-white shadow ring-1 ring-white/30">
              ADMINISTRATOR
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold text-white drop-shadow-[0_4px_0_#1e1b6b] sm:text-5xl">
              Admin <span className="text-[#facc15]">Sign In</span>
            </h1>
            <p className="mt-1 text-sm font-semibold text-white/90 drop-shadow">MindSpark Math · Administrator Panel</p>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/85 p-7 shadow-2xl backdrop-blur-md">
            <LoginForm portal="admin" />
          </div>

          <p className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-[#1e1b6b]/70 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-[#4ade80]" /> Authorized administrator access only.
          </p>
        </div>
      </div>
    </AuthScene>
  )
}
