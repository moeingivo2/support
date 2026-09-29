import { useState, type ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";

const PERSIAN_CHARACTERS = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/g;

export function Input({ className, onChange, type, ...props }: ComponentProps<"input">) {
    const [keyboardError, setKeyboardError] = useState(false);
    const input = (
        <input
            type={type}
            className={cn(
                "h-11 w-full rounded-2xl border border-hairline bg-sunken px-4 text-sm text-ink outline-none transition-[border-color,box-shadow,background-color,transform] duration-[320ms] ease-spring-smooth placeholder:text-ink-3 hover:border-hairline-strong focus-visible:-translate-y-px focus-visible:border-primary-line-2 focus-visible:bg-surface-2 focus-visible:shadow-[0_0_0_4px_var(--c-ring-accent),0_12px_25px_-18px_var(--c-glow-accent)] disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
            onChange={(event) => {
                if (type === "password") {
                    const cleaned = event.currentTarget.value.replace(PERSIAN_CHARACTERS, "");
                    setKeyboardError(cleaned !== event.currentTarget.value);
                    event.currentTarget.value = cleaned;
                }
                onChange?.(event);
            }}
        />
    );

    if (type !== "password") return input;

    return (
        <span className="block w-full">
            {input}
            {keyboardError ? <span role="alert" className="mt-1 block text-xs text-err-text">لطفاً کیبوردتان را انگلیسی کنید.</span> : null}
        </span>
    );
}
