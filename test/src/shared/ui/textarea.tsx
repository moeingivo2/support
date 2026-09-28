import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
    return (
        <textarea
            className={cn(
                "min-h-32 w-full rounded-2xl border border-hairline bg-sunken p-4 text-sm leading-7 text-ink outline-none transition-[border-color,box-shadow,background-color,transform] duration-[320ms] ease-spring-smooth placeholder:text-ink-2 hover:border-hairline focus-visible:-translate-y-px focus-visible:border-primary-line-2 focus-visible:bg-surface-2 focus-visible:shadow-[0_0_0_4px_var(--c-ring-accent),0_12px_25px_-18px_var(--c-glow-accent)] disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}
