import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Check, Code2, Image as ImageIcon, Loader2, Paperclip, RotateCcw, Send } from "lucide-react";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { ChatTextarea } from "@/shared/ui/textarea";
import type { OutgoingAttachment } from "@/features/student-chat/types/chat";
import { ChatAttachmentPreview } from "@/features/student-chat/components/ChatAttachmentPreview";
import { CodeEditor } from "@/features/student-chat/components/CodeEditor";
import { getChatSendError } from "@/features/student-chat/utils/chat-error";

type SupportComposerProps = {
    onSend: (
        body: string,
        options: {
            codeMode: boolean;
            language: string;
            attachment?: OutgoingAttachment;
            signal?: AbortSignal;
        },
    ) => Promise<unknown>;
    isSending: boolean;
    isOnline: boolean;
    disabled?: boolean;
};

export function SupportComposer({ onSend, isSending, isOnline, disabled = false }: SupportComposerProps) {
    const [body, setBody] = useState("");
    const [codeMode, setCodeMode] = useState(false);
    const [language, setLanguage] = useState("plain");
    const [attachment, setAttachment] = useState<OutgoingAttachment | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
    const submitLockRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const isDisabled = disabled || !isOnline;
    const canSend = !isSending && !isDisabled && (body.trim() !== "" || attachment !== null);

    useEffect(() => {
        if (!isOnline) {
            abortControllerRef.current?.abort();
        }
    }, [isOnline]);

    async function handleSubmit(event?: FormEvent<HTMLFormElement>, retry = false) {
        event?.preventDefault();
        if (submitLockRef.current || (!retry && !canSend)) return;
        if (!navigator.onLine) {
            setSendState("failed");
            setSendError("اتصال اینترنت برقرار نیست. پیام یا فایل ارسال نشد؛ برای تلاش دوباره روی «تلاش مجدد» بزنید.");
            return;
        }

        submitLockRef.current = true;
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setSendError(null);
        setSendState("sending");
        try {
            await onSend(body, {
                codeMode,
                language: codeMode ? language : "plain",
                attachment: attachment ?? undefined,
                signal: controller.signal,
            });
            setBody("");
            setAttachment(null);
            setSendState("sent");
        } catch (failure) {
            setSendState("failed");
            setSendError(!navigator.onLine
                ? "اتصال اینترنت هنگام ارسال قطع شد. پیام یا فایل حفظ شده است؛ برای تلاش دوباره روی «تلاش مجدد» بزنید."
                : getChatSendError(failure, attachment !== null));
        } finally {
            submitLockRef.current = false;
            abortControllerRef.current = null;
        }
    }

    function handleTextKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
        }
    }

    function pickFile(input: HTMLInputElement | null) {
        const file = input?.files?.[0];
        if (file) {
            setAttachment({ file });
            setSendState("idle");
            setSendError(null);
        }
        if (input) input.value = "";
    }

    return (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3 border-t border-hairline bg-sunken p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:p-4">
            {!isOnline && sendState !== "failed" ? <Alert tone="danger">اتصال اینترنت برقرار نیست. پیام یا فایل پس از بازگشت اتصال قابل ارسال است.</Alert> : null}
            {isOnline ? <p className="text-xs text-succ-txt" role="status">● آنلاین</p> : null}
            {sendState === "failed" && sendError ? (
                <Alert tone="danger">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span><strong>ارسال ناموفق بود.</strong> {sendError}</span>
                        <Button type="button" variant="ghost" disabled={!isOnline || isSending} onClick={() => void handleSubmit(undefined, true)}>
                            <RotateCcw /> تلاش مجدد
                        </Button>
                    </div>
                </Alert>
            ) : null}
            {sendState === "sending" || sendState === "sent" ? (
                <p aria-live="polite" className="text-xs text-ink-2">
                    {sendState === "sending" ? (attachment ? "در حال بارگذاری فایل…" : "در حال ارسال پیام…") : <span className="inline-flex items-center gap-1 text-succ-txt"><Check className="size-4" /> ارسال شد</span>}
                </p>
            ) : null}

            {attachment ? <ChatAttachmentPreview attachment={attachment} disabled={isSending} onRemove={() => { setAttachment(null); setSendState("idle"); setSendError(null); }} /> : null}

            {codeMode ? (
                <CodeEditor
                    value={body}
                    onChange={(value) => {
                        setBody(value);
                        setSendState("idle");
                        setSendError(null);
                    }}
                    language={language}
                    onLanguageChange={setLanguage}
                    disabled={isSending || isDisabled}
                    canSubmit={canSend}
                    isSubmitting={isSending}
                    onSubmit={() => void handleSubmit()}
                    onClose={() => setCodeMode(false)}
                />
            ) : (
                <ChatTextarea
                    value={body}
                    onChange={(event) => { setBody(event.target.value); setSendState("idle"); setSendError(null); }}
                    onKeyDown={handleTextKeyDown}
                    dir="rtl"
                    placeholder="پاسخ خود را بنویسید..."
                    aria-label="متن پاسخ"
                    disabled={isSending || isDisabled}
                    // ارتفاع، فاصله و اندازه‌ی متن از ChatTextarea پایه می‌آید
                    // (روی موبایل ۱۶ پیکسل تا مرورگر زوم نکند). اینجا فقط
                    // رنگ سطح و عرض باقی‌مانده در ردیف ابزارها تنظیم می‌شود.
                    className="max-h-36 w-full bg-surface-2"
                />
            )}

            {/* یک ردیف در همه‌ی اندازه‌ها: چیدمان ستونیِ قبلی روی گوشی ارتفاع
                زیادی می‌گرفت و دکمه‌ی ارسال را از ابزارها جدا می‌کرد.
                shrink-0 روی دکمه‌ها لازم است تا در عرض کم فشرده نشوند. */}
            <div className="flex items-center justify-between gap-2">
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={() => pickFile(imageInputRef.current)} />
                <input ref={fileInputRef} type="file" className="hidden" onChange={() => pickFile(fileInputRef.current)} />
                <div className="composer-toolbar shrink-0">
                    <button type="button" className="composer-tool" onClick={() => imageInputRef.current?.click()} disabled={isSending || isDisabled} aria-label="پیوست تصویر" title="پیوست تصویر">
                        <ImageIcon className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" className="composer-tool" onClick={() => fileInputRef.current?.click()} disabled={isSending || isDisabled} aria-label="پیوست فایل" title="پیوست فایل">
                        <Paperclip className="size-4" aria-hidden="true" />
                    </button>
                    {!codeMode ? (
                        <button type="button" className="composer-tool" onClick={() => setCodeMode(true)} disabled={isSending || isDisabled} aria-pressed={false} aria-label="حالت کد" title="ویرایش و ارسال کد">
                            <Code2 className="size-4" aria-hidden="true" />
                        </button>
                    ) : null}
                </div>
                {/* min-w-0 + truncate: برچسب بلندِ «ارسال پیام صوتی» در عرض کم
                    نباید دکمه را از کادر بیرون بزند. */}
                {!codeMode ? (
                    <Button type="submit" disabled={!canSend} className="min-w-0 shrink">
                        {sendState === "sending" || isSending ? <Loader2 className="animate-spin" /> : sendState === "sent" ? <Check /> : <Send />}
                        <span className="truncate">
                            {isSending
                                ? "در حال ارسال..."
                                : attachment
                                  ? "ارسال فایل"
                                  : "ارسال پاسخ"}
                        </span>
                    </Button>
                ) : null}
            </div>
            {!codeMode ? <p className="hidden text-[11px] text-ink-3 sm:block">برای ارسال پاسخ Enter و برای خط جدید Shift+Enter را بزنید.</p> : null}
        </form>
    );
}
