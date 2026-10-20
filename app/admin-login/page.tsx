/**
 * app/admin-login/page.tsx — ADMIN sign-in (2026-10b revision, item 1).
 *
 * Separate entry from the teacher portal: the evaluators asked for the admin
 * and teacher to have separate access. The form is the shared LoginForm, which
 * routes by role after a successful sign-in.
 */
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import LoginForm from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin Sign In' }

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#161f45] via-[#22326f] to-[#3459C7] flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-8 h-8 text-[#D9B8FF]" />
            <span className="text-2xl font-black font-game text-[#F4F2FF]">MindSpark</span>
          </div>
          <h1 className="text-3xl font-bold text-[#F4F2FF]">Administrator</h1>
          <p className="text-[#F4F2FF]/70 text-sm">Manage teacher accounts and access</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-[#F4F2FF]/60">
          Teacher?{' '}
          <Link href="/teacher-login" className="text-[#D9B8FF] hover:underline font-semibold">
            Teacher sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
