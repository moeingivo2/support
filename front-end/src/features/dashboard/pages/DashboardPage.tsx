import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
    BarChart3,
    Clock,
    FileSpreadsheet,
    Play,
    UserCog,
    UserRound,
    UserPlus,
    Users,
} from "lucide-react";
import { getDashboardData } from "../api/dashboard-api";
import { getJson } from "@/shared/api/http";
import { DashboardMetricsSection } from "../components/dashboard-metrics";
import { QuickActionsSection } from "../components/quick-actions";
import {
    dashboardKeys,
    mapDashboardMetrics,
    type DashboardMetrics,
} from "../services/dashboard-service";
import { currentUserKeys } from "../services/current-shift-service";
import { getCurrentUser } from "@/shared/services/auth-service";
import { useActiveShift } from "@/features/support-shifts/hooks/useActiveShift";
import { getActiveShifts } from "@/features/support-shifts/services/shift-service";
import { useAuth } from "@/shared/services/auth-context";
import { Card } from "@/shared/ui/card";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatusPill } from "@/shared/ui/status-pill";
import { Dot } from "@/shared/ui/dot";
import {
    formatShiftTime,
    formatShiftDuration,
} from "@/features/end-shift-report/utils/formatShiftPresentation";

type DashboardQuery = {
    data?: DashboardMetrics;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
};

export default function DashboardPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    const dashboard = useQuery({
        queryKey: dashboardKeys.all,
        queryFn: async () => mapDashboardMetrics(await getDashboardData()),
        refetchInterval: 60_000,
    });
    const currentUser = useQuery({
        queryKey: currentUserKeys.all,
        queryFn: getCurrentUser,
        staleTime: 300_000,
    });

    const userName = currentUser.data?.name ?? user?.name ?? "";

    if (isAdmin) {
        return <AdminDashboard dashboard={dashboard} userName={userName} />;
    }

    return <SupportDashboard dashboard={dashboard} userName={userName} />;
}

