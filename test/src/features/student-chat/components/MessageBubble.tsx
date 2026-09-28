import { FileCode2, FileText, Play } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ActorRole, ChatMessage } from "../types/chat";
import { formatFileSize, formatMessageTime } from "../utils/format";
import { toPersianDigits } from "../utils/persian";

/**
 * نقش ثبت‌شده هنگام ارسال پیام — برای حسابرسی صریح است و از جای‌گیری حباب
 * یا رنگ آن استنتاج نمی‌شود.
 */
const ROLE_TONE: Record<ActorRole, string> = {
    student: "bg-primary-soft text-accent-ink ring-primary-ring",
    support: "bg-success-soft-2 text-succ-txt ring-success-line",
    observer: "bg-warn-soft text-alret-gold ring-warn-ring",
    system: "bg-surface-3 text-ink-2 ring-hairline",
};

const ROLE_LABEL: Record<ActorRole, string> = {
    student: "دانشجو",
    support: "پشتیبان",
    observer: "ناظر",
    system: "سامانه",
};

type MessageBubbleProps = {
    message: ChatMessage;
    isOwn: boolean;
    /** ناظر باید نویسنده و نقش هر پیام را صریح ببیند */
    showAttribution?: boolean;
};

export function MessageBubble({
    message,
    isOwn,
    showAttribution = false,
}: MessageBubbleProps) {
    const actorRole = message.actor_role ?? "student";
    const authorName =
        message.actor_name ?? message.sender.name ?? ROLE_LABEL[actorRole];

    return (
        <div
            className={cn(
                "flex w-full",
                isOwn ? "justify-start" : "justify-end",
            )}
        >
            <div
                className={cn(
                    "group relative max-w-[min(78%,34rem)] overflow-hidden rounded-3xl border px-4 py-3 shadow-[var(--c-shadow-soft)] transition-transform duration-[460ms] ease-spring-gentle hover:-translate-y-0.5",
                    isOwn
                        ? "border-primary-line bg-primary-soft"
                        : "border-hairline bg-surface-2",
                    actorRole === "system" && "border-dashed",
                )}
            >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-2">
                    <span className="font-bold text-ink">
                        {showAttribution ? authorName : isOwn ? "شما" : (message.sender.name ?? "پشتیبان")}
                    </span>

                    {/* نقش: همیشه برچسب‌دار، تا هویت فرستنده حدس زده نشود */}
                    {showAttribution ? (
                        <span
                            className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold ring-1",
                                ROLE_TONE[actorRole],
                            )}
                        >
                            {ROLE_LABEL[actorRole]}
                        </span>
                    ) : null}

                    {/* شماره‌ی پیام فقط در نمای حسابرسی لازم است */}
                    {showAttribution ? (
                        <span className="font-mono text-[10px] text-ink-3">
                            #{toPersianDigits(message.id)}
                        </span>
                    ) : null}

                    <span dir="ltr">
                        {formatMessageTime(message.created_at)}
                    </span>
                </div>

                {message.type === "text" && message.body ? (
                    <p className="text-sm leading-7 whitespace-pre-wrap text-ink">
                        {message.body}
                    </p>
                ) : null}

                {message.type === "code" && message.body ? (
                    <div className="space-y-2" dir="ltr">
                        {message.language ? (
                            <span className="inline-block rounded-lg bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-alret-gold">
                                {message.language}
                            </span>
                        ) : null}
                        <pre className="overflow-x-auto rounded-2xl border border-hairline bg-black/45 p-3 text-left text-[13px] leading-6 text-emerald-200">
                            <code>{message.body}</code>
                        </pre>
                    </div>
                ) : null}

                {message.type === "image" && message.url ? (
                    <a
                        href={message.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-2xl border border-hairline transition-opacity hover:opacity-90"
                    >
                        <img
                            src={message.url}
                            alt={message.attachment_name ?? "تصویر ارسالی"}
                            loading="lazy"
                            className="max-h-72 w-full object-cover"
                        />
                    </a>
                ) : null}

                {message.type === "voice" && message.url ? (
                    <div className="flex min-w-52 items-center gap-3" dir="rtl">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft-2 text-accent-ink">
                            <Play className="size-4" />
                        </span>
                        <audio
                            controls
                            src={message.url}
                            className="h-9 w-full"
                            preload="metadata"
                        >
                            مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
                        </audio>
                        <span
                            className="shrink-0 text-[11px] text-ink-2"
                            dir="ltr"
                        >
                            {toPersianDigits(message.duration_seconds ?? 0)}s
                        </span>
                    </div>
                ) : null}

                {message.type === "file" ? (
                    <a
                        href={message.url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-56 items-center gap-3 rounded-2xl border border-hairline bg-sunken p-3 transition-colors hover:border-primary-line hover:bg-primary-soft"
                    >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warn-soft text-alret-gold">
                            {message.attachment_mime?.includes("pdf") ? (
                                <FileText className="size-4" />
                            ) : (
                                <FileCode2 className="size-4" />
                            )}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">
                                {message.attachment_name ?? "فایل"}
                            </span>
                            <span className="block text-[11px] text-ink-2">
                                {formatFileSize(message.attachment_size)}
                            </span>
                        </span>
                    </a>
                ) : null}

                {message.body &&
                message.type !== "text" &&
                message.type !== "code" ? (
                    <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-ink">
                        {message.body}
                    </p>
                ) : null}
            </div>
        </div>
    );
}
