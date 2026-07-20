import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import './AdminLayout.css'

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="admin-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="admin-main">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
