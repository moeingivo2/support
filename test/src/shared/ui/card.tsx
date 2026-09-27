import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-4xl border border-white/[.09] bg-[linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] shadow-[0_18px_45px_-30px_rgba(0,0,0,.95)] backdrop-blur-sm transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-white/[.16] hover:shadow-[0_24px_50px_-30px_rgba(0,98,255,.45)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-l before:from-transparent before:via-white/30 before:to-transparent',
        className,
      )}
      {...props}
    />
  )
}
