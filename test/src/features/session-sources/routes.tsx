import { lazy } from 'react'

const SessionSourcesPage = lazy(() => import('./pages/SessionSourcesPage'))

export default function SessionSourcesRoute() {
  return <SessionSourcesPage />
}
