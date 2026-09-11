import { lazy } from 'react'

const SupportShiftsPage = lazy(() => import('./pages/SupportShiftsPage'))

export default function SupportShiftsRoute() {
  return <SupportShiftsPage />
}
