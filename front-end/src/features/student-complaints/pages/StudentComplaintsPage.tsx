import { useEffect, useRef, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Inbox,
    MessageSquareWarning,
    RefreshCw,
    Trash2,
} from "lucide-react";
import {
    useComplaints,
    useDeleteComplaint,
    useMarkComplaintsSeen,
    useUpdateComplaintStatus,
} from "../hooks/useComplaints";
import {
    STATUS_LABELS,
    STATUS_OPTIONS,
    TYPE_LABELS,
} from "../services/complaint-service";
import type {
    Complaint,
    ComplaintStatus,
    ComplaintType,
} from "../types/complaint";
import { formatComplaintDateTime } from "../utils/formatComplaintDate";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { JalaliDateInput } from "@/shared/ui/jalali-date-input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatusPill } from "@/shared/ui/status-pill";
import { getPages, PageButton } from "@/shared/ui/pagination";
import { cn } from "@/shared/lib/utils";

/** نمایش «منتور: رضا محمدی» یا «دوره: …» و برای پشتیبانی فقط برچسب. */
function complaintSubject(complaint: Complaint): string {
    if (complaint.type === "mentor") {
        const name = [complaint.mentor_first_name, complaint.mentor_last_name]
            .filter(Boolean)
            .join(" ");
        return name ? `منتور: ${name}` : "منتور";
    }

    if (complaint.type === "course") {
        return complaint.course_name
            ? `دوره: ${complaint.course_name}`
            : "دوره";
    }

    return complaint.support?.name
        ? `پشتیبانی: ${complaint.support.name}`
        : "پشتیبانی";
}

/**
 * پنل نارضایتی‌ها — فقط سوپر ادمین.
 *
 * نارضایتی را دانشجو خودش ثبت می‌کند، پس این صفحه فقط فهرست، فیلتر و
 * پیگیری وضعیت است. چون کل صفحه در دسترس سوپر ادمین است، حذفِ موارد
 * بی‌ربط هم برای او باز است و نارضایتی واقعی از فعالیت پشتیبان پاک می‌شود.
 */
