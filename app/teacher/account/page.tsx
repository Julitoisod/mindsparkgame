'use client'
/** Teacher — My Profile / Edit Account Information / Change Password (Nov 2026). */
import { UserRound } from 'lucide-react'
import PageHeader from '@/components/teacher/PageHeader'
import AccountSettings from '@/components/account/AccountSettings'

export default function TeacherAccountPage() {
  return (
    <div className="space-y-5">
      <PageHeader icon={UserRound} title="My Account" subtitle="Your profile, account information and password." />
      <AccountSettings roleLabel="Teacher Account" />
    </div>
  )
}
