import { ChevronLeft, MessageSquare, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
import type { SupportStudentRow } from "../types/support-chat";

/**
 * فهرست دانشجویان، هر کدام با تعداد گفتگو.
 *
 * نمای پیش‌فرض پنل پشتیبان به‌جای یک صفحه‌ی پر از گفتگوی پراکنده، دانشجوها
 * را نشان می‌دهد تا پشتیبان اول نفر را انتخاب کند و بعد فقط گفتگوهای همان
 * یک نفر را ببیند. مرتب‌سازی از سمت سرور و بر اساس آخرین فعالیت است.
 */
export function StudentList({
    students,
    isPending,
    isError,
    onRetry,
    onSelect,
}: {
    students: SupportStudentRow[];
    isPending: boolean;
    isError: boolean;
    onRetry: () => void;
    onSelect: (studentId: number) => void;
}) {
    const [query, setQuery] = useState("");

    const normalised = query.trim().toLowerCase();
    const visible =
        normalised === ""
            ? students
            : students.filter((row) =>
                  `${row.student.name} ${row.student.phone ?? ""} ${row.student.email ?? ""}`
                      .toLowerCase()
                      .includes(normalised),
              );

    if (isError) {
        return (
            <Alert tone="danger" className="space-y-3">
                <p>دریافت فهرست دانشجویان ناموفق بود.</p>
                <Button variant="danger" onClick={onRetry}>
                    <RefreshCw />
                    تلاش مجدد
                </Button>
            </Alert>
        );
    }

    if (students.length === 0 && !isPending) {
        return (
            <p className="py-10 text-center text-sm text-ink-2">
                هنوز گفتگویی ثبت نشده است.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
                    aria-hidden="true"
                />
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="جستجوی دانشجو"
                    aria-label="جستجوی دانشجو"
                    className="h-11 w-full rounded-2xl border border-hairline bg-sunken pr-9 pl-3 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-ink-3 focus-visible:border-primary-line-2 focus-visible:shadow-[0_0_0_4px_var(--c-ring-accent)]"
                />
            </div>

            {isPending ? (
                <ul className="space-y-2">
                    {[0, 1, 2].map((index) => (
                        <li
                            key={index}
                            className="h-16 animate-pulse rounded-2xl bg-surface-2"
                        />
                    ))}
                </ul>
            ) : visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-2">
                    دانشجویی با این نام پیدا نشد.
                </p>
            ) : (
                <ul className="space-y-2">
                    {visible.map((row) => (
                        <li key={row.student.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(row.student.id)}
                                className="flex w-full items-center gap-3 rounded-2xl border border-hairline bg-surface-2 px-3 py-3 text-right transition-[background-color,border-color,box-shadow,opacity,color] duration-150 ease-out  hover:border-hairline-strong hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 "
                            >
                                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-accent-ink">
                                    {row.student.name.trim().charAt(0) || "؟"}
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-bold text-ink">
                                        {row.student.name}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-ink-2">
                                        <MessageSquare
                                            className="size-3"
                                            aria-hidden="true"
                                        />
                                        {toPersianDigits(row.conversations_count)}{" "}
                                        گفتگو
                                    </span>
                                </span>

                                {row.unread_count > 0 ? (
                                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-danger-soft text-[11px] font-bold text-err-text">
                                        {toPersianDigits(row.unread_count)}
                                    </span>
                                ) : null}

                                <ChevronLeft
                                    className="size-4 shrink-0 text-ink-3"
                                    aria-hidden="true"
                                />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
