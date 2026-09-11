import { lazy } from 'react'

const MyShiftReportsPage = lazy(() => import('./pages/MyShiftReportsPage'))

export default function MyShiftReportsRoute() {
  return <MyShiftReportsPage />
}
