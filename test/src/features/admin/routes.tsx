import { lazy } from 'react'

const RegisterSupportPage = lazy(() => import('./pages/RegisterSupportPage'))
const AllReportsPage = lazy(() => import('./pages/AllReportsPage'))

export function RegisterSupportRoute() {
  return <RegisterSupportPage />
}

export function AllReportsRoute() {
  return <AllReportsPage />
}
