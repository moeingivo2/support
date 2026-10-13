import { useEffect, useRef, useState } from "react";
import { Check, Clipboard, Download, FileCode2, FileText, Loader2 } from "lucide-react";
import { downloadAuthenticatedBlob, fetchAuthenticatedBlob } from "@/shared/api/http";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/shared/ui/toast";
import { copyTextToClipboard } from "@/shared/lib/clipboard";
import type { ActorRole, ChatMessage } from "../types/chat";
import { formatFileSize, formatMessageTime } from "../utils/format";
import { toPersianDigits } from "../utils/persian";
import { VoicePlayer } from "./VoicePlayer";

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
    const toast = useToast();
    const [copied, setCopied] = useState(false);
    const copiedTimeoutRef = useRef<number | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageLoadFailed, setImageLoadFailed] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageNearViewport, setImageNearViewport] = useState(false);
    const imagePlaceholderRef = useRef<HTMLDivElement | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const actorRole = message.actor_role ?? "student";
    const authorName =
        message.actor_name ?? message.sender.name ?? ROLE_LABEL[actorRole];

    useEffect(() => () => {
        if (copiedTimeoutRef.current !== null) {
            window.clearTimeout(copiedTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (message.type !== "image" || !message.url) {
            setImageUrl(null);
            setImageLoading(false);
            return;
        }
        if (!imageNearViewport) return;

        let cancelled = false;
        let objectUrl: string | null = null;
        setImageLoading(true);
        setImageLoadFailed(false);
        void fetchAuthenticatedBlob(message.url, message.attachment_mime ?? "image/jpeg")
            .then((blob) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setImageUrl(objectUrl);
                setImageLoading(false);
            })
            .catch(() => {
                if (!cancelled) {
                    setImageLoading(false);
                    setImageLoadFailed(true);
                }
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [imageNearViewport, message.attachment_mime, message.type, message.url]);

    useEffect(() => {
        if (message.type !== "image" || !message.url || !imagePlaceholderRef.current) return;
        if (!("IntersectionObserver" in window)) {
            setImageNearViewport(true);
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setImageNearViewport(true);
                observer.disconnect();
            }
        }, { rootMargin: "240px" });
        observer.observe(imagePlaceholderRef.current);
        return () => observer.disconnect();
    }, [message.type, message.url]);

    async function handleCopyCode() {
        if (!message.body) return;
        try {
            await copyTextToClipboard(message.body);
            setCopied(true);
            if (copiedTimeoutRef.current !== null) {
                window.clearTimeout(copiedTimeoutRef.current);
            }
            copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error("کپی کردن کد انجام نشد.");
        }
    }

    async function downloadFile(): Promise<void> {
        if (!message.url) return;
        setIsDownloading(true);
        try {
            await downloadAuthenticatedBlob(
                message.url,
                message.attachment_mime ?? "application/octet-stream",
                message.attachment_name ?? "attachment",
            );
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "دریافت فایل ناموفق بود.");
        } finally {
            setIsDownloading(false);
        }
    }

    return (
        <div
            className={cn(
                "flex w-full shrink-0",
                isOwn ? "justify-start" : "justify-end",
            )}
        >
            <div
                className={cn(
                    "group relative min-w-0 max-w-[min(78%,34rem)] overflow-hidden rounded-3xl border px-4 py-3 shadow-[var(--c-shadow-soft)] transition-colors duration-150 ease-out max-md:max-w-[90%] max-md:rounded-2xl max-md:border-0 max-md:px-3 max-md:py-2.5 max-md:shadow-none",
                    isOwn
                        ? "border-primary-line bg-primary-soft"
                        : "border-hairline bg-surface-2",
                    actorRole === "system" && "border-dashed",
                )}
            >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-2 max-md:gap-y-0.5">
                    <span className="font-bold text-ink max-md:min-w-0 max-md:font-medium max-md:wrap-anywhere">
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

                    <span dir="ltr" className="max-md:ms-auto max-md:shrink-0">
                        {formatMessageTime(message.created_at)}
                    </span>
                </div>

                {message.type === "text" && message.body ? (
                    <p className="text-sm leading-7 whitespace-pre-wrap text-ink max-md:text-[15px] max-md:leading-6 max-md:wrap-anywhere">
                        {message.body}
                    </p>
                ) : null}

                {message.type === "code" && message.body ? (
                    <div className="min-w-0 space-y-2" dir="ltr">
                        <div className="flex items-center justify-between gap-2">
                        {message.language ? (
                            <span className="inline-block rounded-lg bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-alret-gold">
                                {message.language}
                            </span>
                        ) : null}
                            <Button type="button" variant="ghost" onClick={() => void handleCopyCode()} className="h-8 shrink-0 rounded-lg px-2 text-[11px]" aria-label={copied ? "کد کپی شد" : "کپی کد"}>
                                {copied ? <Check /> : <Clipboard />}
                                {copied ? "کپی شد" : "کپی"}
                            </Button>
                        </div>
                        <pre className="max-w-full overflow-x-auto rounded-2xl border border-hairline bg-black/45 p-3 text-left text-[13px] leading-6 text-emerald-200 max-md:rounded-xl max-md:border-0">
                            <code>{message.body}</code>
                        </pre>
                    </div>
                ) : null}

                {message.type === "image" && message.url ? (
                    <div ref={imagePlaceholderRef} className="min-h-12">
                        {imageUrl ? (
                            <a href={imageUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-hairline transition-opacity hover:opacity-90 max-md:rounded-xl max-md:border-0">
                                <img src={imageUrl} alt={message.attachment_name ?? "تصویر ارسالی"} loading="lazy" className="max-h-72 w-full object-cover" />
                            </a>
                        ) : (
                            <p className="rounded-xl border border-hairline bg-surface-2 px-3 py-2 text-xs text-ink-2 max-md:border-0 max-md:bg-transparent max-md:px-0" role={imageLoadFailed ? "alert" : undefined}>
                                {imageLoading ? "در حال دریافت تصویر…" : imageLoadFailed ? "دریافت تصویر ناموفق بود." : "تصویر هنگام نمایش دریافت می‌شود."}
                            </p>
                        )}
                    </div>
                ) : null}

                {message.type === "voice" && message.url ? (
                    <VoicePlayer
        src={message.url}
        durationSeconds={message.duration_seconds}
        mimeType={message.attachment_mime ?? "audio/webm"}
      />
                ) : null}

                {message.type === "file" ? (
                    <div className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-hairline bg-sunken p-3 max-md:gap-2 max-md:rounded-xl max-md:border-0 max-md:bg-transparent max-md:p-0">
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
                        <button type="button" onClick={() => void downloadFile()} disabled={isDownloading || !message.url} aria-label="دانلود پیوست" className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-2 hover:bg-surface-3 hover:text-ink disabled:opacity-50">
                            {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                        </button>
                    </div>
                ) : null}

                {message.body &&
                message.type !== "text" &&
                message.type !== "code" ? (
                    <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-ink max-md:text-[15px] max-md:leading-6 max-md:wrap-anywhere">
                        {message.body}
                    </p>
                ) : null}
            </div>
        </div>
    );
}
