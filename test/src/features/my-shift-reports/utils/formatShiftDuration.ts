export function formatShiftDuration(startTime: string, endTime: string | null): string {
  if (!endTime) {
    return 'در حال انجام'
  }

  const durationMinutes = Math.max(
    0,
    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000),
  )
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours.toLocaleString('fa-IR')} ساعت`)
  }

  if (minutes > 0) {
    parts.push(`${minutes.toLocaleString('fa-IR')} دقیقه`)
  }

  return parts.length > 0 ? parts.join(' و ') : '۰ دقیقه'
}
