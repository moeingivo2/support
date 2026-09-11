import { lazy } from 'react'

const EndShiftReportPage = lazy(() => import('./pages/EndShiftReportPage'))

export default function EndShiftReportRoute() {
  return <EndShiftReportPage />
}
