import { lazy } from 'react'

const FaqPage = lazy(() => import('./pages/FaqPage'))

export default function FaqRoute() {
  return <FaqPage />
}
