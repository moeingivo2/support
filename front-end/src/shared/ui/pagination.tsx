import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export function PageButton({
    active = false,
    disabled = false,
    onClick,
    children,
    ...props
}: {
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
    "aria-label"?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "grid size-10 place-items-center rounded-full border text-sm font-semibold transition-colors duration-150 ease-out  disabled:cursor-not-allowed disabled:opacity-40",
                active
                    ? "border-active-blue bg-active-blue text-on-primary shadow-[0_8px_20px_-10px_var(--c-glow-accent)]"
                    : "border-hairline bg-surface-2 text-ink  hover:border-hairline hover:bg-surface-3 hover:text-ink",
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export function getPages(
    currentPage: number,
    lastPage: number,
): Array<number | null> {
    if (lastPage <= 5) {
        return Array.from({ length: lastPage }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, currentPage, lastPage]);

    if (currentPage > 2) pages.add(currentPage - 1);
    if (currentPage < lastPage - 1) pages.add(currentPage + 1);

    return Array.from(pages)
        .sort((first, second) => first - second)
        .flatMap((page, index, sorted) => {
            const previous = sorted[index - 1];

            if (previous && page - previous > 1) return [null, page];

            return [page];
        });
}
