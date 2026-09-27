import { useRef, useState, type FormEvent } from 'react'
import { Image as ImageIcon, Loader2, Mic, Paperclip, Send, X } from 'lucide-react'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import type { OutgoingAttachment } from '../types/chat'
import { formatFileSize } from '../utils/format'
import { VoiceRecorder } from './VoiceRecorder'

type ChatComposerProps = {
  onSend: (
    body: string,
    options: { codeMode: boolean; language: string; attachment?: OutgoingAttachment },
  ) => void
  codeMode: boolean
  isSending: boolean
  error: string | null
  disabled?: boolean
}

const CODE_LANGUAGES = ['plain', 'python', 'php', 'javascript', 'sql', 'bash', 'json']

export function ChatComposer({
  onSend,
  codeMode,
  isSending,
  error,
  disabled = false,
}: ChatComposerProps) {
  const [body, setBody] = useState('')
  const [language, setLanguage] = useState('plain')
  const [attachment, setAttachment] = useState<OutgoingAttachment | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const canSend = !isSending && !disabled && (body.trim() !== '' || attachment !== null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSend) return

    onSend(body.trim(), {
      codeMode,
      language: codeMode ? language : 'plain',
      attachment: attachment ?? undefined,
    })
    setBody('')
    setAttachment(null)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  function pickFile(input: HTMLInputElement | null) {
    const file = input?.files?.[0]
    if (!file) return
    setAttachment({ file })
    if (input) input.value = ''
  }

  if (isRecording) {
    return (
      <div className="space-y-2 border-t border-white/[.08] bg-black/20 p-3 md:p-4">
        <VoiceRecorder
          disabled={isSending}
          onCancel={() => setIsRecording(false)}
          onRecorded={(file, durationSeconds) => {
            setAttachment({ file, durationSeconds })
            setIsRecording(false)
          }}
        />
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 border-t border-white/[.08] bg-black/25 p-3 backdrop-blur-xl md:p-4"
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {attachment ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-active-blue/15 text-active-blue">
            <Paperclip className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-zinc-100">
              {attachment.file.name}
            </span>
            <span className="block text-[11px] text-zinc-500">
              {formatFileSize(attachment.file.size)}
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setAttachment(null)}
            aria-label="حذف پیوست"
            disabled={isSending}
          >
            <X />
          </Button>
        </div>
      ) : null}

      {codeMode ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-alret-gold">حالت کد فعال است</span>
          {CODE_LANGUAGES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setLanguage(item)}
              aria-pressed={language === item}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active-blue/60 ${
                language === item
                  ? 'bg-alret-gold/20 text-alret-gold ring-1 ring-alret-gold/40'
                  : 'bg-white/5 text-zinc-400 ring-1 ring-white/10 hover:bg-white/10 hover:text-zinc-100'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={() => pickFile(imageInputRef.current)}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={() => pickFile(fileInputRef.current)}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => imageInputRef.current?.click()}
          disabled={isSending || disabled}
          aria-label="پیوست تصویر"
          title="پیوست تصویر"
        >
          <ImageIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending || disabled}
          aria-label="پیوست فایل"
          title="پیوست فایل"
        >
          <Paperclip />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsRecording(true)}
          disabled={isSending || disabled}
          aria-label="ضبط پیام صوتی"
          title="ضبط پیام صوتی"
        >
          <Mic />
        </Button>

        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          dir={codeMode ? 'ltr' : 'rtl'}
          placeholder={codeMode ? 'کد خود را بنویسید...' : 'پیام خود را بنویسید...'}
          className={codeMode ? 'min-h-12 flex-1 font-mono text-left' : 'min-h-12 flex-1'}
          disabled={isSending}
        />

        <Button type="submit" size="icon" disabled={!canSend} aria-label="ارسال پیام">
          {isSending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>

      <p className="text-[11px] text-zinc-600">
        برای ارسال پیام Enter و برای شروع خط جدید Shift+Enter را بزنید.
      </p>
    </form>
  )
}
