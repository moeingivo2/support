import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-32 w-full rounded-2xl border border-white/[.12] bg-black/10 p-4 text-sm leading-7 text-zinc-100 outline-none transition-[border-color,box-shadow,background-color,transform] duration-300 placeholder:text-zinc-500 hover:border-white/[.2] focus-visible:-translate-y-px focus-visible:border-active-blue/70 focus-visible:bg-white/[.07] focus-visible:shadow-[0_0_0_4px_rgba(0,98,255,.12),0_12px_25px_-18px_rgba(0,98,255,.8)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
