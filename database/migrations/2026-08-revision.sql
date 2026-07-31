-- ============================================================
--  MindSpark Game — 2026-08 Panel Revision
--  1) Split student name into last/first/middle (Registrar CSV format).
--     `full_name` is kept and auto-composed on enrolment so every existing
--     reader (students list, reports, profile) keeps working unchanged.
--  Apply AFTER 2026-06-revision.sql. Safe to re-run (IF NOT EXISTS).
--  (Question-bank expansion to 50+50/level is loaded by seed-questions.sql.)
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_name   VARCHAR(60) DEFAULT NULL AFTER full_name,
  ADD COLUMN IF NOT EXISTS first_name  VARCHAR(60) DEFAULT NULL AFTER last_name,
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(60) DEFAULT NULL AFTER first_name;
