import { BookOpen, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="state-message" role="status"><LoaderCircle className="spin" size={22} />{label}</div>
}

export function ErrorMessage({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="notice error" role="alert"><TriangleAlert size={19} /><span>{message}</span>{retry && <button className="text-button" onClick={retry}>Try again</button>}</div>
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty-state"><BookOpen size={34} /><h3>{title}</h3>{children}</div>
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <div className="page-heading">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{children}</div>
}

export function StatusBadge({ status }: { status: string }) {
  const value = status.toUpperCase()
  return <span className={`status-badge status-${value.toLowerCase()}`}>{value}</span>
}
