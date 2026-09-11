import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type ToastTone = 'success' | 'error' | 'info' | 'warning'

type ToastData = {
  id: number
  tone: ToastTone
  message: string
}

type ToastContextValue = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE_STYLES: Record<ToastTone, { container: string; icon: ReactNode }> = {
  success: {
    container: 'border-succ-txt/25 bg-succ-btn/10 text-succ-txt',
    icon: <CheckCircle2 className="size-5" />,
  },
  error: {
    container: 'border-err-text/25 bg-err-text/10 text-err-text',
    icon: <XCircle className="size-5" />,
  },
  info: {
    container: 'border-active-blue/25 bg-active-blue/10 text-active-blue',
    icon: <Info className="size-5" />,
  },
  warning: {
    container: 'border-alret-gold/25 bg-alret-gold/10 text-alret-gold',
    icon: <TriangleAlert className="size-5" />,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-3), { id, tone, message }])
      window.setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
      warning: (message) => push('warning', message),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col items-stretch gap-2 px-4"
      >
        {toasts.map((toast) => {
          const style = TONE_STYLES[toast.tone]
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex items-center gap-3 rounded-3xl border px-4 py-3 text-sm font-semibold backdrop-blur-xl',
                style.container,
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-2xl bg-white/10">
                {style.icon}
              </span>
              <p className="leading-6 text-zinc-100">{toast.message}</p>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}