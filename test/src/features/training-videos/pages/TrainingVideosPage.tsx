import { useState } from 'react'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { useVideos } from '../hooks/useVideos'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'
import { StatusPill } from '@/shared/ui/status-pill'
import { Check, Copy, PlayCircle, RefreshCw, Search } from 'lucide-react'

export default function TrainingVideosPage() {
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 400)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const videosQuery = useVideos('', search)

  const videos = videosQuery.data ?? []

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
      <Card className="p-6 md:p-7">
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">ویدیوهای آموزشی</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          ویدیوهای پایه آموزشی — لینک هر ویدیو را می‌توانید مستقیماً برای دانشجو ارسال کنید.
        </p>
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
                {video.category ? (
                  <StatusPill tone="info">{video.category}</StatusPill>
                ) : null}
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
    </div>
  )
}
