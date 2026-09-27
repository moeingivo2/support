import { toPersianDigits } from '@/features/student-chat/utils/persian'

export function formatMessageTime(isoDate: string | null): string {
  if (!isoDate) return ''
  return toPersianDigits(
    new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoDate)),
  )
}

export function formatConversationDate(isoDate: string | null): string {
  if (!isoDate) return 'بدون پیام'
  const date = new Date(isoDate)
  const today = new Date()

  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  if (sameDay) {
    return formatMessageTime(isoDate)
  }

  return toPersianDigits(
    new Intl.DateTimeFormat('fa-IR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date),
  )
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  const units = ['بایت', 'کیلوبایت', 'مگابایت']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${toPersianDigits(Math.round(value * 10) / 10)} ${units[unit]}`
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return toPersianDigits(`${minutes}:${String(rest).padStart(2, '0')}`)
}

export function formatMembershipDate(isoDate: string | null): string {
  if (!isoDate) return '—'
  return toPersianDigits(
    new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(isoDate)),
  )
}
