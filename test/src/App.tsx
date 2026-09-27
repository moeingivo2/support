import { Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import AppShell from '@/shell/components/app-shell'
import StudentShell from '@/shell/components/student-shell'
import LoginPage from '@/features/auth/pages/LoginPage'
import StudentLoginPage from '@/features/student-auth/pages/StudentLoginPage'
import StudentRegisterPage from '@/features/student-auth/pages/StudentRegisterPage'
import ForgotPasswordPage from '@/features/student-auth/pages/ForgotPasswordPage'
import { ChatRoute } from '@/features/student-chat/routes'
import { AccountRoute } from '@/features/student-account/routes'
import { SupportInboxRoute } from '@/features/support-chat/routes'
import DashboardRoute from '@/features/dashboard/routes'
import SupportShiftsRoute from '@/features/support-shifts/routes'
import StudentComplaintsRoute from '@/features/student-complaints/routes'
import SessionSourcesRoute from '@/features/session-sources/routes'
import RequiredFilesRoute from '@/features/required-files/routes'
import FaqRoute from '@/features/faq/routes'
import TrainingVideosRoute from '@/features/training-videos/routes'
import MyShiftReportsRoute from '@/features/my-shift-reports/routes'
import EndShiftReportRoute from '@/features/end-shift-report/routes'
import {
  ActivityReportRoute,
  AllReportsRoute,
  ManageAdminsRoute,
  RegisterSupportRoute,
} from '@/features/admin/routes'
import { AuthProvider, useAuth } from '@/shared/services/auth-context'
import { ToastProvider } from '@/shared/ui/toast'
import RouteTransitionSplash from '@/shared/ui/route-transition-splash'
import LoginSplash from '@/features/auth/components/LoginSplash'

const supportOnlyPaths = new Set(['/support-shifts', '/end-shift-report', '/reports'])
const adminOnlyPaths = new Set(['/all-reports', '/register-support', '/activity-report', '/manage-admins'])

const routeComponents: Record<string, React.ComponentType> = {
  '/': DashboardRoute,
  '/inbox': SupportInboxRoute,
  '/support-shifts': SupportShiftsRoute,
  '/student-complaints': StudentComplaintsRoute,
  '/sessions': SessionSourcesRoute,
  '/files': RequiredFilesRoute,
  '/faq': FaqRoute,
  '/training-videos': TrainingVideosRoute,
  '/reports': MyShiftReportsRoute,
  '/end-shift-report': EndShiftReportRoute,
  '/all-reports': AllReportsRoute,
  '/activity-report': ActivityReportRoute,
  '/manage-admins': ManageAdminsRoute,
  '/register-support': RegisterSupportRoute,
}

function PanelRoutes() {
  const { user } = useAuth()
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

function StudentRoutes() {
  return (
    <StudentShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/chat" element={<ChatRoute />} />
          <Route path="/account" element={<AccountRoute />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </Suspense>
    </StudentShell>
  )
}

function GuestRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/register" element={<StudentRegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<StudentLoginPage />} />
        <Route path="/panel-login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}

function AppRoutes() {
  const { isAuthenticated, user, showLoginSplash, completeLoginSplash } = useAuth()
  const queryClient = useQueryClient()

  // در صورت انقضای نشست (401 سراسری)، کش ریست و به لاگین هدایت می‌شویم
  useEffect(() => {
    function onUnauthorized() {
      queryClient.clear()
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [queryClient])

  return (
    <>
      {!isAuthenticated ? (
        <GuestRoutes />
      ) : user?.role === 'student' ? (
        <StudentRoutes />
      ) : (
        <PanelRoutes />
      )}
      {showLoginSplash ? <LoginSplash onComplete={completeLoginSplash} /> : null}
      <RouteTransitionSplash />
    </>
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
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
