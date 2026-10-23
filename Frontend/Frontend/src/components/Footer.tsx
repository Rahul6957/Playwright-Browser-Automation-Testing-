import { BookOpen, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

const currentYear = new Date().getFullYear()

export default function Footer() {
  return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Link to="/" className="brand"><span className="brand-mark"><BookOpen size={19} /></span><span>book<span>hub</span></span></Link><p>Good books make good days.</p></div><div className="footer-links"><div><strong>Explore</strong><Link to="/books">All books</Link><Link to="/categories">Categories</Link></div><div><strong>Your account</strong><Link to="/profile">Profile</Link><Link to="/orders">My orders</Link><Link to="/cart">Shopping bag</Link></div></div></div><div className="footer-bottom"><span>© {currentYear} BookHub. Made for the love of reading.</span><Heart size={17} aria-label="Made with love" /></div></footer>
}
