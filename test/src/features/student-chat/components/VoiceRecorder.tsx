import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Square, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { formatDuration } from '../utils/format'
import { toPersianDigits } from '../utils/persian'

type VoiceRecorderProps = {
  onRecorded: (file: File, durationSeconds: number) => void
  onCancel: () => void
  disabled?: boolean
}

const MAX_SECONDS = 300

/**
 * ضبط پیام صوتی در مرورگر و تحویل فایل صوتی به کامپوزر.
 */
export function VoiceRecorder({ onRecorded, onCancel, disabled = false }: VoiceRecorderProps) {
  const [elapsed, setElapsed] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    }
  }, [])

  async function start() {
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('مرورگر شما از ضبط صدا پشتیبانی نمی‌کند.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const extension = blob.type.includes('ogg') ? 'ogg' : 'webm'
        const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: blob.type })
        onRecorded(file, Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)))
      }

      startedAtRef.current = Date.now()
      setElapsed(0)
      setIsRecording(true)
      recorder.start()

      timerRef.current = window.setInterval(() => {
        const seconds = Math.round((Date.now() - startedAtRef.current) / 1000)
        setElapsed(seconds)
        if (seconds >= MAX_SECONDS) stop()
      }, 250)
    } catch {
      setError('دسترسی به میکروفون ممکن نشد.')
    }
  }

  function stop() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    setIsRecording(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-err-text/25 bg-err-text/10 px-3 py-2">
      {isRecording ? (
        <>
          <span className="flex items-center gap-2 text-xs font-bold text-err-text">
            <span className="size-2 animate-pulse rounded-full bg-err-text" />
            در حال ضبط
          </span>
          <span dir="ltr" className="text-xs font-bold text-zinc-100">
            {toPersianDigits(formatDuration(elapsed))}
          </span>
          <span className="text-[11px] text-zinc-500">حداکثر {toPersianDigits(MAX_SECONDS)} ثانیه</span>
          <Button type="button" size="icon" variant="ghost" onClick={stop} aria-label="پایان ضبط">
            <Square className="fill-current" />
          </Button>
        </>
      ) : (
        <Button type="button" variant="ghost" onClick={start} disabled={disabled} aria-label="شروع ضبط">
          {disabled ? <Loader2 className="animate-spin" /> : <Mic />}
          شروع ضبط
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        disabled={isRecording}
        aria-label="انصراف از ضبط"
      >
        <Trash2 />
        انصراف
      </Button>

      {error ? <p className="text-xs font-medium text-err-text">{error}</p> : null}
    </div>
  )
}
