import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
    return (
        <input
            className={cn(
                "h-11 w-full rounded-2xl border border-hairline bg-sunken px-4 text-sm text-ink outline-none transition-[border-color,box-shadow,background-color,transform] duration-[320ms] ease-spring-smooth placeholder:text-ink-3 hover:border-hairline-strong focus-visible:-translate-y-px focus-visible:border-primary-line-2 focus-visible:bg-surface-2 focus-visible:shadow-[0_0_0_4px_var(--c-ring-accent),0_12px_25px_-18px_var(--c-glow-accent)] disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}
