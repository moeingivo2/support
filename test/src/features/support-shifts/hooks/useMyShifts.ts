import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getMyShifts, shiftServiceKeys } from '../services/shift-service'

export function useMyShifts(page: number) {
  return useQuery({
    queryKey: shiftServiceKeys.my(page),
    queryFn: () => getMyShifts(page),
    placeholderData: keepPreviousData,
  })
}

export function useActiveShiftsCount() {
  return useQuery({
    queryKey: shiftServiceKeys.active,
    queryFn: () => import('../services/shift-service').then((m) => m.getActiveShifts()),
    refetchInterval: 60_000,
    select: (data) => data.count,
  })
}
