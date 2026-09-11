import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-4xl border border-border/10 bg-deactive-btn-gray/70 shadow-lg shadow-black/20',
        className,
      )}
      {...props}
    />
  )
}
