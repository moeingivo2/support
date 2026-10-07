import {
    BookOpen,
    CalendarClock,
    ClipboardList,
    Eye,
    FolderOpen,
    PlayCircle,
} from "lucide-react";

const allQuickActions = [
    {
        title: "سورس جلسات",
        description: "دسترسی به سورس و کدهای جلسات",
        icon: BookOpen,
        path: "/sessions",
    },
    {
        title: "فایل‌های مورد نیاز",
        description: "دریافت مستندات پشتیبانی",
        icon: FolderOpen,
        path: "/files",
    },
    {
        title: "سوالات متداول و آموزش‌ها",
        description: "منابع پاسخ سریع به دانشجو",
        icon: PlayCircle,
        path: "/faq",
    },
    {
        title: "شیفت من",
        description: "شروع و پایان شیفت",
        icon: CalendarClock,
        path: "/support-shifts",
    },
    {
        title: "گزارش پایان شیفت",
        description: "ثبت خلاصه عملکرد شیفت",
        icon: ClipboardList,
        path: "/end-shift-report",
    },
] as const;

/** پشتیبان: همه‌ی اقدامات از جمله شیفت و گزارش پایان شیفت. */
export const dashboardQuickActions = allQuickActions;

/**
 * سوپر ادمین و ناظر فقط‌خواندنی: شیفت و گزارش پایان شیفت ندارند؛
 * منوی این نقش‌ها هم این دو مورد را نشان نمی‌دهد.
 */
export const observerDashboardQuickActions = allQuickActions.filter(
    (action) =>
        action.path !== "/support-shifts" &&
        action.path !== "/end-shift-report",
);

/**
 * ناظر اکانت شیفت تیمش را می‌بیند و ثبت می‌کند اما گزارش پایان شیفت
 * مخصوص خود پشتیبان است. «نظارت بر روی تیم» هم مخصوص اوست.
 */
export const accountObserverDashboardQuickActions = [
    ...allQuickActions.filter((action) => action.path !== "/end-shift-report"),
    {
        title: "نظارت بر روی تیم",
        description: "آمار اعضای تیم و ورود به حساب پشتیبان",
        icon: Eye,
        path: "/team-supervision",
    },
] as const;
