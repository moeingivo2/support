import {
    CalendarDays,
    Clock,
    Eye,
    MessageSquareWarning,
    MonitorSmartphone,
    Users,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { StatusPill } from "@/shared/ui/status-pill";
import { formatShiftDateTime } from "../utils/formatShiftDateTime";
import { formatShiftDuration } from "../utils/formatShiftDuration";
import { formatShiftStatus } from "../utils/formatShiftStatus";
import type { ShiftReport } from "../types/shiftReport";

type ShiftReportCardProps = {
    report: ShiftReport;
    onOpenDetails: (report: ShiftReport) => void;
};

export function ShiftReportCard({
    report,
    onOpenDetails,
}: ShiftReportCardProps) {
    const status = formatShiftStatus(report.shift.status);

    return (
        <Card className="flex h-full flex-col gap-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <CalendarDays className="size-4 text-ink-2" />
                    {formatShiftDateTime(report.created_at)}
                </span>
                <StatusPill tone={getShiftStatusTone(report.shift.status)}>
                    {status}
                </StatusPill>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ReportMetric
                    label="دانشجویان پاسخ‌داده‌شده"
                    value={report.responded_students_count}
                    icon={Users}
                    tone="text-accent-ink"
                />
                <ReportMetric
                    label="دانشجویان ناراضی"
                    value={report.unsatisfied_students_count}
                    icon={MessageSquareWarning}
                    tone="text-err-text"
                />
                <ReportMetric
                    label="درخواست‌های دسک"
                    value={report.desk_requests_count}
                    icon={MonitorSmartphone}
                    tone="text-alret-gold"
                />
            </div>

            <div className="space-y-3 rounded-3xl bg-surface-2 p-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-2">
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-4" />
                        شروع شیفت:{" "}
                        {formatShiftDateTime(report.shift.start_time)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-4" />
                        پایان شیفت:{" "}
                        {report.shift.end_time
                            ? formatShiftDateTime(report.shift.end_time)
                            : "در حال انجام"}
                    </span>
                </div>
                <p className="text-xs text-ink-2">
                    مدت شیفت:{" "}
                    {formatShiftDuration(
                        report.shift.start_time,
                        report.shift.end_time,
                    )}
                </p>
            </div>

            {report.extra_notes ? (
                <p className="text-sm leading-7 text-ink">
                    {report.extra_notes}
                </p>
            ) : (
                <p className="text-sm italic text-ink-3">
                    یادداشتی ثبت نشده است.
                </p>
            )}

            <Button
                variant="ghost"
                className="mt-auto w-full"
                onClick={() => onOpenDetails(report)}
            >
                <Eye />
                مشاهده جزئیات
            </Button>
        </Card>
    );
}

function ReportMetric({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: number;
    icon: typeof Users;
    tone: string;
}) {
    return (
        <div className="space-y-2">
            <span
                className={`inline-flex size-9 items-center justify-center rounded-xl bg-surface-2 ${tone}`}
            >
                <Icon className="size-4" />
            </span>
            <p className="text-xl font-bold text-ink">
                {value.toLocaleString("fa-IR")}
            </p>
            <p className="text-xs leading-5 text-ink-2">{label}</p>
        </div>
    );
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
