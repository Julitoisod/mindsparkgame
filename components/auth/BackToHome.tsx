/**
 * components/auth/BackToHome.tsx — top-left "Back to Home" link shared by the
 * admin and teacher sign-in pages (adviser, Nov 2026). The parent <main> must
 * be `relative`.
 */
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function BackToHome() {
  return (
    <Link
      href="/"
      className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-[#F4F2FF] ring-1 ring-white/20 backdrop-blur-md transition-colors hover:bg-white/20"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Home
    </Link>
  )
}
