'use client'
/**
 * Student sign-in is app-only (2026-10 panel feedback).
 *
 * The APK loads this same deployment, so the /login route has to keep existing
 * — it just must not offer the form in a desktop browser. Inside the app
 * (Capacitor native) the children render; on the web the visitor is told where
 * the game lives and sent to the teacher portal instead.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Smartphone } from 'lucide-react'
import { isStudentApp } from '@/lib/appTarget'

export default function StudentLoginGate({ children }: { children: React.ReactNode }) {
  // null = not decided yet; render nothing so neither side flashes the wrong UI
  const [inApp, setInApp] = useState<boolean | null>(null)

  useEffect(() => { setInApp(isStudentApp()) }, [])

  if (inApp === null) return null
  if (inApp) return <>{children}</>

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6255E8]/15">
        <Smartphone className="h-7 w-7 text-[#6255E8]" />
      </div>
      <h2 className="text-xl font-black text-[#3459C7]">Play on the MINDSPARK app</h2>
      <p className="text-sm leading-relaxed text-[#22326f]/70">
        The student game runs on the MINDSPARK mobile app. Ask your teacher to install it,
        then sign in there with the username and password they gave you.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-full bg-[#6255E8] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#3459C7]"
      >
        Back to home
      </Link>
    </div>
  )
}
