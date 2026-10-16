import {
    BarChart3,
    BookOpen,
    CalendarClock,
    Eye,
    FileSpreadsheet,
    FileWarning,
    FolderOpen,
    GraduationCap,
    LayoutDashboard,
    MessageSquareWarning,
    MessagesSquare,
    PlayCircle,
    Trophy,
    UserRoundCog,
    UserCog,
    UserPlus,
    Users,
} from "lucide-react";
import type { PanelUser } from "@/shared/lib/auth-storage";

export type NavItem = {
    label: string;
    path: string;
    icon: typeof LayoutDashboard;
    /**
     * نشان قرمز کنار آیتم — مثل تلگرام. برای «نارضایتی» تعداد
     * خوانده‌نشده‌ها را می‌گیرد.
     */
    badge?: number;
};

// منوی پنل ادمین — نظارت و برنامه‌ریزی؛ بدون ثبت گزارش دستی شیفت.
// طبق سیاست حاکمیت، سوپر ادمین به متن گفتگوی دانشجویان دسترسی ندارد.
const adminNavigation: NavItem[] = [
    { label: "داشبورد", path: "/", icon: LayoutDashboard },
    { label: "تعیین شیفت", path: "/shift-scheduling", icon: UserRoundCog },
    { label: "گزارش شیفت پشتیبان‌ها", path: "/all-reports", icon: BarChart3 },
    {
        label: "گزارش فعالیت پشتیبان",
        path: "/activity-report",
        icon: FileSpreadsheet,
    },
    { label: "رتبه‌بندی پشتیبان‌ها", path: "/support-ranking", icon: Trophy },
    { label: "درخواست ارتقا", path: "/upgrade-requests", icon: GraduationCap },
    { label: "مدیریت سوپر ادمین‌ها", path: "/manage-admins", icon: UserCog },
    // پنل نارضایتی فقط در دسترس سوپر ادمین است.
    { label: "نارضایتی‌ها", path: "/student-complaints", icon: MessageSquareWarning },
    { label: "ثبت پشتیبان جدید", path: "/register-support", icon: UserPlus },
    { label: "کارآموزها", path: "/manage-trainees", icon: Users },
    { label: "سورس جلسات", path: "/sessions", icon: BookOpen },
    { label: "فایل‌های مورد نیاز", path: "/files", icon: FolderOpen },
    { label: "سوالات متداول", path: "/faq", icon: FileWarning },
    { label: "ویدیوهای آموزشی", path: "/training-videos", icon: PlayCircle },
];

// منوی پشتیبان — عملیات روزمره. گزارش پایان شیفت دیگر دستی نیست و
// به‌صورت خودکار از لاگ گفتگوها ثبت می‌شود؛ پنل آن فقط ناظر و سوپر ادمین می‌بینند.
const supportNavigation: NavItem[] = [
    { label: "داشبورد", path: "/", icon: LayoutDashboard },
    { label: "گفتگوی دانشجویان", path: "/inbox", icon: MessagesSquare },
{ label: "شیفت من", path: "/support-shifts", icon: CalendarClock },
    { label: "سورس جلسات", path: "/sessions", icon: BookOpen },
    { label: "فایل‌های مورد نیاز", path: "/files", icon: FolderOpen },
    { label: "سوالات متداول", path: "/faq", icon: FileWarning },
    { label: "ویدیوهای آموزشی", path: "/training-videos", icon: PlayCircle },
];

/**
 * ناظر فقط‌خواندنی است: گفتگوها را می‌بیند و منابع عمومی را مرور می‌کند،
 * اما شیفت، گزارش‌گیری و ابزارهای پشتیبانی ندارد.
 *
 * سورس جلسات، فایل‌های مورد نیاز و سوالات متداول این‌جا نیستند: محتوای
 * پنل به بخش «وب» و «هوش مصنوعی» تقسیم شده و سرور آن را به
 * `support_type` کاربر گره می‌زند؛ ناظر فقط‌خواندنی اصلاً نوع پشتیبانی
 * ندارد، پس فقط ناظر اکانت (که نوع دارد) این سه صفحه را می‌بیند.
 */
const observerNavigation: NavItem[] = [
    { label: "گفتگوی دانشجویان", path: "/inbox", icon: MessagesSquare },
    { label: "گزارش شیفت پشتیبان‌ها", path: "/all-reports", icon: BarChart3 },
];

// کارآموز فقط‌خواندنی است و مانند ناظر به متن گفتگوها دسترسی دارد،
// اما ابزار پشتیبانی، شیفت و گزارش ندارد.
const traineeNavigation: NavItem[] = [
    { label: "گفتگوی دانشجویان", path: "/inbox", icon: MessagesSquare },
];

const accountObserverNavigation: NavItem[] = [
    ...supportNavigation,
    {
        label: "نظارت بر روی تیم",
        path: "/team-supervision",
        icon: Eye,
    },
    { label: "تعیین شیفت تیم", path: "/shift-scheduling", icon: UserRoundCog },
    { label: "گزارش شیفت پشتیبان‌ها", path: "/all-reports", icon: BarChart3 },
];

/** آیتم‌هایی که نشان قرمزِ خوانده‌نشده می‌گیرند. */
const BADGE_PATHS = new Set(["/student-complaints"]);

export function getNavigation(user: PanelUser | null): NavItem[] {
    if (user?.role === "admin") return adminNavigation;
    if (user?.role === "observer") return observerNavigation;
    if (user?.role === "trainee") return traineeNavigation;
    if (user?.role === "account_observer") return accountObserverNavigation;
    return supportNavigation;
}

/**
 * نشان قرمزِ منو.
 *
 * فقط آیتم‌هایی که در `BADGE_PATHS` هستند عدد می‌گیرند و اگر
 * خوانده‌نشده‌ای نباشد اصلاً رندر نمی‌شوند.
 */
export function withBadges(
    items: NavItem[],
    unseenComplaints: number,
): NavItem[] {
    if (unseenComplaints <= 0) {
        return items;
    }

    return items.map((item) =>
        BADGE_PATHS.has(item.path)
            ? { ...item, badge: unseenComplaints }
            : item,
    );
}

// برای سازگاری با استفاده‌های قبلی
export const mainNavigation = supportNavigation;