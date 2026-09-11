import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { clearAuth, getStoredUser, getToken, setAuth, type PanelUser } from '@/shared/lib/auth-storage'
import { login, logout as apiLogout, registerSupport } from '@/shared/services/auth-service'

type AuthContextValue = {
  user: PanelUser | null
  isAuthenticated: boolean
  login: (loginValue: string, password: string) => Promise<PanelUser>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

type RegisterPayload = {
  name: string
  phone: string
  password: string
  password_confirmation: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PanelUser | null>(() => (getToken() ? getStoredUser() : null))

  const loginAction = useCallback(async (loginValue: string, password: string) => {
    const { user: authenticatedUser, token } = await login(loginValue, password)
    setAuth(token, authenticatedUser)
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await registerSupport(payload)
    setAuth(response.token, response.user)
    setUser(response.user)
  }, [])

  const logout = useCallback(() => {
    void apiLogout()
    clearAuth()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login: loginAction,
      register,
      logout,
    }),
    [user, loginAction, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
