import { ArrowRight, ArrowUpRight, BookOpen, Search, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import BookCard from '../components/BookCard'
import { EmptyState, ErrorMessage, Loading, PageHeader } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { booksApi, cartApi, categoriesApi, errorMessage } from '../services/api'
import type { Book, Category } from '../types'
import heroImage from '../assets/hero.png'

function useCatalog() {
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reload = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([booksApi.list(), categoriesApi.list()])
      .then(([bookData, categoryData]) => { setBooks(bookData); setCategories(categoryData) })
      .catch((err: unknown) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { reload() }, [reload])
  return { books, categories, loading, error, reload }
}

export function Home() {
  const { books, categories, loading, error, reload } = useCatalog()
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow light"><Sparkles size={14} /> YOUR NEXT CHAPTER STARTS HERE</span>
          <h1>Stories worth<br /><em>staying up for.</em></h1>
          <p>Thoughtfully selected books for curious minds, big feelings, and every adventure in between.</p>
          <Link to="/books" className="button button-cream">Explore the collection <ArrowRight size={17} /></Link>
          <div className="hero-note"><BookOpen size={18} /><span>Browse real titles from the BookHub catalog.</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <img src={heroImage} alt="" />
          <div className="hero-stamp"><BookOpen size={20} /><span>FIND YOUR<br />NEXT FAVORITE</span></div>
        </div>
      </section>
      <section className="section-block">
        <div className="section-title"><div><span className="eyebrow">THE BOOKSHELF</span><h2>Recently added</h2></div><Link to="/books" className="inline-link">View all books <ArrowUpRight size={16} /></Link></div>
        {loading ? <Loading label="Finding good reads…" /> : error ? <ErrorMessage message={error} retry={reload} /> : books.length === 0 ? <EmptyState title="The shelves are being stocked"><p>Check back soon for new titles.</p></EmptyState> : <div className="book-grid">{books.slice(0, 4).map((book) => <BookCard key={book.book_id} book={book} />)}</div>}
      </section>
      <section className="category-band">
        <div className="section-title"><div><span className="eyebrow">FOLLOW A FEELING</span><h2>Browse by category</h2></div></div>
        {loading ? <Loading label="Loading categories…" /> : error ? <ErrorMessage message={error} retry={reload} /> : categories.length ? <div className="category-grid">{categories.slice(0, 6).map((category, index) => <Link className={`category-tile category-${index % 4}`} key={category.category_id} to={`/books?category=${category.category_id}`}><span>{String(index + 1).padStart(2, '0')}</span><strong>{category.category_name}</strong><ArrowUpRight size={18} /></Link>)}</div> : <EmptyState title="No categories available yet" />}
      </section>
      <section className="editorial-cta"><div><span className="eyebrow light">A LITTLE BOOKISH INSPIRATION</span><h2>Good books.<br />Great company.</h2><p>Take your time. Your next favorite is right here.</p></div><Link to="/books" className="button button-cream">Find your book <ArrowRight size={17} /></Link></section>
    </>
  )
}

export function Books() {
  const { books, categories, loading, error, reload } = useCatalog()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')
  const [price, setPrice] = useState('')
  const [sort, setSort] = useState('newest')
  const category = params.get('category') || ''
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return books.filter((book) =>
      (!normalized || `${book.title} ${book.author}`.toLowerCase().includes(normalized)) &&
      (!category || String(book.category_id) === category) &&
      (!price || Number(book.price) <= Number(price)),
    ).sort((a, b) => {
      if (sort === 'price-low') return Number(a.price) - Number(b.price)
      if (sort === 'price-high') return Number(b.price) - Number(a.price)
      if (sort === 'title') return a.title.localeCompare(b.title)
      return 0
    })
  }, [books, query, category, price, sort])

  return <section className="page-shell">
    <PageHeader eyebrow="THE BOOKHUB COLLECTION" title="Find your next favorite">
      <p>Browse the real BookHub catalog and filter by what feels right.</p>
    </PageHeader>
    <div className="catalog-controls">
      <label className="search-field"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title or author" aria-label="Search books" /></label>
      <select aria-label="Filter by category" value={category} onChange={(e) => setParams(e.target.value ? { category: e.target.value } : {})}><option value="">All categories</option>{categories.map((item) => <option key={item.category_id} value={item.category_id}>{item.category_name}</option>)}</select>
      <select aria-label="Filter by maximum price" value={price} onChange={(e) => setPrice(e.target.value)}><option value="">Any price</option><option value="400">Under ₹400</option><option value="600">Under ₹600</option><option value="1000">Under ₹1,000</option></select>
      <select aria-label="Sort books" value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Recently added</option><option value="title">Title A–Z</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select>
    </div>
    {loading ? <Loading label="Loading books…" /> : error ? <ErrorMessage message={error} retry={reload} /> : filtered.length ? <><div className="results-count">{filtered.length} {filtered.length === 1 ? 'book' : 'books'} found</div><div className="book-grid">{filtered.map((book) => <BookCard key={book.book_id} book={book} />)}</div></> : <EmptyState title="No books match those filters"><p>Try another search or clear the category and price filters.</p><button className="button button-light" onClick={() => { setQuery(''); setPrice(''); setParams({}) }}>Clear filters</button></EmptyState>}
  </section>
}

