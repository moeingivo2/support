import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { getNavigation } from '@/shared/navigation'
import { useAuth } from '@/shared/services/auth-context'
import { Logo } from '@/shared/api/logo'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const activePath = location.pathname
  const navigation = getNavigation(user)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_100%_-20%,rgba(0,98,255,0.16),transparent_28%),radial-gradient(circle_at_0%_100%,rgba(242,169,58,0.08),transparent_30%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-[276px] shrink-0 flex-col border-l border-border/10 bg-deactive-btn-gray/70 px-5 py-6 backdrop-blur lg:flex">
          <div className="flex w-full flex-1 flex-col">
            <Link to="/" className="mb-2 flex items-center gap-3 px-2">
              <Logo size={44} />
              <span>
                <span className="block text-sm font-bold text-white">
                  {user?.role === 'admin' ? 'پنل مدیریت' : 'پنل پشتیبانی'}
                </span>
                <span className="block text-xs text-zinc-500">AIO Support</span>
              </span>
            </Link>
            <span
              className={cn(
                'mb-6 mr-2 inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-semibold ring-1',
                user?.role === 'admin'
                  ? 'bg-alret-gold/10 text-alret-gold ring-alret-gold/25'
                  : 'bg-active-blue/10 text-active-blue ring-active-blue/25',
              )}
            >
              {user?.role === 'admin'
                ? 'دسترسی مدیریتی'
                : user?.support_type === 'ai'
                  ? 'پشتیبان هوش مصنوعی'
                  : 'پشتیبان وب'}
            </span>
            <DesktopNavigation navigation={navigation} activePath={activePath} />
            <div className="rounded-3xl border border-alret-gold/20 bg-alret-gold/10 p-4 text-xs leading-5 text-alret-gold">
              {user?.role === 'admin'
                ? 'همه گزارش‌ها و نارضایتی‌های تیم از این پنل قابل پیگیری است.'
                : 'اطلاعات مرتبط با شیفت فعال هر ساعت به‌روزرسانی می‌شود.'}
            </div>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-border/10 bg-deactive-btn-gray/85 px-4 backdrop-blur-xl md:px-7">
            <Dialog.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <Dialog.Trigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="منو">
                  <Menu />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-30 bg-black/70" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-40 flex w-[86vw] max-w-[320px] flex-col border-l border-border/10 bg-deactive-btn-gray px-5 py-6">
                  <div className="mb-6 flex items-center justify-between">
                    <Dialog.Title className="text-sm font-bold text-white">منوی پنل</Dialog.Title>
                    <Dialog.Close asChild>
                      <Button variant="ghost" size="icon" aria-label="بستن منو">
                        <X />
                      </Button>
                    </Dialog.Close>
                  </div>
                  <MobileNavigation
                    navigation={navigation}
                    activePath={activePath}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <Button variant="ghost" size="icon" className="relative" aria-label="اعلان‌ها">
              <Bell />
              <span className="absolute left-2.5 top-2.5 size-2 rounded-full bg-err-text" />
            </Button>
            <div className="mr-auto flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-active-blue/15 text-sm font-bold text-active-blue">
                {getUserInitial(user?.name)}
              </span>
              <span className="hidden text-right md:block">
                <span className="block text-sm font-semibold text-zinc-100">
                  {user?.name ?? 'کاربر'}
                </span>
                <span className="block text-xs text-zinc-500">
                  {formatRoleLabel(user)}
                </span>
              </span>
              <ChevronDown className="hidden size-4 text-zinc-500 md:block" />
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="خروج از حساب">
                <LogOut />
              </Button>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 md:px-7 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}

function DesktopNavigation({
  activePath,
  navigation,
}: {
  activePath: string
  navigation: ReturnType<typeof getNavigation>
}) {
  return (
    <nav className="flex-1 space-y-1.5 overflow-y-auto" aria-label="منوی پنل">
      {navigation.map((item) => (
        <NavigationLink key={item.path} item={item} activePath={activePath} />
      ))}
    </nav>
  )
}

function MobileNavigation({
  activePath,
  navigation,
  onNavigate,
}: {
  activePath: string
  navigation: ReturnType<typeof getNavigation>
  onNavigate: () => void
}) {
  return (
    <nav className="flex-1 space-y-1.5 overflow-y-auto" aria-label="منوی پنل">
      {navigation.map((item) => (
        <NavigationLink
          key={item.path}
          item={item}
          activePath={activePath}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}

function NavigationLink({
  activePath,
  item,
  onNavigate,
}: {
  activePath: string
  item: { label: string; path: string; icon: typeof LayoutDashboard }
  onNavigate?: () => void
}) {
  const active = activePath === item.path

  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition',
        active
          ? 'bg-active-blue/12 text-active-blue ring-1 ring-active-blue/25'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <item.icon />
      {item.label}
    </Link>
  )
}

function getUserInitial(name: string | undefined): string {
  return name?.trim().charAt(0) || '؟'
}

function formatRoleLabel(user: { role: string; support_type?: string | null } | null): string {
  if (!user) return 'کاربر'
  if (user.role === 'admin') return 'مدیر سیستم'
  return user.support_type === 'ai' ? 'پشتیبان هوش مصنوعی' : 'پشتیبان وب'
}
