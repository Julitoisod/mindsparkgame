'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { isStudentApp } from '@/lib/appTarget'

/**
 * The teacher-account divider + link. Hidden in the student app build so the
 * app stays student-only (req #1).
 */
export default function TeacherAccessLink() {
  const [studentApp, setStudentApp] = useState(false)
  useEffect(() => setStudentApp(isStudentApp()), [])

  if (studentApp) return null

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-primary-200/15" />
        </div>
        <div className="relative text-center">
          <span className="px-3 bg-transparent text-xs text-primary-100/55">or</span>
        </div>
      </div>

      <p className="text-center text-sm text-primary-100/65">
        Teacher access?{' '}
        <Link href="/teacher-login" className="text-primary-300 hover:underline font-semibold">
          Teacher sign in
        </Link>
      </p>
    </>
  )
}