export function Categories() {
  const { categories, loading, error, reload } = useCatalog()
  return <section className="page-shell"><PageHeader eyebrow="EXPLORE THE SHELVES" title="Categories"><p>Every category comes directly from the BookHub catalog.</p></PageHeader>{loading ? <Loading /> : error ? <ErrorMessage message={error} retry={reload} /> : categories.length ? <div className="category-grid category-page-grid">{categories.map((category, index) => <Link className={`category-tile category-${index % 4}`} key={category.category_id} to={`/books?category=${category.category_id}`}><span>{String(index + 1).padStart(2, '0')}</span><strong>{category.category_name}</strong><small>{category.description || 'Explore books in this collection'}</small><ArrowUpRight size={18} /></Link>)}</div> : <EmptyState title="No categories available yet" />}</section>
}

export function BookDetails() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imageFailed, setImageFailed] = useState(false)
  const { user } = useAuth()
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const id = Number(bookId)
    if (!Number.isSafeInteger(id) || id < 1) { setError('Invalid book ID.'); setLoading(false); return }
    Promise.all([booksApi.get(id), categoriesApi.list()])
      .then(([data, allCategories]) => { setBook(data); setCategory(allCategories.find((item) => item.category_id === data.category_id) || null) })
      .catch((err: unknown) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [bookId])
  async function add() {
    if (!book) return
    if (!user) { navigate('/login', { state: { from: `/books/${book.book_id}` } }); return }
    setAdding(true); setError(''); setMessage('')
    try {
      await cartApi.add(book.book_id, quantity)
      window.dispatchEvent(new Event('bookhub:cart-updated'))
      setMessage('Added to your bag.')
    } catch (err) { setError(errorMessage(err)) } finally { setAdding(false) }
  }
  if (loading) return <section className="page-shell"><Loading label="Loading book details…" /></section>
  if (error && !book) return <section className="page-shell"><ErrorMessage message={error} retry={() => window.location.reload()} /><Link to="/books" className="inline-link">Back to books</Link></section>
  if (!book) return null
  return <section className="page-shell detail-page"><Link to="/books" className="back-link">← Back to books</Link><div className="book-detail-layout"><div className="detail-cover">{book.image_url && !imageFailed ? <img src={book.image_url} alt={book.title} onError={() => setImageFailed(true)} /> : <div className="cover-placeholder detail-placeholder"><span>BOOKHUB</span><strong>{book.title}</strong><small>{book.author}</small></div>}</div><div className="detail-copy"><span className="eyebrow">{category?.category_name || 'BOOKHUB EDITION'}</span><h1>{book.title}</h1><p className="detail-author">by {book.author}</p><strong className="detail-price">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(book.price))}</strong><p className="detail-description">{book.description || 'No description available.'}</p><p className={book.stock > 0 ? 'availability' : 'unavailable'}>{book.stock > 0 ? `${book.stock} available` : 'Currently out of stock'}</p>{book.stock > 0 && <div className="detail-buy"><label htmlFor="quantity">Quantity</label><input id="quantity" type="number" min={1} max={book.stock} value={quantity} onChange={(e) => setQuantity(Math.min(book.stock, Math.max(1, Number(e.target.value) || 1)))} /><button className="button button-dark" onClick={add} disabled={adding || quantity > book.stock}>{adding ? 'Adding…' : 'Add to bag'}</button></div>}{error && <ErrorMessage message={error} />}{message && <p className="notice success">{message}</p>}</div></div></section>
}
