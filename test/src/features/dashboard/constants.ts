import {
  BookOpen,
  CalendarClock,
  ClipboardList,
  FolderOpen,
  MessageSquareWarning,
  PlayCircle,
} from 'lucide-react'

export const dashboardQuickActions = [
  {
    title: 'ثبت نارضایتی دانشجو',
    description: 'فرم رسمی ثبت نارضایتی',
    icon: MessageSquareWarning,
    path: '/student-complaints',
  },
  {
    title: 'سورس جلسات',
    description: 'دسترسی به سورس و کدهای جلسات',
    icon: BookOpen,
    path: '/sessions',
  },
  {
    title: 'فایل‌های مورد نیاز',
    description: 'دریافت مستندات پشتیبانی',
    icon: FolderOpen,
    path: '/files',
  },
  {
    title: 'سوالات متداول و آموزش‌ها',
    description: 'منابع پاسخ سریع به دانشجو',
    icon: PlayCircle,
    path: '/faq',
  },
  {
    title: 'شیفت من',
    description: 'شروع و پایان شیفت',
    icon: CalendarClock,
    path: '/support-shifts',
  },
  {
    title: 'گزارش پایان شیفت',
    description: 'ثبت خلاصه عملکرد شیفت',
    icon: ClipboardList,
    path: '/end-shift-report',
  },
] as const
