import { getJson, postJson } from '@/shared/api/http'
import type { PanelUser } from '@/shared/lib/auth-storage'

export const adminKeys = {
  supports: ['admin', 'supports'] as const,
}

export type SupportType = 'web' | 'ai'

export type CreateSupportPayload = {
  name: string
  phone: string
  password: string
  support_type: SupportType
}

export type SupportListItem = Pick<PanelUser, 'id' | 'name' | 'phone' | 'support_type'> & {
  created_at: string
}

export function createSupport(payload: CreateSupportPayload): Promise<{ message: string; user: PanelUser }> {
  return postJson<CreateSupportPayload, { message: string; user: PanelUser }>(
    '/api/admin/supports',
    payload,
  )
}

export function getSupports(): Promise<{ data: SupportListItem[] }> {
  return getJson<{ data: SupportListItem[] }>('/api/admin/supports')
}
