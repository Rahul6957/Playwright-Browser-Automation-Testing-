import { ArrowRight, BookOpen, LockKeyhole, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../services/api'
import { PageHeader } from '../components/UI'

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace />
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    setBusy(true)
    try {
      await login(email.trim(), password)
      const destination = (location.state as { from?: string } | null)?.from
      navigate(destination || '/', { replace: true })
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return <section className="auth-layout"><div className="auth-aside"><BookOpen size={28} /><span className="eyebrow light">WELCOME BACK</span><h2>There’s a story waiting for you.</h2><p>Sign in to pick up where your reading journey left off.</p></div><form className="auth-form" onSubmit={submit}><span className="eyebrow">YOUR BOOKHUB ACCOUNT</span><h1>Welcome back</h1><p>Sign in to continue.</p>{error && <div className="notice error" role="alert">{error}</div>}<label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" /></label><button className="button button-dark button-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} /></button><p className="auth-foot">New to BookHub? <Link to="/register">Create an account</Link></p></form></section>
}

export function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '', phone: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/" replace />
  function change(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })) }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(''); setSuccess('')
    if (!form.full_name.trim() || !form.email.trim() || !form.password) { setError('Complete all required fields.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Enter a valid email address.'); return }
    if (form.password.length < 8 || new TextEncoder().encode(form.password).length > 72) { setError('Password must be 8 to 72 bytes long.'); return }
    if (form.password !== form.confirm) { setError('Your passwords do not match.'); return }
    if (form.phone.length > 15) { setError('Phone must be at most 15 characters.'); return }
    setBusy(true)
    try {
      await register({ full_name: form.full_name.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim() })
      setSuccess('Your account was created. You can now sign in.')
      window.setTimeout(() => navigate('/login'), 900)
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return <section className="auth-layout"><div className="auth-aside"><UserRound size={28} /><span className="eyebrow light">JOIN THE COMMUNITY</span><h2>Make room for one more story.</h2><p>Create an account to keep your cart and orders close at hand.</p></div><form className="auth-form" onSubmit={submit}><span className="eyebrow">A NEW CHAPTER</span><h1>Create account</h1><p>It only takes a moment.</p>{error && <div className="notice error" role="alert">{error}</div>}{success && <div className="notice success" role="status">{success}</div>}<label>Full name<input autoComplete="name" required maxLength={100} value={form.full_name} onChange={(e) => change('full_name', e.target.value)} /></label><label>Email address<input type="email" autoComplete="email" required value={form.email} onChange={(e) => change('email', e.target.value)} /></label><div className="form-row"><label>Password<input type="password" autoComplete="new-password" required value={form.password} onChange={(e) => change('password', e.target.value)} /></label><label>Confirm password<input type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => change('confirm', e.target.value)} /></label></div><label>Phone <span className="muted">(optional)</span><input type="tel" autoComplete="tel" maxLength={15} value={form.phone} onChange={(e) => change('phone', e.target.value)} /></label><button className="button button-dark button-full" disabled={busy || Boolean(success)}>{busy ? 'Creating account…' : 'Create account'} <ArrowRight size={16} /></button><p className="auth-foot">Already have an account? <Link to="/login">Sign in</Link></p></form></section>
}

export function Profile() {
  const { user, logout } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <section className="page-shell profile-page"><PageHeader eyebrow="YOUR ACCOUNT" title="Your profile"><p>Account details associated with your BookHub login.</p></PageHeader><div className="profile-card"><div className="profile-avatar"><UserRound size={26} /></div><dl><div><dt>Full name</dt><dd>{user.full_name}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Phone</dt><dd>{user.phone || 'Not provided'}</dd></div><div><dt>Account type</dt><dd>{user.role}</dd></div></dl><p className="muted"><LockKeyhole size={15} /> Profile editing is not available through the current backend.</p><button className="button button-light" onClick={() => { logout(); window.location.assign('/') }}>Sign out</button></div></section>
}
