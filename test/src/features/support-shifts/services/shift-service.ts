import { getJson, postJson } from '@/shared/api/http'
import type {
  ActiveShiftsResponse,
  CurrentShiftResponse,
  EndShiftResponse,
  LaravelPagination,
  Shift,
  StartShiftPayload,
  StartShiftResponse,
} from '../types/shift'

const SHIFT_KEYS_ROOT = ['shifts'] as const

export const shiftServiceKeys = {
  all: SHIFT_KEYS_ROOT,
  my: (page: number) => [...SHIFT_KEYS_ROOT, 'my', page] as const,
  active: [...SHIFT_KEYS_ROOT, 'active'] as const,
  current: [...SHIFT_KEYS_ROOT, 'current'] as const,
}

export function getMyShifts(page: number): Promise<LaravelPagination<Shift>> {
  return getJson<LaravelPagination<Shift>>('/api/shifts/my', { page })
}

export function getActiveShifts(): Promise<ActiveShiftsResponse> {
  return getJson<ActiveShiftsResponse>('/api/shifts/active')
}

export function getCurrentShift(): Promise<Shift | null> {
  return getJson<CurrentShiftResponse>('/api/shifts/current').then(
    (response) => response.data,
  )
}

export function startShift(payload: StartShiftPayload): Promise<StartShiftResponse> {
  return postJson<StartShiftPayload, StartShiftResponse>('/api/shifts/start', payload)
}

export function endShift(shiftId: number): Promise<EndShiftResponse> {
  return postJson<Record<string, never>, EndShiftResponse>(`/api/shifts/${shiftId}/end`, {})
}
