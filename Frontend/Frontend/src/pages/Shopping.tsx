import { ArrowLeft, ArrowRight, CheckCircle2, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { EmptyState, ErrorMessage, Loading, PageHeader, StatusBadge } from '../components/UI'
import { billsApi, cartApi, errorMessage, ordersApi, paymentsApi } from '../services/api'
import { formatPrice } from '../components/BookCard'
import { formatCalendarDate } from '../utils/dates'
import { openRazorpayCheckout, prepareRazorpayCheckout } from '../utils/razorpayCheckout'
import type { BillDetails, Cart, OnlineOrderResult, Order, OrderItem, PaymentConfiguration } from '../types'

export function CartPage() {
  const { user } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | 'clear' | null>(null)
  const load = useCallback(() => { setLoading(true); setError(''); cartApi.get().then(setCart).catch((err: unknown) => setError(errorMessage(err))).finally(() => setLoading(false)) }, [])
  useEffect(() => { if (user) load() }, [user, load])
  async function update(bookId: number, quantity: number) {
    if (!cart) return
    setBusy(bookId); setError('')
    try { setCart(await cartApi.update(bookId, quantity)); window.dispatchEvent(new Event('bookhub:cart-updated')) } catch (err) { setError(errorMessage(err)) } finally { setBusy(null) }
  }
  async function remove(bookId: number) {
    setBusy(bookId); setError('')
    try { setCart(await cartApi.remove(bookId)); window.dispatchEvent(new Event('bookhub:cart-updated')) } catch (err) { setError(errorMessage(err)) } finally { setBusy(null) }
  }
  async function clear() {
    if (!window.confirm('Remove every item from your bag?')) return
    setBusy('clear'); setError('')
    try { setCart(await cartApi.clear()); window.dispatchEvent(new Event('bookhub:cart-updated')) } catch (err) { setError(errorMessage(err)) } finally { setBusy(null) }
  }
  if (!user) return <Navigate to="/login" state={{ from: '/cart' }} replace />
  return <section className="page-shell"><PageHeader eyebrow="YOUR READING PILE" title="Your bag"><p>Everything you’ve been looking forward to reading.</p></PageHeader>{loading ? <Loading label="Loading your bag…" /> : error && !cart ? <ErrorMessage message={error} retry={load} /> : !cart?.items.length ? <EmptyState title="Your bag is ready for a good book"><p>Take a look around and find something you’ll love.</p><Link className="button button-dark" to="/books">Continue shopping <ArrowRight size={16} /></Link></EmptyState> : <><div className="cart-layout"><div className="cart-items">{cart.items.map((item) => <article className="cart-item" key={item.book_id}><div className="cart-thumb"><ShoppingBag size={20} />{item.image_url && <img src={item.image_url} alt="" onError={(event) => { event.currentTarget.hidden = true }} />}</div><div className="cart-item-main"><Link to={`/books/${item.book_id}`}><strong>{item.title}</strong></Link><span>by {item.author}</span><span>{formatPrice(item.unit_price)} each</span></div><div className="quantity-control"><button aria-label={`Decrease ${item.title} quantity`} disabled={busy !== null || item.quantity <= 1} onClick={() => update(item.book_id, item.quantity - 1)}><Minus size={14} /></button><span>{item.quantity}</span><button aria-label={`Increase ${item.title} quantity`} disabled={busy !== null} onClick={() => update(item.book_id, item.quantity + 1)}><Plus size={14} /></button></div><strong className="cart-subtotal">{formatPrice(item.subtotal)}</strong><button className="icon-button danger" aria-label={`Remove ${item.title}`} disabled={busy !== null} onClick={() => remove(item.book_id)}><Trash2 size={17} /></button></article>)}</div><aside className="summary-card"><span className="eyebrow">ORDER SUMMARY</span><h2>Bag total</h2><div className="summary-row"><span>Subtotal</span><strong>{formatPrice(cart.total)}</strong></div><div className="summary-row"><span>Delivery</span><strong>{formatPrice(0)}</strong></div><p className="muted">Your final total is calculated by the server when your order is placed.</p><Link className="button button-dark button-full" to="/checkout">Continue to checkout <ArrowRight size={16} /></Link><button className="text-button remove-all" onClick={clear} disabled={busy !== null}>Clear bag</button></aside></div>{error && <ErrorMessage message={error} />}</>}</section>
}

export function Checkout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cart, setCart] = useState<Cart | null>(null)
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD')
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfiguration>({ configured: false, key_id: null })
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!user) return
    Promise.all([cartApi.get(), paymentsApi.configuration(), ordersApi.checkoutPreview()])
      .then(([cartData, config, preview]) => {
        setCart(cartData)
        setPaymentConfig(config)
        setExpectedDeliveryDate(preview.expected_delivery_date)
      })
      .catch((err: unknown) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [user])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!user) return
    if (!address.trim()) { setError('Enter a delivery address.'); return }
    if (address.trim().length > 5000) { setError('Delivery address is too long.'); return }
    setBusy(true)
    try {
      if (paymentMethod === 'ONLINE') await prepareRazorpayCheckout()
      const result = await ordersApi.create(address.trim(), paymentMethod)
      window.dispatchEvent(new Event('bookhub:cart-updated'))
      if (paymentMethod === 'COD') {
        if (!('order_id' in result)) throw new Error('The server returned an invalid COD order response.')
        const order = result
        navigate(`/orders/${order.order_id}`, { state: { confirmation: true } })
        return
      }

      if ('order_id' in result) throw new Error('The server returned an invalid online order response.')
      const onlineResult: OnlineOrderResult = result
      if (!onlineResult.payment) {
        navigate(`/orders/${onlineResult.order.order_id}`, {
          state: { confirmation: true, paymentError: onlineResult.payment_setup_error },
        })
        return
      }
      const checkoutResponse = await openRazorpayCheckout(onlineResult.payment, user)
      await ordersApi.verifyPayment(onlineResult.order.order_id, checkoutResponse)
      navigate(`/orders/${onlineResult.order.order_id}`, { state: { confirmation: true, paid: true } })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  if (!user) return <Navigate to="/login" state={{ from: '/checkout' }} replace />
  if (loading) return <section className="page-shell"><Loading label="Preparing checkout…" /></section>
  if (!cart?.items.length) return <section className="page-shell"><EmptyState title="Your bag is empty"><Link className="button button-dark" to="/books">Browse books</Link></EmptyState></section>
  return <section className="page-shell">
    <Link to="/cart" className="back-link"><ArrowLeft size={15} /> Back to bag</Link>
    <PageHeader eyebrow="ONE LAST THING" title="Checkout"><p>Choose how you would like to pay for your order.</p></PageHeader>
    <div className="cart-layout checkout-layout">
      <form className="checkout-form" onSubmit={submit}>
        <h2>Delivery details</h2>
        <label htmlFor="address">Delivery address</label>
        <textarea id="address" rows={5} maxLength={5000} required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, region, postal code" />
        <fieldset className="payment-method-options">
          <legend>Payment method</legend>
          <label><input type="radio" name="payment-method" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} /> Cash on Delivery</label>
          <label><input type="radio" name="payment-method" checked={paymentMethod === 'ONLINE'} disabled={!paymentConfig.configured} onChange={() => setPaymentMethod('ONLINE')} /> Online Payment <span className="muted">(UPI, credit/debit card, or net banking)</span></label>
          {!paymentConfig.configured && <p className="muted">Online payment is unavailable until Razorpay Test Mode credentials are configured on the backend.</p>}
        </fieldset>
        {notice && <p className="notice success">{notice}</p>}
        {error && <ErrorMessage message={error} />}
        <button className="button button-dark" disabled={busy || (paymentMethod === 'ONLINE' && !paymentConfig.configured)}>
          {busy ? 'Preparing checkout…' : paymentMethod === 'ONLINE' ? 'Pay now' : 'Place order — Cash on delivery'} <ArrowRight size={16} />
        </button>
      </form>
      <aside className="summary-card">
        <span className="eyebrow">YOUR ORDER</span><h2>Order summary</h2>
        {cart.items.map((item) => <div className="summary-row" key={item.book_id}><span>{item.title}<br /><small>Qty {item.quantity} × {formatPrice(item.unit_price)}</small></span><strong>{formatPrice(item.subtotal)}</strong></div>)}
        <div className="summary-row"><span>Delivery charge</span><strong>{formatPrice(0)}</strong></div>
        <div className="summary-total"><span>Grand total</span><strong>{formatPrice(cart.total)}</strong></div>
        <div className="summary-row"><span>Expected delivery</span><strong>{formatCalendarDate(expectedDeliveryDate)}</strong></div>
        <p className="muted">The backend recalculates prices, stock, and the expected delivery date when you place the order.</p>
      </aside>
    </div>
  </section>
}