function AdminDashboard({
    dashboard,
    userName,
}: {
    dashboard: DashboardQuery;
    userName: string;
}) {
    const activeShifts = useQuery({
        queryKey: ["shifts", "active"],
        queryFn: getActiveShifts,
        refetchInterval: 60_000,
    });

    const metricsStatus = dashboard.isPending
        ? "loading"
        : dashboard.isError
          ? "error"
          : dashboard.data
            ? "success"
            : "empty";

    const onlineShifts = activeShifts.data?.shifts ?? [];

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <Card className="p-6 md:p-7">
                <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">
                    پنل سوپر ادمین
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-ink-2">
                    وقت بخیر {userName || "…"} — نظارت بر عملکرد تیم پشتیبانی
                </p>
            </Card>

            <section className="space-y-4" aria-labelledby="online-supports">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2
                        id="online-supports"
                        className="text-xl font-bold text-ink"
                    >
                        پشتیبان‌های در حال شیفت
                    </h2>
                    <StatusPill tone="success">
                        <Dot />
                        {activeShifts.data?.count.toLocaleString("fa-IR") ??
                            "۰"}{" "}
                        نفر فعال
                    </StatusPill>
                </div>

                {activeShifts.isPending ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {Array.from({ length: 2 }, (_, index) => (
                            <Card key={index} className="space-y-3 p-5">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-4 w-56" />
                            </Card>
                        ))}
                    </div>
                ) : onlineShifts.length === 0 ? (
                    <Card className="flex flex-col items-center gap-3 p-10 text-center">
                        <Users className="size-10 text-ink-3" />
                        <p className="text-base font-bold text-ink">
                            هیچ پشتیبانی در حال شیفت نیست.
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {onlineShifts.map((shift) => (
                            <Card
                                key={shift.id}
                                className="flex items-center justify-between gap-3 p-5"
                            >
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-ink">
                                        {shift.user?.name ??
                                            `پشتیبان #${shift.user_id}`}
                                    </p>
                                    <p className="text-xs text-ink-2">
                                        شروع:{" "}
                                        {formatShiftTime(shift.start_time)} —
                                        مدت:{" "}
                                        {formatShiftDuration(
                                            shift.start_time,
                                            null,
                                        )}
                                    </p>
                                </div>
                                <StatusPill
                                    tone={
                                        shift.channel === "ai"
                                            ? "warning"
                                            : "info"
                                    }
                                >
                                    {shift.channel === "ai"
                                        ? "هوش مصنوعی"
                                        : "وب"}
                                </StatusPill>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            <DashboardMetricsSection
                error={dashboard.error}
                metrics={dashboard.data}
                onRetry={() => dashboard.refetch()}
                status={metricsStatus}
            />

            <section className="space-y-4" aria-labelledby="admin-quick-links">
                <h2
                    id="admin-quick-links"
                    className="text-xl font-bold text-ink"
                >
                    دسترسی سریع سوپر ادمین
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Card className="p-0">
                        <Link
                            to="/all-reports"
                            className="flex items-center gap-4 rounded-xl p-5 transition hover:bg-surface-2"
                        >
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                                <BarChart3 />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-ink">
                                    گزارش شیفت پشتیبان‌ها
                                </span>
                                <span className="block text-xs text-ink-2">
                                    مشاهده و فیلتر گزارش‌های کل تیم
                                </span>
                            </span>
                        </Link>
                    </Card>
                    <Card className="p-0">
                        <Link
                            to="/activity-report"
                            className="flex items-center gap-4 rounded-xl p-5 transition hover:bg-surface-2"
                        >
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warn-soft text-alret-gold ring-1 ring-warn-ring">
                                <FileSpreadsheet />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-ink">
                                    گزارش فعالیت پشتیبان
                                </span>
                                <span className="block text-xs text-ink-2">
                                    دریافت خروجی Excel در بازه دلخواه
                                </span>
                            </span>
                        </Link>
                    </Card>
                    <Card className="p-0">
                        <Link
                            to="/manage-admins"
                            className="flex items-center gap-4 rounded-xl p-5 transition hover:bg-surface-2"
                        >
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                                <UserCog />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-ink">
                                    مدیریت سوپر ادمین‌ها
                                </span>
                                <span className="block text-xs text-ink-2">
                                    ایجاد، ویرایش و حذف حساب‌های مدیریتی
                                </span>
                            </span>
                        </Link>
                    </Card>
                    <Card className="p-0">
                        <Link
                            to="/register-support"
                            className="flex items-center gap-4 rounded-xl p-5 transition hover:bg-surface-2"
                        >
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                                <UserPlus />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-ink">
                                    ثبت پشتیبان جدید
                                </span>
                                <span className="block text-xs text-ink-2">
                                    ایجاد حساب با نوع پشتیبانی (وب / هوش مصنوعی)
                                </span>
                            </span>
                        </Link>
                    </Card>
                </div>
            </section>
        </div>
    );
}

function SupportDashboard({
    dashboard,
    userName,
}: {
    dashboard: DashboardQuery;
    userName: string;
}) {
    const currentShift = useActiveShift();
    const activeShift = currentShift.data;
    const scheduleQuery = useQuery({
        queryKey: ["shift-schedule", "notifications"],
        queryFn: () => getJson<{ data: { starts_at: string; ends_at: string; schedule: { name: string; channel: string } }[] }>("/api/shift-schedule/notifications"),
        refetchInterval: 30000,
    });

    const metricsStatus = dashboard.isPending
        ? "loading"
        : dashboard.isError
          ? "error"
          : dashboard.data
            ? "success"
            : "empty";

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <Card className="p-6 md:p-7">
                <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">
                    داشبورد
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-ink-2">
                    وقت بخیر {userName || "…"} — خلاصه فعالیت پشتیبانی و وضعیت
                    شیفت شما
                </p>
            </Card>

            {(scheduleQuery.data?.data ?? []).map((assignment, index) => (
                <Alert key={`${assignment.starts_at}-${index}`} tone="info">
                    شیفت «{assignment.schedule.name}» برای شما تعیین شده: {formatShiftTime(assignment.starts_at)} تا {formatShiftTime(assignment.ends_at)} ({assignment.schedule.channel === "ai" ? "هوش مصنوعی" : "وب"}). لطفاً در زمان مشخص‌شده حاضر باشید.
                </Alert>
            ))}

            {currentShift.isPending ? (
                <Card className="p-6">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-6 w-28" />
                    </div>
                </Card>
            ) : activeShift ? (
                <Card className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-7">
                    <div className="flex items-center gap-4">
                        <span className="grid size-12 place-items-center rounded-3xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                            <UserRound />
                        </span>
                        <div>
                            <p className="text-xs text-ink-2">وضعیت شما</p>
                            <StatusPill tone="success" className="mt-2">
                                <Dot />
                                در حال شیفت
                            </StatusPill>
                        </div>
                    </div>
                    <div className="grid flex-1 grid-cols-2 gap-5 md:grid-cols-3">
                        <div>
                            <p className="text-xs text-ink-2">کانال</p>
                            <p className="mt-1.5 text-sm font-semibold text-ink">
                                {activeShift.channel === "ai"
                                    ? "هوش مصنوعی"
                                    : "وب"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-ink-2">ساعت شروع</p>
                            <p className="mt-1.5 text-sm font-semibold text-ink">
                                {formatShiftTime(activeShift.start_time)}
                            </p>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <p className="text-xs text-ink-2">مدت شیفت</p>
                            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                                <Clock className="size-4" />
                                {formatShiftDuration(
                                    activeShift.start_time,
                                    null,
                                )}
                            </p>
                        </div>
                    </div>
                    <Button variant="danger" asChild>
                        <Link to="/end-shift-report">
                            پایان شیفت و ثبت گزارش
                        </Link>
                    </Button>
                </Card>
            ) : (
                <Card className="flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="font-bold text-ink">شیفت فعالی ندارید</p>
                        <p className="mt-1 text-sm text-ink-2">
                            برای شروع پاسخگویی، از صفحه شیفت من یک شیفت جدید
                            آغاز کنید.
                        </p>
                    </div>
                    <Button asChild>
                        <Link to="/support-shifts">
                            <Play />
                            رفتن به شیفت من
                        </Link>
                    </Button>
                </Card>
            )}

            <DashboardMetricsSection
                error={dashboard.error}
                metrics={dashboard.data}
                onRetry={() => dashboard.refetch()}
                status={metricsStatus}
            />

            <QuickActionsSection />
        </div>
    );
}
