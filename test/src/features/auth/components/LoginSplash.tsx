import { useEffect, useRef, useState } from 'react'

type LoginSplashProps = {
  onComplete: () => void
}

export default function LoginSplash({ onComplete }: LoginSplashProps) {
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const completed = useRef(false)

  const complete = () => {
    if (completed.current) return
    completed.current = true
    setProgress(100)
    setLeaving(true)
    window.setTimeout(onComplete, 900)
  }

  useEffect(() => {
    const startedAt = performance.now()
    const duration = 2600
    let frame = 0

    const updateProgress = (now: number) => {
      const ratio = Math.min((now - startedAt) / duration, 1)
      setProgress(Math.round((1 - Math.pow(1 - ratio, 3)) * 96))
      if (ratio < 1) frame = requestAnimationFrame(updateProgress)
      else complete()
    }

    frame = requestAnimationFrame(updateProgress)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <section className={`login-splash${leaving ? ' is-leaving' : ''}`} aria-label="در حال ورود به پنل" aria-live="polite">
      <div className="login-splash__glow login-splash__glow--one" />
      <div className="login-splash__glow login-splash__glow--two" />
      <div className="login-splash__grid" />

      <div className="login-splash__content">
        <p className="login-splash__eyebrow">WELCOME BACK</p>
        <button className="login-splash__mark" type="button" onClick={complete} aria-label="ورود فوری به پنل">
          <span className="login-splash__orbit" />
          <span className="login-splash__orbit login-splash__orbit--inner" />
          <span className="login-splash__logo-wrap">
            <img src="/logo.png" alt="AIO" className="login-splash__logo" />
          </span>
        </button>
        <h1 className="login-splash__brand">A<span>I</span>O</h1>
        <p className="login-splash__message">فضای کاری شما آماده است</p>
        <div className="login-splash__loader" aria-hidden="true">
          <span className="login-splash__track"><span className="login-splash__fill" style={{ width: `${progress}%` }} /></span>
          <span className="login-splash__meta"><span>LOADING</span><span>{String(progress).padStart(2, '0')}%</span></span>
        </div>
        <p className="login-splash__hint">برای ورود فوری، روی لوگو کلیک کنید</p>
      </div>
    </section>
  )
}
