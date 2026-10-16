import {
    AlertCircle,
    ClipboardList,
    Info,
    MessageSquareWarning,
    RotateCcw,
    Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/services/auth-context";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatusPill } from "@/shared/ui/status-pill";
import type { DashboardMetrics } from "../services/dashboard-service";

const metricCards = [
    {
        label: "دانشجویان پاسخ‌داده‌شده در این هفته",
        field: "answeredStudents",
        icon: Users,
    },
    {
        label: "تعداد سرویس‌های موجود",
        field: "availableServices",
        icon: ClipboardList,
    },
] as const satisfies Array<{
    label: string;
    field: keyof DashboardMetrics;
    icon: typeof ClipboardList;
}>;

/**
 * کارت نشان قرمزِ نارضایتی — مثل تلگرام.
 *
 * هم بازِ این هفته را نشان می‌دهد و هم خوانده‌نشده‌ها را با یک بج قرمز.
 * کل کارت به صفحه‌ی نارضایتی‌ها لینک است تا یک کلیک کافی باشد.
 */
function ComplaintBadgeCard({
    metrics,
}: {
    metrics: DashboardMetrics;
}) {
    const navigate = useNavigate();
    const unseen = metrics.unseenComplaints;

    return (
        <button
            type="button"
            onClick={() => navigate("/student-complaints")}
            className="rounded-4xl border border-primary-line bg-primary-soft p-5 text-right shadow-[var(--c-shadow-soft)] transition hover:border-active-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active-blue"
        >
            <div className="flex items-start justify-between gap-3">
                <span className="text-3xl font-black text-ink">
                    {metrics.openComplaints.toLocaleString("fa-IR")}
                </span>
                {unseen > 0 ? (
                    <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-danger px-2 text-xs font-bold text-white">
                        {unseen > 99
                            ? "۹۹+"
                            : unseen.toLocaleString("fa-IR")}
                    </span>
                ) : null}
            </div>
            <p className="mt-4 text-sm leading-5 text-ink-2">
                نارضایتی‌های باز این هفته
            </p>
            <p className="mt-1 text-xs text-ink-2">
                {unseen > 0
                    ? `${unseen.toLocaleString("fa-IR")} مورد خوانده‌نشده`
                    : "همه نارضایتی‌ها دیده شده‌اند"}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-ink">
                <MessageSquareWarning className="size-4" />
                مشاهده نارضایتی‌ها
            </span>
        </button>
    );
}

export function DashboardMetricsSection({
    error,
    metrics,
    onRetry,
    status,
}: {
    error?: Error | null;
    metrics?: DashboardMetrics;
    onRetry: () => void;
    status: "loading" | "error" | "empty" | "success";
}) {
    const { user } = useAuth();

    // کارت نارضایتی فقط برای سوپر ادمین است؛ سرور هم آمارش را برای
    // بقیه صفر می‌فرستد.
    const canSeeComplaints = user?.role === "admin";

    return (
        <section className="space-y-4" aria-labelledby="dashboard-activity">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                    id="dashboard-activity"
                    className="text-xl font-bold text-ink"
                >
                    فعالیت این هفته
                </h2>
                <StatusPill tone="warning">
                    <Info className="size-3.5" />
                    داده‌ها هر ۶۰ ثانیه یک‌بار تازه‌سازی می‌شوند
                </StatusPill>
            </div>

            {status === "loading" && <MetricsLoading />}
            {status === "error" && (
                <MetricsError error={error} onRetry={onRetry} />
            )}
            {status === "empty" && <MetricsEmpty />}
            {status === "success" && metrics && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {metricCards.map((metric) => (
                        <Card key={metric.field} className="p-5">
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-3xl font-black text-ink">
                                    {metrics[metric.field].toLocaleString(
                                        "fa-IR",
                                    )}
                                </span>
                            </div>
                            <p className="mt-4 text-sm leading-5 text-ink-2">
                                {metric.label}
                            </p>
                        </Card>
                    ))}
                    {canSeeComplaints ? (
                        <ComplaintBadgeCard metrics={metrics} />
                    ) : null}
                </div>
            )}
        </section>
    );
}

function MetricsLoading() {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="space-y-4 p-5">
                    <div className="flex items-start justify-between">
                        <Skeleton className="size-10 rounded-2xl" />
                        <Skeleton className="h-9 w-12" />
                    </div>
                    <Skeleton className="h-4 w-4/5" />
                </Card>
            ))}
        </div>
    );
}

function MetricsError({
    error,
    onRetry,
}: {
    error?: Error | null;
    onRetry: () => void;
}) {
    return (
        <Card className="flex flex-col items-center gap-4 border-danger-line bg-danger-soft p-8 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-err-text">
                <AlertCircle />
            </span>
            <div>
                <p className="font-bold text-ink">
                    نمایش آمار داشبورد ممکن نیست
                </p>
                <p className="mt-1 text-sm text-ink-2">
                    {error?.message ?? "اتصال به سرویس آماری برقرار نشد."}
                </p>
            </div>
            <Button variant="ghost" onClick={onRetry}>
                <RotateCcw />
                تلاش مجدد
            </Button>
        </Card>
    );
}

function MetricsEmpty() {
    return (
        <Card className="flex flex-col items-center gap-3 border-warn-line bg-warn-soft p-8 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-warn-soft text-alret-gold">
                <ClipboardList />
            </span>
            <p className="font-bold text-ink">آماری برای نمایش وجود ندارد</p>
            <p className="text-sm text-ink-2">
                با ثبت اولین فعالیت، کارت‌ها به‌روزرسانی می‌شوند.
            </p>
        </Card>
    );
}
