import { ArrowUpRight, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cartApi, errorMessage } from '../services/api'
import type { Book } from '../types'

function formatPrice(value: string | number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))
}

export default function BookCard({ book }: { book: Book }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [imageFailed, setImageFailed] = useState(false)

  async function addToCart() {
    if (!user) {
      navigate('/login', { state: { from: `/books/${book.book_id}` } })
      return
    }
    setBusy(true)
    setError('')
    try {
      await cartApi.add(book.book_id, 1)
      window.dispatchEvent(new Event('bookhub:cart-updated'))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="book-card">
      <Link className="book-cover" to={`/books/${book.book_id}`} aria-label={`View ${book.title}`}>
        {book.image_url && !imageFailed
          ? <img src={book.image_url} alt="" onError={() => setImageFailed(true)} />
          : <span className="cover-placeholder"><span>BOOKHUB</span><strong>{book.title}</strong><small>{book.author}</small></span>}
      </Link>
      <div className="book-card-body">
        <span className="book-category">BOOK {String(book.book_id).padStart(3, '0')}</span>
        <h3><Link to={`/books/${book.book_id}`}>{book.title}</Link></h3>
        <p className="book-author">by {book.author}</p>
        <div className="book-card-bottom">
          <strong>{formatPrice(book.price)}</strong>
          <span className={book.stock > 0 ? 'availability' : 'unavailable'}>{book.stock > 0 ? 'In stock' : 'Out of stock'}</span>
        </div>
        {error && <p className="inline-error">{error}</p>}
        <div className="book-actions">
          <Link className="button button-light" to={`/books/${book.book_id}`}>Details <ArrowUpRight size={15} /></Link>
          <button className="button button-dark" onClick={addToCart} disabled={busy || book.stock < 1}>
            <ShoppingBag size={15} />{busy ? 'Adding…' : 'Add to bag'}
          </button>
        </div>
      </div>
    </article>
  )
}

export { formatPrice }
