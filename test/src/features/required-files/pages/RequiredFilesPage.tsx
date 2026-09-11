import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRequiredFiles } from '../hooks/useRequiredFiles'
import { RequiredFileFilters } from '../components/RequiredFileFilters'
import { RequiredFileList } from '../components/RequiredFileList'
import { RequiredFilePagination } from '../components/RequiredFilePagination'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

const INITIAL_FILTERS = {
  page: 1,
  search: '',
  category: '',
}

export default function RequiredFilesPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const filesQuery = useRequiredFiles(filters)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="p-6 md:p-7">
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">فایل‌های مورد نیاز</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          فایل‌ها و ابزارهای مورد نیاز برای انجام فعالیت‌های پشتیبانی را دریافت یا لینک آن‌ها را
          برای دانشجو ارسال کنید.
        </p>
      </Card>

      {filesQuery.isError ? (
        <Alert tone="danger" className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>دریافت فایل‌های مورد نیاز با خطا مواجه شد.</span>
          <Button variant="danger" onClick={() => filesQuery.refetch()}>
            <RefreshCw />
            تلاش مجدد
          </Button>
        </Alert>
      ) : null}

      <RequiredFileFilters
        search={searchInput}
        category={filters.category}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setFilters((current) => ({ ...current, page: 1, search: searchInput }))}
        onCategoryChange={(category) =>
          setFilters((current) => ({ ...current, page: 1, category }))
        }
      />

      {filesQuery.isPending ? (
        <RequiredFilesSkeleton />
      ) : (
        <RequiredFileList resources={filesQuery.data?.items ?? []} />
      )}

      {filesQuery.data && filesQuery.data.pagination.last_page > 1 ? (
        <RequiredFilePagination
          pagination={filesQuery.data.pagination}
          onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
        />
      ) : null}
    </div>
  )
}

function RequiredFilesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="size-11 rounded-2xl" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
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
