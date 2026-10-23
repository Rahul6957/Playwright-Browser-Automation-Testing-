import { BookOpen, Boxes, ClipboardList, LayoutDashboard, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { formatPrice } from '../components/BookCard'
import { EmptyState, ErrorMessage, Loading, StatusBadge } from '../components/UI'
import { booksApi, categoriesApi, errorMessage, ordersApi } from '../services/api'
import { formatCalendarDate } from '../utils/dates'
import type { Book, BookInput, Category, CategoryInput, Order } from '../types'

export default function Admin() {
  const path = useLocation().pathname.split('/')[2] || ''
  const active = ['books', 'categories', 'orders', 'bills'].includes(path) ? path : ''
  return <section className="page-shell admin-page"><div className="admin-heading"><div><span className="eyebrow">BOOKHUB CONTROL ROOM</span><h1>Admin dashboard</h1><p>Manage catalog records and review customer orders.</p></div></div><div className="admin-tabs">{[['', 'Overview', LayoutDashboard], ['books', 'Books', BookOpen], ['categories', 'Categories', Boxes], ['orders', 'Orders', ClipboardList], ['bills', 'Bills', ReceiptText]].map(([to, label, Icon]) => <NavLink key={to as string} end to={to ? `/admin/${to}` : '/admin'} className={active === to ? 'active' : ''}><Icon size={16} />{label as string}</NavLink>)}</div>{active === 'books' ? <ManageBooks /> : active === 'categories' ? <ManageCategories /> : active === 'orders' ? <ManageOrders /> : active === 'bills' ? <ManageBills /> : <Dashboard />}</section>
}

function Dashboard() {
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => { setLoading(true); Promise.all([booksApi.list(), categoriesApi.list(), ordersApi.list()]).then(([b, c, o]) => { setBooks(b); setCategories(c); setOrders(o) }).catch((err: unknown) => setError(errorMessage(err))).finally(() => setLoading(false)) }, [])
  useEffect(load, [load])
  if (loading) return <Loading label="Loading dashboard…" />
  if (error) return <ErrorMessage message={error} retry={load} />
  return <><div className="admin-stats"><article><BookOpen /><span>Active books</span><strong>{books.length}</strong></article><article><Boxes /><span>Categories</span><strong>{categories.length}</strong></article><article><ClipboardList /><span>Orders</span><strong>{orders.length}</strong></article></div><div className="admin-panel"><div className="panel-title"><h2>Recent orders</h2><Link to="/admin/orders">See all</Link></div>{orders.slice(0, 5).map((order) => <div className="admin-order-row" key={order.order_id}><span>#{order.order_id}</span><StatusBadge status={order.order_status} /><span>{new Date(order.order_date).toLocaleDateString()}</span><strong>{formatPrice(order.total_amount)}</strong><Link to={`/admin/bills?order=${order.order_id}`}>Bill</Link></div>)}{!orders.length && <EmptyState title="No orders yet" />}</div></>
}

const emptyBook: BookInput = { category_id: 0, title: '', author: '', description: '', price: '', stock: 0, image_url: '' }
function ManageBooks() {
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<BookInput>(emptyBook)
  const [editing, setEditing] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => { setLoading(true); Promise.all([booksApi.list(), categoriesApi.list()]).then(([b, c]) => { setBooks(b); setCategories(c) }).catch((err: unknown) => setError(errorMessage(err))).finally(() => setLoading(false)) }, [])
  useEffect(load, [load])
  function startEdit(book: Book) { setEditing(book.book_id); setForm({ category_id: book.category_id, title: book.title, author: book.author, description: book.description || '', price: String(book.price), stock: book.stock, image_url: book.image_url || '' }); setError(''); setSuccess('') }
  function reset() { setEditing(null); setForm(emptyBook) }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!form.category_id || !form.title.trim() || !form.author.trim() || !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(form.price) || !Number.isSafeInteger(Number(form.stock)) || Number(form.stock) < 0) { setError('Provide a category, title, author, valid price and non-negative whole-number stock.'); return }
    setBusy(true)
    try {
      const input = { ...form, title: form.title.trim(), author: form.author.trim(), stock: Number(form.stock) }
      if (editing) await booksApi.update(editing, input); else await booksApi.create(input)
      setSuccess(editing ? 'Book updated.' : 'Book created.'); reset(); load()
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  async function deactivate(book: Book) {
    if (!window.confirm(`Deactivate “${book.title}”? It will no longer appear in the public catalog.`)) return
    try { await booksApi.deactivate(book.book_id); setSuccess('Book deactivated.'); load() } catch (err) { setError(errorMessage(err)) }
  }
  return <div className="admin-content-grid"><div className="admin-panel"><div className="panel-title"><h2>Catalog books</h2><span>{books.length} active</span></div>{loading ? <Loading /> : error && !books.length ? <ErrorMessage message={error} retry={load} /> : books.map((book) => <div className="manage-row" key={book.book_id}><div><strong>{book.title}</strong><span>{book.author} · {formatPrice(book.price)} · {book.stock} in stock</span></div><button className="icon-button" aria-label={`Edit ${book.title}`} onClick={() => startEdit(book)}><Pencil size={16} /></button><button className="icon-button danger" aria-label={`Deactivate ${book.title}`} onClick={() => deactivate(book)}><Trash2 size={16} /></button></div>)}</div><form className="admin-panel admin-form" onSubmit={submit}><h2>{editing ? 'Edit book' : 'Add a book'}</h2>{error && <ErrorMessage message={error} />}{success && <p className="notice success">{success}</p>}<label>Title<input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Author<input required maxLength={150} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></label><label>Category<select required value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}><option value="">Select category</option>{categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}</select></label><div className="form-row"><label>Price<input type="number" min="0" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label><label>Stock<input type="number" min="0" step="1" required value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></label></div><label>Image URL<input type="url" maxLength={500} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></label><label>Description<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><button className="button button-dark" disabled={busy || !categories.length}><Plus size={16} />{busy ? 'Saving…' : editing ? 'Save changes' : 'Add book'}</button>{editing && <button type="button" className="text-button" onClick={reset}>Cancel editing</button>}{!categories.length && !loading && <p className="muted">Create a category before adding a book.</p>}</form></div>
}

