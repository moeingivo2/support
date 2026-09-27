import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

type AlertTone = 'danger' | 'info' | 'success' | 'warning'

type AlertProps = ComponentProps<'div'> & {
  tone?: AlertTone
}

const toneStyles: Record<AlertTone, string> = {
  danger: 'border-err-text/20 bg-err-text/10 text-err-text',
  info: 'border-active-blue/20 bg-active-blue/10 text-active-blue',
  success: 'border-succ-txt/20 bg-succ-btn text-succ-txt',
  warning: 'border-alret-gold/20 bg-alret-gold/10 text-alret-gold',
}

export function Alert({ className, tone = 'info', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn('relative overflow-hidden rounded-3xl border p-4 text-sm leading-6 shadow-[0_14px_30px_-26px_rgba(0,0,0,.9)] before:absolute before:inset-y-3 before:right-0 before:w-0.5 before:rounded-full before:bg-current', toneStyles[tone], className)}
      {...props}
    />
  )
}
