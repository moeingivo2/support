import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarRange, Eye, RefreshCw, Search } from "lucide-react";
import { getJson } from "@/shared/api/http";
import { adminKeys, getSupports } from "../services/admin-service";
import { ShiftReportDetailsDialog } from "@/features/my-shift-reports/components/ShiftReportDetailsDialog";
import { formatShiftDateTime } from "@/features/my-shift-reports/utils/formatShiftDateTime";
import type {
    ShiftReport,
    LaravelPagination,
} from "@/features/my-shift-reports/types/shiftReport";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { getPages, PageButton } from "@/shared/ui/pagination";
import { cn } from "@/shared/lib/utils";

type ReportsFilters = {
    page: number;
    user_id?: string;
    channel?: string;
    from?: string;
    to?: string;
};

export default function AllReportsPage() {
    const [filters, setFilters] = useState<ReportsFilters>({ page: 1 });
    const [selectedReport, setSelectedReport] = useState<ShiftReport | null>(
        null,
    );
    const supportsQuery = useQuery({
        queryKey: adminKeys.supports,
        queryFn: getSupports,
    });
    const reportsQuery = useQuery({
        queryKey: ["all-reports", filters],
        queryFn: () =>
            getJson<LaravelPagination<ShiftReport>>("/api/shift-reports", {
                page: filters.page,
                user_id: filters.user_id || undefined,
                channel: filters.channel || undefined,
                from: filters.from || undefined,
                to: filters.to || undefined,
            }),
        placeholderData: keepPreviousData,
    });
    const reports = reportsQuery.data?.data ?? [];
    const pagination = reportsQuery.data;

    function updateFilter<Key extends keyof ReportsFilters>(
        key: Key,
        value: ReportsFilters[Key],
    ): void {
        setFilters((current) => ({ ...current, page: 1, [key]: value }));
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <Card className="p-6 md:p-7">
                <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                        <CalendarRange className="size-6" />
                    </span>
                    <div>
                        <h1 className="mt-1 text-3xl font-bold text-ink md:text-4xl">
                            گزارش شیفت پشتیبان‌ها
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-2">
                            جزئیات کامل گزارش‌های تمام پشتیبان‌ها را با فیلتر
                            پشتیبان، کانال و بازه زمانی بررسی کنید.
                        </p>
                    </div>
                </div>
            </Card>

            <Card className="p-6">
                <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                        <Search className="size-5" />
                    </span>
                    <h2 className="text-lg font-bold text-ink">
                        فیلتر گزارش‌ها
                    </h2>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                        <Label htmlFor="filter-user">پشتیبان</Label>
                        <select
                            id="filter-user"
                            className="h-11 w-full rounded-2xl border border-hairline bg-surface-2 px-4 text-sm text-ink outline-none transition focus-visible:border-primary-line-2 focus-visible:ring-2 focus-visible:ring-primary-ring"
                            value={filters.user_id ?? ""}
                            onChange={(event) =>
                                updateFilter("user_id", event.target.value)
                            }
                        >
                            <option value="">همه پشتیبان‌ها</option>
                            {(supportsQuery.data?.data ?? []).map((support) => (
                                <option
                                    key={support.id}
                                    value={String(support.id)}
                                >
                                    {support.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="filter-channel">نوع پشتیبانی</Label>
                        <select
                            id="filter-channel"
                            className="h-11 w-full rounded-2xl border border-hairline bg-surface-2 px-4 text-sm text-ink outline-none transition focus-visible:border-primary-line-2 focus-visible:ring-2 focus-visible:ring-primary-ring"
                            value={filters.channel ?? ""}
                            onChange={(event) =>
                                updateFilter("channel", event.target.value)
                            }
                        >
                            <option value="">همه</option>
                            <option value="web">وب</option>
                            <option value="ai">هوش مصنوعی</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="filter-from">از تاریخ</Label>
                        <Input
                            id="filter-from"
                            type="date"
                            dir="ltr"
                            value={filters.from ?? ""}
                            onChange={(event) =>
                                updateFilter("from", event.target.value)
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="filter-to">تا تاریخ</Label>
                        <Input
                            id="filter-to"
                            type="date"
                            dir="ltr"
                            value={filters.to ?? ""}
                            onChange={(event) =>
                                updateFilter("to", event.target.value)
                            }
                        />
                    </div>
                </div>

                {hasActiveFilters(filters) ? (
                    <Button
                        variant="ghost"
                        className="mt-4"
                        onClick={() => setFilters({ page: 1 })}
                    >
                        <RefreshCw />
                        حذف فیلترها
                    </Button>
                ) : null}
            </Card>

            {reportsQuery.isError ? (
                <Alert
                    tone="danger"
                    className="flex items-center justify-between gap-3"
                >
                    <span>دریافت گزارش‌ها ناموفق بود.</span>
                    <Button
                        variant="danger"
                        onClick={() => reportsQuery.refetch()}
                    >
                        <RefreshCw />
                        تلاش مجدد
                    </Button>
                </Alert>
            ) : null}

            {reportsQuery.isPending ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }, (_, index) => (
                        <Card key={index} className="space-y-3 p-5">
                            <Skeleton className="h-5 w-52" />
                            <Skeleton className="h-4 w-80" />
                        </Card>
                    ))}
                </div>
            ) : reports.length === 0 ? (
                <Card className="flex flex-col items-center gap-3 p-12 text-center">
                    <CalendarRange className="size-10 text-ink-3" />
                    <p className="text-base font-bold text-ink">
                        گزارشی با این فیلترها یافت نشد.
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {reports.map((report) => (
                        <Card key={report.id} className="p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0 space-y-1">
                                    <p className="text-sm font-bold text-ink">
                                        {report.user?.name ??
                                            `پشتیبان #${report.user_id}`}
                                        <span className="mr-2 text-xs font-normal text-ink-2">
                                            {report.shift.channel === "ai"
                                                ? "هوش مصنوعی"
                                                : "وب"}
                                        </span>
                                    </p>
                                    <p className="text-xs text-ink-2">
                                        شروع شیفت:{" "}
                                        {formatShiftDateTime(
                                            report.shift.start_time,
                                        )}
                                    </p>
                                    <p className="text-xs text-ink-2">
                                        پایان شیفت:{" "}
                                        {report.shift.end_time
                                            ? formatShiftDateTime(
                                                  report.shift.end_time,
                                              )
                                            : "در حال انجام"}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <MetricPill
                                        label="پاسخ‌داده"
                                        value={report.responded_students_count}
                                        tone="text-accent-ink"
                                    />
                                    <MetricPill
                                        label="ناراضی"
                                        value={
                                            report.unsatisfied_students_count
                                        }
                                        tone="text-err-text"
                                    />
                                    <MetricPill
                                        label="دسک"
                                        value={report.desk_requests_count}
                                        tone="text-alret-gold"
                                    />
                                </div>
                            </div>
                            {report.extra_notes ? (
                                <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-xs leading-6 text-ink">
                                    {report.extra_notes}
                                </p>
                            ) : null}
                            <Button
                                variant="ghost"
                                className="mt-4"
                                onClick={() => setSelectedReport(report)}
                            >
                                <Eye />
                                مشاهده جزئیات کامل
                            </Button>
                        </Card>
                    ))}
                </div>
            )}

            {pagination && pagination.last_page > 1 ? (
                <div className="flex items-center justify-center gap-2">
                    <PageButton
                        disabled={!pagination.prev_page_url}
                        onClick={() =>
                            setFilters((current) => ({
                                ...current,
                                page: current.page - 1,
                            }))
                        }
                        aria-label="صفحه قبل"
                    >
                        ›
                    </PageButton>
                    {getPages(
                        pagination.current_page,
                        pagination.last_page,
                    ).map((page, index) =>
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
                                onClick={() =>
                                    setFilters((current) => ({
                                        ...current,
                                        page,
                                    }))
                                }
                            >
                                {page.toLocaleString("fa-IR")}
                            </PageButton>
                        ),
                    )}
                    <PageButton
                        disabled={!pagination.next_page_url}
                        onClick={() =>
                            setFilters((current) => ({
                                ...current,
                                page: current.page + 1,
                            }))
                        }
                        aria-label="صفحه بعد"
                    >
                        ‹
                    </PageButton>
                </div>
            ) : null}

            <ShiftReportDetailsDialog
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
            />
        </div>
    );
}

function MetricPill({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: string;
}) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 ring-1 ring-hairline">
            <span className={cn("font-bold", tone)}>
                {value.toLocaleString("fa-IR")}
            </span>
            <span className="text-ink-2">{label}</span>
        </span>
    );
}

function hasActiveFilters(filters: ReportsFilters): boolean {
    return Boolean(
        filters.user_id || filters.channel || filters.from || filters.to,
    );
}
