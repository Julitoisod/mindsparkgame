/**
 * app/page.tsx — Landing / Home page
 */
import Link from 'next/link'
import { BookOpen, GraduationCap, Star, Swords, Trophy, Zap } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MindSpark — Math Adventure Game for Kids',
  description: 'An immersive RPG math game for Grade 3 students. Battle enemies by solving math problems!',
}

const features = [
  { icon: Swords,        color: 'text-purple-400', title: 'Boss Battle Quizzes',    desc: 'Answer math questions to attack bosses and progress through levels.' },
  { icon: BookOpen,      color: 'text-cyan-400',   title: 'Grade 3 Math',           desc: 'Multiplication, division, fractions, shapes, and more — aligned to curriculum.' },
  { icon: Trophy,        color: 'text-yellow-400', title: 'Stars & Rewards',        desc: 'Earn stars, unlock badges, and climb the leaderboard as you learn.' },
  { icon: GraduationCap, color: 'text-emerald-400',title: 'Teacher Dashboard',      desc: 'Track student progress, quiz scores, and unlock levels in real time.' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1a0a3c] via-[#2d1060] to-[#1a0a3c] flex flex-col">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-purple-400/15">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-300 fill-yellow-300" />
          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300">
            MindSpark
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/teacher-login" className="text-sm text-purple-200/70 hover:text-white transition-colors px-4 py-2">
            Teacher Login
          </Link>
          <Link href="/register" className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/30">
            Teacher Setup
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-pink-600/15 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <p className="text-sm md:text-base font-bold text-yellow-300">HI</p>
          <div className="inline-flex items-center gap-2 bg-purple-500/15 border border-purple-300/30 rounded-full px-4 py-1.5 text-sm text-purple-200 mb-2">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            Math RPG Adventure · Grade 3
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight">
            <span className="text-white">Mind</span>
            <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
              Spark
            </span>
          </h1>

          <p className="text-lg md:text-xl text-purple-100/70 max-w-2xl mx-auto leading-relaxed">
            An immersive math RPG where kids battle powerful enemies by solving math challenges.
            Learn multiplication, division, and more — through exciting quiz adventures!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/teacher-login"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black px-8 py-4 rounded-xl text-base hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-purple-500/40"
            >
              <GraduationCap className="w-5 h-5" />
              Teacher Login
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-purple-500/15 border border-purple-400/30 text-white font-bold px-8 py-4 rounded-xl text-base hover:bg-purple-500/25 transition-all"
            >
              <Star className="w-5 h-5 text-yellow-400" />
              Student Sign In
            </Link>
          </div>

          <p className="text-sm text-purple-100/55 pt-1">
            New teacher?{' '}
            <Link href="/register" className="text-purple-200 font-semibold hover:text-white underline underline-offset-2">
              Set up your account
            </Link>
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, color, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-purple-400/20 bg-purple-950/40 backdrop-blur-md p-5 space-y-3 hover:border-purple-400/40 transition-colors"
            >
              <Icon className={`w-7 h-7 ${color}`} />
              <h3 className="text-white font-bold">{title}</h3>
              <p className="text-purple-100/55 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-purple-400/10 py-6 text-center text-xs text-purple-100/40">
        MindSpark Game · Math Adventure for Grade 3 · Built with Next.js &amp; MySQL
      </footer>
    </main>
  )
}
