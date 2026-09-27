import { FileCode2, FileText, Play } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { ChatMessage } from '../types/chat'
import { formatFileSize, formatMessageTime } from '../utils/format'
import { toPersianDigits } from '../utils/persian'

type MessageBubbleProps = {
  message: ChatMessage
  isOwn: boolean
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={cn('flex w-full', isOwn ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'group relative max-w-[min(78%,34rem)] overflow-hidden rounded-3xl border px-4 py-3 shadow-[0_16px_36px_-28px_rgba(0,0,0,.95)] transition-transform duration-300 hover:-translate-y-0.5',
          isOwn
            ? 'border-active-blue/35 bg-active-blue/12'
            : 'border-white/[.1] bg-white/[.05]',
        )}
      >
        <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="font-bold text-zinc-200">{isOwn ? 'شما' : (message.sender.name ?? 'پشتیبان')}</span>
          <span dir="ltr">{formatMessageTime(message.created_at)}</span>
        </div>

        {message.type === 'text' && message.body ? (
          <p className="text-sm leading-7 whitespace-pre-wrap text-zinc-100">{message.body}</p>
        ) : null}

        {message.type === 'code' && message.body ? (
          <div className="space-y-2" dir="ltr">
            {message.language ? (
              <span className="inline-block rounded-lg bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-alret-gold">
                {message.language}
              </span>
            ) : null}
            <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/45 p-3 text-left text-[13px] leading-6 text-emerald-200">
              <code>{message.body}</code>
            </pre>
          </div>
        ) : null}

        {message.type === 'image' && message.url ? (
          <a
            href={message.url}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-2xl border border-white/10 transition-opacity hover:opacity-90"
          >
            <img
              src={message.url}
              alt={message.attachment_name ?? 'تصویر ارسالی'}
              loading="lazy"
              className="max-h-72 w-full object-cover"
            />
          </a>
        ) : null}

        {message.type === 'voice' && message.url ? (
          <div className="flex min-w-52 items-center gap-3" dir="rtl">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-active-blue/20 text-active-blue">
              <Play className="size-4" />
            </span>
            <audio controls src={message.url} className="h-9 w-full" preload="metadata">
              مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
            </audio>
            <span className="shrink-0 text-[11px] text-zinc-400" dir="ltr">
              {toPersianDigits(message.duration_seconds ?? 0)}s
            </span>
          </div>
        ) : null}

        {message.type === 'file' ? (
          <a
            href={message.url ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-56 items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 transition-colors hover:border-active-blue/40 hover:bg-active-blue/10"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-alret-gold/15 text-alret-gold">
              {message.attachment_mime?.includes('pdf') ? (
                <FileText className="size-4" />
              ) : (
                <FileCode2 className="size-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-zinc-100">
                {message.attachment_name ?? 'فایل'}
              </span>
              <span className="block text-[11px] text-zinc-500">
                {formatFileSize(message.attachment_size)}
              </span>
            </span>
          </a>
        ) : null}

        {message.body && message.type !== 'text' && message.type !== 'code' ? (
          <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-zinc-200">{message.body}</p>
        ) : null}
      </div>
    </div>
  )
}
