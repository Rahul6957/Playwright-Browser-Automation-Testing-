import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, TOKEN_STORAGE_KEY } from '../services/api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: { full_name: string; email: string; password: string; phone: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener('bookhub:session-expired', onExpired)
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      setLoading(false)
    } else {
      authApi.profile().then(setUser).catch(logout).finally(() => setLoading(false))
    }
    return () => window.removeEventListener('bookhub:session-expired', onExpired)
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password)
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token)
    setUser(result.user)
  }, [])

  const register = useCallback(async (input: { full_name: string; email: string; password: string; phone: string }) => {
    await authApi.register(input)
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
