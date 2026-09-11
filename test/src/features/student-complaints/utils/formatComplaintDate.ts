export function formatShiftDateTime(date: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(date))
}
