import { getJson, postJson } from '@/shared/api/http'
import type { PanelUser } from '@/shared/lib/auth-storage'

export type LoginResponse = { user: PanelUser; token: string }

export type RegisterPayload = {
  name: string
  phone: string
  password: string
  password_confirmation: string
}

export type RegisterResponse = { message: string; user: PanelUser; token: string }

export async function login(loginValue: string, password: string): Promise<LoginResponse> {
  return postJson<{ login: string; password: string }, LoginResponse>('/api/login', {
    login: loginValue,
    password,
  })
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
