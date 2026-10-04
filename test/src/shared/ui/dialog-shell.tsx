import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/**
 * پوسته‌ی مشترک دیالوگ‌ها — اسپلش فنری، بستن با Escape و کلیک بیرون.
 */
export function DialogShell({
    title,
    description,
    tone = "neutral",
    onClose,
    children,
    icon,
    className,
}: {
    title: string;
    description?: ReactNode;
    tone?: "neutral" | "danger" | "warning";
    onClose: () => void;
    children: ReactNode;
    icon?: ReactNode;
    className?: string;
}) {
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
        >
            <button
                type="button"
                aria-label="بستن"
                onClick={onClose}
                className="absolute inset-0 cursor-default"
                tabIndex={-1}
            />

            {/* max-h + اسکرول مستقل: روی صفحه‌ی کوتاه (یا وقتی
                صفحه‌کلید باز است) دکمه‌های پایین نباید بریده شوند. */}
            <div
                className={cn(
                    "motion-enter relative my-auto w-full max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl border bg-surface p-6 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl",
                    tone === "danger"
                        ? "border-danger-line"
                        : tone === "warning"
                          ? "border-warn-line"
                          : "border-hairline",
                    className,
                )}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="بستن"
                    className="absolute top-4 left-4 grid size-11 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
                >
                    <X className="size-4" />
                </button>

                <div className="flex flex-col items-center gap-3 text-center">
                    {icon}
                    <h2 id="dialog-title" className="text-lg font-bold text-ink">
                        {title}
                    </h2>
                    {description ? (
                        <div className="text-sm leading-7 text-ink-2">
                            {description}
                        </div>
                    ) : null}
                </div>

                <div className="mt-6">{children}</div>
            </div>
        </div>
    );
}