export function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cancelling, setCancelling] = useState<number | null>(null)
  const load = useCallback(() => {
    setLoading(true)
    setError('')
    ordersApi.list().then(setOrders).catch((err: unknown) => setError(errorMessage(err))).finally(() => setLoading(false))
  }, [])
  useEffect(() => { if (user) load() }, [user, load])
  async function cancel(order: Order) {
    if (!window.confirm(`Cancel order #${order.order_id}? An eligible online payment will be refunded through Razorpay.`)) return
    setCancelling(order.order_id)
    setError('')
    setNotice('')
    try {
      await ordersApi.cancel(order.order_id)
      setNotice(`Order #${order.order_id} was cancelled.`)
      load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setCancelling(null)
    }
  }
  if (!user) return <Navigate to="/login" state={{ from: '/orders' }} replace />
  return <section className="page-shell">
    <PageHeader eyebrow="YOUR BOOKHUB HISTORY" title={user.role === 'ADMIN' ? 'Orders' : 'My orders'}><p>Track your orders and see the details of each delivery.</p></PageHeader>
    {notice && <p className="notice success"><CheckCircle2 size={18} />{notice}</p>}
    {error && <ErrorMessage message={error} />}
    {loading ? <Loading label="Loading orders…" /> : !orders.length ? <EmptyState title="No orders yet"><p>Your future favorite reads will show up here.</p><Link to="/books" className="button button-dark">Explore books</Link></EmptyState> : <div className="orders-list">
      {orders.map((order) => <article className="order-card" key={order.order_id}>
        <div><span className="eyebrow">ORDER #{order.order_id}</span><p>{new Date(order.order_date).toLocaleDateString()}</p><small>Expected delivery: {formatCalendarDate(order.expected_delivery_date)}</small></div>
        <StatusBadge status={order.order_status} /><strong>{formatPrice(order.total_amount)}</strong>
        <Link className="button button-light" to={`/orders/${order.order_id}`}>View details <ArrowRight size={15} /></Link>
        {user.role !== 'ADMIN' && ['PENDING', 'CONFIRMED'].includes(order.order_status.toUpperCase()) && <button className="button button-outline-danger" onClick={() => cancel(order)} disabled={cancelling !== null}>{cancelling === order.order_id ? 'Cancelling…' : 'Cancel order'}</button>}
      </article>)}
    </div>}
  </section>
}

