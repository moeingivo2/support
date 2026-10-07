import { useEffect, useState } from "react";
import { Droplets } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { toPersianDigits } from "@/features/student-chat/utils/persian";

type RemainingChatsWaterTankProps = {
    percentage: number;
    remainingChats: number;
    totalChats: number;
};

type TankTone = "ok" | "warn" | "low";

/**
 * رنگ آب بر اساس وضعیت: ۱۰۰٪ سبز، ۷۰٪ تا ۴۰٪ کهربایی، زیر ۴۰٪ قرمز.
 */
export function resolveTankTone(percentage: number): TankTone {
    const clamped = Math.max(0, Math.min(100, percentage));

    if (clamped >= 70) return "ok";
    if (clamped >= 40) return "warn";
    return "low";
}

const TONE_LABEL: Record<TankTone, string> = {
    ok: "وضعیت عالی",
    warn: "وضعیت هشدار",
    low: "وضعیت بحرانی",
};

/**
 * درصدِ دوحالته: تا خط آب مشکی و از خط آب به پایین سفید.
 * سطح آب و برشِ متن از یک مقدار مشترک (`level`) تغذیه می‌شوند تا هم‌زمان حرکت کنند.
 */
export function RemainingChatsWaterTank({
    percentage,
    remainingChats,
    totalChats,
}: RemainingChatsWaterTankProps) {
    const clamped = Math.max(0, Math.min(100, percentage));
    const tone = resolveTankTone(clamped);
    const [level, setLevel] = useState(0);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setLevel(clamped));
        return () => window.cancelAnimationFrame(frame);
    }, [clamped]);

    const label = `${toPersianDigits(clamped)}٪`;

    return (
        <div className="flex flex-col items-center gap-3">
            <div
                className={cn("water-tank", `water-tank--${tone}`)}
                role="img"
                aria-label={`${label} از چت‌های باقی‌مانده — ${TONE_LABEL[tone]}`}
            >
                <div className="water-tank__glass" />
                <div className="water-tank__clip">
                    <div
                        className="water-tank__water"
                        style={{ transform: `scaleY(${level / 100})` }}
                    />
                    {/* موج روی خط آب می‌نشیند تا با scaleY کشیده نشود */}
                    <div
                        className="water-tank__wave"
                        style={{ bottom: `calc(${level}% - 13px)` }}
                    />
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

            <p className="flex items-center gap-1.5 text-xs font-bold text-ink-2">
                <Droplets className="size-4 text-accent-ink" />
                {toPersianDigits(remainingChats)} از{" "}
                {toPersianDigits(totalChats)} چت باقی‌مانده
            </p>
        </div>
    );
}
