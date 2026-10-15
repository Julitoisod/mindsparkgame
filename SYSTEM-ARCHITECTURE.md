# MindSpark Math — System Architecture & ERD

Written for: the panel / app-dev reviewers checking the system (2026-10 revision, CONCERN 1–3).

The database file itself is `database/schema.sql` (full schema, safe to import into a
fresh MySQL/MariaDB database). `database/seed-questions.sql` loads the 72 Grade 5
questions. Migrations applied on top of an existing database live in
`database/migrations/` and are applied in filename order.

---

## 1. Technology stack

| Layer | What is used | Version |
|---|---|---|
| Web framework | **Next.js (App Router)** — React, server components + API routes | 15.5 |
| Language | **TypeScript** (strict) | 5.9 |
| UI library | **React** | 19 |
| Styling | **Tailwind CSS** (+ PostCSS, Autoprefixer) | 3.4 |
| Animation | **Framer Motion** | 11 |
| Icons | **lucide-react** | 0.46 |
| Toasts | **react-hot-toast** | 2.4 |
| 3D / canvas effects | **three**, **@react-three/fiber**, **@react-three/drei** | 0.169 / 9 / 10 |
| Database | **MySQL / MariaDB** (XAMPP locally, Hostinger in production) | 10.4+ |
| DB driver | **mysql2** (promise API, parameterised queries only) | 3.11 |
| Auth | **jsonwebtoken** (JWT in an http-only cookie) + **bcryptjs** (password hashing) | 9 / 2.4 |
| Mail | **nodemailer** | 8 |
| Mobile app | **Capacitor (Android)** — native shell loading the live web build | 8.3 |
| PWA | **next-pwa** | 5.6 |
| Linting | **ESLint** with `eslint-config-next` | 9 |

**Per surface**

1. **Web dashboard for the teacher (desktop view)** — Next.js (React) with TypeScript,
   Tailwind CSS, and Framer Motion.
2. **Student game (mobile / Android app)** — the same Next.js build, wrapped by
   Capacitor; the APK loads the live site, so web changes need no new APK.
3. **Backend** — Next.js API routes (`app/api/**`) talking to MySQL through mysql2.
4. **Database** — MySQL/MariaDB, schema in `database/schema.sql`.

**Run it locally**

```bash
npm install
# create the database, then:
mysql -u root mindsparkgame < database/schema.sql
mysql -u root mindsparkgame < database/seed-questions.sql
cp .env.example .env.local      # DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET
npm run dev                      # http://localhost:3000
```

---

## 2. Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ classrooms : "teaches"
    users ||--o| character_data : "has avatar"
    users ||--o| student_wallets : "has stars"
    users ||--o{ character_unlocks : "unlocked classes"
    users ||--o{ inventory : "owns"
    users ||--o| game_progress : "progress"
    users ||--o{ student_badges : "earned"
    users ||--o{ quiz_attempts : "answers"
    users ||--o{ teacher_level_unlocks : "unlocked for"
    users ||--o{ level_deadlines : "deadlines"
    users ||--o{ quiz_questions : "authored"
    classrooms ||--o{ users : "enrolls students"
    character_data ||--o{ inventory : "equipped"
    character_data ||--o{ quiz_attempts : "played by"
    character_data ||--o| game_progress : "tracks"
    items ||--o{ inventory : "stocked as"

    users {
        int id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar initial_password "readable copy for the teacher"
        varchar full_name
        varchar last_name
        varchar first_name
        varchar middle_name
        enum role "student | teacher"
        enum enrollment_status
        int enrolled_by FK "teacher"
        int classroom_id FK
        datetime enrolled_at
        datetime created_at
    }
    classrooms {
        int id PK
        int teacher_id FK
        varchar name
        varchar school_year
        datetime created_at
    }
    character_data {
        int id PK
        int user_id FK
        varchar name
        enum class "warrior | mage | rogue | archer"
        smallint hp
        smallint max_hp
        smallint attack
        smallint defense
        smallint speed
        smallint level
        int experience
    }
    student_wallets {
        int user_id PK_FK
        int stars
        datetime created_at
        datetime updated_at
    }
    character_unlocks {
        int user_id PK_FK
        enum class PK "warrior | mage | rogue | archer"
        int cost_stars
        datetime unlocked_at
    }
    items {
        int id PK
        varchar name
        text description
        enum type "weapon | armor | consumable | accessory | quest"
        enum rarity "common .. legendary"
        smallint stat_hp
        smallint stat_attack
        smallint stat_defense
        smallint stat_speed
        int value
    }
    inventory {
        int id PK
        int user_id FK
        int character_id FK
        int item_id FK
        int quantity
        tinyint equipped
    }
    game_progress {
        int id PK
        int user_id FK
        int character_id FK
        varchar current_zone
        text completed_levels "JSON array"
        text level_stars "JSON"
        text quest_flags "JSON"
        int playtime_seconds
        datetime last_saved
    }
    student_badges {
        int id PK
        int user_id FK
        varchar badge_id
        datetime earned_at
    }
    teacher_level_unlocks {
        int id PK
        int student_id FK
        tinyint level_number
        int unlocked_by FK "teacher"
        datetime created_at
    }
    quiz_questions {
        int id PK
        tinyint level_number
        enum phase "normal | boss"
        varchar category
        text prompt
        text options "JSON array"
        tinyint correct_index
        tinyint is_active
        int created_by FK "NULL = system seed"
    }
    quiz_attempts {
        int id PK
        int user_id FK
        int character_id FK
        tinyint level_number
        enum phase
        varchar question_id
        varchar selected_answer
        tinyint is_correct
        int hearts_remaining
        int score_earned
        datetime attempted_at
    }
    level_deadlines {
        int id PK
        int student_id FK
        tinyint level_number
        datetime due_at
        int set_by FK "teacher"
    }
```

### How to read it

- **users** holds both roles. A student row carries `enrolled_by` (their teacher) and
  `classroom_id` (their section); a teacher row owns rows in **classrooms**.
- **quiz_questions** is the question bank. `created_by IS NULL` marks the 72 system
  questions loaded from `seed-questions.sql`; a teacher's own questions carry their id,
  which is why re-seeding never deletes a teacher's work.
- **quiz_attempts** records every answer, and the teacher reports and badges are both
  computed from it.
- **teacher_level_unlocks** is how a teacher opens Level 1; levels 2–5 open by progress.
- **game_progress.completed_levels** is a JSON array of cleared level numbers.

---

## 3. Request flow (how a quiz runs)

1. Student signs in at `/login` → `POST /api/auth/login` → JWT set in an http-only cookie.
2. First login goes to `/character-select`, then `/dashboard` and `/game`.
3. Opening a level calls `GET /api/quiz?level=N`, which samples **5 normal + 5 boss**
   questions from the active pool — one per category, with the order and the answer
   options shuffled on every request, so the set is never memorisable.
4. Every answer posts to `POST /api/attempts` (recording the attempt, the stars and any
   badge earned); finishing a level posts to `POST /api/progress`.
5. The teacher reads the same tables through `/api/teacher/**` for the dashboard,
   the student list, the question bank and the reports.
