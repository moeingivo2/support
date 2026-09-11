import { lazy } from 'react'

const RequiredFilesPage = lazy(() => import('./pages/RequiredFilesPage'))

export default function RequiredFilesRoute() {
  return <RequiredFilesPage />
}
