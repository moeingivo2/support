export type ShiftStatus = 'active' | 'ended' | 'pending' | 'cancelled'

export type MaybeUnknownStatus<T extends string> = T | (string & {})

export interface Shift {
  id: number
  user_id: number
  channel: string
  start_time: string
  end_time: string | null
  status: MaybeUnknownStatus<ShiftStatus>
  created_at: string
  updated_at: string
}

export interface CreateShiftReportPayload {
  shift_id: number
  responded_students_count: number
  unsatisfied_students_count: number
  desk_requests_count: number
  calls_count: number
  extra_notes: string | null
}

export type CreateShiftReportResponse = {
  message: string
  report: unknown
}
