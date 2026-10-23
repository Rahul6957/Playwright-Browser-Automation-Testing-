export interface ApiResponse<T> {
  success: boolean
  message?: string
  count?: number
  data: T
}

export interface User {
  user_id: number
  full_name: string
  email: string
  phone: string | null
  role: 'USER' | 'ADMIN'
  created_at?: string
}

export interface Book {
  book_id: number
  category_id: number
  title: string
  author: string
  description: string | null
  price: string | number
  stock: number
  image_url: string | null
}

export interface Category {
  category_id: number
  category_name: string
  description: string | null
}

export interface CartItem {
  book_id: number
  title: string
  author: string
  image_url: string | null
  quantity: number
  unit_price: string | number
  subtotal: string | number
}

export interface Cart {
  cart_id: number | null
  items: CartItem[]
  total: string | number
}

export interface Order {
  order_id: number
  user_id: number
  order_date: string
  expected_delivery_date: string | null
  total_amount: string | number
  delivery_address: string
  order_status: string
  cancelled_at?: string | null
  payment_method?: 'COD' | 'ONLINE'
  payment_status?: string
  gateway_order_id?: string | null
  gateway_payment_id?: string | null
  refund_status?: string
  gateway_refund_id?: string | null
}

export interface RazorpayOrder {
  key_id: string
  gateway_order_id: string
  amount: number
  currency: 'INR'
  order_id: number
}

export interface OnlineOrderResult {
  order: Order
  payment: RazorpayOrder | null
  payment_setup_error: string | null
}

export interface PaymentConfiguration {
  configured: boolean
  key_id: string | null
}

export interface CheckoutPreview {
  expected_delivery_date: string
}

export interface RazorpayCheckoutResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface RazorpayCheckoutOptions {
  key: string
  amount: number
  currency: 'INR'
  name: string
  description: string
  order_id: string
  prefill: { name: string; email: string; contact?: string }
  method: { card: boolean; upi: boolean; netbanking: boolean }
  handler: (response: RazorpayCheckoutResponse) => void | Promise<void>
  modal: { ondismiss: () => void }
}

export interface RazorpayCheckoutFailure {
  error?: { description?: string }
}

export interface RazorpayCheckoutInstance {
  open(): void
  on(event: 'payment.failed', callback: (response: RazorpayCheckoutFailure) => void): void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance
  }
}

export interface OrderItem {
  order_item_id: number
  book_id: number
  title: string
  author: string
  quantity: number
  unit_price: string | number
  subtotal: string | number
}

export interface Bill {
  bill_id: number
  order_id: number
  bill_number: string
  subtotal: string | number
  delivery_charge: string | number
  grand_total: string | number
  payment_method: string
  payment_status: string
  generated_at: string
}

export interface BillDetails {
  bill: Bill
  order: Order
  items: OrderItem[]
}

export interface BookInput {
  category_id: number
  title: string
  author: string
  description: string
  price: string
  stock: number
  image_url: string
}

export interface CategoryInput {
  category_name: string
  description: string
}
