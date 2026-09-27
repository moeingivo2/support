import { useEffect, useState } from 'react'
import { Droplets } from 'lucide-react'
import { toPersianDigits } from '@/features/student-chat/utils/persian'

type RemainingChatsWaterTankProps = {
  percentage: number
  remainingChats: number
  totalChats: number
}

/**
 * درصدِ دوحالته: تا خط آب مشکی و از خط آب به پایین سفید.
 * سطح آب و برشِ متن از یک مقدار مشترک (`level`) تغذیه می‌شوند تا هم‌زمان حرکت کنند.
 */
export function RemainingChatsWaterTank({
  percentage,
  remainingChats,
  totalChats,
}: RemainingChatsWaterTankProps) {
  const clamped = Math.max(0, Math.min(100, percentage))
  const [level, setLevel] = useState(0)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setLevel(clamped))
    return () => window.cancelAnimationFrame(frame)
  }, [clamped])

  const label = `${toPersianDigits(clamped)}٪`

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="water-tank"
        role="img"
        aria-label={`${label} از چت‌های باقی‌مانده`}
      >
        <div className="water-tank__glass" />
        <div className="water-tank__clip">
          <div className="water-tank__water" style={{ height: `${level}%` }} />
        </div>
        <div className="water-tank__ticks" />
        <div className="water-tank__shine" />

        <div className="water-tank__label">
          <span className="tank-percent">
            <span className="tank-percent__base num-fa text-3xl font-extrabold">
              {label}
            </span>
            <span
              className="tank-percent__clip"
              style={{ clipPath: `inset(${100 - level}% 0 0 0)` }}
            >
              <span className="tank-percent__fill num-fa text-3xl font-extrabold">
                {label}
              </span>
            </span>
          </span>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs font-bold text-active-blue">
        <Droplets className="size-4" />
        {toPersianDigits(remainingChats)} از {toPersianDigits(totalChats)} چت باقی‌مانده
      </p>
    </div>
  )
}
