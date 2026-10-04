import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Check, Image as ImageIcon, Loader2, Mic, Paperclip, RotateCcw, Send } from "lucide-react";
import { Alert } from "@/shared/ui/alert";
import { Button, SendButton } from "@/shared/ui/button";
import { ChatTextarea } from "@/shared/ui/textarea";
import type { OutgoingAttachment } from "../types/chat";
import { ChatAttachmentPreview } from "./ChatAttachmentPreview";
import { CodeEditor } from "./CodeEditor";
import { VoicePreview } from "./VoicePreview";
import { VoiceRecorder } from "./VoiceRecorder";
import { getChatSendError } from "../utils/chat-error";

type VoiceState = "idle" | "recording" | "preview";

type ChatComposerProps = {
    onSend: (
        body: string,
        options: {
            codeMode: boolean;
            language: string;
            attachment?: OutgoingAttachment;
            signal?: AbortSignal;
        },
    ) => Promise<unknown>;
    codeMode: boolean;
    isSending: boolean;
    isOnline: boolean;
    disabled?: boolean;
};

export function ChatComposer({
    onSend,
    codeMode,
    isSending,
    isOnline,
    disabled = false,
}: ChatComposerProps) {
    const [body, setBody] = useState("");
    const [language, setLanguage] = useState("plain");
    const [attachment, setAttachment] = useState<OutgoingAttachment | null>(null);
    const [voiceState, setVoiceState] = useState<VoiceState>("idle");
    const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
    const [sendError, setSendError] = useState<string | null>(null);
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
            await onSend(codeMode ? body : body.trim(), {
                codeMode,
                language: codeMode ? language : "plain",
                attachment: attachment ?? undefined,
                signal: controller.signal,
            });
            setBody("");
            setAttachment(null);
            setVoiceState("idle");
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

    if (voiceState === "recording") {
        return (
            <div className="space-y-2 border-t border-hairline bg-sunken p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4">
                {!isOnline ? <Alert tone="danger">اتصال اینترنت برقرار نیست.</Alert> : null}
                <VoiceRecorder
                    autoStart
                    disabled={isDisabled || isSending}
                    onCancel={() => setVoiceState("idle")}
                    onRecorded={(file, durationSeconds) => {
                        setAttachment({ file, durationSeconds });
                        setSendState("idle");
                        setSendError(null);
                        setVoiceState("preview");
                    }}
                />
            </div>
        );
    }

    return (
        <form
            onSubmit={(event) => void handleSubmit(event)}
            className="space-y-3 border-t border-hairline bg-sunken p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:p-4"
        >
            {!isOnline && sendState !== "failed" ? <Alert tone="danger">اتصال اینترنت برقرار نیست. پیام یا فایل را پس از بازگشت اتصال می‌توانید ارسال کنید.</Alert> : null}
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

            {attachment ? (
                <div className="space-y-2">
                    {attachment.durationSeconds !== undefined ? (
                        <VoicePreview
                            file={attachment.file}
                            durationSeconds={attachment.durationSeconds}
                            disabled={isSending}
                            onDelete={() => { setAttachment(null); setSendState("idle"); setSendError(null); }}
                            onRerecord={() => {
                                setAttachment(null);
                                setSendState("idle");
                                setSendError(null);
                                setVoiceState("recording");
                            }}
                        />
                    ) : (
                        <ChatAttachmentPreview
                            attachment={attachment}
                            disabled={isSending}
                            onRemove={() => { setAttachment(null); setSendState("idle"); setSendError(null); }}
                        />
                    )}
                </div>
            ) : null}

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
                    onSubmit={() => void handleSubmit()}
                />
            ) : (
                <div className="flex min-w-0 items-end gap-2">
                    <ChatTextarea
                        value={body}
                        onChange={(event) => { setBody(event.target.value); setSendState("idle"); setSendError(null); }}
                        onKeyDown={handleTextKeyDown}
                        dir="rtl"
                        placeholder="پیام خود را بنویسید..."
                        aria-label="متن پیام"
                        disabled={isSending || isDisabled}
                        // ارتفاع، فاصله و اندازه‌ی متن از ChatTextarea پایه
                        // می‌آید؛ اینجا فقط flex-1 برای پر کردن عرض باقی‌مانده
                        // و رنگ سطحِ متفاوت از فرم‌های دیگر لازم است.
                        className="max-h-36 flex-1 bg-surface-2"
                    />
                </div>
            )}

            {/* یک ردیف در همه‌ی اندازه‌ها: چیدمان ستونیِ قبلی روی گوشی ارتفاع
                زیادی می‌گرفت. shrink-0 از فشرده شدن دکمه‌ها در عرض کم
                جلوگیری می‌کند. */}
            <div className="flex items-center justify-between gap-2">
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={() => pickFile(imageInputRef.current)}
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={() => pickFile(fileInputRef.current)}
                />
                <div className="composer-toolbar shrink-0">
                    <button type="button" className="composer-tool" onClick={() => imageInputRef.current?.click()} disabled={isSending || isDisabled} aria-label="پیوست تصویر" title="پیوست تصویر">
                        <ImageIcon className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" className="composer-tool" onClick={() => fileInputRef.current?.click()} disabled={isSending || isDisabled} aria-label="پیوست فایل" title="پیوست فایل">
                        <Paperclip className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" className="composer-tool" onClick={() => setVoiceState("recording")} disabled={isSending || isDisabled} aria-label="ضبط پیام صوتی" title="ضبط پیام صوتی">
                        <Mic className="size-4" aria-hidden="true" />
                    </button>
                    <span className="sr-only" aria-live="polite">{isSending ? "در حال ارسال پیام" : ""}</span>
                </div>
                {/* shrink + truncate: برچسب «ارسال پیام صوتی» در عرض کم نباید
                    دکمه را از کادر بیرون بزند. */}
                <div className="flex min-w-0 shrink items-center justify-end">
                    {attachment ? (
                        <Button type="submit" disabled={!canSend} className="min-w-0 shrink">
                        {sendState === "sending" || isSending ? <Loader2 className="animate-spin" /> : sendState === "sent" ? <Check /> : <Send />}
                            <span className="truncate">
                                {isSending
                                    ? "در حال ارسال..."
                                    : attachment.durationSeconds !== undefined
                                      ? "ارسال پیام صوتی"
                                      : "ارسال فایل"}
                            </span>
                        </Button>
                    ) : (
                        <SendButton disabled={!canSend} aria-label={codeMode ? "ارسال کد" : "ارسال پیام"}>
                            {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                        </SendButton>
                    )}
                </div>
            </div>
            {!codeMode ? <p className="hidden text-[11px] text-ink-3 sm:block">برای ارسال پیام Enter و برای خط جدید Shift+Enter را بزنید.</p> : null}
        </form>
    );
}
