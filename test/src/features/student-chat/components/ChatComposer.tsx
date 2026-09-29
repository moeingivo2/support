import { useRef, useState, type FormEvent } from "react";
import {
    Image as ImageIcon,
    Loader2,
    Mic,
    Paperclip,
    Send,
    X,
} from "lucide-react";
import { Alert } from "@/shared/ui/alert";
import { Button, MagneticSendButton } from "@/shared/ui/button";
import { ChatTextarea } from "@/shared/ui/textarea";
import type { OutgoingAttachment } from "../types/chat";
import { formatFileSize } from "../utils/format";
import { VoiceRecorder } from "./VoiceRecorder";

type ChatComposerProps = {
    onSend: (
        body: string,
        options: {
            codeMode: boolean;
            language: string;
            attachment?: OutgoingAttachment;
        },
    ) => void;
    codeMode: boolean;
    isSending: boolean;
    error: string | null;
    disabled?: boolean;
};

const CODE_LANGUAGES = [
    "plain",
    "python",
    "php",
    "javascript",
    "sql",
    "bash",
    "json",
];

export function ChatComposer({
    onSend,
    codeMode,
    isSending,
    error,
    disabled = false,
}: ChatComposerProps) {
    const [body, setBody] = useState("");
    const [language, setLanguage] = useState("plain");
    const [attachment, setAttachment] = useState<OutgoingAttachment | null>(
        null,
    );
    const [isRecording, setIsRecording] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);

    const canSend =
        !isSending && !disabled && (body.trim() !== "" || attachment !== null);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSend) return;

        onSend(body.trim(), {
            codeMode,
            language: codeMode ? language : "plain",
            attachment: attachment ?? undefined,
        });
        setBody("");
        setAttachment(null);
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
        }
    }

    function pickFile(input: HTMLInputElement | null) {
        const file = input?.files?.[0];
        if (!file) return;
        setAttachment({ file });
        if (input) input.value = "";
    }

    if (isRecording) {
        return (
            <div className="space-y-2 border-t border-hairline bg-sunken p-3 md:p-4">
                <VoiceRecorder
                    // با باز شدن پنل ضبط، ضبط بلافاصله شروع می‌شود تا کاربر
                    // مجبور به کلیک دوم نباشد.
                    autoStart
                    disabled={isSending}
                    onCancel={() => setIsRecording(false)}
                    onRecorded={(file, durationSeconds) => {
                        setAttachment({ file, durationSeconds });
                        setIsRecording(false);
                    }}
                />
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-3 border-t border-hairline bg-sunken p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:p-4"
        >
            {error ? <Alert tone="danger">{error}</Alert> : null}

            {attachment ? (
                <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-2 p-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-accent-ink">
                        <Paperclip className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                            {attachment.file.name}
                        </span>
                        <span className="block text-[11px] text-ink-2">
                            {formatFileSize(attachment.file.size)}
                        </span>
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setAttachment(null)}
                        aria-label="حذف پیوست"
                        disabled={isSending}
                    >
                        <X />
                    </Button>
                </div>
            ) : null}

            {codeMode ? (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-alret-gold">
                        حالت کد فعال است
                    </span>
                    {CODE_LANGUAGES.map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => setLanguage(item)}
                            aria-pressed={language === item}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 ${
                                language === item
                                    ? "bg-warn-soft-2 text-alret-gold ring-1 ring-warn-ring"
                                    : "bg-surface-2 text-ink-2 ring-1 ring-hairline hover:bg-surface-3 hover:text-ink"
                            }`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            ) : null}

            {/* یک ردیف در هر اندازه: ورودی، ارسال و ابزارهای پیوست. ابزارها
                آخر می‌نشینند تا در RTL سمت چپ باشند و بالای صفحه خلوت بماند. */}
            <div className="flex flex-row items-end gap-1.5 sm:gap-2">
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

                {/* دکمه‌های پیوست بعد از ارسال می‌نشینند تا در RTL سمت چپ
                    ورودی باشند و بالای صفحه خلوت بماند. */}
                <div className="composer-toolbar order-last">
                    <button
                        type="button"
                        className="composer-tool"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isSending || disabled}
                        aria-label="پیوست تصویر"
                        title="پیوست تصویر"
                    >
                        <ImageIcon className="size-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="composer-tool"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending || disabled}
                        aria-label="پیوست فایل"
                        title="پیوست فایل"
                    >
                        <Paperclip
                            className="size-4"
                            aria-hidden="true"
                        />
                    </button>
                    <button
                        type="button"
                        className="composer-tool"
                        onClick={() => setIsRecording(true)}
                        disabled={isSending || disabled}
                        aria-label="ضبط پیام صوتی"
                        title="ضبط پیام صوتی"
                    >
                        <Mic className="size-4" aria-hidden="true" />
                    </button>
                </div>

                <ChatTextarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    onKeyDown={handleKeyDown}
                    dir={codeMode ? "ltr" : "rtl"}
                    placeholder={
                        codeMode
                            ? "کد خود را بنویسید..."
                            : "پیام خود را بنویسید..."
                    }
                    className={
                        codeMode
                            ? "min-h-12 flex-1 font-mono text-left"
                            : "min-h-12 flex-1"
                    }
                    disabled={isSending}
                />

                <MagneticSendButton
                    disabled={!canSend}
                    aria-label="ارسال پیام"
                    className="shrink-0"
                >
                    {isSending ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <Send />
                    )}
                </MagneticSendButton>
            </div>

            <p className="hidden text-[11px] text-ink-3 sm:block">
                برای ارسال پیام Enter و برای شروع خط جدید Shift+Enter را بزنید.
            </p>
        </form>
    );
}
