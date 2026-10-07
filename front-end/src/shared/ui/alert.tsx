import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";

type AlertTone = "danger" | "info" | "success" | "warning";

type AlertProps = ComponentProps<"div"> & {
    tone?: AlertTone;
};

const toneStyles: Record<AlertTone, string> = {
    danger: "border-danger-line bg-danger-soft text-err-text",
    info: "border-primary-line bg-primary-soft text-accent-ink",
    success: "border-success-line bg-succ-btn text-succ-txt",
    warning: "border-warn-line bg-warn-soft text-alret-gold",
};

export function Alert({ className, tone = "info", ...props }: AlertProps) {
    return (
        <div
            role="alert"
            className={cn(
                "relative overflow-hidden rounded-3xl border p-4 text-sm leading-6 shadow-[var(--c-shadow-soft)] before:absolute before:inset-y-3 before:right-0 before:w-0.5 before:rounded-full before:bg-current",
                toneStyles[tone],
                className,
            )}
            {...props}
        />
    );
}
