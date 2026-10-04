import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, MessagesSquare } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { Button } from "@/shared/ui/button";
import type { ChatMessage } from "../types/chat";
import { MessageBubble } from "./MessageBubble";

/**
 * ترتیب خواندن گفتگو: قدیمی بالا، جدید پایین.
 *
 * سرور پیام‌ها را نزولی برمی‌گرداند (`orderByDesc('created_at')`)، پس اینجا
 * معکوس می‌شود تا ترتیب به رفتار پایگاه‌داده وابسته نماند. `id` نقش کلید دوم
 * را دارد تا پیام‌هایی که در همان ثانیه ثبت شده‌اند بین رندرها جابه‌جا نشوند.
 * پیامی که `created_at` ندارد (تازه ساخته و هنوز زمان‌نخورده) ته فهرست
 * می‌نشیند تا مبنای «تازه‌ترین پیام» برای اسکرول مبهم نشود.
 */
function sortByCreatedAt(messages: ChatMessage[]): ChatMessage[] {
    return [...messages].sort((a, b) => {
        const left = a.created_at ? Date.parse(a.created_at) : Number.NaN;
        const right = b.created_at ? Date.parse(b.created_at) : Number.NaN;

        if (Number.isNaN(left) || Number.isNaN(right)) {
            if (Number.isNaN(left) && Number.isNaN(right)) return a.id - b.id;
            return Number.isNaN(left) ? 1 : -1;
        }

        return left === right ? a.id - b.id : left - right;
    });
}

/**
 * فاصله‌ای که تا رسیدن به پایین، هنوز «چسبیده به آخر» حساب می‌شود.
 * صفر یعنی اسکرول باید دقیقاً روی آخرین پیکسل بنشیند که با نوسان
 * کسریِ ارتفاع حباب‌ها هر بار دکمه را روشن و خاموش می‌کرد.
 */
const BOTTOM_THRESHOLD_PX = 48;

type MessageListProps = {
    messages: ChatMessage[];
    currentUserId: number | null;
    isPending: boolean;
    isError: boolean;
    emptyHint: string;
    /** نمایش صریح نام نویسنده و نقش او روی هر پیام (برای ناظر) */
    showAttribution?: boolean;
    /**
     * شناسه‌ی گفتگوی فعال. با تغییرش اسکرول به تازه‌ترین پیام برمی‌گردد،
     * حتی اگر کاربر در گفتگوی قبلی بالای تاریخچه ایستاده بوده باشد.
     */
    conversationId?: number | null;
};

export function MessageList({
    messages,
    currentUserId,
    isPending,
    isError,
    emptyHint,
    showAttribution = false,
    conversationId,
}: MessageListProps) {
    const orderedMessages = useMemo(() => sortByCreatedAt(messages), [messages]);
    // چون ترتیب صعودی است، تازه‌ترین پیام آخرین عضو فهرست است.
    const newestMessageId = orderedMessages[orderedMessages.length - 1]?.id ?? 0;

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const endRef = useRef<HTMLDivElement | null>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const scrollToLatest = useCallback((behavior: ScrollBehavior = "smooth") => {
        const element = endRef.current;
        if (!element) return;
        element.scrollIntoView({ behavior, block: "end" });
        setIsAtBottom(true);
    }, []);

    /**
     * وضعیت چسبیدن به پایین از روی رویداد اسکرول خوانده می‌شود، نه از
     * مقایسه‌ی `scrollTop` در هر رندر: اسکرول برنامه‌ای (کلیک روی لنگر)
     * رویداد scroll را در بعضی مرورگرها fire نمی‌کند و دکمه خاموش می‌ماند.
     */
    const handleScroll = useCallback(() => {
        const element = scrollRef.current;
        if (!element) return;
        const distanceFromBottom =
            element.scrollHeight - element.scrollTop - element.clientHeight;
        setIsAtBottom(distanceFromBottom <= BOTTOM_THRESHOLD_PX);
    }, []);

    // باید پیش از افکت پیام تازه اعمال شود تا در همان کامیتی که گفتگو عوض
    // می‌شود، وضعیت «چسبیده به پایین» برای اسکرول بعدی آماده باشد.
    useEffect(() => {
        scrollToLatest("auto");
    }, [conversationId, scrollToLatest]);

    useEffect(() => {
        if (newestMessageId === 0) return;
        // باز شدن گفتگو همیشه از تازه‌ترین پیام شروع می‌شود؛ بعد از آن
        // اسکرول کاربر را نمی‌زنیم تا در حال خواندن تاریخچه نپرد.
        if (isAtBottom) {
            scrollToLatest();
        }
        // isAtBottom عمداً وابسته نیست: فقط رسیدن پیام تازه محرک است، نه
        // تغییر وضعیت اسکرول — وگرنه هر باری که کاربر اسکرول می‌کرد دوباره
        // به پایین کشیده می‌شد.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [newestMessageId]);

    if (isPending) {
        return (
            <div className="space-y-4 p-5">
                <Skeleton className="h-16 w-2/3" />
                <Skeleton className="ms-auto h-12 w-1/2" />
                <Skeleton className="h-20 w-3/4" />
            </div>
        );
    }

    if (isError) {
        return (
            <p className="p-8 text-center text-sm text-err-text">
                دریافت پیام‌ها ناموفق بود. اتصال خود را بررسی کنید.
            </p>
        );
    }

    if (orderedMessages.length === 0) {
        return (
            <div className="grid flex-1 place-content-center gap-3 p-10 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                    <MessagesSquare className="size-6" />
                </span>
                <p className="max-w-sm text-sm leading-7 text-ink-2">
                    {emptyHint}
                </p>
            </div>
        );
    }

    return (
        // باکس بیرونی موقعیت‌دهی دکمه را نگه می‌دارد و اسکرول داخلی همان کلاس
        // قبلی را می‌گیرد؛ بدون این دو لایه، دکمه داخل خودِ ناحیه‌ی اسکرول
        // می‌نشیند و همراه پیام‌ها بالا و پایین می‌لغزد.
        <div className="relative flex min-h-0 flex-1 flex-col">
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5"
            >
                <div className="flex min-h-full flex-col justify-end gap-3">
                    {orderedMessages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={
                                message.sender.id !== null &&
                                message.sender.id === currentUserId
                            }
                            showAttribution={showAttribution}
                        />
                    ))}
                    {/* لنگر انتهای فهرست: مقصد دکمه‌ی «رفتن به آخرین پیام» و
                        هدف اسکرول خودکار هنگام رسیدن پیام تازه. */}
                    <div ref={endRef} className="shrink-0" />
                </div>
            </div>

            {isAtBottom ? null : (
                <Button
                    type="button"
                    variant="primary"
                    onClick={() => scrollToLatest()}
                    className="absolute bottom-4 end-4 z-10 gap-1.5 rounded-full shadow-[0_10px_28px_-12px_var(--c-glow-accent)]"
                >
                    <ArrowDown className="size-4" />
                    آخرین پیام
                </Button>
            )}
        </div>
    );
}
