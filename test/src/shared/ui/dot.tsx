import { cn } from '@/shared/lib/utils'

export function Dot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block size-1.5 rounded-full bg-current shadow-[0_0_0_4px_currentColor/15]',
        className,
      )}
      aria-hidden="true"
    />
  )
}
