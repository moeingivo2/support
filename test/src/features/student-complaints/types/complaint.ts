export type ComplaintPriority = 'high' | 'normal' | 'low'

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved'

export interface ComplaintStudent {
  id: number
  name: string
  student_code: string | null
  phone: string | null
}

export interface ComplaintMentor {
  id: number
  name: string
  phone: string | null
}

export interface ComplaintSupport {
  id: number
  name: string
}

export interface Complaint {
  id: number
  student_id: number
  mentor_id: number
  support_id: number
  shift_id: number | null
  description: string
  priority: ComplaintPriority | (string & {})
  status: ComplaintStatus | (string & {})
  created_at: string
  updated_at: string
  student: ComplaintStudent
  mentor: ComplaintMentor
  support?: ComplaintSupport
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

export type CreateComplaintPayload = {
  student_name: string
  student_code?: string | null
  student_phone?: string | null
  mentor_name: string
  mentor_phone?: string | null
  description: string
  priority: ComplaintPriority
  shift_id?: number | null
}

export type CreateComplaintResponse = {
  message: string
  complaint: Complaint
}
