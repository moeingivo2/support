import { getJson } from '@/shared/api/http'

export type DashboardResponse = {
  data: {
    weeklySatisfaction: number
    answeredStudents: number
    mentorIssues: number
    availableServices: number
  }
}

export async function getDashboardData(): Promise<DashboardResponse> {
  return getJson<DashboardResponse>('/api/dashboard')
}
