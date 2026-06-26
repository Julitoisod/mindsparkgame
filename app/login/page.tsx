/**
 * app/login/page.tsx — Login page
 */
import Link from 'next/link'
import { Gamepad2 } from 'lucide-react'
import LoginForm from '@/components/auth/LoginForm'
import TeacherAccessLink from '@/components/auth/TeacherAccessLink'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign In' }

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-game-gradient flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Gamepad2 className="w-8 h-8 text-primary-300" />
            <span className="text-2xl font-black font-game text-white">MindSpark</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-primary-100/55 text-sm">Students sign in with credentials assigned by a teacher</p>
        </div>

        {/* Form card */}
        <div className="glass rounded-2xl p-8 space-y-6">
          <LoginForm />
          <TeacherAccessLink />
        </div>

        <p className="text-center text-xs text-primary-100/45">
          <Link href="/" className="hover:text-primary-100 transition-colors">← Back to home</Link>
        </p>
      </div>
    </main>
  )
}
