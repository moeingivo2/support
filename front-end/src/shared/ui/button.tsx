import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border text-sm font-semibold motion-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-deactive-btn-gray disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                primary:
                    "border-active-blue bg-active-blue text-on-primary shadow-[0_9px_22px_-12px_var(--c-glow-accent)] hover:bg-primary-hover hover:shadow-[0_14px_28px_-12px_var(--c-glow-accent)] focus-visible:ring-active-blue",
                success:
                    "border-success-line bg-succ-btn text-succ-txt shadow-[0_8px_20px_-14px_color-mix(in_srgb,var(--c-success)_40%,transparent)]  hover:bg-primary-soft-2 focus-visible:ring-succ-txt",
                danger:
                    "border-danger-line bg-danger-soft text-err-text  hover:border-danger-line hover:bg-danger-soft focus-visible:ring-err-text",
                ghost: "border-hairline bg-surface-2 text-ink  hover:border-hairline hover:bg-surface-2 focus-visible:ring-hairline-strong",
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

export function SendButton({
    className,
    disabled,
    ...props
}: ComponentProps<"button">) {
    return (
        <Button
            type="submit"
            size="icon"
            disabled={disabled}
            aria-label="ارسال"
            className={cn("send-button", className)}
            {...props}
        />
    );
}
