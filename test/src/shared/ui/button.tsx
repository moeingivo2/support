import {
    useCallback,
    useEffect,
    useRef,
    type ComponentProps,
} from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
    // بدون لایه‌ی pseudo برای درخشش؛ حرکت فقط روی transform انجام می‌شود تا ۶۰fps بماند
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border text-sm font-semibold transition-[transform,background-color,border-color,box-shadow] duration-[460ms] ease-spring-gentle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-deactive-btn-gray active:scale-[.97] disabled:pointer-events-none disabled:opacity-45 [&_svg]:relative [&_svg]:z-10 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300 group-hover:[&_svg]:translate-x-0.5",
    {
        variants: {
            variant: {
                primary:
                    "btn-magnetic border-active-blue bg-active-blue text-on-primary shadow-[0_9px_22px_-12px_var(--c-glow-accent)] hover:bg-primary-hover hover:shadow-[0_14px_28px_-12px_var(--c-glow-accent)] focus-visible:ring-active-blue",
                success:
                    "border-success-line bg-succ-btn text-succ-txt shadow-[0_8px_20px_-14px_color-mix(in_srgb,var(--c-success)_40%,transparent)] hover:-translate-y-0.5 hover:bg-primary-soft-2 focus-visible:ring-succ-txt",
                danger:
                    "border-danger-line bg-danger-soft text-err-text hover:-translate-y-0.5 hover:border-danger-line hover:bg-danger-soft focus-visible:ring-err-text",
                ghost: "border-hairline bg-surface-2 text-ink hover:-translate-y-0.5 hover:border-hairline hover:bg-surface-2 focus-visible:ring-hairline-strong",
            },
            size: {
                md: "h-11 px-5",
                icon: "size-11 p-0",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "md",
        },
    },
);

type ButtonProps = ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    };

export function Button({
    asChild = false,
    className,
    size,
    variant,
    ...props
}: ButtonProps) {
    const Component = asChild ? Slot : "button";
    return (
        <Component
            className={cn(buttonVariants({ size, variant }), className)}
            {...props}
        />
    );
}

const MAGNETIC_RADIUS = 72;
/** حداکثر جابه‌جایی بر حسب پیکسل */
const MAGNETIC_PULL = 3;

/**
 * دکمه‌ی ارسال — جاذب.
 *
 * با نزدیک شدن اشاره‌گر، دکمه به سمت آن کشیده می‌شود. برای صفحه‌کلید و
 * اشاره‌گرهای درشت (لمسی) غیرفعال است و در حالت غیرفعال اصلاً حرکت نمی‌کند.
 */
export function MagneticSendButton({
    className,
    disabled,
    ...props
}: ComponentProps<"button">) {
    const ref = useRef<HTMLButtonElement | null>(null);

    const reset = useCallback(() => {
        const element = ref.current;
        if (!element) return;
        element.style.setProperty("--magnet-x", "0px");
        element.style.setProperty("--magnet-y", "0px");
    }, []);

    const handlePointerMove = useCallback(
        (event: PointerEvent) => {
            const element = ref.current;
            if (!element || disabled) return;

            // صفحه‌کلید و لمس نباید جاذب را فعال کنند
            if (event.pointerType !== "mouse") return;

            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const deltaX = event.clientX - centerX;
            const deltaY = event.clientY - centerY;

            // نزدیک‌تر از شعاع تعیین‌شده بی‌اثر است تا حرکت ناگهانی نباشد
            if (
                Math.abs(deltaX) > rect.width / 2 + MAGNETIC_RADIUS ||
                Math.abs(deltaY) > rect.height / 2 + MAGNETIC_RADIUS
            ) {
                reset();
                return;
            }

            element.style.setProperty(
                "--magnet-x",
                `${clamp(deltaX * 0.12, -MAGNETIC_PULL, MAGNETIC_PULL)}px`,
            );
            element.style.setProperty(
                "--magnet-y",
                `${clamp(deltaY * 0.12, -MAGNETIC_PULL, MAGNETIC_PULL)}px`,
            );
        },
        [disabled, reset],
    );

    // شنونده روی پنجره است تا کشش با «نزدیک شدن» هم عمل کند، نه فقط وقتی
    // اشاره‌گر دقیقاً روی دکمه قرار گرفته است.
    useEffect(() => {
        if (disabled) {
            reset();
            return;
        }

        window.addEventListener("pointermove", handlePointerMove, {
            passive: true,
        });
        window.addEventListener("blur", reset);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("blur", reset);
        };
    }, [disabled, handlePointerMove, reset]);

    return (
        <Button
            ref={ref}
            type="submit"
            size="icon"
            disabled={disabled}
            aria-label="ارسال"
            onBlur={reset}
            className={cn("send-button", className)}
            {...props}
        />
    );
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
