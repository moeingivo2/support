import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, MessagesSquare, UserRound, Wallet, X, BookOpen } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/shared/api/logo";
import { Button } from "@/shared/ui/button";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/shared/services/auth-context";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
import { StudentNotificationsBell } from "@/features/student-complaints/components/StudentNotificationsBell";
import { chatKeys, getConversations } from "@/features/student-chat/services/chat-service";
import {
    getStudentProfile,
    studentProfileKeys,
} from "@/features/student-account/services/student-profile-service";

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

    // فهرست گفتگوها داخل منوی همبرگری است، پس همان‌جا بارگذاری می‌شود.
    const conversationsQuery = useQuery({
        queryKey: chatKeys.conversations,
        queryFn: getConversations,
        staleTime: 30_000,
    });
    const conversations = conversationsQuery.data?.data ?? [];

    const activeConversationId = Number(
        new URLSearchParams(location.search).get("c") ?? "",
    );

    function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }

    return (
        <div
            dir="rtl"
            // ارتفاع به دید کامل قفل است و اسکرول به محتوای داخلی سپرده
            // شده؛ وگرنه صفحه‌ی چت به اندازه‌ی همه‌ی پیام‌ها قد می‌کشید.
            className="app-canvas relative flex h-dvh flex-col overflow-hidden"
        >
            <header className="sticky top-0 z-30 shrink-0 border-b border-hairline bg-glass backdrop-blur-xl">
                <div className="mx-auto flex h-16 w-full max-w-[1500px] justify-between items-center gap-2 px-3 md:h-18 md:gap-3 md:px-7">
                    <div className="flex items-center gap-1.5">
                        {/*
                            دسترسی سریع به سورس جلسات.
                            قبلاً این‌جا «کیف پول» (تعداد گفتگوی
                            باقی‌مانده) بود؛ درخواست کاربر حذف آن و
                            جایگزینی با دسترسی به سورس‌ها بود، و شمار
                            گفتگوی باقی‌مانده همچنان در صفحه‌ی حساب و
                            منوی موبایل دیده می‌شود.
                        */}
                        <Link
                            to="/sources"
                            className="hidden items-center gap-1.5 rounded-full border border-primary-line bg-primary-soft px-3 py-2 text-xs font-bold text-accent-ink transition-colors hover:bg-primary-soft-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 md:flex"
                        >
                            <BookOpen className="size-3.5" aria-hidden="true" />
                            سورس‌ها
                        </Link>

                        <Dialog.Root
                            open={isMenuOpen}
                            onOpenChange={setIsMenuOpen}
                        >
                            <Dialog.Trigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-11 shrink-0 rounded-xl border-hairline bg-surface min-[1025px]:hidden"
                                    aria-label="باز کردن منو"
                                >
                                    <Menu />
                                </Button>
                            </Dialog.Trigger>
                            <Dialog.Portal>
                                <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm" />
                                <Dialog.Content dir="rtl" className="fixed inset-y-0 right-0 z-50 flex w-[88vw] max-w-[360px] flex-col border-l border-hairline bg-surface">
                                    <div className="flex min-h-16 items-center justify-between gap-3 border-b border-hairline px-4 py-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <Logo size={36} />
                                            <div className="min-w-0">
                                                <Dialog.Title className="text-sm font-bold text-ink">
                                                    منوی دانشجو
                                                </Dialog.Title>
                                                <Dialog.Description className="text-xs text-ink-2">
                                                    گفتگوها و حساب کاربری
                                                </Dialog.Description>
                                            </div>
                                        </div>
                                        <Dialog.Close asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-11 shrink-0"
                                                aria-label="بستن منو"
                                            >
                                                <X />
                                            </Button>
                                        </Dialog.Close>
                                    </div>

                                    {/* فهرست گفتگوها زیر بخش گفتگو */}
                                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                                        <div className="mb-3 flex items-center gap-2">
                                            <MessagesSquare
                                                className="size-4 text-accent-ink"
                                                aria-hidden="true"
                                            />
                                            <h2 className="text-sm font-bold text-ink">
                                                گفتگو
                                            </h2>
                                        </div>

                                        <Button
                                            className="mb-3 min-h-11 w-full"
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                navigate("/chat");
                                            }}
                                        >
                                            گفتگوی جدید
                                        </Button>

                                        <Link
                                            to="/sources"
                                            onClick={() =>
                                                setIsMenuOpen(false)
                                            }
                                            className="mb-3 flex min-h-11 w-full items-center gap-2 rounded-2xl border border-primary-line bg-primary-soft px-3 py-2.5 text-sm font-bold text-accent-ink transition-colors hover:bg-primary-soft-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
                                        >
                                            <BookOpen
                                                className="size-4 shrink-0"
                                                aria-hidden="true"
                                            />
                                            سورس جلسات
                                        </Link>

                                        {conversations.length === 0 ? (
                                            <p className="rounded-2xl border border-hairline bg-surface-2 px-3 py-6 text-center text-xs text-ink-2">
                                                {conversationsQuery.isPending
                                                    ? "در حال بارگذاری…"
                                                    : "هنوز گفتگویی ندارید."}
                                            </p>
                                        ) : (
                                            <ul className="space-y-1.5">
                                                {conversations.map(
                                                    (conversation) => {
                                                        const active =
                                                            conversation.id ===
                                                            activeConversationId;
                                                        return (
                                                            <li key={
                                                                conversation.id
                                                            }>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setIsMenuOpen(
                                                                            false,
                                                                        );
                                                                        navigate(
                                                                            `/chat?c=${conversation.id}`,
                                                                        );
                                                                    }}
                                                                    className={
                                                                        active
                                                                            ? "flex min-h-11 w-full items-center gap-2 rounded-2xl border border-primary-line bg-primary-soft px-3 py-2.5 text-start text-sm font-bold text-accent-ink"
                                                                            : "flex min-h-11 w-full items-center gap-2 rounded-2xl border border-hairline bg-surface-2 px-3 py-2.5 text-start text-sm font-medium text-ink transition-colors duration-150 ease-out hover:bg-surface-3"
                                                                    }
                                                                >
                                                                    <span className="min-w-0 flex-1 truncate">
                                                                        {
                                                                            conversation.title
                                                                        }
                                                                    </span>
                                                                    {conversation
                                                                        .unread_count >
                                                                    0 ? (
                                                                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-danger-soft text-[10px] font-bold text-err-text">
                                                                            {toPersianDigits(
                                                                                conversation.unread_count,
                                                                            )}
                                                                        </span>
                                                                    ) : null}
                                                                </button>
                                                            </li>
                                                        );
                                                    },
                                                )}
                                            </ul>
                                        )}
                                    </div>

                                    {/* پروفایل؛ با زدن روی آن صفحه‌ی حساب باز می‌شود */}
                                    <div className="shrink-0 border-t border-hairline px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                                        <Link
                                            to="/account"
                                            onClick={() =>
                                                setIsMenuOpen(false)
                                            }
                                            className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-2 px-3 py-3 transition-colors duration-150 ease-out hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
                                        >
                                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-accent-ink">
                                                {user?.name.trim().charAt(0) ??
                                                    "؟"}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-bold text-ink">
                                                    {user?.name}
                                                </span>
                                                {profile ? (
                                                    <span className="flex items-center gap-1 text-xs text-ink-2">
                                                        <Wallet
                                                            className="size-3"
                                                            aria-hidden="true"
                                                        />
                                                        {toPersianDigits(
                                                            profile.remaining_chats,
                                                        )}{" "}
                                                        گفتگوی باقی‌مانده
                                                    </span>
                                                ) : null}
                                            </span>
                                            <UserRound
                                                className="size-4 shrink-0 text-ink-3"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </div>
                                </Dialog.Content>
                            </Dialog.Portal>
                        </Dialog.Root>

                        <Link
                            to="/chat"
                            aria-label="خانه پشتیبانی"
                            className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
                        >
                            <span className="shrink-0">
                                <Logo size={36} />
                            </span>
                            <span className="hidden min-w-0 sm:block">
                                <span className="block truncate text-sm font-bold text-ink">
                                    پشتیبانی دانشجو
                                </span>
                                <span className="block text-xs text-ink-2">
                                    AIO Support
                                </span>
                            </span>
                        </Link>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 md:gap-3">
                        {/* {profile ? (
                            <span className="hidden h-10 items-center gap-2 rounded-xl border border-primary-line bg-primary-soft px-3 text-xs font-semibold text-accent-ink md:inline-flex">
                                <Wallet className="size-4" aria-hidden="true" />
                                <span className="font-bold">
                                    {toPersianDigits(profile.remaining_chats)}
                                </span>
                                گفتگوی باقی‌مانده
                            </span>
                        ) : null} */}

                        <Link
                            to="/account"
                            aria-label="مشاهده حساب کاربری"
                            className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-hairline bg-surface px-1.5 transition-colors duration-150 ease-out hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 md:pe-3"
                        >
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-bold text-accent-ink">
                                {user?.name?.trim().charAt(0) || "؟"}
                            </span>
                            <span className="hidden max-w-32 truncate text-sm font-semibold text-ink lg:block">
                                {user?.name ?? "کاربر"}
                            </span>
                        </Link>

                        <span className="hidden h-6 w-px bg-hairline md:block" aria-hidden="true" />
                        <StudentNotificationsBell />
                        <ThemeToggle className="size-10 rounded-xl border-hairline bg-surface" />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            aria-label="خروج از حساب"
                            className="size-10 rounded-xl border-hairline bg-surface"
                        >
                            <LogOut />
                        </Button>
                    </div>
                </div>
            </header>

            <main className={cn(
                "mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-3 md:px-7 md:py-6",
                location.pathname === "/chat" && "max-md:overflow-hidden max-md:p-0",
            )}>
                {children}
            </main>
        </div>
    );
}
