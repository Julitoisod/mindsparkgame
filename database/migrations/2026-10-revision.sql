-- ============================================================
--  MindSpark Game — 2026-10 Panel Revision (REVISION1.pdf)
--  Item 6: the teacher must be able to SEE the password handed to a student,
--  so they have a copy when the student forgets it. password_hash cannot be
--  read back, so the enrollment password is kept beside it in plain text.
--  Only the enrolling teacher's own students are ever returned by the API.
--  Apply AFTER 2026-08b-revision.sql. Safe to re-run (IF NOT EXISTS).
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS initial_password VARCHAR(100) DEFAULT NULL AFTER password_hash;
