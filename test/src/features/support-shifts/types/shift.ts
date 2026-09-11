export type ShiftChannel = 'web' | 'ai' | 'phone'

export type ShiftStatus = 'active' | 'ended'

export interface Shift {
  id: number
  user_id: number
  channel: string
  start_time: string
  end_time: string | null
  status: ShiftStatus | (string & {})
  created_at: string
  updated_at: string
  user?: {
    id: number
    name: string
  }
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

export type StartShiftPayload = {
  channel: ShiftChannel
}

export type StartShiftResponse = {
  message: string
  shift: Shift
}

export type EndShiftResponse = {
  message: string
  shift: Shift
}

export type ActiveShiftsResponse = {
  count: number
  shifts: Shift[]
}

export type CurrentShiftResponse = {
  data: Shift | null
}
