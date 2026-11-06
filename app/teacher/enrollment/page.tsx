'use client'
/**
 * Teacher — Enrollment (2026-10b revision, item 2).
 * The enrollment section moved off the dashboard into its own menu entry; the
 * banner matches every other teacher page (Nov 2026).
 */
import { UserPlus } from 'lucide-react'
import PageHeader from '@/components/teacher/PageHeader'
import EnrollmentPanel from '@/components/teacher/EnrollmentPanel'

export default function TeacherEnrollmentPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        icon={UserPlus}
        title="Enrollment"
        subtitle="Enroll students from the Registrar's class list, or add them one at a time."
      />
      <EnrollmentPanel />
    </div>
  )
}
