import { Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shell/components/app-shell";
import StudentShell from "@/shell/components/student-shell";
import LoginPage from "@/features/auth/pages/LoginPage";
import StudentLoginPage from "@/features/student-auth/pages/StudentLoginPage";
import StudentRegisterPage from "@/features/student-auth/pages/StudentRegisterPage";
import ForgotPasswordPage from "@/features/student-auth/pages/ForgotPasswordPage";
import { ChatRoute } from "@/features/student-chat/routes";
import { AccountRoute } from "@/features/student-account/routes";
import { SupportInboxRoute } from "@/features/support-chat/routes";
import DashboardRoute from "@/features/dashboard/routes";
import SupportShiftsRoute from "@/features/support-shifts/routes";
import StudentComplaintsRoute from "@/features/student-complaints/routes";
import SessionSourcesRoute from "@/features/session-sources/routes";
import RequiredFilesRoute from "@/features/required-files/routes";
import FaqRoute from "@/features/faq/routes";
import TrainingVideosRoute from "@/features/training-videos/routes";
import {
    ActivityReportRoute,
    AllReportsRoute,
    ManageAdminsRoute,
    RegisterSupportRoute,
    SupportRankingRoute,
} from "@/features/admin/routes";
import { AuthProvider, useAuth } from "@/shared/services/auth-context";
import { ThemeProvider } from "@/shared/services/theme-context";
import { ToastProvider } from "@/shared/ui/toast";
import LoginSplash from "@/features/auth/components/LoginSplash";
import { AppErrorBoundary } from "@/shared/ui/app-error-boundary";
import ObserverSchedulesPage from "@/features/admin/pages/ObserverSchedulesPage";
import TeamSupervisionPage from "@/features/support-chat/pages/TeamSupervisionPage";
import MentorFeedbackPage from "@/features/student-complaints/pages/MentorFeedbackPage";

const supportOnlyPaths = new Set(["/support-shifts"]);
const accountObserverOnlyPaths = new Set([
    "/observer-schedules",
    "/team-supervision",
]);
const supportPanelPaths = new Set(["/mentor-feedback"]);
/**
 * محتوای پنل (سورس جلسات، فایل‌های مورد نیاز، سوالات متداول) به بخش «وب» و
 * «هوش مصنوعی» تقسیم شده و سرور آن را به `support_type` گره می‌زند. ناظر
 * فقط‌خواندنی نوع پشتیبانی ندارد، پس این سه صفحه برایش نیست.
 */
const contentChannelPaths = new Set(["/sessions", "/files", "/faq"]);
const adminOnlyPaths = new Set([
    "/register-support",
    "/activity-report",
    "/manage-admins",
    "/support-ranking",
]);
/**
 * پنل گزارش‌های خودکار شیفت — فقط سوپر ادمین و ناظرها؛ پشتیبان‌ها گزارش را
 * نمی‌بینند (فرم دستی کاملاً حذف شده است).
 */
const reportsPanelPaths = new Set(["/all-reports"]);
/**
 * طبق سیاست حاکمیت داده، سوپر ادمین به متن گفتگوی دانشجویان دسترسی ندارد.
 * دسترسی متن گفتگو فقط برای پشتیبان و ناظر (فقط‌خواندنی) است.
 */
const transcriptPaths = new Set(["/inbox"]);

const routeComponents: Record<string, React.ComponentType> = {
    "/": DashboardRoute,
    "/inbox": SupportInboxRoute,
    "/support-shifts": SupportShiftsRoute,
    "/student-complaints": StudentComplaintsRoute,
    "/sessions": SessionSourcesRoute,
    "/files": RequiredFilesRoute,
    "/faq": FaqRoute,
    "/training-videos": TrainingVideosRoute,
    "/all-reports": AllReportsRoute,
    "/activity-report": ActivityReportRoute,
    "/manage-admins": ManageAdminsRoute,
    "/register-support": RegisterSupportRoute,
    "/support-ranking": SupportRankingRoute,
    "/observer-schedules": ObserverSchedulesPage,
    "/team-supervision": TeamSupervisionPage,
    "/mentor-feedback": MentorFeedbackPage,
};

function PanelRoutes() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const isObserver = user?.role === "observer";
    /** مقصد پیش‌فرض ناظر — داشبورد شیفتی ندارد */
    const homePath = isObserver ? "/inbox" : "/";

    function renderWithGuard(path: string) {
        if (isAdmin && transcriptPaths.has(path))
            return <Navigate to={homePath} replace />;
        if (supportOnlyPaths.has(path) && (isAdmin || isObserver))
            return <Navigate to={homePath} replace />;
        if (accountObserverOnlyPaths.has(path) && user?.role !== "account_observer")
            return <Navigate to={homePath} replace />;
        if (supportPanelPaths.has(path) && !["support", "observer", "account_observer", "admin"].includes(user?.role ?? ""))
            return <Navigate to={homePath} replace />;
        if (contentChannelPaths.has(path) && user?.role === "observer")
            return <Navigate to={homePath} replace />;
        if (adminOnlyPaths.has(path) && !isAdmin)
            return <Navigate to={homePath} replace />;
        if (
            reportsPanelPaths.has(path) &&
            !["admin", "observer", "account_observer"].includes(user?.role ?? "")
        )
            return <Navigate to={homePath} replace />;
        const RouteComponent = routeComponents[path]!;
        return <RouteComponent />;
    }

    return (
        <AppShell>
            <Suspense fallback={<PageFallback />}>
                <Routes>
                    {Object.keys(routeComponents).map((path) => (
                        <Route
                            key={path}
                            path={path}
                            element={renderWithGuard(path)}
                        />
                    ))}
                    <Route path="*" element={<Navigate to={homePath} replace />} />
                </Routes>
            </Suspense>
        </AppShell>
    );
}

