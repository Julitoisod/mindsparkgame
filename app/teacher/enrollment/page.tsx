'use client'
/**
 * Teacher — Enrollment (2026-10b revision, item 2).
 * The enrollment section moved off the dashboard into its own menu entry.
 */
import EnrollmentPanel from '@/components/teacher/EnrollmentPanel'

export default function TeacherEnrollmentPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-[#1f2430]">Enrollment</h1>
        <p className="text-sm text-[#6B7280]">
          Enroll students from the Registrar&apos;s class list, or add them one at a time.
        </p>
      </div>
      <EnrollmentPanel />
    </div>
  )
}
