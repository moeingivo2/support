import { Inbox, RefreshCw } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
import { formatConversationDate } from "@/features/student-chat/utils/format";
import type { SupportConversationSummary } from "../types/support-chat";

type ConversationListProps = {
    conversations: SupportConversationSummary[];
    activeId: number | null;
    isPending: boolean;
    isError: boolean;
    onRetry: () => void;
    onSelect: (id: number) => void;
};

export function ConversationList({
    conversations,
    activeId,
    isPending,
    isError,
    onRetry,
    onSelect,
}: ConversationListProps) {
    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-1 pb-3">
                <span className="text-xs font-bold text-ink-2">
                    گفتگوی دانشجویان
                </span>
                <span className="text-[11px] text-ink-3">
                    {toPersianDigits(conversations.length)} مورد
                </span>
            </div>

            <nav
                className="flex-1 space-y-1.5 overflow-y-auto"
                aria-label="فهرست گفتگوهای دانشجویان"
            >
                {isPending
                    ? Array.from({ length: 6 }, (_, index) => (
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
                        <Inbox className="mx-auto size-6 text-ink-3" />
                        <p className="text-xs leading-6 text-ink-2">
                            هنوز گفتگویی از دانشجویان ثبت نشده است.
                        </p>
                    </div>
                ) : null}

                {conversations.map((conversation) => {
                    const active = conversation.id === activeId;
                    const hasUnread = conversation.unread_count > 0;
                    return (
                        <button
                            key={conversation.id}
                            type="button"
                            onClick={() => onSelect(conversation.id)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "group flex w-full items-start gap-3 rounded-2xl border p-3 text-right transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                                active
                                    ? "border-primary-line bg-primary-soft"
                                    : "border-transparent hover:border-hairline hover:bg-surface-2",
                            )}
                        >
                            <span
                                className={cn(
                                    "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold",
                                    hasUnread
                                        ? "bg-danger-soft-2 text-err-text ring-1 ring-danger-ring"
                                        : "bg-surface-2 text-ink-2",
                                )}
                            >
                                {getInitial(conversation.student?.name)}
                            </span>

                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                    {/* شماره‌ی گفتگو تنها چیزی است که ردیف‌های یک
                                        دانشجو را از هم جدا می‌کند. */}
                                    <span className="shrink-0 rounded-lg bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-ink-2">
                                        {conversation.title}
                                    </span>
                                    <span
                                        className={cn(
                                            "line-clamp-1 flex-1 text-sm",
                                            hasUnread
                                                ? "font-bold text-ink"
                                                : "font-semibold text-ink",
                                        )}
                                    >
                                        {conversation.student?.name ??
                                            "دانشجوی حذف‌شده"}
                                    </span>
                                    {hasUnread ? (
                                        <span className="motion-enter grid min-w-5 shrink-0 place-items-center rounded-full bg-err-text px-1.5 py-0.5 text-[10px] font-bold text-ink">
                                            {toPersianDigits(
                                                conversation.unread_count,
                                            )}
                                        </span>
                                    ) : null}
                                </span>
                                <span className="line-clamp-1 text-xs text-ink-2">
                                    {conversation.last_message_preview ??
                                        "بدون پیام"}
                                </span>
                                <span className="mt-0.5 flex items-center justify-between text-[11px] text-ink-3">
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
                                            تخصیص‌نیافته
                                        </span>
                                    )}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

function getInitial(name: string | undefined): string {
    return name?.trim().charAt(0) || "؟";
}
