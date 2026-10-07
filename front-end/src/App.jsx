import { useCallback, useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './hooks/useToast.jsx'
import { api } from './lib/api.js'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Shift from './pages/Shift.jsx'
import Complaints from './pages/Complaints.jsx'
import Resources from './pages/Resources.jsx'
import Faq from './pages/Faq.jsx'
import Videos from './pages/Videos.jsx'
import Reports from './pages/Reports.jsx'

function Shell() {
  const { user, logout } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeShift, setActiveShift] = useState(null)

  // شیفت فعال کاربر را در شروع و پس از هر تغییر واکشی کن
  const fetchActiveShift = useCallback(() => {
    if (!user) return
    api
      .get('/shifts/active')
      .then((res) => {
        const mine = (res.shifts || []).find((s) => s.user?.id === user.id)
        setActiveShift(mine || null)
      })
      .catch(() => {})
  }, [user])

  useEffect(fetchActiveShift, [fetchActiveShift])

  if (!user) {
    return (
      <Login
        onSuccess={() => {
          // fetchActiveShift با تغییر user اجرا می‌شود
        }}
      />
    )
  }

  const pages = {
    dashboard: Dashboard,
    shift: Shift,
    complaints: Complaints,
    resources: Resources,
    faq: Faq,
    videos: Videos,
    reports: Reports,
  }

  const PageComp = pages[page] || Dashboard

  return (
    <div className="app">
      <Sidebar
        active={page}
        onChange={setPage}
        user={user}
        onLogout={logout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main">
        <div className="topbar">
          <button className="btn sm menu-btn" onClick={() => setSidebarOpen(true)} aria-label="منو">
            ☰
          </button>
          <div className="spacer" />
          <div className="user-chip">
            <div className="avatar">{(user.name || '؟').slice(0, 1)}</div>
            <div className="name">{user.name}</div>
            <span className={`badge ${user.role === 'admin' ? 'blue' : 'gray'}`}>
              {user.role === 'admin' ? 'مدیر' : 'پشتیبان'}
            </span>
          </div>
        </div>

        <PageComp
          activeShift={activeShift}
          onStartShift={fetchActiveShift}
          onEndShift={fetchActiveShift}
          onNavigate={setPage}
        />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ToastProvider>
  )
}
