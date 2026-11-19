/**
 * The illustrated world behind the landing page and the admin / teacher
 * sign-in pages (panel's suggested web design, Nov 2026b): the game's magical
 * kingdom art, floating math symbols and stars, plus the decorations the
 * mockups use — a stack of math books and a photo of the partner school.
 * Built from the game's own art; no generated images.
 */
import type { ReactNode } from 'react'

const SYMBOLS = [
  { ch: '+', color: '#facc15', pos: 'left-[6%] top-[22%]', size: 'text-6xl', delay: '0s' },
  { ch: '×', color: '#4ade80', pos: 'right-[8%] top-[16%]', size: 'text-7xl', delay: '1.2s' },
  { ch: '÷', color: '#f472b6', pos: 'left-[30%] top-[10%]', size: 'text-5xl', delay: '0.6s' },
  { ch: '−', color: '#60a5fa', pos: 'right-[30%] top-[8%]', size: 'text-6xl', delay: '1.8s' },
  { ch: '★', color: '#fde047', pos: 'left-[18%] top-[48%]', size: 'text-3xl', delay: '0.9s' },
  { ch: '★', color: '#fde047', pos: 'right-[20%] top-[44%]', size: 'text-2xl', delay: '2.1s' },
]

export function AuthScene({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className={`relative min-h-screen overflow-hidden bg-[#3a6ff0] ${className}`}>
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/revision/student-login-bg.jpg')" }}
      />
      {/* keeps the centre readable without hiding the art */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#1e3a8a]/35 via-[#4c1d95]/10 to-[#1e1b4b]/45" />
      {SYMBOLS.map((s, i) => (
        <span
          key={i}
          aria-hidden
          className={`auth-float pointer-events-none absolute hidden font-black drop-shadow-[0_4px_0_rgba(0,0,0,0.18)] sm:block ${s.pos} ${s.size}`}
          style={{ color: s.color, animationDelay: s.delay, WebkitTextStroke: '2px rgba(255,255,255,0.85)' }}
        >
          {s.ch}
        </span>
      ))}
      <div className="relative z-10">{children}</div>
    </main>
  )
}

/** A stack of chunky storybook-style math books (CSS only). */
export function BookStack({ labels, className = '' }: { labels: { text: string; tone: string }[]; className?: string }) {
  return (
    <div aria-hidden className={`flex flex-col items-start ${className}`}>
      {labels.map((b, i) => (
        <span
          key={b.text}
          className={`flex h-11 items-center rounded-r-xl rounded-l-md border-l-[10px] border-black/20 px-5 font-game text-lg font-black text-white shadow-[0_6px_0_rgba(0,0,0,0.2)] ${b.tone}`}
          style={{ width: `${13 - i}rem`, transform: `rotate(${i % 2 ? 2 : -2}deg) translateX(${i * 6}px)` }}
        >
          {b.text}
        </span>
      ))}
    </div>
  )
}

/** The partner school's photo, framed like a pinned snapshot. */
export function SchoolPolaroid({ className = '' }: { className?: string }) {
  return (
    <figure className={`rotate-2 rounded-2xl bg-white p-2.5 pb-2 shadow-2xl ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/revision/school-landing.jpg" alt="Francisco Adlaon Learning Institute" className="aspect-[4/3] w-full rounded-xl object-cover" />
      <figcaption className="mt-1.5 text-center text-[11px] font-black uppercase tracking-wide text-[#22326f]">Francisco Adlaon Learning Institute</figcaption>
    </figure>
  )
}
