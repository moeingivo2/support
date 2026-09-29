import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
    return (
        <textarea
            className={cn(
                "min-h-32 w-full resize-y rounded-2xl border border-hairline bg-sunken p-4 text-sm leading-7 text-ink outline-none transition-[border-color,box-shadow,background-color,transform] duration-[320ms] ease-spring-smooth placeholder:text-ink-2 hover:border-hairline focus-visible:-translate-y-px focus-visible:border-primary-line-2 focus-visible:bg-surface-2 focus-visible:shadow-[0_0_0_4px_var(--c-ring-accent),0_12px_25px_-18px_var(--c-glow-accent)] disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}

/** ارتفاع یک خط به‌علاوه‌ی padding عمودی (leading-7 + p-4). */
const CHAT_TEXTAREA_MIN = 60;
/** سقف رشد: حدود چهار خط. بعد از آن خود فیلد اسکرول داخلی می‌گیرد. */
const CHAT_TEXTAREA_MAX = 144;

/**
 * ورودی پیام چت، به سبک تلگرام.
 *
 * قابلیت تغییر دستی اندازه ندارد؛ ارتفاع با تایپ کاربر خودکار رشد می‌کند و
 * بعد از چهار خط متوقف می‌شود تا کل صفحه را نبلعد. `rows` پیش‌فرض روی یک
 * خط تنظیم شده تا در شروع، فیلد بی‌دلیل بلندتر از محتوا نباشد.
 */
export function ChatTextarea({ value, className, ...props }: ComponentProps<"textarea"> & { value: string }) {
    const ref = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        element.style.height = "auto";
        const next = Math.min(Math.max(element.scrollHeight, CHAT_TEXTAREA_MIN), CHAT_TEXTAREA_MAX);
        element.style.height = `${next}px`;
        element.style.overflowY = element.scrollHeight > CHAT_TEXTAREA_MAX ? "auto" : "hidden";
    }, [value]);

    return (
        <Textarea
            ref={ref}
            value={value}
            rows={1}
            className={cn("max-h-36 min-h-[60px] resize-none overflow-x-hidden", className)}
            {...props}
        />
    );
}
