import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createShiftReport, shiftReportQueryKeys } from '../services/shiftReportService'
import type { CreateShiftReportPayload } from '../types/shiftReport'

type UseCreateShiftReportOptions = {
  onSuccess: () => void
}

export function useCreateShiftReport({ onSuccess }: UseCreateShiftReportOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateShiftReportPayload) => createShiftReport(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: shiftReportQueryKeys.currentShift }),
        queryClient.invalidateQueries({ queryKey: shiftReportQueryKeys.myReports }),
        queryClient.invalidateQueries({ queryKey: shiftReportQueryKeys.dashboard }),
      ])
      onSuccess()
    },
  })
}
