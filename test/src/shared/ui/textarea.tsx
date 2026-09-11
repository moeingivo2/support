import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-32 w-full rounded-2xl border border-border/15 bg-white/5 p-4 text-sm leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus-visible:border-active-blue/50 focus-visible:ring-2 focus-visible:ring-active-blue/30 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
