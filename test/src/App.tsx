import { Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import AppShell from '@/shell/components/app-shell'
import LoginPage from '@/features/auth/pages/LoginPage'
import DashboardRoute from '@/features/dashboard/routes'
import SupportShiftsRoute from '@/features/support-shifts/routes'
import StudentComplaintsRoute from '@/features/student-complaints/routes'
import SessionSourcesRoute from '@/features/session-sources/routes'
import RequiredFilesRoute from '@/features/required-files/routes'
import FaqRoute from '@/features/faq/routes'
import TrainingVideosRoute from '@/features/training-videos/routes'
import MyShiftReportsRoute from '@/features/my-shift-reports/routes'
import EndShiftReportRoute from '@/features/end-shift-report/routes'
import { AllReportsRoute, RegisterSupportRoute } from '@/features/admin/routes'
import { AuthProvider, useAuth } from '@/shared/services/auth-context'

const supportOnlyPaths = new Set(['/support-shifts', '/end-shift-report', '/reports'])
const adminOnlyPaths = new Set(['/all-reports', '/register-support'])

const routeComponents: Record<string, React.ComponentType> = {
  '/': DashboardRoute,
  '/support-shifts': SupportShiftsRoute,
  '/student-complaints': StudentComplaintsRoute,
  '/sessions': SessionSourcesRoute,
  '/files': RequiredFilesRoute,
  '/faq': FaqRoute,
  '/training-videos': TrainingVideosRoute,
  '/reports': MyShiftReportsRoute,
  '/end-shift-report': EndShiftReportRoute,
  '/all-reports': AllReportsRoute,
  '/register-support': RegisterSupportRoute,
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth()
  const queryClient = useQueryClient()

  // در صورت انقضای نشست (401 سراسری)، کش ریست و به لاگین هدایت می‌شویم
  useEffect(() => {
    function onUnauthorized() {
      queryClient.clear()
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [queryClient])

  if (!isAuthenticated) {
    return <LoginPage />
  }

  const isAdmin = user?.role === 'admin'

  function renderWithGuard(path: string) {
    if (supportOnlyPaths.has(path) && isAdmin) return <Navigate to="/" replace />
    if (adminOnlyPaths.has(path) && !isAdmin) return <Navigate to="/" replace />
    const RouteComponent = routeComponents[path]!
    return <RouteComponent />
  }

  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {Object.keys(routeComponents).map((path) => (
            <Route key={path} path={path} element={renderWithGuard(path)} />
          ))}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

function PageFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="h-40 animate-pulse rounded-4xl border border-border/10 bg-deactive-btn-gray/70" />
      <div className="h-72 animate-pulse rounded-4xl border border-border/10 bg-deactive-btn-gray/70" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
