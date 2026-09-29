import { useRef, useState, type FormEvent } from "react";
import {
    Code2,
    Image as ImageIcon,
    Loader2,
    Paperclip,
    Send,
    X,
} from "lucide-react";
import { Alert } from "@/shared/ui/alert";
import { Button, MagneticSendButton } from "@/shared/ui/button";
import { ChatTextarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import type { OutgoingAttachment } from "@/features/student-chat/types/chat";
import { formatFileSize } from "@/features/student-chat/utils/format";

type SupportComposerProps = {
    onSend: (
        body: string,
        options: {
            codeMode: boolean;
            language: string;
            attachment?: OutgoingAttachment;
        },
    ) => void;
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

export function SupportComposer({
    onSend,
    isSending,
    error,
    disabled = false,
}: SupportComposerProps) {
    const [body, setBody] = useState("");
    const [codeMode, setCodeMode] = useState(false);
    const [language, setLanguage] = useState("plain");
    const [attachment, setAttachment] = useState<OutgoingAttachment | null>(
        null,
    );
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

    function pickFile(input: HTMLInputElement | null) {
        const file = input?.files?.[0];
        if (!file) return;
        setAttachment({ file });
        if (input) input.value = "";
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
                        ارسال به‌صورت بلوک کد
                    </span>
                    {CODE_LANGUAGES.map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => setLanguage(item)}
                            aria-pressed={language === item}
                            className={cn(
                                "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                                language === item
                                    ? "bg-warn-soft-2 text-alret-gold ring-1 ring-warn-ring"
                                    : "bg-surface-2 text-ink-2 ring-1 ring-hairline hover:bg-surface-3 hover:text-ink",
                            )}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            ) : null}

            {/* items-center تا دکمه‌های ۳۶ پیکسلی با ورودی هم‌تراز بمانند */}
            <div className="flex items-center gap-2 max-sm:flex-col max-sm:items-stretch">
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={() => pickFile(fileInputRef.current)}
                />
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={() => pickFile(imageInputRef.current)}
                />

                {/* دکمه‌های پیوست: هم‌اندازه ۳۶×۳۶ با فاصله‌ی ۸ پیکسل، لنگر راست در RTL */}
                <div className="composer-toolbar">
                    <button
                        type="button"
                        className={cn("composer-tool", codeMode && "is-code")}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending || disabled}
                        aria-label="پیوست فایل"
                        title="پیوست فایل"
                    >
                        <Paperclip className="size-4" aria-hidden="true" />
                    </button>
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
                        onClick={() => setCodeMode((current) => !current)}
                        disabled={isSending || disabled}
                        aria-pressed={codeMode}
                        aria-label="حالت کد"
                        title="ارسال به‌صورت بلوک کد"
                    >
                        <Code2 className="size-4" aria-hidden="true" />
                    </button>
                </div>

                <ChatTextarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                        }
                    }}
                    dir={codeMode ? "ltr" : "rtl"}
                    placeholder={
                        codeMode
                            ? "کد خود را بنویسید..."
                            : "پاسخ خود را بنویسید..."
                    }
                    className={
                        codeMode
                            ? "flex-1 font-mono text-left"
                            : "flex-1"
                    }
                    disabled={isSending}
                />

                <MagneticSendButton
                    disabled={!canSend}
                    aria-label="ارسال پاسخ"
                >
                    {isSending ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <Send />
                    )}
                </MagneticSendButton>
            </div>
        </form>
    );
}
