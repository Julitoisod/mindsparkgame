/**
 * Teachers can no longer sign themselves up (panel revision, Nov 2026) — the
 * administrator creates their accounts. Harness scripts therefore create their
 * throwaway teacher through the admin API.
 *
 * ADMIN_USER / ADMIN_PASS override the local default admin account.
 */
export async function createTeacher(base, { username, email, password }) {
  const admin = {
    identifier: process.env.ADMIN_USER ?? 'admin',
    password: process.env.ADMIN_PASS ?? 'Admin@12345',
  }
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(admin),
  })
  const cookie = login.headers.get('set-cookie')?.split(';')[0]
  if (!login.ok || !cookie) throw new Error(`admin login failed (${login.status}) — set ADMIN_USER / ADMIN_PASS`)

  const res = await fetch(`${base}/api/admin/teachers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ username, email, password, fullName: username }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.status !== 201) throw new Error(`could not create teacher ${username}: ${json.message ?? res.status}`)
  return json.data
}