export default function StudentComplaintsPage() {
    const [type, setType] = useState<ComplaintType | "">("");
    const [status, setStatus] = useState<ComplaintStatus | "">("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);

    const filters = { type, status, from, to, page };
    const complaintsQuery = useComplaints(filters);
    const updateStatus = useUpdateComplaintStatus();
    const deleteComplaint = useDeleteComplaint();
    const markSeen = useMarkComplaintsSeen();

    // «خوانده‌شده» فقط یک‌بار در هر ورود به صفحه علامت می‌خورد، پس
    // ref لازم است تا ری‌رندرهای بعدی دوباره درخواست نفرستند.
    const markedSeen = useRef(false);
    useEffect(() => {
        if (markedSeen.current || markSeen.isPending) {
            return;
        }

        markedSeen.current = true;
        markSeen.mutate();
    }, [markSeen]);

    const complaints = complaintsQuery.data?.data ?? [];
    const pagination = complaintsQuery.data;
    const hasFilters = Boolean(type || status || from || to);

    /**
     * هر فیلتر صفحه را به ۱ برمی‌گرداند، وگرنه ممکن است کاربر روی
     * صفحه‌ای بماند که با فیلتر جدید اصلاً نتیجه‌ای ندارد.
     */
    function applyFilter(next: Partial<typeof filters>) {
        setType(next.type ?? "");
        setStatus(next.status ?? "");
        setFrom(next.from ?? "");
        setTo(next.to ?? "");
        setPage(1);
    }

    function clearFilters() {
        applyFilter({ type: "", status: "", from: "", to: "" });
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <Card className="p-6 md:p-7">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold text-ink md:text-4xl">
                            <MessageSquareWarning className="size-7 text-primary" />
                            نارضایتی‌ها
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-2">
                            نارضایتی‌هایی که دانشجویان درباره‌ی پشتیبانی،
                            منتور یا دوره ثبت کرده‌اند.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void complaintsQuery.refetch()}
                        disabled={complaintsQuery.isFetching}
                    >
                        <RefreshCw
                            className={cn(
                                "size-4",
                                complaintsQuery.isFetching && "animate-spin",
                            )}
                        />
                        تازه‌سازی
                    </Button>
                </div>
            </Card>

            {/* فیلتر نوع و بازه‌ی زمانی */}
            <Card className="p-5">
                <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                        <Label htmlFor="filter-type">نوع</Label>
                        <select
                            id="filter-type"
                            value={type}
                            onChange={(event) =>
                                applyFilter({
                                    type: event.target
                                        .value as ComplaintType,
                                })
                            }
                            className="h-10 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-sm text-ink"
                        >
                            <option value="">همه</option>
                            <option value="support">پشتیبانی</option>
                            <option value="mentor">منتور</option>
                            <option value="course">دوره</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="filter-status">وضعیت</Label>
                        <select
                            id="filter-status"
                            value={status}
                            onChange={(event) =>
                                applyFilter({
                                    status: event.target
                                        .value as ComplaintStatus,
                                })
                            }
                            className="h-10 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-sm text-ink"
                        >
                            <option value="">همه</option>
                            {STATUS_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="filter-from">از تاریخ</Label>
                        <JalaliDateInput
                            id="filter-from"
                            value={from}
                            onChange={(value) => applyFilter({ from: value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="filter-to">تا تاریخ</Label>
                        <JalaliDateInput
                            id="filter-to"
                            value={to}
                            onChange={(value) => applyFilter({ to: value })}
                        />
                    </div>
                </div>

                {hasFilters ? (
                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-xs text-ink-2">
                            فیلتر فعال است —{" "}
                            {pagination?.total ?? 0} نتیجه
                        </p>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={clearFilters}
                        >
                            پاک کردن فیلترها
                        </Button>
                    </div>
                ) : null}
            </Card>

            {deleteComplaint.isError ? (
                <Alert tone="danger">
                    {deleteComplaint.error.message}
                </Alert>
            ) : null}

            {complaintsQuery.isError ? (
                <Alert tone="danger">
                    {complaintsQuery.error.message}
                </Alert>
            ) : null}

            {complaintsQuery.isPending ? (
                <div className="space-y-3">
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                </div>
            ) : complaints.length === 0 ? (
                <Card className="p-10 text-center">
                    <Inbox className="mx-auto size-10 text-ink-2" />
                    <p className="mt-4 text-sm font-medium text-ink">
                        {hasFilters
                            ? "برای این فیلتر نارضایتی‌ای پیدا نشد."
                            : "هنوز نارضایتی‌ای ثبت نشده است."}
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {complaints.map((complaint) => (
                        <Card
                            key={complaint.id}
                            className={cn(
                                "p-5",
                                !complaint.seen_at &&
                                    "border-s-4 border-s-danger-line",
                            )}
                        >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-ink">
                                            {TYPE_LABELS[complaint.type] ??
                                                complaint.type}
                                        </span>
                                        <span className="text-sm font-semibold text-ink">
                                            {complaintSubject(complaint)}
                                        </span>
                                        <StatusPill
                                            tone={
                                                complaint.status ===
                                                "resolved"
                                                    ? "success"
                                                    : complaint.status ===
                                                        "in_progress"
                                                      ? "warning"
                                                      : "info"
                                            }
                                        >
                                            {STATUS_LABELS[
                                                complaint.status
                                            ] ?? complaint.status}
                                        </StatusPill>
                                        {!complaint.seen_at ? (
                                            <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-err-text">
                                                خوانده‌نشده
                                            </span>
                                        ) : null}
                                    </div>

                                    <p className="text-sm text-ink">
                                        {complaint.user?.name}
                                    </p>
                                    <p className="whitespace-pre-wrap text-sm leading-7 text-ink-2">
                                        {complaint.description}
                                    </p>
                                    <p className="text-xs text-ink-2">
                                        {formatComplaintDateTime(
                                            complaint.created_at,
                                        )}
                                    </p>
                                </div>

<div className="flex shrink-0 flex-col items-stretch gap-2 md:w-52">
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor={`complaint-status-${complaint.id}`}
                                            className="sr-only"
                                        >
                                            وضعیت
                                        </Label>
                                        <select
                                            id={`complaint-status-${complaint.id}`}
                                            value={complaint.status}
                                            onChange={(event) =>
                                                updateStatus.mutate({
                                                    id: complaint.id,
                                                    status: event
                                                        .target
                                                        .value as ComplaintStatus,
                                                })
                                            }
                                            className="h-10 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-sm text-ink"
                                        >
                                            {STATUS_OPTIONS.map((option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="danger"
                                        disabled={deleteComplaint.isPending}
                                        onClick={() =>
                                            deleteComplaint.mutate(
                                                complaint.id,
                                            )
                                        }
                                    >
                                        <Trash2 className="size-4" />
                                        حذف (بی‌ربط)
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {pagination && pagination.last_page > 1 ? (
                <nav
                    className="flex items-center justify-center gap-1.5"
                    aria-label="صفحه‌بندی نارضایتی‌ها"
                >
                    <PageButton
                        disabled={!pagination.prev_page_url}
                        onClick={() => setPage(pagination.current_page - 1)}
                        aria-label="صفحه قبل"
                    >
                        <ChevronRight className="size-4" />
                    </PageButton>
                    {getPages(
                        pagination.current_page,
                        pagination.last_page,
                    ).map((page, index) =>
                        page === null ? (
                            <span
                                key={`ellipsis-${index}`}
                                className="px-2 text-sm text-ink-2"
                            >
                                …
                            </span>
                        ) : (
                            <PageButton
                                key={page}
                                active={page === pagination.current_page}
                                onClick={() => setPage(page)}
                            >
                                {page.toLocaleString("fa-IR")}
                            </PageButton>
                        ),
                    )}
                    <PageButton
                        disabled={!pagination.next_page_url}
                        onClick={() => setPage(pagination.current_page + 1)}
                        aria-label="صفحه بعد"
                    >
                        <ChevronLeft className="size-4" />
                    </PageButton>
                </nav>
            ) : null}
        </div>
    );
}