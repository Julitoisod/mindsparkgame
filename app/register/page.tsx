/**
 * app/register/page.tsx — Registration page
 */
import Link from 'next/link'
import { Gamepad2 } from 'lucide-react'
import RegisterForm from '@/components/auth/RegisterForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Create Teacher Account' }

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-game-gradient flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Gamepad2 className="w-8 h-8 text-primary-300" />
            <span className="text-2xl font-black font-game text-white">MindSpark</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Teacher Setup</h1>
          <p className="text-primary-100/55 text-sm">Create a teacher account to enroll and manage students</p>
        </div>

        <div className="glass rounded-2xl p-8 space-y-6">
          <RegisterForm />

          <p className="text-center text-sm text-primary-100/65">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-300 hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-primary-100/45">
          <Link href="/" className="hover:text-primary-100 transition-colors">← Back to home</Link>
        </p>
      </div>
    </main>
  )
}
