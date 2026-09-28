import {
    BarChart3,
    BookOpen,
    CalendarClock,
    ClipboardList,
    FileSpreadsheet,
    FileWarning,
    FolderOpen,
    LayoutDashboard,
    MessageSquareWarning,
    MessagesSquare,
    PlayCircle,
    SquareChartGantt,
    Trophy,
    UserCog,
    UserPlus,
} from "lucide-react";
import type { PanelUser } from "@/shared/lib/auth-storage";

type NavItem = {
    label: string;
    path: string;
    icon: typeof LayoutDashboard;
};

// منوی پنل ادمین — فقط نظارت؛ بدون شیفت و ثبت گزارش.
// طبق سیاست حاکمیت، سوپر ادمین به متن گفتگوی دانشجویان دسترسی ندارد.
const adminNavigation: NavItem[] = [
    { label: "داشبورد", path: "/", icon: LayoutDashboard },
    { label: "گزارش شیفت پشتیبان‌ها", path: "/all-reports", icon: BarChart3 },
    {
        label: "گزارش فعالیت پشتیبان",
        path: "/activity-report",
        icon: FileSpreadsheet,
    },
    { label: "رتبه‌بندی پشتیبان‌ها", path: "/support-ranking", icon: Trophy },
    { label: "مدیریت سوپر ادمین‌ها", path: "/manage-admins", icon: UserCog },
    {
        label: "نارضایتی دانشجویان",
        path: "/student-complaints",
        icon: MessageSquareWarning,
    },
    { label: "ثبت پشتیبان جدید", path: "/register-support", icon: UserPlus },
    { label: "سورس جلسات", path: "/sessions", icon: BookOpen },
    { label: "فایل‌های مورد نیاز", path: "/files", icon: FolderOpen },
    { label: "سوالات متداول", path: "/faq", icon: FileWarning },
    { label: "ویدیوهای آموزشی", path: "/training-videos", icon: PlayCircle },
];

// منوی پنل ساپورت — عملیات روزمره
const supportNavigation: NavItem[] = [
    { label: "داشبورد", path: "/", icon: LayoutDashboard },
    { label: "گفتگوی دانشجویان", path: "/inbox", icon: MessagesSquare },
    { label: "شیفت من", path: "/support-shifts", icon: CalendarClock },
    {
        label: "نارضایتی دانشجویان",
        path: "/student-complaints",
        icon: MessageSquareWarning,
    },
    { label: "سورس جلسات", path: "/sessions", icon: BookOpen },
    { label: "فایل‌های مورد نیاز", path: "/files", icon: FolderOpen },
    { label: "سوالات متداول", path: "/faq", icon: FileWarning },
    { label: "ویدیوهای آموزشی", path: "/training-videos", icon: PlayCircle },
    {
        label: "گزارش پایان شیفت",
        path: "/end-shift-report",
        icon: ClipboardList,
    },
    { label: "گزارش‌های من", path: "/reports", icon: SquareChartGantt },
];

/**
 * ناظر فقط‌خواندنی است: گفتگوها را می‌بیند و منابع عمومی را مرور می‌کند،
 * اما شیفت، گزارش‌گیری و ابزارهای پشتیبانی ندارد.
 */
const observerNavigation: NavItem[] = [
    { label: "گفتگوی دانشجویان", path: "/inbox", icon: MessagesSquare },
    { label: "نارضایتی دانشجویان", path: "/student-complaints", icon: MessageSquareWarning },
    { label: "سورس جلسات", path: "/sessions", icon: BookOpen },
    { label: "فایل‌های مورد نیاز", path: "/files", icon: FolderOpen },
    { label: "سوالات متداول", path: "/faq", icon: FileWarning },
];

export function getNavigation(user: PanelUser | null): NavItem[] {
    if (user?.role === "admin") return adminNavigation;
    if (user?.role === "observer") return observerNavigation;
    return supportNavigation;
}

// برای سازگاری با استفاده‌های قبلی
export const mainNavigation = supportNavigation;
