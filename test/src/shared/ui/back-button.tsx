import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/utils";

/**
 * دکمه‌ی بازگشت برای گوشی.
 *
 * روی موبایل نوار آدرس وجود ندارد، پس بدون این دکمه کاربر راه برگشت
 * ندارد مگر با دکمه‌ی فیزیکی گوشی. روی دسکتاپ مخفی است چون بازگشت
 * با Alt+← یا دکمه‌ی مرورگر انجام می‌شود.
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
        if (window.history.length > 1 && window.history.state?.idx > 0) {
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
                "inline-flex h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold",
                "text-ink-2 transition-transform duration-[220ms] ease-spring-snappy",
                "hover:-translate-y-0.5 hover:text-ink",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                "active:scale-95 md:hidden",
                className,
            )}
        >
            <ChevronRight className="size-4" aria-hidden="true" />
            {label}
        </button>
    );
}
