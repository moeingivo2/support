import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn('block text-sm font-medium text-zinc-200', className)}
      {...props}
    />
  )
}
