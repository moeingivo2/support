import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-2xl border border-border/15 bg-white/5 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus-visible:border-active-blue/50 focus-visible:ring-2 focus-visible:ring-active-blue/30 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
