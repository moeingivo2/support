import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

export function PageButton({
  active = false,
  disabled = false,
  onClick,
  children,
  ...props
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid size-10 place-items-center rounded-2xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-active-blue text-white'
          : 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white',
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function getPages(currentPage: number, lastPage: number): Array<number | null> {
  if (lastPage <= 5) {
    return Array.from({ length: lastPage }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, currentPage, lastPage])

  if (currentPage > 2) pages.add(currentPage - 1)
  if (currentPage < lastPage - 1) pages.add(currentPage + 1)

  return Array.from(pages)
    .sort((first, second) => first - second)
    .flatMap((page, index, sorted) => {
      const previous = sorted[index - 1]

      if (previous && page - previous > 1) return [null, page]

      return [page]
    })
}
