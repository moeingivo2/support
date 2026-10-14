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

type NavItem = {
    label: string;
    path: string;
    icon: typeof LayoutDashboard;
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
    {
        label: "نارضایتی دانشجویان",
        path: "/student-complaints",
        icon: MessageSquareWarning,
    },
    { label: "نارضایتی از منتور", path: "/mentor-feedback", icon: MessageSquareWarning },
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
    { label: "درخواست ارتقا", path: "/upgrade-requests", icon: GraduationCap },
    { label: "شیفت من", path: "/support-shifts", icon: CalendarClock },
    {
        label: "نارضایتی دانشجویان",
        path: "/student-complaints",
        icon: MessageSquareWarning,
    },
    { label: "نارضایتی از منتور", path: "/mentor-feedback", icon: MessageSquareWarning },
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
    { label: "نارضایتی دانشجویان", path: "/student-complaints", icon: MessageSquareWarning },
    { label: "نارضایتی از منتور", path: "/mentor-feedback", icon: MessageSquareWarning },
];

// کارآموز فقط‌خواندنی است و مانند ناظر به متن گفتگوها دسترسی دارد،
// اما ابزار پشتیبانی، شیفت و گزارش ندارد.
const traineeNavigation: NavItem[] = [
    { label: "گفتگوی دانشجویان", path: "/inbox", icon: MessagesSquare },
];

const accountObserverNavigation: NavItem[] = [
    ...supportNavigation.filter((item) => item.path !== "/mentor-feedback"),
    {
        label: "نظارت بر روی تیم",
        path: "/team-supervision",
        icon: Eye,
    },
    { label: "تعیین شیفت تیم", path: "/shift-scheduling", icon: UserRoundCog },
    { label: "گزارش شیفت پشتیبان‌ها", path: "/all-reports", icon: BarChart3 },
];

export function getNavigation(user: PanelUser | null): NavItem[] {
    if (user?.role === "admin") return adminNavigation;
    if (user?.role === "observer") return observerNavigation;
    if (user?.role === "trainee") return traineeNavigation;
    if (user?.role === "account_observer") return accountObserverNavigation;
    return supportNavigation;
}

// برای سازگاری با استفاده‌های قبلی
export const mainNavigation = supportNavigation;
