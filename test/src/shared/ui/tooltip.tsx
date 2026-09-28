import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type TooltipProps = {
    label: string;
    children: ReactNode;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
};

/**
 * تولتیپ ساده و فارسی برای دکمه‌های آیکنی.
 * روی موبایل که hover نیست، خود برچشن aria-label دیده می‌شود.
 */
export function Tooltip({
    label,
    children,
    side = "bottom",
    align = "center",
}: TooltipProps) {
    return (
        <TooltipPrimitive.Provider delayDuration={250}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                    {children}
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side={side}
                        align={align}
                        sideOffset={8}
                        className={cn(
                            "z-[110] rounded-2xl border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold",
                            "text-ink shadow-[var(--c-shadow-soft)] animate-[toast-in_.2s_cubic-bezier(.16,1,.3,1)]",
                        )}
                    >
                        {label}
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}
