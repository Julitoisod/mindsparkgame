# How to Run MindSpark Game

A step-by-step guide to get the MindSpark Game running on your local machine.

---

## Prerequisites

| Tool | Version (tested) | Notes |
|------|-------------------|-------|
| **Node.js** | v18+ (tested on v24.13) | [Download](https://nodejs.org/) |
| **npm** | v9+ (comes with Node) | |
| **XAMPP** | Any recent version | Provides MySQL + Apache |
| **MySQL** | 8.x (via XAMPP) | Must be running before starting the app |

---

## 1. Clone the Repository

```bash
git clone <repo-url> C:\xampp\htdocs\Mindsparkgame
cd C:\xampp\htdocs\Mindsparkgame
```

---

## 2. Install Dependencies

```bash
npm install
```

> The project uses `legacy-peer-deps=true` (configured in `.npmrc`), so peer dependency conflicts are handled automatically.

---

## 3. Set Up Environment Variables

Copy the example file and adjust if needed:

```bash
copy .env.example .env.local
```

Default values for local development (no password needed for XAMPP MySQL):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=mindsparkgame

JWT_SECRET=mindsparkgame_dev_secret_replace_in_prod
JWT_EXPIRES_IN=7d
COOKIE_SECRET=mindsparkgame_cookie_secret_replace_in_prod

NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 4. Start MySQL (via XAMPP)

1. Open **XAMPP Control Panel**
2. Click **Start** next to **MySQL**
3. Verify it shows a green "Running" status

---

## 5. Create the Database

Choose one of these methods:

### Option A: phpMyAdmin (GUI)

1. Open http://localhost/phpmyadmin
2. Click **Import** tab
3. Choose file: `database/schema.sql`
4. Click **Go**

### Option B: Command Line

```bash
C:\xampp\mysql\bin\mysql.exe -u root < database/schema.sql
```

This creates the `mindsparkgame` database with all required tables and seed data (starter items).

---

## 6. Run the Development Server

```bash
npm run dev
```

The app starts at: **http://localhost:3000**

> The dev script allocates 4 GB of memory (`--max-old-space-size=4096`) to handle the 3D assets and large bundle.

---

## 7. Access the App

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Landing page |
| http://localhost:3000/register | Create a new account |
| http://localhost:3000/login | Log in |
| http://localhost:3000/dashboard | Student dashboard (after login) |
| http://localhost:3000/game | Game view |
| http://localhost:3000/character-select | Character selection |
| http://localhost:3000/teacher/students | Teacher panel (teacher role) |

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (hot reload) |
| `npm run build` | Create production build |
| `npm run start` | Start production server (run `build` first) |
| `npm run lint` | Run ESLint |

---

## Production Build

```bash
npm run build
npm run start
```

The production server runs at http://localhost:3000 by default.

---

## Android Build (Capacitor)

The project includes a Capacitor setup for Android:

```bash
npx cap sync android
npx cap open android
```

> **Note:** The Capacitor config (`capacitor.config.js`) points the dev server to `http://192.168.1.4:3000`. Update this IP to your machine's local network IP if testing on a physical device.

---

## Database Tables Overview

| Table | Purpose |
|-------|---------|
| `users` | Player/teacher accounts |
| `classrooms` | Teacher-managed classrooms |
| `character_data` | Character stats, position, class |
| `student_wallets` | Star currency balance |
| `character_unlocks` | Which classes a player has unlocked |
| `items` | Master item catalogue |
| `inventory` | Player-owned items |
| `game_progress` | Save data (zone, quests, playtime) |

---

## Troubleshooting

### "Can't connect to MySQL"
- Make sure MySQL is running in XAMPP Control Panel
- Verify `DB_PASSWORD` in `.env.local` matches your MySQL root password (empty by default in XAMPP)

### Port 3000 already in use
- Kill the process using port 3000, or set a different port:
  ```bash
  set PORT=3001 && npm run dev
  ```

  npm run dev
  ngrok.exe http 3000

### "Module not found" errors
- Delete `node_modules` and reinstall:
  ```bash
  rmdir /s /q node_modules
  del package-lock.json
  npm install
  ```

### Build runs out of memory
- The scripts already set `--max-old-space-size=4096`. If you still hit limits, increase it in `package.json` or set:
  ```bash
  set NODE_OPTIONS=--max-old-space-size=8192
  npm run build
  ```

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **3D:** React Three Fiber + Drei
- **Animation:** Framer Motion
- **Database:** MySQL 8 (via mysql2)
- **Auth:** JWT + HTTP-only cookies (bcryptjs)
- **Mobile:** Capacitor (Android)
- **PWA:** next-pwa
