import type { DashboardResponse } from '../api/dashboard-api'

export type DashboardMetrics = DashboardResponse['data']

export const dashboardKeys = {
  all: ['dashboard'] as const,
}

export function mapDashboardMetrics(
  response: DashboardResponse,
): DashboardMetrics {
  const { data } = response
  const metrics: Array<keyof DashboardMetrics> = [
    'weeklySatisfaction',
    'answeredStudents',
    'mentorIssues',
    'availableServices',
  ]

  for (const metric of metrics) {
    const value = data[metric]
    if (value === undefined || value === null) {
      throw new Error('اطلاعات داشبورد کامل نیست.')
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('اطلاعات داشبورد معتبر نیست.')
    }
  }

  return data
}
