import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";

type StatusPillProps = ComponentProps<"span"> & {
    tone?: "info" | "success" | "warning" | "danger" | "neutral";
};

const toneStyles = {
    info: "bg-primary-soft text-accent-ink ring-primary-ring",
    success: "bg-succ-btn text-succ-txt ring-success-line",
    warning: "bg-warn-soft text-alret-gold ring-warn-ring",
    danger: "bg-danger-soft text-err-text ring-danger-ring",
    neutral: "bg-surface-2 text-ink ring-hairline",
} as const;

export function StatusPill({
    className,
    tone = "neutral",
    ...props
}: StatusPillProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 shadow-[inset_0_1px_0_var(--c-inset-highlight)] transition-colors duration-150 ease-out ",
                toneStyles[tone],
                className,
            )}
            {...props}
        />
    );
}