const emptyCategory: CategoryInput = { category_name: '', description: '' }
function ManageCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<CategoryInput>(emptyCategory)
  const [editing, setEditing] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => { setLoading(true); categoriesApi.list().then(setCategories).catch((err: unknown) => setError(errorMessage(err))).finally(() => setLoading(false)) }, [])
  useEffect(load, [load])
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!form.category_name.trim()) { setError('Category name is required.'); return }
    setBusy(true)
    try { if (editing) await categoriesApi.update(editing, form); else await categoriesApi.create(form); setSuccess(editing ? 'Category updated.' : 'Category created.'); setEditing(null); setForm(emptyCategory); load() } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  async function remove(category: Category) {
    if (!window.confirm(`Delete category “${category.category_name}”? The backend may refuse if it is in use.`)) return
    try { await categoriesApi.remove(category.category_id); setSuccess('Category deleted.'); load() } catch (err) { setError(errorMessage(err)) }
  }
  return <div className="admin-content-grid"><div className="admin-panel"><div className="panel-title"><h2>Categories</h2><span>{categories.length} total</span></div>{loading ? <Loading /> : error && !categories.length ? <ErrorMessage message={error} retry={load} /> : categories.map((category) => <div className="manage-row" key={category.category_id}><div><strong>{category.category_name}</strong><span>{category.description || 'No description'}</span></div><button className="icon-button" aria-label={`Edit ${category.category_name}`} onClick={() => { setEditing(category.category_id); setForm({ category_name: category.category_name, description: category.description || '' }) }}><Pencil size={16} /></button><button className="icon-button danger" aria-label={`Delete ${category.category_name}`} onClick={() => remove(category)}><Trash2 size={16} /></button></div>)}</div><form className="admin-panel admin-form" onSubmit={submit}><h2>{editing ? 'Edit category' : 'Add category'}</h2>{error && <ErrorMessage message={error} />}{success && <p className="notice success">{success}</p>}<label>Category name<input required maxLength={100} value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })} /></label><label>Description<textarea rows={4} maxLength={255} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add category'}</button>{editing && <button type="button" className="text-button" onClick={() => { setEditing(null); setForm(emptyCategory) }}>Cancel editing</button>}</form></div>
}

function ManageOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => { setLoading(true); ordersApi.list().then(setOrders).catch((err: unknown) => setError(errorMessage(err))).finally(() => setLoading(false)) }, [])
  useEffect(load, [load])
  return <div className="admin-panel"><div className="panel-title"><h2>Customer orders</h2><span>Includes cancelled orders and payment/refund state</span></div>{loading ? <Loading /> : error ? <ErrorMessage message={error} retry={load} /> : orders.length ? orders.map((order) => <div className="admin-order-row" key={order.order_id}><span>#{order.order_id} · User {order.user_id}</span><StatusBadge status={order.order_status} /><span>Ordered {new Date(order.order_date).toLocaleDateString()} · Delivery {formatCalendarDate(order.expected_delivery_date)}</span><span>{order.payment_method || 'COD'} · {order.payment_status || 'PENDING'}{order.refund_status && order.refund_status !== 'NOT_REQUIRED' ? ` · Refund ${order.refund_status}` : ''}</span><strong>{formatPrice(order.total_amount)}</strong><Link to={`/admin/bills?order=${order.order_id}`}>View bill</Link><Link to={`/orders/${order.order_id}`}>Details</Link></div>) : <EmptyState title="No orders yet" />}</div>
}

function ManageBills() {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const query = new URLSearchParams(window.location.search).get('order')
  const load = useCallback(() => { setLoading(true); ordersApi.list().then(setOrders).catch((err: unknown) => setError(errorMessage(err))).finally(() => setLoading(false)) }, [])
  useEffect(load, [load])
  return <div className="admin-panel"><div className="panel-title"><h2>Bills by order</h2><span>Bills are retrieved through the existing order-specific bill API</span></div>{loading ? <Loading /> : error ? <ErrorMessage message={error} retry={load} /> : orders.length ? orders.filter((order) => !query || String(order.order_id) === query).map((order) => <div className="admin-order-row" key={order.order_id}><span>Order #{order.order_id}</span><StatusBadge status={order.order_status} /><span>{new Date(order.order_date).toLocaleDateString()}</span><strong>{formatPrice(order.total_amount)}</strong><Link to={`/bills/${order.order_id}`}>Open bill</Link></div>) : <EmptyState title="No bills available" />}</div>
}
