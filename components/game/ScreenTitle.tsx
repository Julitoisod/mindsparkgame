/**
 * A student screen's header in the panel's suggested design (Nov 24): a round
 * back-to-map button, the screen's icon badge and its title. `children` sit
 * after the title (the star count, the search box). `.student-page-head`
 * keeps it clear of the nav tray.
 */
import Link from 'next/link'
import { ChevronLeft, type LucideIcon } from 'lucide-react'

export default function ScreenTitle({
  title,
  icon: Icon,
  badge = 'game-badge-gold',
  children,
}: {
  title: string
  icon: LucideIcon
  /** a .game-badge-* colour */
  badge?: string
  children?: React.ReactNode
}) {
  return (
    <div className="student-page-head flex min-w-0 items-center gap-2">
      <Link href="/dashboard/map" aria-label="Back to the map" className="game-badge game-badge-blue h-9 w-9">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <span className={`game-badge ${badge} h-9 w-9`}>
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="game-title truncate text-[22px]">{title}</h2>
      {children}
    </div>
  )
}