function StudentRoutes() {
    return (
        <StudentShell>
            <Suspense fallback={<PageFallback />}>
                <Routes>
                    <Route path="/chat" element={<ChatRoute />} />
                    <Route path="/account" element={<AccountRoute />} />
                    <Route path="/mentor-feedback" element={<MentorFeedbackPage />} />
                    <Route path="*" element={<Navigate to="/chat" replace />} />
                </Routes>
            </Suspense>
        </StudentShell>
    );
}

function GuestRoutes() {
    return (
        <Suspense fallback={<PageFallback />}>
            <Routes>
                <Route path="/register" element={<StudentRegisterPage />} />
                <Route
                    path="/forgot-password"
                    element={<ForgotPasswordPage />}
                />
                <Route path="/login" element={<StudentLoginPage />} />
                <Route path="/panel-login" element={<LoginPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Suspense>
    );
}

function AppRoutes() {
    const { isAuthenticated, user, showLoginSplash, completeLoginSplash } =
        useAuth();
    const queryClient = useQueryClient();

    // در صورت انقضای نشست (401 سراسری)، کش ریست و به لاگین هدایت می‌شویم
    useEffect(() => {
        function onUnauthorized() {
            queryClient.clear();
        }
        window.addEventListener("auth:unauthorized", onUnauthorized);
        return () =>
            window.removeEventListener("auth:unauthorized", onUnauthorized);
    }, [queryClient]);

    return (
        <>
            {!isAuthenticated ? (
                <GuestRoutes />
            ) : user?.role === "student" ? (
                <StudentRoutes />
            ) : (
                <PanelRoutes />
            )}
            {showLoginSplash ? (
                <LoginSplash onComplete={completeLoginSplash} />
            ) : null}
        </>
    );
}

function PageFallback() {
    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="h-40 animate-pulse rounded-4xl border border-hairline bg-glass" />
            <div className="h-72 animate-pulse rounded-4xl border border-hairline bg-glass" />
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <ToastProvider>
                    <AuthProvider>
                        <AppErrorBoundary>
                            <AppRoutes />
                        </AppErrorBoundary>
                    </AuthProvider>
                </ToastProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}
