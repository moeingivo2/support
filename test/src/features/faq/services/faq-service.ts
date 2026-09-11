import { getJson } from '@/shared/api/http'
import type { Faq } from '../types/faq'

export const faqKeys = {
  all: ['faqs'] as const,
  list: (category?: string, search?: string) =>
    [...faqKeys.all, 'list', { category, search }] as const,
}

export function getFaqs(params: { category?: string; search?: string } = {}): Promise<Faq[]> {
  return getJson<Faq[]>('/api/faqs', {
    category: params.category || undefined,
    search: params.search || undefined,
  })
}

export const FAQ_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'laragon', label: 'Laragon' },
  { value: 'xampp', label: 'XAMPP' },
  { value: 'ioncube', label: 'ionCube' },
  { value: 'other', label: 'سایر' },
]

export function categoryLabel(value: string | null): string {
  if (!value) return 'بدون دسته'
  return FAQ_CATEGORIES.find((item) => item.value === value)?.label ?? value
}
