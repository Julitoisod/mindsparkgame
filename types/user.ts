// ─── User Types ───────────────────────────────────────────────────────────────

export type UserRole = 'teacher' | 'student'
export type EnrollmentStatus = 'pending' | 'enrolled' | 'disabled'

export interface User {
  id: number
  username: string
  email: string
  password_hash?: string // never expose on frontend
  role: UserRole
  enrollment_status: EnrollmentStatus
  enrolled_by: number | null
  classroom_id: number | null
  enrolled_at: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface PublicUser {
  id: number
  username: string
  email: string
  role: UserRole
  enrollmentStatus: EnrollmentStatus
  classroomId?: number | null
  classroomName?: string | null
  avatar_url: string | null
  created_at: string
}

export interface AuthPayload {
  userId: number
  username: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  message: string
  user?: PublicUser
  token?: string
}
