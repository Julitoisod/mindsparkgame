-- ============================================================
--  MindSpark Game — MySQL Database Schema (Hostinger Compatible)
--  Import this into phpMyAdmin on Hostinger shared hosting.
--  Select your database first, then Import this file.
-- ============================================================

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  username      VARCHAR(32)      NOT NULL,
  full_name     VARCHAR(120)     DEFAULT NULL,
  email         VARCHAR(255)     NOT NULL,
  password_hash VARCHAR(255)     NOT NULL,
  role          ENUM('teacher','student') NOT NULL DEFAULT 'student',
  enrollment_status ENUM('pending','enrolled','disabled') NOT NULL DEFAULT 'enrolled',
  enrolled_by   INT UNSIGNED     DEFAULT NULL,
  classroom_id  INT UNSIGNED     DEFAULT NULL,
  enrolled_at   DATETIME         DEFAULT NULL,
  avatar_url    VARCHAR(512)     DEFAULT NULL,
  created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email    (email),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_role_status (role, enrollment_status),
  KEY idx_users_enrolled_by (enrolled_by),
  KEY idx_users_classroom_id (classroom_id),
  CONSTRAINT fk_users_enrolled_by FOREIGN KEY (enrolled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Classrooms ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classrooms (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(80)  NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_classrooms_teacher_name (teacher_id, name),
  KEY idx_classrooms_teacher (teacher_id),
  CONSTRAINT fk_classrooms_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE users
  ADD CONSTRAINT fk_users_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL;

-- ── Character Data ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS character_data (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             INT UNSIGNED NOT NULL,
  name                VARCHAR(64)  NOT NULL DEFAULT 'Hero',
  class               ENUM('warrior','mage','rogue','archer') NOT NULL DEFAULT 'warrior',

  hp                  SMALLINT     NOT NULL DEFAULT 100,
  max_hp              SMALLINT     NOT NULL DEFAULT 100,
  mp                  SMALLINT     NOT NULL DEFAULT 50,
  max_mp              SMALLINT     NOT NULL DEFAULT 50,
  attack              SMALLINT     NOT NULL DEFAULT 10,
  defense             SMALLINT     NOT NULL DEFAULT 5,
  speed               SMALLINT     NOT NULL DEFAULT 5,
  level               SMALLINT     NOT NULL DEFAULT 1,
  experience          INT          NOT NULL DEFAULT 0,
  experience_to_next  INT          NOT NULL DEFAULT 100,

  position_x          FLOAT        NOT NULL DEFAULT 0,
  position_y          FLOAT        NOT NULL DEFAULT 0,
  position_z          FLOAT        NOT NULL DEFAULT 0,
  direction           ENUM('left','right') NOT NULL DEFAULT 'right',
  animation_state     VARCHAR(16)  NOT NULL DEFAULT 'idle',

  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_char_user (user_id),
  CONSTRAINT fk_char_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Student Wallets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_wallets (
  user_id     INT UNSIGNED NOT NULL,
  stars       INT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id),
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Character Unlocks ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS character_unlocks (
  user_id     INT UNSIGNED NOT NULL,
  class       ENUM('warrior','mage','rogue','archer') NOT NULL,
  cost_stars  INT UNSIGNED NOT NULL DEFAULT 0,
  unlocked_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, class),
  CONSTRAINT fk_character_unlock_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Items (master catalogue) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(64)  NOT NULL,
  description  TEXT,
  type         ENUM('weapon','armor','consumable','accessory','quest') NOT NULL DEFAULT 'consumable',
  rarity       ENUM('common','uncommon','rare','epic','legendary')     NOT NULL DEFAULT 'common',
  icon         VARCHAR(64)  NOT NULL DEFAULT 'package',

  stat_hp      SMALLINT     DEFAULT NULL,
  stat_mp      SMALLINT     DEFAULT NULL,
  stat_attack  SMALLINT     DEFAULT NULL,
  stat_defense SMALLINT     DEFAULT NULL,
  stat_speed   SMALLINT     DEFAULT NULL,
  value        INT          NOT NULL DEFAULT 0,

  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Inventory ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  character_id INT UNSIGNED NOT NULL,
  item_id      INT UNSIGNED NOT NULL,
  quantity     SMALLINT     NOT NULL DEFAULT 1,
  slot_index   TINYINT      NOT NULL DEFAULT 0,
  equipped     TINYINT(1)   NOT NULL DEFAULT 0,

  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_inv_char_slot (character_id, slot_index),
  KEY idx_inv_char   (character_id),
  KEY idx_inv_user   (user_id),
  CONSTRAINT fk_inv_user  FOREIGN KEY (user_id)      REFERENCES users(id)          ON DELETE CASCADE,
  CONSTRAINT fk_inv_char  FOREIGN KEY (character_id) REFERENCES character_data(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_item  FOREIGN KEY (item_id)      REFERENCES items(id)          ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Game Progress ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_progress (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  character_id     INT UNSIGNED NOT NULL,
  current_zone     VARCHAR(64)  NOT NULL DEFAULT 'zone_1',
  quest_flags      TEXT         DEFAULT NULL,
  completed_levels TEXT         DEFAULT NULL,
  level_stars      TEXT         DEFAULT NULL,
  playtime_seconds INT          NOT NULL DEFAULT 0,
  last_saved       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_progress_char (character_id),
  KEY idx_prog_user (user_id),
  CONSTRAINT fk_prog_user FOREIGN KEY (user_id)      REFERENCES users(id)          ON DELETE CASCADE,
  CONSTRAINT fk_prog_char FOREIGN KEY (character_id) REFERENCES character_data(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Seed Data: Starter Items ──────────────────────────────────────────────────
INSERT IGNORE INTO items (id, name, description, type, rarity, icon, stat_attack, stat_defense, stat_speed, value) VALUES
  (1, 'Iron Sword',      'A dependable starting blade.',         'weapon',     'common',    'sword',    5,  NULL, NULL, 50),
  (2, 'Leather Armor',   'Basic protection for new adventurers.','armor',      'common',    'shield',   NULL, 3,  NULL, 40),
  (3, 'Health Potion',   'Restores 30 HP.',                      'consumable', 'common',    'beaker',   NULL, NULL, NULL, 15),
  (4, 'Silver Dagger',   'Fast lightweight blade.',              'weapon',     'uncommon',  'sword',    8,  NULL, 2,   120),
  (5, 'Chain Mail',      'Solid mid-tier armour.',               'armor',      'uncommon',  'shield',   NULL, 6,  NULL, 180),
  (6, 'Elixir of Speed', 'Permanently boosts speed by 3.',       'consumable', 'rare',      'zap',      NULL, NULL, 3,  250),
  (7, 'Mythril Ring',    'Grants +10 MP.',                       'accessory',  'rare',      'gem',      NULL, NULL, NULL, 300),
  (8, 'Dragon Sword',    'A legendary blade of immense power.',  'weapon',     'legendary', 'sword',    25, NULL, 5,   1500);

-- ── Student Badges ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_badges (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  badge_id   VARCHAR(32)  NOT NULL,
  earned_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_user_badge (user_id, badge_id),
  CONSTRAINT fk_badge_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Teacher Level Unlocks ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_level_unlocks (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id   INT UNSIGNED NOT NULL,
  level_number TINYINT      NOT NULL,
  unlocked_by  INT UNSIGNED NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_student_level (student_id, level_number),
  CONSTRAINT fk_tlu_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tlu_teacher FOREIGN KEY (unlocked_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Quiz Attempts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  character_id     INT UNSIGNED NOT NULL,
  level_number     TINYINT      NOT NULL,
  phase            ENUM('normal','boss') NOT NULL,
  question_id      VARCHAR(64)  NOT NULL,
  selected_answer  VARCHAR(255) NOT NULL,
  is_correct       TINYINT(1)   NOT NULL DEFAULT 0,
  hearts_remaining TINYINT      NOT NULL DEFAULT 5,
  score_earned     INT          NOT NULL DEFAULT 0,
  attempted_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_attempts_user (user_id),
  KEY idx_attempts_char_level (character_id, level_number),
  CONSTRAINT fk_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_attempts_char FOREIGN KEY (character_id) REFERENCES character_data(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Question Bank (DB-backed quiz content, teacher-authored) ───────────────────
CREATE TABLE IF NOT EXISTS quiz_questions (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  level_number  TINYINT      NOT NULL,
  phase         ENUM('normal','boss') NOT NULL DEFAULT 'normal',
  category      VARCHAR(40)  NOT NULL DEFAULT 'general',
  prompt        TEXT         NOT NULL,
  options       TEXT         NOT NULL,
  correct_index TINYINT      NOT NULL DEFAULT 0,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_by    INT UNSIGNED DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_qq_level_phase_active (level_number, phase, is_active),
  KEY idx_qq_category (category),
  KEY idx_qq_created_by (created_by),
  CONSTRAINT fk_qq_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Per-Level Deadlines ───────────────────────────────────────────────────────
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
