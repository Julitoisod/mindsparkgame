'use client'
/**
 * The landing page is the TEACHER's web entry (2026-10 revision, item 2).
 * The student app loads the same deployment, so when it opens at "/" we send
 * it straight to the student login instead of showing the teacher page.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isStudentApp } from '@/lib/appTarget'

export default function StudentAppRedirect() {
  const router = useRouter()

  useEffect(() => {
    if (isStudentApp()) router.replace('/login')
  }, [router])

  return null
}
