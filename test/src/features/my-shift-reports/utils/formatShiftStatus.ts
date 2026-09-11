export function formatShiftStatus(status: string): string {
  const statusLabels: Record<string, string> = {
    active: 'فعال',
    ended: 'پایان‌یافته',
    pending: 'در انتظار',
    cancelled: 'لغو شده',
  }

  return statusLabels[status] ?? 'نامشخص'
}
