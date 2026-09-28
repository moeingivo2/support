import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const RATING_LABELS: Record<number, string> = {
    1: "خیلی بد",
    2: "بد",
    3: "متوسط",
    4: "خوب",
    5: "عالی",
};

/**
 * انتخابگر امتیاز ۱ تا ۵.
 *
 * مقدار پیش‌فرض **۵ ستاره** است تا کاربر فقط در صورت تمایل آن را کم کند.
 * مقدار اولیه از بیرون قابل کنترل است ولی همیشه بین ۱ تا ۵ اعتبارسنجی می‌شود.
 */
export function StarRating({
    value,
    onChange,
    disabled = false,
    name = "rating",
}: {
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    name?: string;
}) {
    const [hovered, setHovered] = useState<number | null>(null);
    const selected = Math.min(5, Math.max(1, value || 5));
    const shown = hovered ?? selected;

    return (
        <fieldset
            className="flex flex-col items-center gap-2"
            aria-label="امتیاز رضایت"
        >
            <div
                className="flex flex-row-reverse justify-center gap-1.5"
                dir="ltr"
                onMouseLeave={() => setHovered(null)}
            >
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        name={name}
                        onClick={() => onChange(star)}
                        onMouseEnter={() => setHovered(star)}
                        onFocus={() => setHovered(star)}
                        onBlur={() => setHovered(null)}
                        disabled={disabled}
                        aria-label={`${star} ستاره — ${RATING_LABELS[star]}`}
                        aria-pressed={selected === star}
                        className={cn(
                            "rounded-lg p-1 transition-transform",
                            "duration-[220ms] ease-spring-snappy",
                            "hover:scale-115 hover:-translate-y-0.5",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                            "active:scale-95",
                            "disabled:pointer-events-none disabled:opacity-45",
                        )}
                    >
                        <Star
                            aria-hidden="true"
                            className={cn(
                                "size-9 transition-colors duration-[220ms]",
                                star <= shown
                                    ? "fill-alret-gold text-alret-gold"
                                    : "text-ink-3",
                            )}
                        />
                    </button>
                ))}
            </div>

            <p
                className="h-5 text-sm font-semibold text-ink-2"
                aria-live="polite"
            >
                {RATING_LABELS[shown]}
            </p>
        </fieldset>
    );
}

export { RATING_LABELS };
