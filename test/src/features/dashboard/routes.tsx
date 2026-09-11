import { lazy } from 'react'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))

export default function DashboardRoute() {
  return <DashboardPage />
}
