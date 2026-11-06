'use client'
/** Admin Profile — account information and password settings (Nov 2026). */
import { UserRound } from 'lucide-react'
import PageHeader from '@/components/teacher/PageHeader'
import AccountSettings from '@/components/account/AccountSettings'

export default function AdminProfilePage() {
  return (
    <div className="space-y-5">
      <PageHeader icon={UserRound} title="Admin Profile" subtitle="Account information and password settings." />
      <AccountSettings roleLabel="Administrator" />
    </div>
  )
}
