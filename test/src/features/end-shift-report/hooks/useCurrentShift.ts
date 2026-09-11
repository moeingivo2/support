import { useQuery } from '@tanstack/react-query'
import { getReportableShift, shiftReportQueryKeys } from '../services/shiftReportService'

/**
 * شیفتِ قابلِ گزارش = آخرین شیفت پایان‌یافته بدون گزارش.
 * بک‌اند ثبت گزارش روی شیفت فعال را رد می‌کند (422).
 * enabled را می‌توان برای نقش‌های بدون شیفت خاموش کرد.
 */
export function useCurrentShift(enabled = true) {
  return useQuery({
    queryKey: shiftReportQueryKeys.currentShift,
    queryFn: getReportableShift,
    retry: false,
    staleTime: 0,
    enabled,
  })
}
