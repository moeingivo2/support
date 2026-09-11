import {
  BarChart3,
  BookOpen,
  CalendarClock,
  ClipboardList,
  FileWarning,
  FolderOpen,
  LayoutDashboard,
  MessageSquareWarning,
  PlayCircle,
  SquareChartGantt,
  UserPlus,
} from 'lucide-react'
import type { PanelUser } from '@/shared/lib/auth-storage'

type NavItem = {
  label: string
  path: string
  icon: typeof LayoutDashboard
}

// منوی پنل ادمین — فقط نظارت؛ بدون شیفت و ثبت گزارش
const adminNavigation: NavItem[] = [
  { label: 'داشبورد', path: '/', icon: LayoutDashboard },
  { label: 'گزارش شیفت پشتیبان‌ها', path: '/all-reports', icon: BarChart3 },
  { label: 'نارضایتی دانشجویان', path: '/student-complaints', icon: MessageSquareWarning },
  { label: 'ثبت پشتیبان جدید', path: '/register-support', icon: UserPlus },
  { label: 'سورس جلسات', path: '/sessions', icon: BookOpen },
  { label: 'فایل‌های مورد نیاز', path: '/files', icon: FolderOpen },
  { label: 'سوالات متداول', path: '/faq', icon: FileWarning },
  { label: 'ویدیوهای آموزشی', path: '/training-videos', icon: PlayCircle },
]

// منوی پنل ساپورت — عملیات روزمره
const supportNavigation: NavItem[] = [
  { label: 'داشبورد', path: '/', icon: LayoutDashboard },
  { label: 'شیفت من', path: '/support-shifts', icon: CalendarClock },
  { label: 'نارضایتی دانشجویان', path: '/student-complaints', icon: MessageSquareWarning },
  { label: 'سورس جلسات', path: '/sessions', icon: BookOpen },
  { label: 'فایل‌های مورد نیاز', path: '/files', icon: FolderOpen },
  { label: 'سوالات متداول', path: '/faq', icon: FileWarning },
  { label: 'ویدیوهای آموزشی', path: '/training-videos', icon: PlayCircle },
  { label: 'گزارش پایان شیفت', path: '/end-shift-report', icon: ClipboardList },
  { label: 'گزارش‌های من', path: '/reports', icon: SquareChartGantt },
]

export function getNavigation(user: PanelUser | null): NavItem[] {
  return user?.role === 'admin' ? adminNavigation : supportNavigation
}

// برای سازگاری با استفاده‌های قبلی
export const mainNavigation = supportNavigation
