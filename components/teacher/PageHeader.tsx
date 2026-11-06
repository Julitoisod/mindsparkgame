/**
 * The banner every teacher/admin page opens with (panel revision, Nov 2026:
 * "consistent design sa all sub pages"). Icon tile + title + one-line
 * subtitle on a lavender band, with optional actions on the right.
 *
 * Note: inside .teacher-theme, `text-white` is remapped to dark text, so the
 * white icon uses text-[#fff].
 */
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  actions?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#e3dbff] bg-gradient-to-r from-[#efe9ff] via-[#f4f0ff] to-[#e8e0ff] px-5 py-4 shadow-sm">
      {/* soft diagonal bands, as in the panel's mockups */}
      <span className="pointer-events-none absolute -right-10 -top-16 h-48 w-40 rotate-[35deg] rounded-3xl bg-[#d9ccff]/50" />
      <span className="pointer-events-none absolute right-24 -top-20 h-48 w-16 rotate-[35deg] rounded-3xl bg-[#e4dbff]/60" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c5cf0] to-[#5a3fd4] text-[#fff] shadow-lg shadow-[#6255E8]/30">
            <Icon className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-[#1e1b4b]">{title}</h2>
            <p className="text-sm text-[#5b5675]">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
