import { useQuery } from '@tanstack/react-query'
import { getCurrentShift, shiftServiceKeys } from '../services/shift-service'

/** شیفت فعالِ کاربر جاری — فقط برای پشتیبان‌ها (برای اتصال نارضایتی و صفحه گزارش) */
export function useActiveShift(enabled = true) {
  return useQuery({
    queryKey: shiftServiceKeys.current,
    queryFn: getCurrentShift,
    retry: false,
    staleTime: 30_000,
    enabled,
  })
}
