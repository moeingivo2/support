import { lazy } from 'react'

const StudentComplaintsPage = lazy(() => import('./pages/StudentComplaintsPage'))

export default function StudentComplaintsRoute() {
  return <StudentComplaintsPage />
}
