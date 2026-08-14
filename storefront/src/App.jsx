import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import CanonicalLink from './components/seo/CanonicalLink'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import StickyWhatsApp from './components/ui/StickyWhatsApp'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Categories from './pages/Categories'
import CategoryProducts from './pages/CategoryProducts'
import BrandProducts from './pages/BrandProducts'
import ProductDetail from './pages/ProductDetail'
import About from './pages/About'
import Contact from './pages/Contact'
import Cart from './pages/Cart'
import TrackOrder from './pages/TrackOrder'
import ViewOrder from './pages/ViewOrder'

// Scroll the window back to the top on every route change — the single scroll
// handler for the app. Checkout must always open at the top, never inheriting
// the previous page's scroll position or a stale hash.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

// Very subtle page-content fade on every route change (200–300ms, opacity
// only — NO transform, see animations.css: a persisted transform creates a
// containing block that breaks position:fixed descendants like the sticky
// mobile Add-to-Cart bar). Keying by pathname remounts the current page so
// the fade replays on navigation — browser back/forward is unaffected, no
// routes or duplicate pages are created, and reduced-motion users get no
// movement.
function PageContent() {
  const { pathname } = useLocation()
  return (
    <main id="main-content">
      <div key={pathname} className="page-fade">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:slug" element={<CategoryProducts />} />
          <Route path="/brand/:slug" element={<BrandProducts />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/checkout" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/view-order" element={<ViewOrder />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <CartProvider>
      <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            {/* Per-route canonical URL — always the apex domain, never www. */}
            <CanonicalLink />
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <Navbar />
          <PageContent />
          <Footer />
          {/* Floating WhatsApp contact — rendered once at the storefront
              root so it appears on every customer-facing page. The admin app
              is a separate build, so it never appears there. */}
          <StickyWhatsApp />
        </BrowserRouter>
      </ToastProvider>
    </CartProvider>
  )
}
