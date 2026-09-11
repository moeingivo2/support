import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw } from 'lucide-react'
import { useSessionSources } from '../hooks/useSessionSources'
import { SessionSourceFilters } from '../components/SessionSourceFilters'
import { SessionSourceList } from '../components/SessionSourceList'
import { SessionSourcePagination } from '../components/SessionSourcePagination'
import {
  createSessionSource,
  deleteSessionSource,
  sessionSourceKeys,
  updateSessionSource,
  type ResourcePayload,
} from '../services/resourceService'
import type { Resource } from '../types/resource'
import { HttpApiError } from '@/shared/api/http'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Alert } from '@/shared/ui/alert'
import { Skeleton } from '@/shared/ui/skeleton'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { ResourceFormDialog } from '@/shared/ui/resource-form-dialog'
import { useToast } from '@/shared/ui/toast'

const INITIAL_FILTERS = {
  page: 1,
  search: '',
  category: '',
}

export default function SessionSourcesPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null)
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string[]> | undefined>()
  const queryClient = useQueryClient()
  const toast = useToast()
  const sourcesQuery = useSessionSources(filters)

  const saveMutation = useMutation({
    mutationFn: (input: { id?: number; payload: ResourcePayload }) =>
      input.id
        ? updateSessionSource(input.id, input.payload)
        : createSessionSource(input.payload),
    onSuccess: async (data) => {
      setFormOpen(false)
      setEditingResource(null)
      setFormFieldErrors(undefined)
      toast.success(data.message)
      await queryClient.invalidateQueries({ queryKey: sessionSourceKeys.all })
    },
    onError: (error) => {
      if (error instanceof HttpApiError) {
        setFormFieldErrors(error.fieldErrors)
        if (!error.fieldErrors) {
          toast.error(error.message)
        }
      } else {
        toast.error('ذخیره سورس ناموفق بود.')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSessionSource(id),
    onSuccess: async (data) => {
      setDeletingResource(null)
      toast.success(data.message)
      await queryClient.invalidateQueries({ queryKey: sessionSourceKeys.all })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'حذف سورس ناموفق بود.')
    },
  })

  const openCreate = () => {
    setEditingResource(null)
    setFormFieldErrors(undefined)
    setFormOpen(true)
  }

  const openEdit = (resource: Resource) => {
    setEditingResource(resource)
    setFormFieldErrors(undefined)
    setFormOpen(true)
  }

  const handleSave = (values: ResourcePayload) => {
    saveMutation.mutate(
      editingResource ? { id: editingResource.id, payload: values } : { payload: values },
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-7">
        <div>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">سورس جلسات</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            سورس و کدهای جلسات آموزشی را مشاهده، دریافت و لینک آن‌ها را برای دانشجو ارسال کنید.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus />
          افزودن سورس جلسه
        </Button>
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
        <SessionSourceList
          resources={sourcesQuery.data?.items ?? []}
          onEdit={openEdit}
          onDelete={setDeletingResource}
        />
      )}

      {sourcesQuery.data && sourcesQuery.data.pagination.last_page > 1 ? (
        <SessionSourcePagination
          pagination={sourcesQuery.data.pagination}
          onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
        />
      ) : null}

      <ResourceFormDialog
        open={formOpen}
        resource={editingResource}
        dialogTitle={editingResource ? 'ویرایش سورس جلسه' : 'افزودن سورس جلسه'}
        linkLabel="لینک سورس"
        isSubmitting={saveMutation.isPending}
        fieldErrors={formFieldErrors}
        onSubmit={handleSave}
        onClose={() => {
          if (!saveMutation.isPending) {
            setFormOpen(false)
            setEditingResource(null)
          }
        }}
      />

      <ConfirmDialog
        open={deletingResource !== null}
        title="حذف سورس جلسه"
        description={`«${deletingResource?.title ?? ''}» برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingResource && deleteMutation.mutate(deletingResource.id)}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeletingResource(null)
          }
        }}
      />
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