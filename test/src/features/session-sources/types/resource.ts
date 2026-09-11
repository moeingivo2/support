export interface ResourceCreator {
  id: number
  name: string
}

export interface Resource {
  id: number
  title: string
  description: string | null
  type: string
  file_url: string
  category: string | null
  created_by: number
  created_at: string
  updated_at: string
  creator: ResourceCreator
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