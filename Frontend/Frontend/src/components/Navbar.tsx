import { BookOpen, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cartApi } from '../services/api'

export default function Navbar() {
  const { user, logout } = useAuth()
  const [count, setCount] = useState<number | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    const load = () => {
      if (!user) { setCount(null); return }
      cartApi.get().then((cart) => { if (active) setCount(cart.items.reduce((sum, item) => sum + item.quantity, 0)) }).catch(() => { if (active) setCount(null) })
    }
    load()
    window.addEventListener('bookhub:cart-updated', load)
    return () => { active = false; window.removeEventListener('bookhub:cart-updated', load) }
  }, [user])
  function search(event: FormEvent) { event.preventDefault(); navigate(`/books${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`); setMobileOpen(false) }
  function signOut() { logout(); navigate('/') }
  return <header className="site-header"><div className="nav-main"><Link to="/" className="brand"><span className="brand-mark"><BookOpen size={19} /></span><span>book<span>hub</span></span></Link><form className="nav-search" onSubmit={search}><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find your next read…" aria-label="Search catalog" /></form><button className="mobile-menu-button" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button><div className="nav-actions"><Link className="cart-link" to="/cart" aria-label={count === null ? user ? 'Shopping bag, count unavailable' : 'Shopping bag' : `Shopping bag, ${count} items`}><ShoppingBag size={19} /><span>Bag</span>{count !== null && count > 0 && <b>{count}</b>}</Link>{user ? <div className="user-menu"><Link to="/profile" className="user-link"><UserRound size={17} /><span>{user.full_name.split(' ')[0]}</span></Link><button className="nav-signout" onClick={signOut}>Sign out</button></div> : <><Link to="/login" className="nav-login">Sign in</Link><Link to="/register" className="button button-dark nav-register">Join BookHub</Link></>}</div></div><nav className={`nav-secondary ${mobileOpen ? 'is-open' : ''}`} aria-label="Main navigation"><div className="nav-secondary-inner"><NavLink to="/" end onClick={() => setMobileOpen(false)}>Home</NavLink><NavLink to="/books" onClick={() => setMobileOpen(false)}>Books</NavLink><NavLink to="/categories" onClick={() => setMobileOpen(false)}>Categories</NavLink>{user && <NavLink to="/orders" onClick={() => setMobileOpen(false)}>My orders</NavLink>}{user?.role === 'ADMIN' && <NavLink to="/admin" onClick={() => setMobileOpen(false)}>Admin</NavLink>}</div></nav></header>
}
