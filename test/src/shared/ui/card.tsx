import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "card-surface group relative overflow-hidden rounded-4xl border border-hairline backdrop-blur-sm transition-[transform,border-color,box-shadow] duration-[460ms] ease-spring-gentle hover:-translate-y-1 hover:border-hairline-strong hover:shadow-[0_24px_50px_-30px_var(--c-glow-accent)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px",
                className,
            )}
            {...props}
        />
    );
}
