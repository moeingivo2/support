import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Check,
    CheckCircle2,
    Clock,
    GraduationCap,
    Loader2,
    MessageSquarePlus,
    Phone,
    X,
    XCircle,
} from "lucide-react";
import { HttpApiError } from "@/shared/api/http";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatusPill } from "@/shared/ui/status-pill";
import { useToast } from "@/shared/ui/toast";
import { cn } from "@/shared/lib/utils";
import {
    courseLabel,
    TRACK_OPTIONS,
    TOTAL_SESSIONS,
} from "@/features/student-auth/constants/courses";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
import {
    approveUpgradeRequest,
    getUpgradeRequests,
    rejectUpgradeRequest,
    upgradeRequestKeys,
    type UpgradeRequestItem,
    type UpgradeRequestStatus,
} from "../services/upgrade-request-service";

const STATUS_FILTERS: Array<{
    value: UpgradeRequestStatus | "all";
    label: string;
}> = [
    { value: "pending", label: "در انتظار بررسی" },
    { value: "approved", label: "تأییدشده" },
    { value: "rejected", label: "ردشده" },
    { value: "all", label: "همه" },
];

const STATUS_META: Record<
    UpgradeRequestStatus,
    { label: string; tone: "success" | "danger" | "warning" }
> = {
    pending: { label: "در انتظار بررسی", tone: "warning" },
    approved: { label: "تأییدشده", tone: "success" },
    rejected: { label: "ردشده", tone: "danger" },
};

