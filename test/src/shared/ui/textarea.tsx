import { useLayoutEffect, useRef, type ComponentProps } from "react";
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

export function ChatTextarea({ value, className, ...props }: ComponentProps<"textarea"> & { value: string }) {
    const ref = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        element.style.height = "auto";
        element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
        element.style.overflowY = element.scrollHeight > 160 ? "auto" : "hidden";
    }, [value]);

    return <Textarea ref={ref} value={value} rows={2} className={cn("min-h-16 max-h-40 resize-none overflow-y-hidden", className)} {...props} />;
}
