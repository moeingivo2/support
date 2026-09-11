import { lazy } from 'react'

const TrainingVideosPage = lazy(() => import('./pages/TrainingVideosPage'))

export default function TrainingVideosRoute() {
  return <TrainingVideosPage />
}
