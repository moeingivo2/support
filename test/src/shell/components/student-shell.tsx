import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, MessagesSquare, UserRound, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Logo } from '@/shared/api/logo'
import { Button } from '@/shared/ui/button'
import { StatusPill } from '@/shared/ui/status-pill'
import { useAuth } from '@/shared/services/auth-context'
import { cn } from '@/shared/lib/utils'
import { toPersianDigits } from '@/features/student-chat/utils/persian'
import { getStudentProfile, studentProfileKeys } from '@/features/student-account/services/student-profile-service'

const STUDENT_NAV = [
  { label: 'گفتگو', path: '/chat', icon: MessagesSquare },
  { label: 'حساب کاربری', path: '/account', icon: UserRound },
]

export default function StudentShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const profileQuery = useQuery({
    queryKey: studentProfileKeys.profile,
    queryFn: getStudentProfile,
  })
  const profile = profileQuery.data?.data

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div
      dir="rtl"
      className="relative min-h-dvh bg-[radial-gradient(circle_at_100%_-20%,rgba(0,98,255,0.2),transparent_28%),radial-gradient(circle_at_0%_100%,rgba(242,169,58,0.1),transparent_30%)]"
    >
      <header className="sticky top-0 z-30 border-b border-white/[.08] bg-[#121010]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-18 w-full max-w-[1500px] items-center gap-3 px-4 py-3 md:px-7">
          <Link to="/chat" className="flex items-center gap-3">
            <Logo size={42} />
            <span className="hidden sm:block">
              <span className="block text-sm font-bold text-white">aiosupport</span>
              <span className="block text-[11px] text-zinc-500">پشتیبانی دانشجویان</span>
            </span>
          </Link>

          <nav className="mr-4 flex items-center gap-1.5" aria-label="منوی دانشجو">
            {STUDENT_NAV.map((item) => {
              const active = location.pathname.startsWith(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active-blue/70',
                    active
                      ? 'border-active-blue/30 bg-active-blue/10 text-active-blue'
                      : 'border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/5 hover:text-zinc-100',
                  )}
                >
                  <item.icon className="size-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mr-auto flex items-center gap-2">
            {profile ? (
              <Link to="/account" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active-blue/70">
                <StatusPill tone={profile.is_low_on_chats ? 'danger' : 'info'}>
                  <Wallet className="size-3" />
                  {toPersianDigits(profile.remaining_chats)} چت
                </StatusPill>
              </Link>
            ) : null}

            <span className="hidden max-w-40 truncate text-xs text-zinc-400 md:inline">
              {user?.name}
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="خروج از حساب">
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-5 md:px-7 md:py-6">{children}</main>
    </div>
  )
}