export function OrderDetails() {
  const { orderId } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const load = useCallback(() => {
    const id = Number(orderId)
    if (!Number.isSafeInteger(id) || id < 1) { setError('Invalid order ID.'); setLoading(false); return }
    setError('')
    Promise.all([ordersApi.get(id), ordersApi.items(id)]).then(([orderData, itemData]) => { setOrder(orderData); setItems(itemData) }).catch((err: unknown) => setError(errorMessage(err))).finally(() => setLoading(false))
  }, [orderId])
  useEffect(() => { load() }, [load])
  async function cancel() {
    if (!order || !window.confirm('Cancel this order?')) return
    setBusy(true); setError('')
    try { setOrder(await ordersApi.cancel(order.order_id)); setNotice('Your order was cancelled. Any online refund status is shown below.'); load() } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  async function payNow() {
    if (!order || !user) return
    setBusy(true); setError(''); setPaymentError(null)
    try {
      const payment = await ordersApi.createPayment(order.order_id)
      const response = await openRazorpayCheckout(payment, user)
      await ordersApi.verifyPayment(order.order_id, response)
      setNotice('Razorpay confirmed your payment.')
      load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  if (!user) return <Navigate to="/login" state={{ from: `/orders/${orderId}` }} replace />
  if (loading) return <section className="page-shell"><Loading label="Loading order…" /></section>
  if (error && !order) return <section className="page-shell"><ErrorMessage message={error} retry={() => window.location.reload()} /><Link to="/orders" className="inline-link">Back to orders</Link></section>
  if (!order) return null
  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.order_status.toUpperCase())
  const initialState = location.state as { confirmation?: boolean; paid?: boolean; paymentError?: string } | null
  const isConfirmation = initialState?.confirmation && order.order_status !== 'CANCELLED'
  return <section className="page-shell">
    <Link to="/orders" className="back-link">← Back to orders</Link>
    <PageHeader eyebrow={`ORDER #${order.order_id}`} title={isConfirmation ? 'Order confirmed' : 'Order details'}><StatusBadge status={order.order_status} /></PageHeader>
    {isConfirmation && <p className="notice success"><CheckCircle2 size={18} />{initialState?.paid ? 'Payment verified and order confirmed.' : 'Your order was placed successfully.'}</p>}
    {paymentError && <ErrorMessage message={paymentError} />}
    {notice && <p className="notice success"><CheckCircle2 size={18} />{notice}</p>}
    {error && <ErrorMessage message={error} />}
    <div className="order-detail-layout">
      <div>
        <div className="order-items"><h2>Books in your order</h2>{items.map((item) => <div className="order-item" key={item.order_item_id}><div><strong>{item.title}</strong><span>by {item.author} · Qty {item.quantity}</span></div><span>{formatPrice(item.unit_price)} each</span><strong>{formatPrice(item.subtotal)}</strong></div>)}</div>
        <div className="order-actions">
          <Link className="button button-light" to={`/bills/${order.order_id}`}>View bill</Link>
          {order.payment_method === 'ONLINE' && order.order_status === 'PENDING' && order.payment_status !== 'PAID' && <button className="button button-dark" onClick={payNow} disabled={busy}>{busy ? 'Opening payment…' : 'Pay online'}</button>}
          {canCancel && <button className="button button-outline-danger" onClick={cancel} disabled={busy}>{busy ? 'Please wait…' : 'Cancel order'}</button>}
        </div>
      </div>
      <aside className="summary-card">
        <span className="eyebrow">DELIVERY & PAYMENT</span>
        <h2>{formatPrice(order.total_amount)}</h2>
        <p>Ordered {new Date(order.order_date).toLocaleString()}</p>
        <p><strong>Expected delivery:</strong> {formatCalendarDate(order.expected_delivery_date)}</p>
        <h3>Delivery address</h3><p className="address-text">{order.delivery_address}</p>
        <p><strong>Payment method:</strong> {order.payment_method || 'COD'}</p>
        <p><strong>Payment status:</strong> {order.payment_status || 'PENDING'}</p>
        {order.order_status === 'CANCELLED' && <p><strong>Cancellation:</strong> Cancelled{order.cancelled_at ? ` on ${new Date(order.cancelled_at).toLocaleString()}` : ''}</p>}
        {order.payment_method === 'ONLINE' && order.order_status === 'CANCELLED' && <p><strong>Refund status:</strong> {order.refund_status || 'PENDING'}</p>}
      </aside>
    </div>
  </section>
}

export function BillPage() {
  const { orderId } = useParams()
  const { user } = useAuth()
  const [details, setDetails] = useState<BillDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const id = Number(orderId)
  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) { setError('Invalid order ID.'); setLoading(false); return }
    billsApi.get(id).then(setDetails).catch((err: unknown) => setError(errorMessage(err))).finally(() => setLoading(false))
  }, [id])
  async function download() {
    setBusy(true); setError('')
    try { await billsApi.download(id) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  if (!user) return <Navigate to="/login" state={{ from: `/bills/${orderId}` }} replace />
  if (loading) return <section className="page-shell"><Loading label="Preparing your bill…" /></section>
  if (error && !details) return <section className="page-shell"><ErrorMessage message={error} retry={() => window.location.reload()} /><Link to={`/orders/${orderId}`} className="inline-link">Back to order</Link></section>
  if (!details) return null
  const { bill, order, items } = details
  return <section className="page-shell bill-page"><div className="bill-top"><div><span className="eyebrow">BOOKHUB BILL</span><h1>{bill.bill_number}</h1></div><button className="button button-dark" onClick={download} disabled={busy}>{busy ? 'Preparing…' : 'Download bill (.json)'}</button></div>{error && <ErrorMessage message={error} />}<div className="bill-meta"><div><span>Bill generated</span><strong>{new Date(bill.generated_at).toLocaleString()}</strong></div><div><span>Order</span><strong>#{order.order_id}</strong></div><div><span>Status</span><StatusBadge status={order.order_status} /></div><div><span>Payment</span><strong>{bill.payment_method} · {bill.payment_status}</strong></div><div><span>Expected delivery</span><strong>{formatCalendarDate(order.expected_delivery_date)}</strong></div></div><div className="order-items"><h2>Purchased books</h2>{items.map((item) => <div className="order-item" key={item.order_item_id}><div><strong>{item.title}</strong><span>Qty {item.quantity}</span></div><span>{formatPrice(item.unit_price)} each</span><strong>{formatPrice(item.subtotal)}</strong></div>)}</div><div className="bill-totals"><div><span>Subtotal</span><strong>{formatPrice(bill.subtotal)}</strong></div><div><span>Delivery</span><strong>{formatPrice(bill.delivery_charge)}</strong></div><div className="grand-total"><span>Grand total</span><strong>{formatPrice(bill.grand_total)}</strong></div></div><p className="muted">Delivery address: {order.delivery_address}</p></section>
}
