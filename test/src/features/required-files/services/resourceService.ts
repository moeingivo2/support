import { getJson } from '@/shared/api/http'
import type { LaravelPagination, Resource } from '../types/resource'

export type RequiredFilesFilters = {
  page: number
  search?: string
  category?: string
}

export type RequiredFilesPagination = Omit<LaravelPagination<Resource>, 'data'>

export type RequiredFilesPage = {
  items: Resource[]
  pagination: RequiredFilesPagination
}

export const requiredFileKeys = {
  all: ['required-files'] as const,
  list: (filters: RequiredFilesFilters) =>
    [...requiredFileKeys.all, 'list', filters] as const,
}

export function formatResourceDate(date: string): string {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date(date))
}

// فیلتر type/search/category سمت سرور اعمال می‌شود و صفحه‌بندی لاراول حفظ می‌شود.
export async function getRequiredFiles(
  filters: RequiredFilesFilters,
): Promise<RequiredFilesPage> {
  const response = await getJson<LaravelPagination<Resource>>('/api/resources', {
    page: filters.page,
    type: 'required_file',
    search: filters.search?.trim() || undefined,
    category: filters.category?.trim() || undefined,
  })

  return {
    items: response.data,
    pagination: getPagination(response),
  }
}

function getPagination(response: LaravelPagination<Resource>): RequiredFilesPagination {
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
