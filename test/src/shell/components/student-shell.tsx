import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, MessagesSquare, UserRound, Wallet, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/shared/api/logo";
import { Button } from "@/shared/ui/button";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { useAuth } from "@/shared/services/auth-context";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
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
                <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-2 px-3 md:h-18 md:gap-3 md:px-7">
                    {/* گروه چپ؛ روی دسکتاپ سمت راست خالی می‌ماند چون نام
                        کاربر و سهمیه داخل همین گروه آمده‌اند. */}
                    <div className="ms-auto flex items-center gap-1.5">
                        {/* تعداد گفتگوی باقی‌مانده — روی دسکتاپ همیشه دیده می‌شود */}
                        {profile ? (
                            <span className="hidden items-center gap-1.5 rounded-full border border-primary-line bg-primary-soft px-3 py-2 text-xs font-bold text-accent-ink md:flex">
                                <Wallet className="size-3.5" aria-hidden="true" />
                                {toPersianDigits(profile.remaining_chats)}{" "}
                                گفتگوی باقی‌مانده
                            </span>
                        ) : null}

                        <Dialog.Root
                            open={isMenuOpen}
                            onOpenChange={setIsMenuOpen}
                        >
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
                                <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[88vw] max-w-[360px] flex-col border-l border-hairline bg-surface">
                                    <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
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

                                    {/* فهرست گفتگوها زیر بخش گفتگو */}
                                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
                                            className="mb-3 w-full"
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                navigate("/chat");
                                            }}
                                        >
                                            گفتگوی جدید
                                        </Button>

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
                                                                            ? "flex w-full items-center gap-2 rounded-2xl border border-primary-line bg-primary-soft px-3 py-2.5 text-start text-sm font-bold text-accent-ink"
                                                                            : "flex w-full items-center gap-2 rounded-2xl border border-hairline bg-surface-2 px-3 py-2.5 text-start text-sm font-medium text-ink transition-colors duration-150 ease-out hover:bg-surface-3"
                                                                    }
                                                                >
                                                                    <span className="shrink-0 text-xs font-bold text-ink-2">
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
                                    <div className="border-t border-hairline px-4 py-3">
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
                            aria-label="خانه"
                            className="flex items-center gap-2.5 rounded-2xl px-1 md:hidden"
                        >
                            <Logo size={36} />
                        </Link>

                        <div className="hidden md:block">
                            <ThemeToggle />
                        </div>
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

            <main className="mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 flex-col px-3 py-3 md:px-7 md:py-6">
                {children}
            </main>
        </div>
    );
}
