import { BrowserRouter, Route, Routes, Link } from 'react-router-dom'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import Admin from './pages/Admin'
import { Login, Profile, Register } from './pages/Account'
import { BookDetails, Books, Categories, Home } from './pages/Catalog'
import { BillPage, CartPage, Checkout, OrderDetails, Orders } from './pages/Shopping'

function NotFound() {
  return <section className="page-shell not-found"><span className="eyebrow">404 · LOST IN THE STACKS</span><h1>This page wandered off.</h1><p>Let’s get you back to a good book.</p><Link to="/books" className="button button-dark">Browse books</Link></section>
}

export default function App() {
  return <BrowserRouter><AuthProvider><div className="app"><Navbar /><main className="main-content"><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/books" element={<Books />} />
    <Route path="/books/:bookId" element={<BookDetails />} />
    <Route path="/categories" element={<Categories />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
    <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
    <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
    <Route path="/orders/:orderId" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
    <Route path="/bills/:orderId" element={<ProtectedRoute><BillPage /></ProtectedRoute>} />
    <Route path="/admin/*" element={<ProtectedRoute admin><Admin /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes></main><Footer /></div></AuthProvider></BrowserRouter>
}
