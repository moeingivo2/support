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

export interface ShiftReportUser {
  id: number
  name: string
  email: string
  email_verified_at: string | null
  created_at: string
  updated_at: string
  role: string
}

export interface ShiftReport {
  id: number
  shift_id: number
  user_id: number
  responded_students_count: number
  unsatisfied_students_count: number
  desk_requests_count: number
  calls_count: number
  extra_notes: string | null
  created_at: string
  updated_at: string
  shift: Shift
  user: ShiftReportUser
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
  report: ShiftReport
}

export interface LaravelPaginationLink {
  url: string | null
  label: string
  active: boolean
}

export interface LaravelPagination<TData> {
  current_page: number
  data: TData[]
  first_page_url: string
  from: number | null
  last_page: number
  last_page_url: string
  links: LaravelPaginationLink[]
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}
