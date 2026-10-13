import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Code2, File, Image, MessageSquareText, MessagesSquare, Mic, Search, X } from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type { ChatMessage } from "../types/chat";
import { MessageBubble } from "./MessageBubble";
import { toPersianDigits } from "../utils/persian";

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
    search: string;
    onSearchChange: (search: string) => void;
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
    search,
    onSearchChange,
    showAttribution = false,
    conversationId,
}: MessageListProps) {
    const [typeFilter, setTypeFilter] = useState<"all" | ChatMessage["type"]>("all");
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
            <div className="space-y-4 p-5 max-md:space-y-3 max-md:p-3">
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

    const normalizedSearch = search.trim().toLocaleLowerCase();
    const filteredMessages = orderedMessages.filter((message) => {
        const matchesType = typeFilter === "all" || message.type === typeFilter;
        const searchableFields = [message.body, message.attachment_name, message.language]
            .filter((value): value is string => Boolean(value));
        const matchesSearch = !normalizedSearch || searchableFields.some((value) =>
            value.toLocaleLowerCase().includes(normalizedSearch),
        );
        return matchesType && matchesSearch;
    });

    if (messages.length === 0) {
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
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 space-y-2 border-b border-hairline px-3 py-2 max-md:space-y-1.5 max-md:border-0 max-md:py-1.5 max-md:pl-[max(0.75rem,env(safe-area-inset-left))] max-md:pr-[max(0.75rem,env(safe-area-inset-right))] md:px-5">
                <div className="relative">
                    <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
                    <Input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="جستجو در پیام‌های این گفتگو…" aria-label="جستجو در پیام‌های گفتگو" className="h-10 pe-9 ps-10 max-md:border-0" />
                    {search ? <Button type="button" variant="ghost" size="icon" aria-label="پاک کردن جستجو" className="absolute left-0 top-0 size-10" onClick={() => onSearchChange("")}><X className="size-4" /></Button> : null}
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5" aria-label="فیلتر نوع پیام">
                    {([ ["all", "همه", MessagesSquare], ["text", "متن", MessageSquareText], ["code", "کد", Code2], ["image", "تصویر", Image], ["file", "فایل", File], ["voice", "ویس", Mic] ] as const).map(([value, label, Icon]) => (
                        <button key={value} type="button" aria-pressed={typeFilter === value} onClick={() => setTypeFilter(value)} className={typeFilter === value ? "inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2.5 text-[11px] font-bold text-accent-ink ring-1 ring-primary-line max-md:rounded-lg max-md:text-xs max-md:ring-0" : "inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2.5 text-[11px] font-medium text-ink-2 ring-1 ring-hairline hover:bg-surface-3 max-md:rounded-lg max-md:bg-transparent max-md:text-xs max-md:ring-0"}>
                            <Icon className="size-3.5 max-md:hidden" aria-hidden="true" />{label}
                        </button>
                    ))}
                </div>
                {search || typeFilter !== "all" ? <p className="text-[11px] text-ink-3" aria-live="polite">{toPersianDigits(filteredMessages.length)} پیام از {toPersianDigits(messages.length)}</p> : null}
            </div>
            <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto p-4 max-md:overscroll-y-contain max-md:scroll-smooth max-md:py-3 max-md:pl-[max(0.75rem,env(safe-area-inset-left))] max-md:pr-[max(0.75rem,env(safe-area-inset-right))] max-md:scroll-pb-[max(0.75rem,env(safe-area-inset-bottom))] motion-reduce:scroll-auto md:p-5">
                <div className="flex min-h-full flex-col justify-end gap-3 max-md:gap-2">
                    {filteredMessages.map((message) => <MessageBubble key={message.id} message={message} isOwn={message.sender.id !== null && message.sender.id === currentUserId} showAttribution={showAttribution} />)}
                    {filteredMessages.length === 0 ? <p className="m-auto rounded-2xl border border-hairline bg-surface-2 px-4 py-3 text-center text-sm text-ink-2 max-md:border-0">پیامی با این عبارت پیدا نشد.</p> : null}
                    <div ref={endRef} className="shrink-0" />
                </div>
            </div>
            {isAtBottom ? null : <Button type="button" variant="primary" onClick={() => scrollToLatest()} className="absolute bottom-4 end-4 z-10 gap-1.5 rounded-full shadow-[0_10px_28px_-12px_var(--c-glow-accent)] max-md:bottom-3 max-md:end-3 max-md:shadow-none"><ArrowDown className="size-4" />آخرین پیام</Button>}
        </div>
    );
}
