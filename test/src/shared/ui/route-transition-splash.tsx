import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Logo } from '@/shared/api/logo'
import { cn } from '@/shared/lib/utils'

export default function RouteTransitionSplash() {
  const location = useLocation()
  const previousLocationKey = useRef(location.key)
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (previousLocationKey.current === location.key) {
      return
    }

    previousLocationKey.current = location.key
    setIsVisible(true)
    setIsLeaving(false)

    const leaveTimer = window.setTimeout(() => setIsLeaving(true), 360)
    const hideTimer = window.setTimeout(() => setIsVisible(false), 720)

    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(hideTimer)
    }
  }, [location.key])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={cn('route-transition-splash', isLeaving && 'route-transition-splash--leaving')}
      role="status"
      aria-live="polite"
      aria-label="در حال انتقال بین صفحات"
    >
      <div className="route-transition-splash__grid" />
      <div className="route-transition-splash__glow route-transition-splash__glow--blue" />
      <div className="route-transition-splash__glow route-transition-splash__glow--gold" />
      <div className="route-transition-splash__content">
        <Logo size={64} />
        <svg
          className="route-orbit-loader"
          viewBox="0 0 64 64"
          width="76"
          height="76"
          fill="none"
          aria-hidden="true"
        >
          <circle className="route-orbit-loader__halo" cx="32" cy="32" r="30" />
          <g className="route-orbit-loader__plane route-orbit-loader__plane--one">
            <circle className="route-orbit-loader__track" cx="32" cy="32" r="20" />
            <circle className="route-orbit-loader__bead" cx="52" cy="32" r="2.6" />
          </g>
          <g className="route-orbit-loader__plane route-orbit-loader__plane--two">
            <circle className="route-orbit-loader__track" cx="32" cy="32" r="16" />
            <circle className="route-orbit-loader__bead" cx="48" cy="32" r="2.6" />
          </g>
          <circle className="route-orbit-loader__core" cx="32" cy="32" r="2" />
        </svg>
        <p className="route-transition-splash__title">در حال انتقال</p>
        <p className="route-transition-splash__subtitle">در حال آماده‌سازی صفحه جدید</p>
        <span className="route-transition-splash__line" />
      </div>
    </div>
  )
}
