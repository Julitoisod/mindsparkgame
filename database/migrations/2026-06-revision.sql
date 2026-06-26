-- ============================================================
--  MindSpark Game — 2026-06 Revision Migration
--  Additive only. Run once on an existing database.
--
--  Usage (XAMPP):
--    mysql -u root -p mindsparkgame < database/migrations/2026-06-revision.sql
--  or import via phpMyAdmin.
--
--  Covers:
--    P1.1  users.full_name column
--    P1.1  quiz_questions table (teacher-authored question bank)
--    P1.2  seed of quiz_questions handled by scripts/seed-questions.ts
--    P3.2  level_deadlines table (per-student per-level due dates)
-- ============================================================

-- Runs against the database selected in phpMyAdmin (no USE needed — DB names
-- differ per host, e.g. mindsparkgame locally vs u574655838_mindspark on Hostinger).

-- ── Full name for students (CSV: Full Name + Username) ────────────────────────
-- NOTE: MySQL 8 has no "ADD COLUMN IF NOT EXISTS"; this is a one-time migration.
ALTER TABLE users
  ADD COLUMN full_name VARCHAR(120) DEFAULT NULL AFTER username;

-- ── Question Bank (DB-backed quiz content) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_questions (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  level_number  TINYINT      NOT NULL,
  phase         ENUM('normal','boss') NOT NULL DEFAULT 'normal',
  category      VARCHAR(40)  NOT NULL DEFAULT 'general',
  prompt        TEXT         NOT NULL,
  options       TEXT         NOT NULL  COMMENT 'JSON array of option strings',
  correct_index TINYINT      NOT NULL DEFAULT 0,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_by    INT UNSIGNED DEFAULT NULL  COMMENT 'teacher user id; NULL = seeded',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_qq_level_phase_active (level_number, phase, is_active),
  KEY idx_qq_category (category),
  KEY idx_qq_created_by (created_by),
  CONSTRAINT fk_qq_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Per-Level Deadlines (teacher sets a due date per student per level) ────────
CREATE TABLE IF NOT EXISTS level_deadlines (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id   INT UNSIGNED NOT NULL,
  level_number TINYINT      NOT NULL,
  due_at       DATETIME     NOT NULL,
  set_by       INT UNSIGNED NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_deadline_student_level (student_id, level_number),
  KEY idx_deadline_student (student_id),
  CONSTRAINT fk_deadline_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_deadline_teacher FOREIGN KEY (set_by)     REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
