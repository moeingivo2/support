import { lazy } from 'react'

const AccountPage = lazy(() => import('./pages/AccountPage'))

export function AccountRoute() {
  return <AccountPage />
}
