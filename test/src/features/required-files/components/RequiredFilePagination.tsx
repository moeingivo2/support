import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import type { RequiredFilesPagination } from "../services/resourceService";

type RequiredFilePaginationProps = {
    pagination: RequiredFilesPagination;
    onPageChange: (page: number) => void;
};

export function RequiredFilePagination({
    pagination,
    onPageChange,
}: RequiredFilePaginationProps) {
    const from = pagination.from ?? 0;
    const to = pagination.to ?? 0;
    const pages = getPages(pagination.current_page, pagination.last_page);

    return (
        <div className="flex flex-col items-center justify-between gap-4 rounded-4xl border border-hairline bg-glass p-4 md:flex-row">
            <p className="text-xs text-ink-2">
                نمایش {from.toLocaleString("fa-IR")} تا{" "}
                {to.toLocaleString("fa-IR")} از{" "}
                {pagination.total.toLocaleString("fa-IR")} فایل
            </p>
            <nav className="flex items-center gap-1.5" aria-label="صفحه‌بندی">
                <PageButton
                    disabled={!pagination.prev_page_url}
                    onClick={() => onPageChange(pagination.current_page - 1)}
                    aria-label="صفحه قبل"
                >
                    <ChevronRight />
                </PageButton>
                {pages.map((page, index) =>
                    page === null ? (
                        <span
                            key={`ellipsis-${index}`}
                            className="px-2 text-sm text-ink-3"
                        >
                            …
                        </span>
                    ) : (
                        <PageButton
                            key={page}
                            active={page === pagination.current_page}
                            onClick={() => onPageChange(page)}
                        >
                            {page.toLocaleString("fa-IR")}
                        </PageButton>
                    ),
                )}
                <PageButton
                    disabled={!pagination.next_page_url}
                    onClick={() => onPageChange(pagination.current_page + 1)}
                    aria-label="صفحه بعد"
                >
                    <ChevronLeft />
                </PageButton>
            </nav>
        </div>
    );
}

function PageButton({
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
                "grid size-10 place-items-center rounded-2xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                active
                    ? "bg-active-blue text-on-primary"
                    : "bg-surface-2 text-ink hover:bg-surface-3 hover:text-ink",
            )}
            {...props}
        >
            {children}
        </button>
    );
}

function getPages(currentPage: number, lastPage: number): Array<number | null> {
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
