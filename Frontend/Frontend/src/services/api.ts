import axios from 'axios'
import type { ApiResponse, BillDetails, Book, BookInput, Cart, Category, CategoryInput, CheckoutPreview, OnlineOrderResult, Order, OrderItem, PaymentConfiguration, RazorpayCheckoutResponse, RazorpayOrder, User } from '../types'

const TOKEN_KEY = 'bookhub_token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event('bookhub:session-expired'))
    }
    return Promise.reject(error)
  },
)

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) return 'You do not have permission to perform this action.'
    if (typeof error.response?.data?.message === 'string') return error.response.data.message
    if (!error.response) return 'Unable to connect to BookHub. Check that the backend is running.'
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export const authApi = {
  async login(email: string, password: string) {
    const { data } = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', { email, password })
    return data.data
  },
  async register(input: { full_name: string; email: string; password: string; phone: string }) {
    const { data } = await api.post<ApiResponse<User>>('/auth/register', input)
    return data.data
  },
  async profile() {
    const { data } = await api.get<ApiResponse<User>>('/auth/profile')
    return data.data
  },
}

export const booksApi = {
  async list() {
    const { data } = await api.get<ApiResponse<Book[]>>('/books')
    return data.data
  },
  async get(id: number) {
    const { data } = await api.get<ApiResponse<Book>>(`/books/${id}`)
    return data.data
  },
  async create(input: BookInput) {
    const { data } = await api.post<ApiResponse<Book>>('/books', input)
    return data.data
  },
  async update(id: number, input: BookInput) {
    const { data } = await api.put<ApiResponse<Book>>(`/books/${id}`, input)
    return data.data
  },
  async deactivate(id: number) {
    await api.delete(`/books/${id}`)
  },
}

export const categoriesApi = {
  async list() {
    const { data } = await api.get<ApiResponse<Category[]>>('/categories')
    return data.data
  },
  async create(input: CategoryInput) {
    const { data } = await api.post<ApiResponse<Category>>('/categories', input)
    return data.data
  },
  async update(id: number, input: CategoryInput) {
    const { data } = await api.put<ApiResponse<Category>>(`/categories/${id}`, input)
    return data.data
  },
  async remove(id: number) {
    await api.delete(`/categories/${id}`)
  },
}

export const cartApi = {
  async get() {
    const { data } = await api.get<ApiResponse<Cart>>('/cart')
    return data.data
  },
  async add(book_id: number, quantity: number) {
    const { data } = await api.post<ApiResponse<Cart>>('/cart', { book_id, quantity })
    return data.data
  },
  async update(bookId: number, quantity: number) {
    const { data } = await api.put<ApiResponse<Cart>>(`/cart/${bookId}`, { quantity })
    return data.data
  },
  async remove(bookId: number) {
    const { data } = await api.delete<ApiResponse<Cart>>(`/cart/${bookId}`)
    return data.data
  },
  async clear() {
    const { data } = await api.delete<ApiResponse<Cart>>('/cart')
    return data.data
  },
}

export const ordersApi = {
  async checkoutPreview() {
    const { data } = await api.get<ApiResponse<CheckoutPreview>>('/orders/checkout-preview')
    return data.data
  },
  async list() {
    const { data } = await api.get<ApiResponse<Order[]>>('/orders')
    return data.data
  },
  async get(id: number) {
    const { data } = await api.get<ApiResponse<Order>>(`/orders/${id}`)
    return data.data
  },
  async items(id: number) {
    const { data } = await api.get<ApiResponse<OrderItem[]>>(`/orders/${id}/items`)
    return data.data
  },
  async create(delivery_address: string, payment_method: 'COD' | 'ONLINE' = 'COD') {
    const { data } = await api.post<ApiResponse<Order | OnlineOrderResult>>('/orders', { delivery_address, payment_method })
    return data.data
  },
  async createPayment(id: number) {
    const { data } = await api.post<ApiResponse<RazorpayOrder>>(`/orders/${id}/payment`)
    return data.data
  },
  async verifyPayment(id: number, response: RazorpayCheckoutResponse) {
    const { data } = await api.post<ApiResponse<{ duplicate: boolean; refund_required: boolean }>>(`/orders/${id}/payment/verify`, response)
    return data.data
  },
  async cancel(id: number) {
    const { data } = await api.put<ApiResponse<Order>>(`/orders/${id}/cancel`)
    return data.data
  },
}

export const paymentsApi = {
  async configuration() {
    const { data } = await api.get<ApiResponse<PaymentConfiguration>>('/payments/config')
    return data.data
  },
}

export const billsApi = {
  async get(orderId: number) {
    const { data } = await api.get<ApiResponse<BillDetails>>(`/bills/${orderId}`)
    return data.data
  },
  async download(orderId: number) {
    const { data } = await api.get(`/bills/${orderId}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `bookhub-bill-${orderId}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  },
}

export const TOKEN_STORAGE_KEY = TOKEN_KEY
