import { getJson, postJson } from '@/shared/api/http'
import type { PanelUser } from '@/shared/lib/auth-storage'
import type { StudentProfilePayload } from '@/features/student-account/types/student-profile'

export type LoginResponse = { user: PanelUser; token: string }

export type RegisterPayload = {
  name: string
  phone: string
  password: string
  password_confirmation: string
}

export type RegisterResponse = { message: string; user: PanelUser; token: string }

export type StudentRegisterPayload = {
  first_name: string
  last_name: string
  email: string
  password: string
  password_confirmation: string
  course: 'offline' | 'in_person' | 'school'
  track?: 'ai' | 'web' | null
  sessions?: number[]
}

export type StudentRegisterResponse = {
  message: string
  user: PanelUser
  profile: StudentProfilePayload
  token: string
}

export async function login(loginValue: string, password: string): Promise<LoginResponse> {
  return postJson<{ login: string; password: string }, LoginResponse>('/api/login', {
    login: loginValue,
    password,
  })
}

export function registerStudent(
  payload: StudentRegisterPayload,
): Promise<StudentRegisterResponse> {
  return postJson<StudentRegisterPayload, StudentRegisterResponse>(
    '/api/register/student',
    payload,
  )
}

export async function registerSupport(payload: RegisterPayload): Promise<RegisterResponse> {
  return postJson<RegisterPayload, RegisterResponse>('/api/register-support', payload)
}

export function getCurrentUser(): Promise<PanelUser> {
  return getJson<PanelUser>('/api/me')
}

export async function logout(): Promise<void> {
  try {
    await postJson('/api/logout', {})
  } catch {
    // خروج سمت کلاینت همیشه انجام می‌شود؛ خطای شبکه مانع خروج نمی‌شود
  }
}
