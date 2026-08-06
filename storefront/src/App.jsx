import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import DeliveryBar from './components/layout/DeliveryBar'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Categories from './pages/Categories'
import CategoryProducts from './pages/CategoryProducts'
import BrandProducts from './pages/BrandProducts'
import ProductDetail from './pages/ProductDetail'
import About from './pages/About'
import Contact from './pages/Contact'
import Cart from './pages/Cart'

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <DeliveryBar />
        <Navbar />
        <main id="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/:slug" element={<CategoryProducts />} />
            <Route path="/brand/:slug" element={<BrandProducts />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </CartProvider>
  )
}
