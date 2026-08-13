-- ============================================================
--  MindSpark Game — 2026-08 (B) Panel Revision
--  Source: SYSTEM-REVISED-MINDSPARK.docx
--  1) Sections carry a School Year (e.g. "2026-2027").
--     Section cards read: "Grade 3 - Gals / 36 Students / SY 2026-2027".
--     The unique key moves to (teacher, name, school_year) so the same
--     section name can be reused in a new school year.
--  Apply AFTER 2026-08-revision.sql. Safe to re-run (IF NOT EXISTS).
-- ============================================================

ALTER TABLE classrooms
  ADD COLUMN IF NOT EXISTS school_year VARCHAR(9) DEFAULT NULL AFTER name;

-- Backfill existing sections from their creation date: a school year that
-- starts in June runs <year>-<year+1>.
UPDATE classrooms
   SET school_year = CONCAT(
         CASE WHEN MONTH(created_at) >= 6 THEN YEAR(created_at) ELSE YEAR(created_at) - 1 END,
         '-',
         CASE WHEN MONTH(created_at) >= 6 THEN YEAR(created_at) + 1 ELSE YEAR(created_at) END)
 WHERE school_year IS NULL;

ALTER TABLE classrooms DROP INDEX uq_classrooms_teacher_name;
ALTER TABLE classrooms
  ADD UNIQUE KEY uq_classrooms_teacher_name_sy (teacher_id, name, school_year);
