import { getJson } from '@/shared/api/http'
import type { LaravelPagination, ShiftReport } from '../types/shiftReport'

export type ShiftReportsPagination = Omit<LaravelPagination<ShiftReport>, 'data'>

export type MyShiftReportsPage = {
  items: ShiftReport[]
  summary: ShiftReportSummary
  pagination: ShiftReportsPagination
}

export type ShiftReportSummary = {
  respondedStudents: number
  unsatisfiedStudents: number
  deskRequests: number
  calls: number
}

export const shiftReportKeys = {
  all: ['my-shift-reports'] as const,
  list: (page: number) => [...shiftReportKeys.all, 'list', page] as const,
}

export async function getMyReports(page: number): Promise<MyShiftReportsPage> {
  const response = await getJson<LaravelPagination<ShiftReport>>(
    '/api/shift-reports/my',
    { page },
  )

  return {
    items: response.data,
    summary: buildSummary(response.data),
    pagination: getPagination(response),
  }
}

// جمع صفحه جاری؛ برای جمع کل دقیق، سمت سرور endpoint تجمیعی لازم است.
function buildSummary(reports: ShiftReport[]): ShiftReportSummary {
  return {
    respondedStudents: reports.reduce((total, report) => total + report.responded_students_count, 0),
    unsatisfiedStudents: reports.reduce(
      (total, report) => total + report.unsatisfied_students_count,
      0,
    ),
    deskRequests: reports.reduce((total, report) => total + report.desk_requests_count, 0),
    calls: reports.reduce((total, report) => total + report.calls_count, 0),
  }
}

function getPagination(response: LaravelPagination<ShiftReport>): ShiftReportsPagination {
  return {
    current_page: response.current_page,
    first_page_url: response.first_page_url,
    from: response.from,
    last_page: response.last_page,
    last_page_url: response.last_page_url,
    links: response.links,
    next_page_url: response.next_page_url,
    path: response.path,
    per_page: response.per_page,
    prev_page_url: response.prev_page_url,
    to: response.to,
    total: response.total,
  }
}
