import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Check, Code2, Image as ImageIcon, Loader2, Mic, Paperclip, RotateCcw, Send } from "lucide-react";
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
    onCodeModeChange: (codeMode: boolean) => void;
    codeMode: boolean;
    isSending: boolean;
    isOnline: boolean;
    disabled?: boolean;
};

export function ChatComposer({
    onSend,
    onCodeModeChange,
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
            <div className="space-y-2 border-t border-hairline bg-sunken p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:sticky max-md:bottom-0 max-md:z-20 max-md:shrink-0 max-md:bg-surface max-md:pl-[max(0.75rem,env(safe-area-inset-left))] max-md:pr-[max(0.75rem,env(safe-area-inset-right))] md:p-4">
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
            className="space-y-2 border-t border-hairline bg-sunken p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl max-md:sticky max-md:bottom-0 max-md:z-20 max-md:shrink-0 max-md:bg-surface max-md:pl-[max(0.75rem,env(safe-area-inset-left))] max-md:pr-[max(0.75rem,env(safe-area-inset-right))] max-md:backdrop-blur-none md:px-4 md:py-3"
        >
            {!isOnline && sendState !== "failed" ? <Alert tone="danger">اتصال اینترنت برقرار نیست. پیام یا فایل را پس از بازگشت اتصال می‌توانید ارسال کنید.</Alert> : null}
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
                    canSubmit={canSend}
                    isSubmitting={isSending}
                    onSubmit={() => void handleSubmit()}
                    onClose={() => onCodeModeChange(false)}
                />
            ) : (
                <div className="chat-composer-shell min-w-0 rounded-2xl border border-hairline bg-surface-2 transition-colors focus-within:border-primary-line-2 focus-within:ring-2 focus-within:ring-primary-ring-2 max-md:border-0 max-md:bg-sunken">
                    <ChatTextarea
                        value={body}
                        onChange={(event) => { setBody(event.target.value); setSendState("idle"); setSendError(null); }}
                        onKeyDown={handleTextKeyDown}
                        dir="rtl"
                        placeholder="پیام خود را بنویسید..."
                        aria-label="متن پیام"
                        disabled={isSending || isDisabled}
                        minHeight={48}
                        maxHeight={136}
                        className="max-h-[136px] min-h-12 resize-none rounded-b-none rounded-t-2xl border-0 bg-transparent px-4 py-3 shadow-none focus-visible:bg-transparent focus-visible:shadow-none max-md:px-3 sm:min-h-12 sm:py-3"
                    />
                    <div className="flex items-center gap-8 border-t border-hairline/70 px-2 py-1.5 max-md:gap-0 max-md:border-0 max-md:px-1 max-md:py-1">
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
                        {/* دکمه‌ی ارسال در سمت چپ کادر می‌نشیند (انتهای بصری
                            در RTL) و ابزارها سمت راست می‌مانند. */}
                        <div className="flex w-full items-center justify-between gap-2" dir="rtl">
                            <div className="composer-toolbar chat-composer-toolbar shrink-0">
                                <button type="button" className="composer-tool" onClick={() => imageInputRef.current?.click()} disabled={isSending || isDisabled} aria-label="پیوست تصویر" title="پیوست تصویر">
                                    <ImageIcon className="size-4" aria-hidden="true" />
                                </button>
                                <button type="button" className="composer-tool" onClick={() => fileInputRef.current?.click()} disabled={isSending || isDisabled} aria-label="پیوست فایل" title="پیوست فایل">
                                    <Paperclip className="size-4" aria-hidden="true" />
                                </button>
                                <button type="button" className="composer-tool" onClick={() => setVoiceState("recording")} disabled={isSending || isDisabled} aria-label="ضبط پیام صوتی" title="ضبط پیام صوتی">
                                    <Mic className="size-4" aria-hidden="true" />
                                </button>
                                <button type="button" className="composer-tool" onClick={() => onCodeModeChange(true)} disabled={isSending || isDisabled} aria-pressed={false} aria-label="حالت کد" title="ویرایش و ارسال کد">
                                    <Code2 className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {attachment ? (
                                <Button type="submit" disabled={!canSend} className="min-w-0 shrink max-md:shadow-none md:h-9 md:px-3 md:text-xs md:shadow-none">
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
                                    <SendButton disabled={!canSend} aria-label={codeMode ? "ارسال کد" : "ارسال پیام"} className="max-md:shadow-none md:size-9 md:rounded-xl md:shadow-none">
                                        {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                                    </SendButton>
                                )}
                            </div>
                            <span className="sr-only" aria-live="polite">{isSending ? "در حال ارسال پیام" : ""}</span>
                        </div>
                    </div>
                </div>
            )}
            {!codeMode ? <p className="hidden text-[11px] text-ink-3 sm:block">برای ارسال پیام Enter و برای خط جدید Shift+Enter را بزنید.</p> : null}
        </form>
    );
}
