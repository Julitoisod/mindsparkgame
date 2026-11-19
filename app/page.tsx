/**
 * app/page.tsx — Landing / Home page (the teachers' and admin's web entry;
 * students go straight to their app).
 *
 * Nov 2026b: rebuilt after the panel's suggested web design — the illustrated
 * kingdom with floating math symbols, a hero on the left, the MindSpark title
 * with a ribbon and description in the middle, the partner school on the
 * right, Teacher / Admin Login in the nav and the hero, and four colourful
 * feature cards along the bottom.
 */
import Link from 'next/link'
import { ArrowRight, BookOpen, Gamepad2, GraduationCap, ShieldCheck, Sparkles, Swords, Trophy, Zap } from 'lucide-react'
import StudentAppRedirect from '@/components/auth/StudentAppRedirect'
import { AuthScene, SchoolPolaroid } from '@/components/auth/AuthScene'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MindSpark — Math Adventure Game for Kids',
  description: 'An immersive RPG math game for Grade 5 students. Battle enemies by solving math problems!',
}

const logins = [
  { href: '/teacher-login', label: 'Teacher Login', Icon: GraduationCap },
  { href: '/admin-login', label: 'Admin Login', Icon: ShieldCheck },
]

const features = [
  { icon: Swords, title: 'Boss Battle Quizzes', desc: 'Answer math questions to attack bosses and progress through levels!', tone: 'from-[#3b82f6] to-[#1d4ed8]', href: '/teacher-login' },
  { icon: BookOpen, title: 'Grade 5 Math', desc: 'Fractions, decimals, solid figures, surface area, and volume!', tone: 'from-[#22c55e] to-[#15803d]', href: '/teacher-login' },
  { icon: Trophy, title: 'Stars & Rewards', desc: 'Earn stars, unlock badges and avatars, and climb the leaderboard!', tone: 'from-[#a855f7] to-[#7e22ce]', href: '/teacher-login' },
  { icon: GraduationCap, title: 'Teacher Dashboard', desc: 'Track student progress, quiz scores, and unlock levels in real time.', tone: 'from-[#f59e0b] to-[#ea580c]', href: '/teacher-login' },
]

export default function HomePage() {
  return (
    <AuthScene className="flex flex-col text-white">
      <StudentAppRedirect />
      <div className="flex min-h-screen flex-col">
        {/* ── Nav ── */}
        <nav className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#1e1b6b]/80 px-4 py-2.5 shadow-xl backdrop-blur-md sm:mx-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Zap className="h-6 w-6 fill-[#facc15] text-[#facc15]" />
              <span className="font-display text-2xl font-bold">Mind<span className="text-[#facc15]">Spark</span></span>
            </span>
            <span className="hidden items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold md:inline-flex">
              <Gamepad2 className="h-3.5 w-3.5" /> Math RPG Adventure · Grade 5
            </span>
          </div>
          <div className="flex gap-2">
            {logins.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#7c5cf0] to-[#5a3fd4] px-3.5 py-2 text-sm font-bold shadow-md ring-1 ring-white/25 transition hover:brightness-110">
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-6 px-4 py-8 lg:grid-cols-[1fr_1.35fr_1fr] lg:py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/hero-knight.png" alt="MindSpark hero knight" className="mx-auto hidden w-full max-w-[340px] drop-shadow-[0_18px_20px_rgba(0,0,0,0.35)] lg:block" />

          <div className="text-center">
            <p className="flex justify-center gap-1 text-2xl text-[#fde047] drop-shadow">★ <span className="-mt-1 text-3xl">★</span> ★</p>
            <h1 className="font-display text-[clamp(56px,10vw,112px)] font-bold leading-none" style={{ WebkitTextStroke: '3px #1e1b6b', paintOrder: 'stroke fill' }}>
              <span className="text-white drop-shadow-[0_6px_0_#1e1b6b]">Mind</span>
              <span className="text-[#facc15] drop-shadow-[0_6px_0_#1e1b6b]">Spark</span>
            </h1>
            <p className="mx-auto mt-2 inline-block -rotate-1 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#ea580c] px-6 py-1.5 font-display text-xl font-bold shadow-[0_5px_0_#9a3412] sm:text-2xl">
              Math Adventure for Grade 5
            </p>
            <p className="mx-auto mt-4 max-w-lg rounded-2xl bg-white/90 px-5 py-3 text-sm font-semibold leading-relaxed text-[#22326f] shadow-xl sm:text-base">
              An immersive math RPG where kids battle powerful enemies by solving math challenges.
              Learn <b>fractions, decimals, solid figures, surface area, and volume</b> — through exciting quizzes!
            </p>
            {/* Separate sign-in links for teachers and the admin (adviser, Nov 2026) */}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {logins.map(({ href, label, Icon }) => (
                <Link key={href} href={href} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-[#7c5cf0] to-[#5a3fd4] px-7 py-3.5 text-base font-black shadow-[0_5px_0_#3b2a99] ring-2 ring-white/40 transition hover:-translate-y-0.5 hover:brightness-110">
                  <Icon className="h-5 w-5" /> {label}
                </Link>
              ))}
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#fde047]" /> Students play on the MindSpark app · teacher accounts come from the administrator
            </p>
          </div>

          <SchoolPolaroid className="mx-auto hidden w-full max-w-[320px] lg:block" />
        </section>

        {/* ── Features ── */}
        <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 pb-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc, tone, href }) => (
            <Link
              key={title}
              href={href}
              className={`group flex items-center gap-3 rounded-2xl bg-gradient-to-br ${tone} p-4 shadow-xl ring-2 ring-white/40 transition hover:-translate-y-1`}
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner"><Icon className="h-8 w-8" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-bold leading-tight">{title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-white/90">{desc}</span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#22326f] shadow transition group-hover:translate-x-0.5"><ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </section>

        <footer className="bg-[#1e1b4b]/70 py-3 text-center text-xs text-white/70 backdrop-blur-sm">
          MindSpark Game · Math Adventure for Grade 5 · Built with Next.js &amp; MySQL
        </footer>
      </div>
    </AuthScene>
  )
}
