import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import RequirePermission from './components/RequirePermission'
import AdminLayout from './components/layout/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import Orders from './pages/Orders'
import Categories from './pages/Categories'
import Brands from './pages/Brands'
import BrandProductsPage from './pages/BrandProductsPage'
import BrandForm from './pages/BrandForm'
import BrandBulkPricing from './pages/BrandBulkPricing'
import Employees from './pages/Employees'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/products" element={<Products />} />
              <Route path="/admin/products/new" element={<ProductForm />} />
              <Route path="/admin/products/:id/edit" element={<ProductForm />} />
              <Route path="/admin/orders" element={<Orders />} />
              <Route path="/admin/categories" element={<Categories />} />
              <Route
                path="/admin/brands"
                element={
                  <RequirePermission permission="brands.view">
                    <Brands />
                  </RequirePermission>
                }
              />
              {/* One generic per-brand products screen for ALL five brands
                  (also serves the legacy /admin/brands/arees + dahab URLs). */}
              <Route
                path="/admin/brands/:slug"
                element={
                  <RequirePermission permission="brands.view">
                    <BrandProductsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/brands/:slug/edit"
                element={
                  <RequirePermission permission="brands.edit">
                    <BrandForm />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/brands/bulk-pricing"
                element={
                  <RequirePermission permission="brands.view">
                    <BrandBulkPricing />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/employees"
                element={
                  <RequirePermission permission="employees.view">
                    <Employees />
                  </RequirePermission>
                }
              />
            </Route>
          </Route>

          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
