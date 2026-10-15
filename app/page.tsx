/**
 * app/page.tsx — Landing / Home page
 *
 * 2026-10 revision (items 1-5): this page is the TEACHER's web entry only —
 * students never land here, they go straight to /login (their own page), so
 * the "Student Sign In" button is gone. Layout follows the panel's mockup:
 * the school photo fills the hero, cards sit in a row underneath, and every
 * colour comes from the MindSpark Math palette in globals.css.
 */
import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, GraduationCap, Trophy, Swords, Zap } from 'lucide-react'
import StudentAppRedirect from '@/components/auth/StudentAppRedirect'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MindSpark — Math Adventure Game for Kids',
  description: 'An immersive RPG math game for Grade 5 students. Battle enemies by solving math problems!',
}

const features = [
  { icon: Swords,        color: 'text-[#D9B8FF]', bar: 'bg-[#9B83F5]', title: 'Boss Battle Quizzes', desc: 'Answer math questions to attack bosses and progress through levels.' },
  { icon: BookOpen,      color: 'text-[#9B83F5]', bar: 'bg-[#6255E8]', title: 'Grade 5 Math',        desc: 'Fractions, decimals, solid figures, surface area, and volume — aligned to curriculum.' },
  { icon: Trophy,        color: 'text-[#D9B8FF]', bar: 'bg-[#9B83F5]', title: 'Stars & Rewards',     desc: 'Earn stars, unlock badges, and climb the leaderboard as you learn.' },
  { icon: GraduationCap, color: 'text-[#9B83F5]', bar: 'bg-[#6255E8]', title: 'Teacher Dashboard',   desc: 'Track student progress, quiz scores, and unlock levels in real time.' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#22326f] flex flex-col text-[#F4F2FF]">
      <StudentAppRedirect />
      {/* ── Nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-[#9B83F5]/25 bg-[#22326f]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-[#D9B8FF] fill-[#D9B8FF]" />
          <span className="text-xl font-black text-[#F4F2FF]">MindSpark</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/teacher-login" className="text-sm text-[#F4F2FF]/75 hover:text-white transition-colors px-4 py-2">
            Teacher Login
          </Link>
          <Link
            href="/register"
            className="text-sm font-bold bg-[#6255E8] text-white px-4 py-2 rounded-lg hover:bg-[#9B83F5] transition-colors shadow-lg shadow-[#6255E8]/40"
          >
            Teacher Setup
          </Link>
        </div>
      </nav>

      {/* ── Hero over the school photo ── */}
      <section className="relative flex-1 overflow-hidden">
        <Image
          src="/revision/school-landing.jpg"
          alt="Francisco Adlaon Learning Institute"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Royal-blue wash keeps the copy readable over the photo */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#22326f]/95 via-[#22326f]/60 to-transparent" />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 px-6 py-16 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#9B83F5]/50 bg-[#3459C7]/40 px-4 py-1.5 text-sm text-[#F4F2FF]">
              <Zap className="w-3.5 h-3.5 text-[#D9B8FF]" />
              Math RPG Adventure · Grade 5
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-tight">
              <span className="text-[#F4F2FF]">Mind</span>
              <span className="text-[#D9B8FF]">Spark</span>
            </h1>

            <p className="text-lg text-[#F4F2FF]/85 leading-relaxed max-w-xl">
              An immersive math RPG where kids battle powerful enemies by solving math challenges.
              Learn fractions, solid figures, surface area, and volume — through exciting quiz adventures!
            </p>

            <div className="pt-2">
              <Link
                href="/teacher-login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6255E8] px-8 py-4 text-base font-black text-white shadow-lg shadow-[#6255E8]/40 transition-all hover:scale-105 hover:bg-[#9B83F5]"
              >
                <GraduationCap className="w-5 h-5" />
                Teacher Login
              </Link>
            </div>

            <p className="text-sm text-[#F4F2FF]/70">
              New teacher?{' '}
              <Link href="/register" className="font-semibold text-[#D9B8FF] underline underline-offset-2 hover:text-white">
                Set up your account
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-[#22326f] px-6 py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, color, bar, title, desc }) => (
            <div
              key={title}
              className="space-y-3 rounded-2xl border border-[#9B83F5]/30 bg-[#3459C7]/35 p-5 backdrop-blur-md transition-colors hover:border-[#9B83F5]/60"
            >
              <Icon className={`w-7 h-7 ${color}`} />
              <h3 className="font-bold text-[#F4F2FF]">{title}</h3>
              <span className={`block h-1 w-8 rounded-full ${bar}`} />
              <p className="text-sm leading-relaxed text-[#F4F2FF]/70">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#9B83F5]/20 py-6 text-center text-xs text-[#F4F2FF]/50">
        MindSpark Game · Math Adventure for Grade 5 · Built with Next.js &amp; MySQL
      </footer>
    </main>
  )
}
