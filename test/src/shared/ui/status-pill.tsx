import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

type StatusPillProps = ComponentProps<'span'> & {
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
}

const toneStyles = {
  info: 'bg-active-blue/10 text-active-blue ring-active-blue/25',
  success: 'bg-succ-btn text-succ-txt ring-succ-txt/25',
  warning: 'bg-alret-gold/10 text-alret-gold ring-alret-gold/25',
  danger: 'bg-err-text/10 text-err-text ring-err-text/25',
  neutral: 'bg-white/5 text-zinc-300 ring-white/10',
} as const

export function StatusPill({ className, tone = 'neutral', ...props }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1',
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  )
}
