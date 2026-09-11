export function formatShiftDuration(startTime: string, endTime: string | null): string {
  const end = endTime ? new Date(endTime).getTime() : Date.now()

  const durationMinutes = Math.max(
    0,
    Math.round((end - new Date(startTime).getTime()) / 60_000),
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
