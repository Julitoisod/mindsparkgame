'use client'
/**
 * Header account dropdown for teachers and admins (panel revision, Nov 2026):
 * My Profile · Edit Account Information · Change Password · Logout.
 * The three account entries open the account page on the matching tab.
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, KeyRound, LogOut, Pencil, UserRound } from 'lucide-react'

export default function AccountMenu({
  name,
  roleLabel,
  accountHref,
  onLogout,
}: {
  name: string
  roleLabel: string
  /** e.g. /teacher/account — the tabs are addressed by #profile, #edit, #password */
  accountHref: string
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const items = [
    { label: 'My Profile', icon: UserRound, href: `${accountHref}#profile` },
    { label: 'Edit Account Information', icon: Pencil, href: `${accountHref}#edit` },
    { label: 'Change Password', icon: KeyRound, href: `${accountHref}#password` },
  ]

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="account-menu-button"
        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-[#f4efff]"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7c5cf0] to-[#5a3fd4] text-sm font-black text-[#fff]">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[160px] truncate text-sm font-bold text-[#1f2430]">{name}</span>
          <span className="block text-[11px] text-[#8f88a1]">{roleLabel}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-[#8f88a1] transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#ece8f5] bg-white p-2 shadow-xl">
          <div className="flex items-center gap-3 border-b border-[#f0ecf8] px-2 pb-3 pt-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7c5cf0] to-[#5a3fd4] font-black text-[#fff]">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#1f2430]">{name}</span>
              <span className="block text-xs text-[#8f88a1]">{roleLabel}</span>
            </span>
          </div>
          <div className="py-1">
            {items.map(item => (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#3d3654] hover:bg-[#f4efff]"
              >
                <item.icon className="h-4 w-4 text-[#7c58d8]" /> {item.label}
              </Link>
            ))}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onLogout() }}
            className="flex w-full items-center gap-3 rounded-xl border-t border-[#f0ecf8] px-3 py-2.5 text-sm font-semibold text-[#d0435f] hover:bg-[#fff1f4]"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </div>
  )
}
