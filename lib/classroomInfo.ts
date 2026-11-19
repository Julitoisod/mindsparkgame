/**
 * A teacher's Classroom (panel revision, Nov 2026b: "change Section to
 * Classroom — the teacher can update the classroom information"). One
 * classroom per teacher — e.g. "Grade 5 Mathematics", SY 2026-2027 — holding
 * their sections.
 *
 * The table creates itself on first use (CREATE TABLE IF NOT EXISTS), so a
 * deploy can never outrun a hand-applied migration — schema drift is this
 * project's #1 failure mode. database/schema.sql carries the same table.
 */
import { execute, query } from '@/lib/db'
import { currentSchoolYear } from '@/lib/enrollment'

export interface ClassroomInfo {
  name: string
  gradeLevel: string
  schoolYear: string
  isActive: boolean
}

export const GRADE_LEVELS = ['Grade 4', 'Grade 5', 'Grade 6'] as const
const SCHOOL_YEAR_PATTERN = /^(\d{4})-(\d{4})$/

export const defaultClassroom = (): ClassroomInfo => ({
  name: 'Grade 5 Mathematics',
  gradeLevel: 'Grade 5',
  schoolYear: currentSchoolYear(),
  isActive: true,
})

const TABLE_SQL = `CREATE TABLE IF NOT EXISTS teacher_classrooms (
  teacher_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(80)  NOT NULL,
  grade_level VARCHAR(20)  NOT NULL DEFAULT 'Grade 5',
  school_year VARCHAR(9)   DEFAULT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (teacher_id),
  CONSTRAINT fk_teacher_classrooms_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`

let ensured: Promise<void> | null = null
function ensureTable(): Promise<void> {
  ensured ??= execute(TABLE_SQL).then(() => undefined).catch(error => {
    ensured = null // retry on the next request
    throw error
  })
  return ensured
}

type Row = { teacherId: number; name: string; gradeLevel: string; schoolYear: string | null; isActive: number }

/** Classroom info per teacher id; teachers who never saved one get the default. */
export async function getClassroomInfo(teacherIds: readonly number[]): Promise<Map<number, ClassroomInfo>> {
  const result = new Map<number, ClassroomInfo>(teacherIds.map(id => [id, defaultClassroom()]))
  if (teacherIds.length === 0) return result
  await ensureTable()
  const rows = await query<Row>(
    `SELECT teacher_id AS teacherId, name, grade_level AS gradeLevel, school_year AS schoolYear, is_active AS isActive
       FROM teacher_classrooms WHERE teacher_id IN (${teacherIds.map(() => '?').join(',')})`,
    [...teacherIds],
  )
  for (const row of rows) {
    result.set(row.teacherId, {
      name: row.name,
      gradeLevel: row.gradeLevel,
      schoolYear: row.schoolYear ?? currentSchoolYear(),
      isActive: Boolean(row.isActive),
    })
  }
  return result
}

/** Validates an update; returns the cleaned info or a field → message map. */
export function validateClassroomInfo(body: Record<string, unknown>): { info: ClassroomInfo } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (name.length < 2 || name.length > 80) errors.name = 'Classroom name must be 2-80 characters.'

  const gradeLevel = typeof body.gradeLevel === 'string' ? body.gradeLevel : ''
  if (!(GRADE_LEVELS as readonly string[]).includes(gradeLevel)) errors.gradeLevel = 'Choose a grade level.'

  const schoolYear = typeof body.schoolYear === 'string' ? body.schoolYear.trim() : ''
  const sy = SCHOOL_YEAR_PATTERN.exec(schoolYear)
  if (!sy || Number(sy[2]) !== Number(sy[1]) + 1) errors.schoolYear = 'Academic year must look like 2026-2027.'

  if (typeof body.isActive !== 'boolean') errors.isActive = 'Status must be active or inactive.'

  if (Object.keys(errors).length) return { errors }
  return { info: { name, gradeLevel, schoolYear, isActive: body.isActive as boolean } }
}

export async function saveClassroomInfo(teacherId: number, info: ClassroomInfo): Promise<void> {
  await ensureTable()
  await execute(
    `INSERT INTO teacher_classrooms (teacher_id, name, grade_level, school_year, is_active)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), grade_level = VALUES(grade_level),
       school_year = VALUES(school_year), is_active = VALUES(is_active)`,
    [teacherId, info.name, info.gradeLevel, info.schoolYear, info.isActive ? 1 : 0],
  )
}
