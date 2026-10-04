import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";

const PERSIAN_CHARACTERS = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g;
const PERSIAN_KEY = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

const KEYBOARD_ERROR_MESSAGE = "لطفا کیبوردتون رو انگلیسی کنین";
const KEYBOARD_ERROR_TIMEOUT = 5000;

function stripPersian(value: string): string {
    return value.replace(PERSIAN_CHARACTERS, "");
}

export function Input({
    className,
    onChange,
    onKeyDown,
    type,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
    ...props
}: ComponentProps<"input">) {
    const isPassword = type === "password";
    const [keyboardError, setKeyboardError] = useState(false);
    const errorId = useRef(`input-keyboard-${Math.random().toString(36).slice(2)}`);
    const timer = useRef<number | undefined>(undefined);
    // رویداد input مصنوعی خودمان دوباره به onChange می‌رسد؛ بدون این پرچم،
    // همان رویداد خطایی را که تازه ساخته‌ایم پاک می‌کند.
    const sanitizing = useRef(false);

    const clearKeyboardError = useCallback(() => {
        if (timer.current !== undefined) {
            window.clearTimeout(timer.current);
            timer.current = undefined;
        }
        setKeyboardError(false);
    }, []);

    const raiseKeyboardError = useCallback(() => {
        if (timer.current !== undefined) {
            window.clearTimeout(timer.current);
        }
        timer.current = window.setTimeout(() => setKeyboardError(false), KEYBOARD_ERROR_TIMEOUT);
        setKeyboardError(true);
    }, []);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const input = (
        <input
            type={type}
            aria-invalid={isPassword && keyboardError ? true : ariaInvalid}
            aria-describedby={isPassword && keyboardError ? errorId.current : ariaDescribedBy}
            className={cn(
                // تا ۶۴۰ پیکسل عرض، هدف لمسی ۴۸ پیکسل و متن ۱۶ پیکسل است؛
                // متن زیر ۱۶ پیکسل باعث زوم خودکار مرورگر موبایل هنگام فوکوس می‌شود.
                // min-w-0 تا ورودی داخل ردیف‌های flex از عرض کارت بیرون نزند.
                "h-12 w-full min-w-0 rounded-2xl border border-hairline bg-sunken px-3.5 text-base leading-6 text-ink outline-none transition-[background-color,border-color,box-shadow,opacity,color] duration-150 ease-out placeholder:text-ink-3 hover:border-hairline-strong  focus-visible:border-primary-line-2 focus-visible:bg-surface-2 focus-visible:shadow-[0_0_0_4px_var(--c-ring-accent),0_12px_25px_-18px_var(--c-glow-accent)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:px-4 sm:text-sm",
                isPassword && keyboardError && "border-danger-line focus-visible:border-danger-line",
                className,
            )}
            {...props}
            onKeyDown={(event) => {
                // میان‌بُر تایپ فارسی را پیش از رسیدن به فیلد متوقف می‌کند؛
                // صفحه‌کلید موبایل از composition استفاده می‌کند و در onChange گرفته می‌شود.
                if (isPassword && event.key.length === 1 && PERSIAN_KEY.test(event.key)) {
                    event.preventDefault();
                    raiseKeyboardError();
                    return;
                }
                if (isPassword) {
                    clearKeyboardError();
                }
                onKeyDown?.(event);
            }}
            onChange={(event) => {
                if (isPassword) {
                    const element = event.currentTarget;
                    const cleaned = stripPersian(element.value);
                    if (cleaned !== element.value) {
                        raiseKeyboardError();
                        // React مقدار کنترل‌شده را از DOM می‌خواند، پس باید
                        // setter اصلی را صدا بزنیم تا مقدار پاک‌شده به state برسد.
                        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
                        sanitizing.current = true;
                        setValue?.call(element, cleaned);
                        element.dispatchEvent(new Event("input", { bubbles: true }));
                        sanitizing.current = false;
                        return;
                    }
                    if (sanitizing.current) return;
                    clearKeyboardError();
                }
                onChange?.(event);
            }}
        />
    );

    if (!isPassword) return input;

    return (
        <span className="block w-full">
            {input}
            {keyboardError ? (
                <span
                    id={errorId.current}
                    role="alert"
                    className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-err-text"
                >
                    <KeyboardWarningIcon />
                    {KEYBOARD_ERROR_MESSAGE}
                </span>
            ) : null}
        </span>
    );
}

function KeyboardWarningIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-3.5 shrink-0">
            <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path
                d="M6 9.5h1.5M9.75 9.5h1.5M13.5 9.5h1.5M17.25 9.5h.75M6 12.75h.75M9.75 12.75h1.5M13.5 12.75h1.5M17.25 12.75h.75M8 15.75h8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}
