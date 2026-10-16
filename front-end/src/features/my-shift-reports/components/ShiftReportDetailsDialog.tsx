import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CalendarDays,
    Clock,
    MessageSquareWarning,
    RotateCcw,
    Trash2,
    X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { StatusPill } from "@/shared/ui/status-pill";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { useAuth } from "@/shared/services/auth-context";
import { useToast } from "@/shared/ui/toast";
import { getJson } from "@/shared/api/http";
import { cn } from "@/shared/lib/utils";
import { formatShiftDateTime } from "../utils/formatShiftDateTime";
import { formatShiftDuration } from "../utils/formatShiftDuration";
import { formatShiftStatus } from "../utils/formatShiftStatus";
import {
    dismissDissatisfaction,
    restoreDissatisfaction,
} from "../services/dissatisfactionService";
import type {
    DissatisfactionReason,
    ShiftReport,
    ShiftReportDetails,
} from "../types/shiftReport";

type ShiftReportDetailsDialogProps = {
    report: ShiftReport | null;
    onClose: () => void;
};

/** کنار گذاشتن نارضایتی فقط با ناظر اکانت و سوپر ادمین ممکن است. */
const DISMISS_ROLES = ["admin", "account_observer"];

export function ShiftReportDetailsDialog({
    report,
    onClose,
}: ShiftReportDetailsDialogProps) {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const canDismiss = DISMISS_ROLES.includes(user?.role ?? "");

    const detailsQuery = useQuery({
        queryKey: ["shift-report-details", report?.id],
        queryFn: ({ queryKey }) =>
            getJson<ShiftReportDetails>(`/api/shift-reports/${queryKey[1]}`),
        enabled: report !== null,
    });

    /**
     * بعد از کنار گذاشتن یا برگرداندن، هم جزئیات این گزارش و هم فهرست
     * گزارش‌ها باید نو شوند تا عدد «دانشجویان ناراضی» در هر دو جا
     * هماهنگ شود (و در نتیجه اکسلِ فعالیت هم).
     */
    const refreshReports = async () => {
        await queryClient.invalidateQueries({ queryKey: ["shift-report-details"] });
        await queryClient.invalidateQueries({ queryKey: ["shift-reports"] });
        await queryClient.invalidateQueries({ queryKey: ["all-reports"] });
    };

    const dismissMutation = useMutation({
        mutationFn: dismissDissatisfaction,
        onSuccess: async (data) => {
            await refreshReports();
            toast.success(data.message);
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const restoreMutation = useMutation({
        mutationFn: restoreDissatisfaction,
        onSuccess: async (data) => {
            await refreshReports();
            toast.success(data.message);
        },
        onError: (error: Error) => toast.error(error.message),
    });

    if (!report) {
        return null;
    }

    const dissatisfactions = detailsQuery.data?.dissatisfactions ?? [];
    const dismissed = detailsQuery.data?.dismissed_dissatisfactions ?? [];

    return (
        <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75" />
                <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 space-y-6 overflow-y-auto rounded-4xl border border-hairline dialog-surface p-6 md:p-7">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogPrimitive.Title className="text-xl font-bold text-ink">
                                جزئیات گزارش
                            </DialogPrimitive.Title>
                            <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-ink-2">
                                اطلاعات کامل این گزارش خودکار و شیفت مرتبط با
                                آن
                            </DialogPrimitive.Description>
                        </div>
                        <DialogPrimitive.Close asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="بستن جزئیات گزارش"
                            >
                                <X />
                            </Button>
                        </DialogPrimitive.Close>
                    </div>

                    <div className="grid grid-cols-2 gap-4 rounded-3xl border border-hairline bg-surface-2 p-4">
                        <DetailField
                            label="پشتیبان"
                            value={
                                report.user?.name ??
                                `پشتیبان #${report.user_id}`
                            }
                        />
                        <DetailField
                            label="شناسه گزارش"
                            value={report.id.toLocaleString("fa-IR")}
                        />
                        <DetailField
                            label="شناسه شیفت"
                            value={report.shift_id.toLocaleString("fa-IR")}
                        />
                        <DetailField
                            label="تاریخ شیفت"
                            value={formatShiftDateTime(report.shift.start_time)}
                        />
                        <DetailField
                            label="شروع شیفت"
                            value={formatShiftDateTime(report.shift.start_time)}
                        />
                        <DetailField
                            label="پایان شیفت"
                            value={
                                report.shift.end_time
                                    ? formatShiftDateTime(report.shift.end_time)
                                    : "در حال انجام"
                            }
                        />
                        <DetailField
                            label="مدت شیفت"
                            value={formatShiftDuration(
                                report.shift.start_time,
                                report.shift.end_time,
                            )}
                        />
                        <div>
                            <p className="text-xs text-ink-2">وضعیت شیفت</p>
                            <StatusPill
                                tone={getShiftStatusTone(report.shift.status)}
                                className="mt-2"
                            >
                                {formatShiftStatus(report.shift.status)}
                            </StatusPill>
                        </div>
                        <DetailField
                            label="کانال شیفت"
                            value={formatChannel(report.shift.channel)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <DetailField
                            label="دانشجویان پاسخ‌داده‌شده"
                            value={report.responded_students_count.toLocaleString(
                                "fa-IR",
                            )}
                        />
                        <DetailField
                            label="دانشجویان ناراضی"
                            value={report.unsatisfied_students_count.toLocaleString(
                                "fa-IR",
                            )}
                        />
                    </div>

                    <div className="space-y-3 rounded-3xl border border-hairline bg-surface-2 p-4">
                        <div className="flex items-center gap-2">
                            <MessageSquareWarning className="size-4 text-err-text" />
                            <p className="text-xs font-bold text-ink">
                                دلایل نارضایتی (امتیاز ۲ و کمتر)
                            </p>
                        </div>
                        {detailsQuery.isPending ? (
                            <p className="text-sm italic text-ink-3">
                                در حال دریافت دلایل نارضایتی...
                            </p>
                        ) : dissatisfactions.length === 0 ? (
                            <p className="text-sm italic text-ink-3">
                                در این شیفت نارضایتی ثبت نشده است.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {dissatisfactions.map((item) => (
                                    <DissatisfactionCard
                                        key={item.id}
                                        item={item}
                                        canDismiss={canDismiss}
                                        pending={
                                            dismissMutation.isPending ||
                                            restoreMutation.isPending
                                        }
                                        onDismiss={() =>
                                            dismissMutation.mutate(item.id)
                                        }
                                        onRestore={() =>
                                            restoreMutation.mutate(item.id)
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {canDismiss && dismissed.length > 0 ? (
                        <div className="space-y-3 rounded-3xl border border-hairline bg-surface-2 p-4">
                            <p className="text-xs font-bold text-ink-2">
                                کنار گذاشته‌شده‌ها ({dismissed.length.toLocaleString("fa-IR")})
                            </p>
                            <p className="text-xs leading-5 text-ink-3">
                                این‌ها در شمارش «دانشجویان ناراضی» و اکسل فعالیت
                                نیستند.
                            </p>
                            <div className="space-y-3">
                                {dismissed.map((item) => (
                                    <DissatisfactionCard
                                        key={item.id}
                                        item={item}
                                        canDismiss={canDismiss}
                                        pending={
                                            dismissMutation.isPending ||
                                            restoreMutation.isPending
                                        }
                                        onDismiss={() =>
                                            dismissMutation.mutate(item.id)
                                        }
                                        onRestore={() =>
                                            restoreMutation.mutate(item.id)
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="space-y-2 rounded-3xl border border-hairline bg-surface-2 p-4">
                        <p className="text-xs text-ink-2">یادداشت‌های اضافی</p>
                        {report.extra_notes ? (
                            <p className="text-sm leading-7 text-ink">
                                {report.extra_notes}
                            </p>
                        ) : (
                            <p className="text-sm italic text-ink-3">
                                یادداشتی ثبت نشده است.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 rounded-3xl border border-hairline bg-surface-2 p-4 sm:grid-cols-2">
                        <DetailField
                            label="تاریخ ثبت گزارش"
                            value={formatShiftDateTime(report.created_at)}
                        />
                        <DetailField
                            label="آخرین بروزرسانی"
                            value={formatShiftDateTime(report.updated_at)}
                        />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-ink-2">
                        <CalendarDays className="size-4" />
                        <span>{formatShiftDateTime(report.created_at)}</span>
                        <Clock className="size-4" />
                        <span>
                            {formatShiftDuration(
                                report.shift.start_time,
                                report.shift.end_time,
                            )}
                        </span>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

/**
 * یک دلیل نارضایتی در گزارش شیفت.
 *
 * برای ناظر اکانت و سوپر ادمین دکمه‌ی «بی‌ربط» هست: با زدنش این امتیاز از
 * شمارش «دانشجویان ناراضی» در گزارش شیفت و از ستون متناظر در اکسل فعالیت
 * بیرون می‌رود. رکورد حذف نمی‌شود و با «بازگرداندن» برمی‌گردد.
 */
function DissatisfactionCard({
    canDismiss,
    item,
    onDismiss,
    onRestore,
    pending,
}: {
    canDismiss: boolean;
    item: DissatisfactionReason;
    onDismiss: () => void;
    onRestore: () => void;
    pending: boolean;
}) {
    const [confirming, setConfirming] = useState(false);
    const isDismissed = item.dismissed_at !== null;

    return (
        <>
            <div
                className={cn(
                    "rounded-2xl border border-hairline bg-surface-2 p-3",
                    isDismissed && "opacity-70",
                )}
            >
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">
                        {item.student_name}
                    </p>
                    <span className="text-xs text-err-text">
                        {item.rating_value.toLocaleString("fa-IR")} از ۵
                    </span>
                </div>
                {item.description ? (
                    <p className="mt-2 text-sm leading-6 text-ink">
                        {item.description}
                    </p>
                ) : (
                    <p className="mt-2 text-xs italic text-ink-3">
                        توضیحی ثبت نشده است.
                    </p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-ink-2">
                        {formatShiftDateTime(item.submitted_at)}
                    </p>

                    {canDismiss ? (
                        isDismissed ? (
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={pending}
                                onClick={onRestore}
                            >
                                <RotateCcw className="size-4" />
                                بازگرداندن
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="danger"
                                disabled={pending}
                                onClick={() => setConfirming(true)}
                            >
                                <Trash2 className="size-4" />
                                بی‌ربط
                            </Button>
                        )
                    ) : null}
                </div>

                {isDismissed && item.dismissed_by ? (
                    <p className="mt-2 text-xs text-ink-3">
                        کنار گذاشته‌شده توسط {item.dismissed_by}
                    </p>
                ) : null}
            </div>

            <ConfirmDialog
                open={confirming}
                title="کنار گذاشتن نارضایتی"
                description="این امتیاز از شمارش «دانشجویان ناراضی» در گزارش شیفت و اکسل فعالیت حذف می‌شود. بعداً می‌توانید برگردانید."
                confirmLabel="کنار بگذار"
                isPending={pending}
                onConfirm={() => {
                    setConfirming(false);
                    onDismiss();
                }}
                onClose={() => setConfirming(false)}
            />
        </>
    );
}

function DetailField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-ink-2">{label}</p>
            <p className="mt-1.5 text-sm font-semibold text-ink">{value}</p>
        </div>
    );
}

function formatChannel(channel: string): string {
    const labels: Record<string, string> = {
        web: "وب",
        ai: "هوش مصنوعی",
        phone: "تلفنی",
    };
    return labels[channel] ?? "نامشخص";
}

function getShiftStatusTone(
    status: string,
): "success" | "warning" | "danger" | "neutral" {
    if (status === "ended") {
        return "success";
    }

    if (status === "active") {
        return "warning";
    }

    if (status === "cancelled") {
        return "danger";
    }

    return "neutral";
}