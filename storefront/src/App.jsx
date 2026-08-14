import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import CanonicalLink from './components/seo/CanonicalLink'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import StickyWhatsApp from './components/ui/StickyWhatsApp'

// Route-level code splitting: each page ships as its own chunk and is only
// downloaded when its route is visited. The first visit to a route shows the
// minimal Suspense fallback for a few ms while the chunk loads (cached
// afterwards), so the initial bundle stays lean — only the app shell + the
// current page's code are ever fetched.
const Home = lazy(() => import('./pages/Home'))
const Shop = lazy(() => import('./pages/Shop'))
const Categories = lazy(() => import('./pages/Categories'))
const CategoryProducts = lazy(() => import('./pages/CategoryProducts'))
const BrandProducts = lazy(() => import('./pages/BrandProducts'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const Cart = lazy(() => import('./pages/Cart'))
const TrackOrder = lazy(() => import('./pages/TrackOrder'))
const ViewOrder = lazy(() => import('./pages/ViewOrder'))

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

// Minimal fallback while a lazy route chunk loads on first visit. Just a
// centered line of text — the page-fade transition + skeletons take over as
// soon as the page mounts.
function RouteFallback() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      Loading…
    </div>
  )
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
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
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
