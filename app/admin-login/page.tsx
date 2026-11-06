/**
 * Admins and teachers now share one sign-in page (panel revision, Nov 2026);
 * the role decides the dashboard. Old /admin-login links land there.
 */
import { redirect } from 'next/navigation'

export default function AdminLoginRedirect() {
  redirect('/teacher-login')
}
