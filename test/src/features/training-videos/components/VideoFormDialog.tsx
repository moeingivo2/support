import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Link2, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import type { EducationalVideo } from '../types/video'

type VideoFormValues = {
  title: string
  description: string
  video_url: string
  category: string
}

type VideoFormDialogProps = {
  open: boolean
  video: EducationalVideo | null
  isSubmitting?: boolean
  fieldErrors?: Record<string, string[]>
  onSubmit: (values: VideoFormValues) => void
  onClose: () => void
}

export function VideoFormDialog({
  open,
  video,
  isSubmitting = false,
  fieldErrors,
  onSubmit,
  onClose,
}: VideoFormDialogProps) {
  const [values, setValues] = useState<VideoFormValues>(() => getInitialValues(video ?? null))

  function setField<Key extends keyof VideoFormValues>(key: Key, value: VideoFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      video_url: values.video_url.trim(),
      category: values.category.trim(),
    })
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 space-y-6 overflow-y-auto rounded-4xl border border-border/10 bg-deactive-btn-gray p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-xl font-bold text-white">
                {video ? 'ویرایش ویدیو' : 'افزودن ویدیو'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-zinc-400">
                {video ? 'مشخصات این ویدیو را ویرایش کنید.' : 'مشخصات ویدیو جدید را وارد کنید.'}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="بستن">
                <X />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="video-title">عنوان</Label>
              <Input
                id="video-title"
                value={values.title}
                onChange={(event) => setField('title', event.target.value)}
                placeholder="مثلاً آموزش نصب Laragon"
              />
              {fieldError('title', fieldErrors) ? (
                <p className="text-xs font-medium text-err-text">
                  {fieldError('title', fieldErrors)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-url">لینک ویدیو</Label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="video-url"
                  dir="ltr"
                  value={values.video_url}
                  onChange={(event) => setField('video_url', event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="pr-11"
                />
              </div>
              {fieldError('video_url', fieldErrors) ? (
                <p className="text-xs font-medium text-err-text">
                  {fieldError('video_url', fieldErrors)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-category">دسته‌بندی</Label>
              <Input
                id="video-category"
                value={values.category}
                onChange={(event) => setField('category', event.target.value)}
                placeholder="مثلاً مقدماتی، پیشرفته…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-description">توضیحات</Label>
              <Textarea
                id="video-description"
                value={values.description}
                onChange={(event) => setField('description', event.target.value)}
                placeholder="توضیحات تکمیلی (اختیاری)"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                انصراف
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'در حال ثبت...' : video ? 'ذخیره تغییرات' : 'افزودن'}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function getInitialValues(video: EducationalVideo | null): VideoFormValues {
  return {
    title: video?.title ?? '',
    description: video?.description ?? '',
    video_url: video?.video_url ?? '',
    category: video?.category ?? '',
  }
}

function fieldError(field: string, fieldErrors?: Record<string, string[]>): string | undefined {
  return fieldErrors?.[field]?.[0]
}