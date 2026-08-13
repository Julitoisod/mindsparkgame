/**
 * Account-generation rules for Registrar CSV enrolment (panel revision, Aug 2026).
 *
 * The teacher never types a username or password: MindSpark derives both from
 * the official class list so the same file always produces the same accounts.
 *   Username: first initial + last name, lowercased and stripped to [a-z0-9]
 *             (e.g. "Santos, John Mark" -> "jsantos"); a numeric suffix is
 *             appended on collision ("jsantos2", "jsantos3", ...).
 *   Password: username + "123".
 */

const MIN_USERNAME_LENGTH = 3

const sanitize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

/** "Last, First Middle" -> the single display name stored in `full_name`. */
export function composeFullName(first: string, middle: string, last: string): string | null {
  return [first, middle, last].map(part => part.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ') || null
}

/** The default password for a generated account. */
export function defaultPasswordFor(username: string): string {
  return `${username}123`
}

/**
 * Builds a unique username. `taken` holds every username already claimed —
 * both the ones in the database and the ones generated earlier in this batch —
 * and is mutated so repeated calls stay unique within one upload.
 */
export function generateUsername(firstName: string, lastName: string, taken: Set<string>): string {
  const first = sanitize(firstName)
  const last = sanitize(lastName)

  let base = last ? `${first.slice(0, 1)}${last}` : first
  if (base.length < MIN_USERNAME_LENGTH) base = `${base}${sanitize(firstName).slice(1)}` || 'student'
  if (base.length < MIN_USERNAME_LENGTH) base = base.padEnd(MIN_USERNAME_LENGTH, '0')
  base = base.slice(0, 28)

  let candidate = base
  let suffix = 1
  while (taken.has(candidate)) {
    suffix += 1
    candidate = `${base}${suffix}`
  }
  taken.add(candidate)
  return candidate
}

/** The school year a date falls in — Philippine SY runs June to March. */
export function currentSchoolYear(now: Date = new Date()): string {
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
  return `${start}-${start + 1}`
}

/** "2026-2027" as the panel wants it printed on a section card. */
export function formatSchoolYear(schoolYear: string | null | undefined): string {
  return schoolYear ? `SY ${schoolYear.replace('-', '–')}` : ''
}
