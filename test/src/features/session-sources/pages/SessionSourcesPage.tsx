import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useSessionSources } from '../hooks/useSessionSources'
import { SessionSourceFilters } from '../components/SessionSourceFilters'
import { SessionSourceList } from '../components/SessionSourceList'
import { SessionSourcePagination } from '../components/SessionSourcePagination'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Alert } from '@/shared/ui/alert'
import { Skeleton } from '@/shared/ui/skeleton'

const INITIAL_FILTERS = {
  page: 1,
  search: '',
  category: '',
}

export default function SessionSourcesPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const sourcesQuery = useSessionSources(filters)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="p-6 md:p-7">
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">سورس جلسات</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          سورس و کدهای جلسات آموزشی را مشاهده، دریافت و لینک آن‌ها را برای دانشجو ارسال کنید.
        </p>
      </Card>

      {sourcesQuery.isError ? (
        <Alert tone="danger" className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>دریافت سورس‌ها با خطا مواجه شد.</span>
          <Button variant="danger" onClick={() => sourcesQuery.refetch()}>
            <RefreshCw />
            تلاش مجدد
          </Button>
        </Alert>
      ) : null}

      <SessionSourceFilters
        search={searchInput}
        category={filters.category}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setFilters((current) => ({ ...current, page: 1, search: searchInput }))}
        onCategoryChange={(category) =>
          setFilters((current) => ({ ...current, page: 1, category }))
        }
      />

      {sourcesQuery.isPending ? (
        <SessionSourcesSkeleton />
      ) : (
        <SessionSourceList resources={sourcesQuery.data?.items ?? []} />
      )}

      {sourcesQuery.data && sourcesQuery.data.pagination.last_page > 1 ? (
        <SessionSourcePagination
          pagination={sourcesQuery.data.pagination}
          onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
        />
      ) : null}
    </div>
  )
}

function SessionSourcesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="space-y-4 p-6">
          <Skeleton className="h-6 w-24 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <Skeleton className="h-11 w-36" />
        </Card>
      ))}
    </div>
  )
}
