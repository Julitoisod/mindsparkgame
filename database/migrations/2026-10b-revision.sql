-- ============================================================
--  MindSpark Math — 2026-10 (B) Evaluator Revisions
--  Source: research-and-system-revised.docx
--  1) Admin role that manages teacher accounts (item 1).
--     - users.role gains 'admin'
--     - users.is_active lets an admin deactivate a teacher without deleting
--       their sections, students or questions (all FK to this row).
--  Apply AFTER 2026-10-revision.sql. Safe to re-run.
-- ============================================================

ALTER TABLE users
  MODIFY COLUMN role ENUM('admin','teacher','student') NOT NULL DEFAULT 'student';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER enrollment_status;

-- First administrator. Password: Admin@12345 — change it after the first login.
-- INSERT IGNORE keeps this re-runnable and never clobbers a changed password.
INSERT IGNORE INTO users (username, full_name, email, password_hash, role, enrollment_status, is_active)
VALUES (
  'admin',
  'System Administrator',
  'admin@mindspark.local',
  '$2a$12$BXawYrttE709pvxXRZF06OxkRtVOj1G6SDhPvA98gcL4n19.WZqIG',
  'admin',
  'enrolled',
  1
);
