/**
 * app/page.tsx — Landing / Home page
 */
import Link from 'next/link'
import { Gamepad2, Sword, Shield, Zap, Star, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MindSpark Game — Browser RPG',
}

const features = [
  { icon: Sword,   color: 'text-primary-300', title: '2D Sprite Character', desc: 'Animated warrior with idle, walk, and attack animations.' },
  { icon: Shield,  color: 'text-primary-400', title: '3D World via Three.js', desc: 'Explore a green-lit 3D environment built with React Three Fiber.' },
  { icon: Zap,     color: 'text-primary-200', title: 'Real-time Controls', desc: 'Smooth WASD keyboard movement with camera follow system.' },
  { icon: Star,    color: 'text-primary-300', title: 'RPG Dashboard', desc: 'Stats, inventory, and save/load progress backed by MySQL.' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-game-gradient flex flex-col">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-primary-200/10">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-7 h-7 text-primary-300" />
          <span className="text-xl font-bold font-game text-white animate-glow">MindSpark</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-primary-100/65 hover:text-white transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold bg-gradient-to-r from-primary-700 to-primary-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Teacher Setup
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary-500/15 border border-primary-300/30 rounded-full px-4 py-1.5 text-sm text-primary-200 mb-2">
            <Zap className="w-3.5 h-3.5" />
            Browser RPG · Free to Play
          </div>

          <h1 className="text-5xl md:text-7xl font-black font-game leading-tight">
            <span className="text-white">Mind</span>
            <span className="bg-gradient-to-r from-primary-200 to-primary-500 bg-clip-text text-transparent animate-glow">
              Spark
            </span>
          </h1>

          <p className="text-lg md:text-xl text-primary-100/70 max-w-2xl mx-auto leading-relaxed">
            Explore a green adventure world with your 2D anime sprite hero.
            Fight, level up, collect items, and save your progress — right in the browser.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-700 to-primary-500 text-white font-bold px-8 py-4 rounded-xl text-base hover:opacity-90 transition-all hover:scale-105 shadow-inner-glow"
            >
              Enroll Students <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-primary-200/10 border border-primary-200/15 text-white font-semibold px-8 py-4 rounded-xl text-base hover:bg-primary-200/15 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, color, title, desc }) => (
            <div
              key={title}
              className="glass rounded-2xl p-5 space-y-3 hover:border-primary-300/30 transition-colors"
            >
              <Icon className={`w-7 h-7 ${color}`} />
              <h3 className="text-white font-semibold">{title}</h3>
              <p className="text-primary-100/55 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-primary-200/10 py-6 text-center text-xs text-primary-100/45">
        MindSpark Game · Built with Next.js 15, Three.js &amp; MySQL
      </footer>
    </main>
  )
}
