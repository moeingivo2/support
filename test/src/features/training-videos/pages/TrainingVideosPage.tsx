import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { useVideos } from '../hooks/useVideos'
import {
  createVideo,
  deleteVideo,
  updateVideo,
  videoKeys,
  type VideoPayload,
} from '../services/video-service'
import { VideoFormDialog } from '../components/VideoFormDialog'
import type { EducationalVideo } from '../types/video'
import { HttpApiError } from '@/shared/api/http'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'
import { StatusPill } from '@/shared/ui/status-pill'
import { useToast } from '@/shared/ui/toast'
import { Check, Copy, Pencil, PlayCircle, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'

export default function TrainingVideosPage() {
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 400)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<EducationalVideo | null>(null)
  const [deletingVideo, setDeletingVideo] = useState<EducationalVideo | null>(null)
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string[]> | undefined>()
  const queryClient = useQueryClient()
  const toast = useToast()
  const videosQuery = useVideos('', search)

  const videos = videosQuery.data ?? []

  const saveMutation = useMutation({
    mutationFn: (input: { id?: number; payload: VideoPayload }) =>
      input.id ? updateVideo(input.id, input.payload) : createVideo(input.payload),
    onSuccess: async (data) => {
      setFormOpen(false)
      setEditingVideo(null)
      setFormFieldErrors(undefined)
      toast.success(data.message)
      await queryClient.invalidateQueries({ queryKey: videoKeys.all })
    },
    onError: (error) => {
      if (error instanceof HttpApiError) {
        setFormFieldErrors(error.fieldErrors)
        if (!error.fieldErrors) {
          toast.error(error.message)
        }
      } else {
        toast.error('ذخیره ویدیو ناموفق بود.')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteVideo(id),
    onSuccess: async (data) => {
      setDeletingVideo(null)
      toast.success(data.message)
      await queryClient.invalidateQueries({ queryKey: videoKeys.all })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'حذف ویدیو ناموفق بود.')
    },
  })

  const openCreate = () => {
    setEditingVideo(null)
    setFormFieldErrors(undefined)
    setFormOpen(true)
  }

  const openEdit = (video: EducationalVideo) => {
    setEditingVideo(video)
    setFormFieldErrors(undefined)
    setFormOpen(true)
  }

  const handleSave = (values: VideoPayload) => {
    saveMutation.mutate(
      editingVideo ? { id: editingVideo.id, payload: values } : { payload: values },
    )
  }

  async function copyLink(video: { id: number; video_url: string }) {
    try {
      await navigator.clipboard.writeText(video.video_url)
      setCopiedId(video.id)
      window.setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // کلیپ‌بورد در دسترس نیست
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-7">
        <div>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">ویدیوهای آموزشی</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            ویدیوهای پایه آموزشی — لینک هر ویدیو را می‌توانید مستقیماً برای دانشجو ارسال کنید.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus />
          افزودن ویدیو
        </Button>
      </Card>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="جستجوی ویدیوها…"
          className="pr-11"
          aria-label="جستجوی ویدیوهای آموزشی"
        />
      </div>

      {videosQuery.isError ? (
        <Alert tone="danger" className="flex items-center justify-between gap-3">
          <span>دریافت ویدیوها ناموفق بود.</span>
          <Button variant="danger" onClick={() => videosQuery.refetch()}>
            <RefreshCw />
            تلاش مجدد
          </Button>
        </Alert>
      ) : videosQuery.isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Card key={index} className="space-y-4 p-6">
              <Skeleton className="h-32 w-full rounded-3xl" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-11 w-full" />
            </Card>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <PlayCircle className="size-10 text-zinc-600" />
          <p className="text-base font-bold text-white">ویدیویی یافت نشد.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <Card key={video.id} className="flex h-full flex-col gap-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-active-blue/10 text-active-blue ring-1 ring-active-blue/20">
                  <PlayCircle className="size-5" />
                </span>
                <div className="flex items-center gap-1">
                  {video.category ? (
                    <StatusPill tone="info">{video.category}</StatusPill>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label="ویرایش ویدیو"
                    onClick={() => openEdit(video)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-err-text hover:text-err-text"
                    aria-label="حذف ویدیو"
                    onClick={() => setDeletingVideo(video)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">{video.title}</h3>
                {video.description ? (
                  <p className="text-sm leading-7 text-zinc-400">{video.description}</p>
                ) : null}
              </div>
              <div className="mt-auto flex flex-col gap-2 sm:flex-row">
                <Button asChild className="w-full sm:w-auto">
                  <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                    <PlayCircle />
                    تماشا
                  </a>
                </Button>
                <Button variant="ghost" onClick={() => copyLink(video)} className="w-full sm:w-auto">
                  {copiedId === video.id ? <Check /> : <Copy />}
                  {copiedId === video.id ? 'کپی شد' : 'کپی لینک برای دانشجو'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <VideoFormDialog
        open={formOpen}
        video={editingVideo}
        isSubmitting={saveMutation.isPending}
        fieldErrors={formFieldErrors}
        onSubmit={handleSave}
        onClose={() => {
          if (!saveMutation.isPending) {
            setFormOpen(false)
            setEditingVideo(null)
          }
        }}
      />

      <ConfirmDialog
        open={deletingVideo !== null}
        title="حذف ویدیو"
        description={`«${deletingVideo?.title ?? ''}» برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingVideo && deleteMutation.mutate(deletingVideo.id)}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeletingVideo(null)
          }
        }}
      />
    </div>
  )
}