/**
 * Reading the Registrar's class list (panel revision, Nov 2026).
 *
 * The panel's own CSV "did not work". Real class lists differ from the one
 * shape the old parser accepted (header on line 1, commas, separate Last /
 * First columns), so this accepts what Registrars and Excel actually produce:
 *   - title rows above the header (school name, section, SY …)
 *   - comma, semicolon (Excel in some regions) or tab separators
 *   - headers like "SURNAME", "Given Name", "M.I.", "Last Name (Apelyido)"
 *   - ONE name column: "Santos, John Mark Cruz" or "John Mark Santos"
 *   - UTF-8 (with or without BOM), UTF-16 ("Unicode Text") and ANSI files
 * An .xlsx/.xls file gets a clear "save it as CSV" message instead.
 *
 * Pure and import-free so `node scripts/check-runs.mts` can test it.
 */

export type ClassListStudent = { lastName: string; firstName: string; middleName: string }
export type ClassListResult = { students: ClassListStudent[]; error?: string }

type Column = 'last' | 'first' | 'middle' | 'full'

const HEADER_SCAN_ROWS = 15
// Surname particles that belong to the last name: "Juan Dela Cruz"
const PARTICLES = new Set(['de', 'del', 'dela', 'delos', 'los', 'la', 'las', 'san', 'santa', 'sta', 'sta.', 'van', 'von', 'di', 'da', 'du'])

export const CLASS_LIST_TEMPLATE = 'Last Name,First Name,Middle Name\nSantos,John Mark,Cruz\nDela Cruz,Ana,Reyes\n'

/** Bytes → text, or a message the teacher can act on. */
export function decodeClassList(bytes: Uint8Array): { text?: string; error?: string } {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return { error: 'This is an Excel workbook (.xlsx). In Excel choose File → Save As → "CSV (Comma delimited) (*.csv)", then upload that file.' }
  }
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    return { error: 'This is an older Excel file (.xls). In Excel choose File → Save As → "CSV (Comma delimited) (*.csv)", then upload that file.' }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(bytes) }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { text: new TextDecoder('utf-16be').decode(bytes) }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  } catch {
    // Excel's "CSV" in Windows saves ANSI — keeps ñ and accented names readable
    return { text: new TextDecoder('windows-1252').decode(bytes) }
  }
}

function detectDelimiter(line: string): string {
  const count = (ch: string) => line.split(ch).length - 1
  return [',', ';', '\t'].reduce((best, ch) => (count(ch) > count(best) ? ch : best), ',')
}

/** One CSV line → cells; quotes may wrap a cell and "" is a literal quote. */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted
    } else if (ch === delimiter && !quoted) {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += ch
    }
  }
  cells.push(cell.trim())
  return cells
}

function classify(header: string): Column | null {
  const h = header.toLowerCase().replace(/[^a-z]/g, '')
  if (!h) return null
  // "Learner's Name (Last Name, First Name, Middle Name)" describes ONE column
  if (h.includes('last') && h.includes('first')) return 'full'
  if (h.includes('lastname') || h.includes('surname') || h.includes('familyname') || h.includes('apelyido') || h === 'last') return 'last'
  if (h.includes('firstname') || h.includes('givenname') || h === 'first' || h === 'given' || h === 'pangalan') return 'first'
  if (h.includes('middle') || h === 'mi') return 'middle'
  if (h.includes('name') && !/user|school|section|teacher|adviser|parent|guardian|mother|father/.test(h)) return 'full'
  return null
}

/** "Santos, John Mark C." / "SANTOS, JOHN, CRUZ" / "John Mark Dela Cruz". */
export function splitFullName(raw: string): ClassListStudent {
  const value = raw.replace(/\s+/g, ' ').trim()
  if (value.includes(',')) {
    const [last, ...rest] = value.split(',').map(part => part.trim())
    if (rest.length >= 2) return { lastName: last, firstName: rest[0], middleName: rest.slice(1).join(' ').trim() }
    const given = (rest[0] ?? '').split(' ').filter(Boolean)
    // a trailing initial is the middle name: "Santos, Maria Clara D."
    if (given.length > 1 && /^[A-Za-z]\.?$/.test(given[given.length - 1])) {
      return { lastName: last, firstName: given.slice(0, -1).join(' '), middleName: given[given.length - 1] }
    }
    return { lastName: last, firstName: given.join(' '), middleName: '' }
  }
  const parts = value.split(' ').filter(Boolean)
  if (parts.length <= 1) return { lastName: '', firstName: parts[0] ?? '', middleName: '' }
  let cut = parts.length - 1
  while (cut > 1 && PARTICLES.has(parts[cut - 1].toLowerCase())) cut--
  return { lastName: parts.slice(cut).join(' '), firstName: parts.slice(0, cut).join(' '), middleName: '' }
}

export function parseClassList(text: string): ClassListResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)

  // Find the header: the first row (of the first few) naming the name columns
  for (let row = 0; row < Math.min(lines.length, HEADER_SCAN_ROWS); row++) {
    if (!lines[row].trim()) continue
    const delimiter = detectDelimiter(lines[row])
    const columns = splitLine(lines[row], delimiter).map(classify)
    const at = (kind: Column) => columns.indexOf(kind)
    const hasSplit = at('last') >= 0 && at('first') >= 0
    if (!hasSplit && at('full') < 0) continue

    const students: ClassListStudent[] = []
    for (const line of lines.slice(row + 1)) {
      if (!line.trim()) continue
      const cells = splitLine(line, delimiter)
      const student = hasSplit
        ? { lastName: cells[at('last')] ?? '', firstName: cells[at('first')] ?? '', middleName: at('middle') >= 0 ? cells[at('middle')] ?? '' : '' }
        : splitFullName(cells[at('full')] ?? '')
      if (student.lastName || student.firstName) students.push(student)
    }
    return students.length
      ? { students }
      : { students, error: 'The class list has a header row but no student rows under it.' }
  }

  return {
    students: [],
    error: 'Could not find the name columns. The class list needs a "Last Name" and a "First Name" column (or one "Name" column written "Last, First Middle"). Download the template to see the format.',
  }
}
