/**
 * app/teacher-login/page.tsx — the web portal's ONE sign-in page.
 *
 * Panel revision (Nov 2026): teachers and the administrator share this page;
 * the account's role decides where it lands (LoginForm routes admin →
 * /admin/dashboard, teacher → /teacher/dashboard) and each still gets only its
 * own tools. Teachers no longer sign themselves up — the admin creates their
 * accounts — and students have no web access, so both links are gone.
 * /admin-login redirects here.
 */
import LoginForm from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign In' }

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
          <h1 className="mt-4 text-3xl font-bold text-[#F4F2FF]">Sign In</h1>
          <p className="mt-1 text-sm text-[#F4F2FF]/75">For teachers and administrators — your account opens your own dashboard.</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-[#F4F2FF]/60">
          Need an account or forgot your password? Ask your MindSpark administrator.
        </p>
      </div>
    </main>
  )
}
