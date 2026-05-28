# Teacher Dashboard Redesign Plan

## Overview
Redesign the teacher dashboard from a single monolithic page to a multi-page layout with a sidebar navigation (hamburger menu on mobile), matching the reference images provided by the adviser.

## Current State
- Single page: `app/teacher/students/page.tsx` (~500+ lines)
- No layout file for teacher section
- No sidebar navigation
- Everything crammed into one page (classrooms, enrollment, student list, progress)

## Target Design (from reference images)
- **Sidebar** with hamburger toggle (dark green/purple theme)
- **Multiple pages**: Dashboard, Classrooms, Students, Reports
- **Stats cards** at the top of each page
- **Data tables** with search, filters, pagination
- **Charts/graphs** for reports
- **Professional look** with proper spacing and hierarchy

---

## New File Structure

```
app/teacher/
├── layout.tsx              ← NEW: Shared sidebar layout
├── dashboard/
│   └── page.tsx            ← NEW: Overview (stats, quick actions, create classroom, enroll)
├── students/
│   └── page.tsx            ← REWRITE: Student list table with search/filters
├── classrooms/
│   └── page.tsx            ← NEW: Classroom management
└── reports/
    └── page.tsx            ← NEW: Performance reports & intervention
```

---

## Page Breakdown

### 1. Teacher Layout (`app/teacher/layout.tsx`)
- Sidebar with navigation links (icons + labels)
- Hamburger menu toggle on mobile
- Top header with teacher name + sign out
- Nav items: Dashboard, Classrooms, Students, Reports
- Purple/dark theme matching student side

### 2. Dashboard Page (`app/teacher/dashboard/page.tsx`)
- **Stats cards**: Total Classrooms, Total Students, Active Students, Performance Overview
- **Quick Actions**: Create Classroom form, Enroll Student form
- **Recent Activity**: Latest enrollments, recent quiz completions
- Welcome message with teacher name

### 3. Students Page (`app/teacher/students/page.tsx`)
- **Search bar** (by name, email)
- **Filter dropdowns**: All Classrooms, All Status, Performance
- **Stats row**: Total Students, Active, By Performance
- **Student table**: Name, Email, Classroom, Status, Performance (color dot), Stars, Level, Actions
- **Actions per student**: View details, change password, unlock levels, notify parent
- **Pagination** (10 per page)

### 4. Classrooms Page (`app/teacher/classrooms/page.tsx`)
- **Create Classroom** button/form
- **Classroom cards/list**: Name, student count, created date
- **Edit/rename** classroom inline
- **View students** in classroom (link to filtered students page)

### 5. Reports Page (`app/teacher/reports/page.tsx`)
- **Quiz Completion Rate** (% of students who completed each level)
- **Boss Battle Success Rate**
- **Performance Distribution** (pie chart: green/yellow/red/none)
- **Student Performance Table**: Name, Classroom, Quiz %, Boss %, Overall Status, Intervention needed
- **Key Insights** summary text

---

## Implementation Order

1. ✅ Create `app/teacher/layout.tsx` (sidebar + header)
2. ✅ Create `app/teacher/dashboard/page.tsx` (overview with stats + quick actions)
3. ✅ Rewrite `app/teacher/students/page.tsx` (table with search/filters)
4. ✅ Create `app/teacher/classrooms/page.tsx` (classroom management)
5. ✅ Create `app/teacher/reports/page.tsx` (performance reports)

---

## Design Tokens (matching student side)
- **Background**: `bg-gradient-to-br from-[#1a1233] via-[#3b2a73] to-[#6b21a8]`
- **Sidebar**: Dark purple gradient
- **Cards**: `bg-purple-950/40 backdrop-blur-md border border-purple-400/25`
- **Active nav**: `bg-gradient-to-r from-pink-500 to-purple-500`
- **Text**: White primary, `text-purple-200` secondary
- **Accent colors**: Pink, cyan, yellow, orange (for stats cards)
- **Tables**: Dark rows with purple borders

---

## API Routes (existing — no changes needed)
- `GET/POST /api/teacher/classrooms`
- `PATCH /api/teacher/classrooms`
- `GET/POST /api/teacher/students`
- `PATCH /api/teacher/students/[id]`
- `POST/DELETE /api/teacher/students/[id]/unlock-level`
- `POST /api/teacher/students/[id]/notify-parent`

---

## Status
- [x] Layout with sidebar
- [x] Dashboard page
- [ ] Students page (rewrite)
- [x] Classrooms page
- [x] Reports page
