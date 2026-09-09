import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const SAFE_ROUTES = {
  VICTIM: '/app/home',
  COUNSELOR: '/dashboard/counselor',
  CASE_OFFICER: '/dashboard/cases',
  ADMIN: '/dashboard/admin',
}

/** Read + validate the stored user; corrupt entries are cleared, never thrown. */
function readStoredUser() {
  try {
    const raw = localStorage.getItem('synora_user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object')
    if (!SAFE_ROUTES[parsed.role]) throw new Error('invalid role')
    if (!parsed.fullName || (!parsed.email && !parsed.phone)) throw new Error('missing fields')
    return parsed
  } catch {
    localStorage.removeItem('synora_user')
    return null
  }
}

export function homeForRole(role) {
  return SAFE_ROUTES[role] || '/login'
}

export function AuthProvider({ children }) {
  // Token without a valid user (or user without a token) → clean slate, no white screen.
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('synora_token')
    const u = readStoredUser()
    if (!token || !u) {
      if (!token) localStorage.removeItem('synora_user')
      if (!u) localStorage.removeItem('synora_token')
      return null
    }
    return u
  })

  useEffect(() => {
    if (user) localStorage.setItem('synora_user', JSON.stringify(user))
    else localStorage.removeItem('synora_user')
  }, [user])

  const loginWith = useCallback((data) => {
    if (!data?.token) throw new Error('Login response did not contain a token')
    localStorage.setItem('synora_token', data.token)
    const u = {
      id: data.userId ?? null,
      role: SAFE_ROUTES[data.role] ? data.role : 'VICTIM',
      fullName: data.fullName || 'User',
      email: data.email || '',
      phone: data.phone || '',
    }
    setUser(u)
    return homeForRole(u.role)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('synora_token')
    localStorage.removeItem('synora_user')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loginWith, logout, isAuthenticated: !!user }),
    [user, loginWith, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
