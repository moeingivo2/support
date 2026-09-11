const TOKEN_KEY = 'aio_token'
const USER_KEY = 'aio_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(token: string, user: PanelUser): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredUser(): PanelUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as PanelUser) : null
  } catch {
    return null
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export interface PanelUser {
  id: number
  name: string
  email: string | null
  phone: string | null
  role: 'admin' | 'support'
  support_type?: 'web' | 'ai' | null
}
