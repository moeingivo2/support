import * as DialogPrimitive from '@radix-ui/react-dialog'
import { TriangleAlert, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  isPending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'حذف',
  isPending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-5 rounded-4xl border border-border/10 bg-deactive-btn-gray p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-err-text/10 text-err-text ring-1 ring-err-text/20">
              <TriangleAlert className="size-6" />
            </span>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="بستن">
                <X />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="space-y-2">
            <DialogPrimitive.Title className="text-lg font-bold text-white">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm leading-7 text-zinc-400">
              {description}
            </DialogPrimitive.Description>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose} disabled={isPending}>
              انصراف
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={isPending}>
              {isPending ? 'در حال حذف...' : confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}