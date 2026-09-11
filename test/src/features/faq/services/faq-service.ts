import { deleteJson, getJson, postJson, putJson } from '@/shared/api/http'
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

export type FaqPayload = {
  question: string
  answer: string
  category: string | null
}

export async function createFaq(payload: FaqPayload): Promise<{ message: string; faq: Faq }> {
  return postJson<FaqPayload, { message: string; faq: Faq }>('/api/faqs', payload)
}

export async function updateFaq(
  id: number,
  payload: FaqPayload,
): Promise<{ message: string; faq: Faq }> {
  return putJson<FaqPayload, { message: string; faq: Faq }>(`/api/faqs/${id}`, payload)
}

export async function deleteFaq(id: number): Promise<{ message: string }> {
  return deleteJson<{ message: string }>(`/api/faqs/${id}`)
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
