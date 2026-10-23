import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from './UI'

export default function ProtectedRoute({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading label="Checking your account…" />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (admin && user.role !== 'ADMIN') return <section className="page-shell"><h1>Access denied</h1><p>Your account does not have administrator access.</p></section>
  return children
}
