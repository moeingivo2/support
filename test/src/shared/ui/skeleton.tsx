import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('animate-pulse rounded-2xl bg-gradient-to-l from-white/[.035] via-white/[.11] to-white/[.035] bg-[length:200%_100%] motion-safe:animate-[shimmer_1.7s_infinite]', className)} {...props} />
}
