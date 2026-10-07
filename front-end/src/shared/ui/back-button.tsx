import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/utils";

/**
 * دکمه‌ی بازگشت.
 *
 * روی موبایل نوار آدرس وجود ندارد، پس بدون این دکمه کاربر راه برگشت ندارد مگر
 * با دکمه‌ی فیزیکی گوشی. روی دسکتاپ هم نمایش داده می‌شود چون در پنل‌های
 * تودرتو (گفتگو، شیفت، گزارش) مسیر شاخه‌ای وجود ندارد و کاربر باید راه برگشت
 * داشته باشد.
 */
export function BackButton({
    className,
    fallbackPath,
    label = "بازگشت",
}: {
    className?: string;
    /** اگر تاریخچه خالی باشد (مثلاً ورود مستقیم با لینک) به این مسیر می‌رود */
    fallbackPath?: string;
    label?: string;
}) {
    const navigate = useNavigate();

    function goBack() {
        // اگر کاربر مستقیم وارد این صفحه شده باشد، تاریخچه‌ای وجود ندارد
        if (window.history.length > 1 && (window.history.state?.idx ?? 0) > 0) {
            navigate(-1);
            return;
        }

        navigate(fallbackPath ?? "/", { replace: true });
    }

    return (
        <button
            type="button"
            onClick={goBack}
            aria-label={label}
            className={cn(
                "inline-flex h-11 shrink-0 items-center gap-1 rounded-full border border-hairline bg-surface-2 px-3 text-sm font-semibold",
                "text-ink-2 transition-[background-color,border-color,box-shadow,opacity,color] duration-150 ease-out",
                " hover:border-hairline-strong hover:bg-surface-3 hover:text-ink",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                "",
                className,
            )}
        >
            <ChevronRight className="size-4" aria-hidden="true" />
            {label}
        </button>
    );
}
