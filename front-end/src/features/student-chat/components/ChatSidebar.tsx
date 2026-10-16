import { useNavigate } from "react-router-dom";
import {
    MessageSquarePlus,
    MessagesSquare,
    RefreshCw,
    UserRound,
    MessageSquareWarning,
} from "lucide-react";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/shared/services/auth-context";
import type { ConversationSummary } from "../types/chat";
import { formatConversationDate } from "../utils/format";
import { toPersianDigits } from "../utils/persian";

type ChatSidebarProps = {
    conversations: ConversationSummary[];
    activeId: number | null;
    isPending: boolean;
    isError: boolean;
    onRetry: () => void;
    onSelect: (id: number) => void;
    onCreate: () => void;
    isCreating: boolean;
    remainingChats?: number;
};

export function ChatSidebar({
    conversations,
    activeId,
    isPending,
    isError,
    onRetry,
    onSelect,
    onCreate,
    isCreating,
    remainingChats,
}: ChatSidebarProps) {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="flex h-full flex-col gap-4">
            <Button onClick={onCreate} disabled={isCreating} className="w-full">
                <MessageSquarePlus />
                {isCreating ? "در حال ساخت..." : "گفتگوی جدید"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate(`/complaints${activeId === null ? "" : `?conversation_id=${activeId}`}`)} className="w-full justify-start">
                <MessageSquareWarning />نارضایتی
            </Button>

            <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-ink-2">
                    گفتگوهای قبلی
                </span>
                    <span className="text-[11px] text-ink-3">
                    {remainingChats === undefined
                        ? `${toPersianDigits(conversations.length)} گفتگو`
                        : `${toPersianDigits(remainingChats)} گفتگوی باقی‌مانده`}
                </span>
            </div>

            <nav
                className="flex-1 space-y-1.5 overflow-y-auto"
                aria-label="فهرست گفتگوها"
            >
                {isPending
                    ? Array.from({ length: 4 }, (_, index) => (
                          <Skeleton key={index} className="h-16" />
                      ))
                    : null}

                {!isPending && isError ? (
                    <Alert tone="danger" className="space-y-3">
                        <p>دریافت گفتگوها ناموفق بود.</p>
                        <Button variant="danger" onClick={onRetry}>
                            <RefreshCw />
                            تلاش مجدد
                        </Button>
                    </Alert>
                ) : null}

                {!isPending && !isError && conversations.length === 0 ? (
                    <div className="grid place-content-center gap-2 rounded-3xl border border-dashed border-hairline p-6 text-center">
                        <MessagesSquare className="mx-auto size-6 text-ink-3" />
                        <p className="text-xs leading-6 text-ink-2">
                            هنوز گفتگویی ندارید. با دکمه «گفتگوی جدید» شروع
                            کنید.
                        </p>
                    </div>
                ) : null}

                {conversations.map((conversation) => {
                    const active = conversation.id === activeId;
                    return (
                        <button
                            key={conversation.id}
                            type="button"
                            onClick={() => onSelect(conversation.id)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                // روی دسکتاپ با فهرست بلند ( ده‌ها گفتگو )
                                // ردیف‌ها بزرگ‌تر و خواناتر می‌شوند؛ روی گوشی
                                // همین فهرست داخل منوی همبرگری است و فشرده
                                // می‌ماند.
                                "group flex w-full flex-col gap-1 rounded-2xl border p-3 text-right transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 md:gap-1.5 md:p-4",
                                active
                                    ? "border-primary-line bg-primary-soft"
                                    : "border-transparent hover:border-hairline hover:bg-surface-2",
                            )}
                        >
                            <span className="flex items-center gap-2">
                                <span
                                    className={cn(
                                        "line-clamp-1 flex-1 text-sm font-semibold md:text-base",
                                        active ? "text-accent-ink" : "text-ink",
                                    )}
                                >
                                    {conversation.title}
                                </span>
                                {conversation.unread_count > 0 ? (
                                    <span className="motion-enter grid min-w-5 shrink-0 place-items-center rounded-full bg-err-text px-1.5 py-0.5 text-[10px] font-bold text-ink">
                                        {toPersianDigits(
                                            conversation.unread_count,
                                        )}
                                    </span>
                                ) : null}
                            </span>
                            <span className="line-clamp-1 text-xs text-ink-2 md:text-sm">
                                {conversation.last_message_preview ??
                                    "بدون پیام"}
                            </span>
                            <span className="flex items-center justify-between text-[11px] text-ink-3 md:text-xs">
                                <span>
                                    {formatConversationDate(
                                        conversation.last_message_at,
                                    )}
                                </span>
                                {conversation.support ? (
                                    <span className="truncate text-ink-2">
                                        {conversation.support.name}
                                    </span>
                                ) : (
                                    <span className="text-alret-gold">
                                        در انتظار پشتیبان
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </nav>

            <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/account")}
                className="w-full justify-start gap-3 border-hairline px-4"
                aria-label="رفتن به صفحه حساب کاربری"
            >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-accent-ink">
                    {user?.name?.trim().charAt(0) || "؟"}
                </span>
                <span className="min-w-0 flex-1 text-right">
                    <span className="block truncate text-sm font-semibold text-ink">
                        {user?.name ?? "کاربر"}
                    </span>
                    <span className="block text-[11px] text-ink-2">
                        مشاهده حساب کاربری
                    </span>
                </span>
                <UserRound className="size-4 text-ink-2" />
            </Button>
        </div>
    );
}
