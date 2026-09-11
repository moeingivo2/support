import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getMyReports, shiftReportKeys } from '../services/shiftReportService'

export function useMyShiftReports(page: number) {
  return useQuery({
    queryKey: shiftReportKeys.list(page),
    queryFn: () => getMyReports(page),
    placeholderData: keepPreviousData,
  })
}
