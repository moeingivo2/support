import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, MessagesSquare, UserRound, Wallet, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/shared/api/logo";
import { Button } from "@/shared/ui/button";
import { StatusPill } from "@/shared/ui/status-pill";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { useAuth } from "@/shared/services/auth-context";
import { cn } from "@/shared/lib/utils";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
import {
    getStudentProfile,
    studentProfileKeys,
} from "@/features/student-account/services/student-profile-service";

const STUDENT_NAV = [
    { label: "گفتگو", path: "/chat", icon: MessagesSquare },
    { label: "حساب کاربری", path: "/account", icon: UserRound },
];

export default function StudentShell({ children }: { children: ReactNode }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const profileQuery = useQuery({
        queryKey: studentProfileKeys.profile,
        queryFn: getStudentProfile,
    });
    const profile = profileQuery.data?.data;

    function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }

    return (
        <div
            dir="rtl"
            // ارتفاع به دید کامل قفل است و اسکرول به محتوای داخلی سپرده
            // شده؛ وگرنه صفحه‌ی چت به اندازه‌ی همه‌ی پیام‌ها قد می‌کشید و
            // کاربر برای دیدن پیام جدید باید کل صفحه را اسکرول می‌کرد.
            className="app-canvas relative flex h-dvh flex-col overflow-hidden"
        >
            <header className="sticky top-0 z-30 shrink-0 border-b border-hairline bg-glass backdrop-blur-xl">
                <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-2 px-3 md:h-18 md:gap-3 md:px-7">
                    {/* روی گوشی همه‌چیز در منوی همبرگری می‌رود تا خودِ چت
                        تمام فضای دید را بگیرد. در RTL این گوشه‌ی راست است. */}
                    <Dialog.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                        <Dialog.Trigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                aria-label="باز کردن منو"
                            >
                                <Menu />
                            </Button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm" />
                            <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-[340px] flex-col border-l border-hairline bg-surface px-4 py-4">
                                <div className="mb-4 flex items-center justify-between gap-2">
                                    <Dialog.Title className="text-sm font-bold text-ink">
                                        منو
                                    </Dialog.Title>
                                    <Dialog.Close asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label="بستن منو"
                                        >
                                            <X />
                                        </Button>
                                    </Dialog.Close>
                                </div>

                                <nav
                                    className="space-y-1.5"
                                    aria-label="منوی دانشجو"
                                >
                                    {STUDENT_NAV.map((item) => {
                                        const active =
                                            location.pathname.startsWith(
                                                item.path,
                                            );
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() =>
                                                    setIsMenuOpen(false)
                                                }
                                                aria-current={
                                                    active
                                                        ? "page"
                                                        : undefined
                                                }
                                                className={cn(
                                                    "flex h-12 items-center gap-3 rounded-2xl border px-4 text-sm font-semibold transition-colors duration-[320ms] ease-spring-smooth",
                                                    active
                                                        ? "border-primary-line bg-primary-soft text-accent-ink"
                                                        : "border-hairline bg-surface-2 text-ink-2",
                                                )}
                                            >
                                                <item.icon className="size-4" />
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </nav>

                                {profile ? (
                                    <div className="mt-4 rounded-2xl border border-hairline bg-surface-2 px-4 py-3">
                                        <p className="text-sm font-bold text-ink">
                                            {user?.name}
                                        </p>
                                        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">
                                            <Wallet
                                                className="size-3"
                                                aria-hidden="true"
                                            />
                                            {toPersianDigits(
                                                profile.remaining_chats,
                                            )}{" "}
                                            گفتگوی باقی‌مانده
                                        </p>
                                    </div>
                                ) : null}

                                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                                    <ThemeToggle />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleLogout}
                                        aria-label="خروج از حساب"
                                    >
                                        <LogOut />
                                    </Button>
                                </div>
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>

                    <Link
                        to="/chat"
                        className="flex min-w-0 items-center gap-2.5 rounded-2xl px-1 md:gap-3"
                    >
                        <Logo size={38} />
                        <span className="hidden sm:block">
                            <span className="block text-sm font-bold text-ink">
                                aiosupport
                            </span>
                            <span className="block text-[11px] text-ink-2">
                                پشتیبانی دانشجویان
                            </span>
                        </span>
                    </Link>

                    <nav
                        className="mr-2 hidden items-center gap-1.5 md:flex"
                        aria-label="منوی دانشجو"
                    >
                        {STUDENT_NAV.map((item) => {
                            const active = location.pathname.startsWith(
                                item.path,
                            );
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition-all duration-[320ms] ease-spring-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                                        active
                                            ? "border-primary-line bg-primary-soft text-accent-ink"
                                            : "border-transparent text-ink-2 hover:border-hairline hover:bg-surface-2 hover:text-ink",
                                    )}
                                >
                                    <item.icon className="size-4" />
                                    <span className="hidden sm:inline">
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* روی گوشی این بخش کاملاً در منوی همبرگری است تا هدر
                        خلوت بماند و چت تمام ارتفاع را بگیرد. */}
                    <div className="mr-auto hidden items-center gap-1.5 md:flex">
                        {profile ? (
                            <Link
                                to="/account"
                                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
                            >
                                <StatusPill
                                    tone={
                                        profile.is_low_on_chats
                                            ? "danger"
                                            : "info"
                                    }
                                >
                                    <Wallet className="size-3" />
                                    {toPersianDigits(
                                        profile.remaining_chats,
                                    )}{" "}
                                    چت
                                </StatusPill>
                            </Link>
                        ) : null}

                        <span className="max-w-40 truncate text-xs text-ink-2">
                            {user?.name}
                        </span>
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            aria-label="خروج از حساب"
                        >
                            <LogOut />
                        </Button>
                    </div>
                </div>
            </header>

            {/* min-h-0 لازم است تا فرزندِ flex بتواند کوچک شود؛ بدون آن
                main رشد می‌کند و اسکرول به صفحه منتقل می‌شود. */}
            <main className="mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 flex-col px-3 py-3 md:px-7 md:py-6">
                {children}
            </main>
        </div>
    );
}
