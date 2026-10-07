import {
    CHANNEL_FILTERS,
    type ChannelFilter,
} from "@/shared/lib/content-channel";
import { useAuth } from "@/shared/services/auth-context";
import { cn } from "@/shared/lib/utils";

/**
 * انتخابگر بخش محتوا.
 *
 * برای سوپر ادمین انتخاب آزاد است (وب / هوش مصنوعی / هر دو) چون باید بتواند
 * به هر دو شاخه اضافه کند. برای پشتیبان و ناظر اکانت بخش از نوع خودشان
 * می‌آید و فقط به‌صورت یک برچسبِ خوانا نمایش داده می‌شود؛ سرور در هر حال
 * محدوده را نادیده می‌گیرد و خودش اعمال می‌کند.
 */
export function ChannelPicker({
    value,
    onChange,
    className,
}: {
    value: ChannelFilter;
    onChange?: (value: ChannelFilter) => void;
    className?: string;
}) {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    if (!isAdmin) {
        const own = user?.support_type === "ai" ? "ai" : "web";
        const label =
            CHANNEL_FILTERS.find((item) => item.value === own)?.label ??
            "وب";

        return (
            <p
                className={cn(
                    "text-xs text-ink-2",
                    className,
                )}
            >
                بخش فعال:{" "}
                <span className="font-semibold text-ink">{label}</span> —
                فقط محتوای هم‌نوع خودتان را می‌بینید.
            </p>
        );
    }

    return (
        <div
            className={cn("flex flex-wrap items-center gap-2", className)}
            role="group"
            aria-label="بخش محتوا"
        >
            <span className="text-xs font-semibold text-ink-2">بخش:</span>
            {CHANNEL_FILTERS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={value === option.value}
                    onClick={() => onChange?.(option.value)}
                    className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        value === option.value
                            ? "border-primary-line-2 bg-primary-soft text-accent-ink ring-2 ring-primary-ring"
                            : "border-hairline bg-surface-2 text-ink-2 hover:bg-surface-3",
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}