export default function UpgradeRequestsPage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<UpgradeRequestStatus | "all">(
        "pending",
    );
    const [rejectTarget, setRejectTarget] =
        useState<UpgradeRequestItem | null>(null);

    const requestsQuery = useQuery({
        queryKey: upgradeRequestKeys.list(
            status === "all" ? undefined : status,
        ),
        queryFn: () =>
            getUpgradeRequests(status === "all" ? undefined : status),
    });
    const requests = requestsQuery.data?.data ?? [];

    function invalidateAll(): Promise<void> {
        return queryClient.invalidateQueries({
            queryKey: ["upgrade-requests"],
        });
    }

    const approveMutation = useMutation({
        mutationFn: (id: number) => approveUpgradeRequest(id),
        onSuccess: async (response) => {
            toast.success(response.message);
            await invalidateAll();
        },
        onError: (error: unknown) => {
            toast.error(getErrorMessage(error));
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (id: number) => rejectUpgradeRequest(id),
        onSuccess: async (response) => {
            toast.success(response.message);
            setRejectTarget(null);
            await invalidateAll();
        },
        onError: (error: unknown) => {
            setRejectTarget(null);
            toast.error(getErrorMessage(error));
        },
    });

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6">
            <Card className="p-6 md:p-7">
                <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                        <GraduationCap className="size-6" />
                    </span>
                    <div>
                        <h1 className="mt-1 text-3xl font-bold text-ink md:text-4xl">
                            درخواست‌های ارتقا
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-2">
                            درخواست‌های ارتقای سهمیه چت دانشجویان را بررسی
                            کنید. پس از راستی‌آزمایی دوره‌ها و جلسات، با تأیید
                            سهمیه چت دانشجو افزایش می‌یابد.
                        </p>
                    </div>
                </div>
            </Card>

            <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((filter) => (
                    <button
                        key={filter.value}
                        type="button"
                        onClick={() => setStatus(filter.value)}
                        aria-pressed={status === filter.value}
                        className={cn(
                            "rounded-full border px-4 py-2 text-sm font-bold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                            status === filter.value
                                ? "border-primary-line-2 bg-primary-soft-2 text-accent-ink"
                                : "border-hairline bg-surface-2 text-ink-2 hover:border-hairline-strong hover:text-ink",
                        )}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {requestsQuery.isPending ? (
                    Array.from({ length: 3 }, (_, index) => (
                        <Skeleton
                            key={index}
                            className="h-40 w-full rounded-3xl"
                        />
                    ))
                ) : requestsQuery.isError ? (
                    <Alert tone="danger">
                        دریافت فهرست درخواست‌ها ناموفق بود.
                    </Alert>
                ) : requests.length === 0 ? (
                    <Card className="py-12 text-center">
                        <p className="text-sm text-ink-2">
                            درخواستی در این وضعیت وجود ندارد.
                        </p>
                    </Card>
                ) : (
                    requests.map((request) => (
                        <RequestCard
                            key={request.id}
                            request={request}
                            onApprove={() => approveMutation.mutate(request.id)}
                            onReject={() => setRejectTarget(request)}
                            isBusy={
                                (approveMutation.isPending &&
                                    approveMutation.variables ===
                                        request.id) ||
                                (rejectMutation.isPending &&
                                    rejectMutation.variables === request.id)
                            }
                        />
                    ))
                )}
            </div>

            <ConfirmDialog
                open={rejectTarget !== null}
                title="رد درخواست ارتقا"
                description={
                    rejectTarget
                        ? `آیا از رد درخواست «${rejectTarget.student_name ?? "دانشجو"}» مطمئن هستید؟ سهمیه چت تغییری نمی‌کند.`
                        : ""
                }
                confirmLabel="رد درخواست"
                isPending={rejectMutation.isPending}
                onConfirm={() =>
                    rejectTarget && rejectMutation.mutate(rejectTarget.id)
                }
                onClose={() => setRejectTarget(null)}
            />
        </div>
    );
}

function RequestCard({
    request,
    onApprove,
    onReject,
    isBusy,
}: {
    request: UpgradeRequestItem;
    onApprove: () => void;
    onReject: () => void;
    isBusy: boolean;
}) {
    const meta = STATUS_META[request.status];

    return (
        <Card className="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-ink">
                            {request.student_name ?? "دانشجوی ناشناس"}
                        </p>
                        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-2">
                        <Phone className="size-3.5" />
                        <span dir="ltr">{request.student_phone}</span>
                    </p>
                    {request.created_at ? (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">
                            <Clock className="size-3.5" />
                            {new Date(request.created_at).toLocaleString(
                                "fa-IR",
                            )}
                        </p>
                    ) : null}
                </div>
                <span className="flex items-center gap-1.5 rounded-2xl border border-hairline bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink">
                    <MessageSquarePlus className="size-4 text-alret-gold" />
                    {toPersianDigits(request.extra_chats)} چت اضافه
                </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {request.courses.map((course, index) => (
                    <div
                        key={`${course.course}-${index}`}
                        className="rounded-2xl border border-hairline bg-surface-2 px-3 py-2"
                    >
                        <p className="text-xs font-bold text-ink">
                            {courseLabel(course.course)}
                            {course.track
                                ? ` — ${
                                      TRACK_OPTIONS.find(
                                          (track) =>
                                              track.value === course.track,
                                      )?.label ?? course.track
                                  }`
                                : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-2">
                            دوره شرکت‌شده: {course.attended_course}
                        </p>
                        {course.course === "offline" ? (
                            <p className="mt-0.5 text-[11px] text-ink-2">
                                جلسات:{" "}
                                {course.sessions.length > 0
                                    ? course.sessions
                                          .map((session) =>
                                              toPersianDigits(session),
                                          )
                                          .join("، ")
                                    : "—"}{" "}
                                از {toPersianDigits(TOTAL_SESSIONS)}
                            </p>
                        ) : null}
                    </div>
                ))}
            </div>

            {request.note ? (
                <p className="mt-3 rounded-2xl border border-hairline bg-surface-2 p-3 text-xs leading-6 text-ink-2">
                    {request.note}
                </p>
            ) : null}

            {request.status === "pending" ? (
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button
                        variant="danger"
                        size="md"
                        onClick={onReject}
                        disabled={isBusy}
                    >
                        {isBusy ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <X />
                        )}
                        رد درخواست
                    </Button>
                    <Button size="md" onClick={onApprove} disabled={isBusy}>
                        {isBusy ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <Check />
                        )}
                        تأیید درخواست
                    </Button>
                </div>
            ) : (
                <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-ink-2">
                    {request.status === "approved" ? (
                        <CheckCircle2 className="size-4 text-succ-txt" />
                    ) : (
                        <XCircle className="size-4 text-err-text" />
                    )}
                    این درخواست رسیدگی شده است.
                </div>
            )}
        </Card>
    );
}

function getErrorMessage(error: unknown): string {
    if (error instanceof HttpApiError) {
        const fieldMessage = error.fieldErrors
            ? Object.values(error.fieldErrors).flat()[0]
            : undefined;
        return fieldMessage ?? error.message;
    }
    return error instanceof Error ? error.message : "عملیات ناموفق بود.";
}
