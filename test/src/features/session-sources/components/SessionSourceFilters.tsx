import { Search } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'

type SessionSourceFiltersProps = {
  search: string
  category: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  onCategoryChange: (value: string) => void
}

export function SessionSourceFilters({
  search,
  category,
  onSearchChange,
  onSearchSubmit,
  onCategoryChange,
}: SessionSourceFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <form
        className="relative flex-1"
        onSubmit={(event) => {
          event.preventDefault()
          onSearchSubmit()
        }}
        role="search"
        aria-label="جستجوی سورس جلسات"
      >
        <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="جستجو در عنوان و توضیحات… (Enter)"
          className="pr-11"
          aria-label="جستجوی سورس جلسات"
        />
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <FilterButton active={category === ''} onClick={() => onCategoryChange('')}>
          همه دسته‌ها
        </FilterButton>
        {SESSION_CATEGORIES.map((item) => (
          <FilterButton
            key={item}
            active={category === item}
            onClick={() => onCategoryChange(item)}
          >
            {item}
          </FilterButton>
        ))}
      </div>
    </div>
  )
}

// دسته‌های رایج پنل؛ اگر رکوردی با دسته دیگر باشد، فیلتر «همه» آن را نشان می‌دهد.
const SESSION_CATEGORIES = ['لاراول', 'پایتون', 'JavaScript', 'نرم‌افزار پایه']

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-2 text-xs font-semibold transition',
        active
          ? 'bg-active-blue text-white'
          : 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}
