import { getJson, postJson } from '@/shared/api/http'
import type {
  CreateShiftReportPayload,
  CreateShiftReportResponse,
  Shift,
} from '../types/shiftReport'
import type { LaravelPagination } from '@/features/support-shifts/types/shift'

export const CREATE_SHIFT_REPORT_ENDPOINT = '/api/shift-reports'

export const shiftReportQueryKeys = {
  currentShift: ['current-shift'] as const,
  myReports: ['my-shift-reports'] as const,
  dashboard: ['dashboard'] as const,
}

type PendingShiftsResponse = {
  count: number
  shifts: Shift[]
}

/**
 * بک‌اند گزارش را فقط برای شیفتِ پایان‌یافته می‌پذیرد؛ بنابراین «شیفت هدفِ گزارش»
 * آخرین شیفتِ پایان‌یافته‌ای است که هنوز گزارشی ثبت نشده است.
 */
export async function getReportableShift(): Promise<Shift | null> {
  const pending = await getJson<PendingShiftsResponse>('/api/shift-reports/pending')
  if (pending.count === 0) {
    return null
  }

  // shifts بر اساس end_time نزولی مرتب می‌شوند؛ گارد تایپ برای رندر امن
  const candidates = pending.shifts.filter((shift) => shift.status === 'ended')
  return candidates[0] ?? null
}

export async function getCurrentShift(): Promise<Shift | null> {
  const response = await getJson<{ data: Shift | null }>('/api/shifts/current')
  return response.data
}

export async function createShiftReport(
  payload: CreateShiftReportPayload,
): Promise<CreateShiftReportResponse> {
  return postJson<CreateShiftReportPayload, CreateShiftReportResponse>(
    CREATE_SHIFT_REPORT_ENDPOINT,
    payload,
  )
}

export type { LaravelPagination }
