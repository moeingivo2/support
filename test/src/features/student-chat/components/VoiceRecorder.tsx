import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useMicLevelFrame, VoiceWaveform } from "@/shared/ui/voice-waveform";
import { formatDuration } from "../utils/format";
import { toPersianDigits } from "../utils/persian";

type VoiceRecorderProps = {
    onRecorded: (file: File, durationSeconds: number) => void;
    onCancel: () => void;
    disabled?: boolean;
    /** با باز شدن پنل، ضبط بلافاصله شروع می‌شود. */
    autoStart?: boolean;
};

const MAX_SECONDS = 300;

/**
 * نگاشت MIME به پسوند.
 *
 * `MediaRecorder` بسته به مرورگر یکی از این‌ها را برمی‌گرداند و رویداد
 * `dataavailable` هم نوع خودش را دارد. اگر پسوند از روی MIME انتخاب نشود،
 * یک فایل MP4 موبایل با نام `.webm` ذخیره می‌شود و سرور آن را ناسازگار
 * می‌بیند.
 */
const EXTENSION_BY_MIME: Record<string, string> = {
    "audio/webm": "webm",
    "video/webm": "webm",
    "audio/ogg": "ogg",
    "audio/oga": "oga",
    "application/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/vnd.wave": "wav",
    "audio/aac": "aac",
    "audio/mp3": "mp3",
};

/**
 * MIME و پسوند هماهنگ را از خروجی واقعی ضبط استخراج می‌کند.
 *
 * پارامترهای codec از MIME حذف می‌شوند تا هدر Content-Type تمیز باشد؛
 * `audio/webm;codecs=opus` با پسوند `.webm` برای سرور قابل تفسیر نیست.
 */
function describeRecording(
    recorderMime?: string | null,
    chunkMime?: string | null,
): { mime: string; extension: string } {
    const candidates = [recorderMime, chunkMime];

    for (const candidate of candidates) {
        if (!candidate) continue;
        // فقط بخش نوع؛ «;codecs=opus» باید کنار برود.
        const base = candidate.split(";")[0]?.trim().toLowerCase() ?? "";
        const extension = EXTENSION_BY_MIME[base];
        if (base && extension) {
            return { mime: base, extension };
        }
    }

    return { mime: "audio/webm", extension: "webm" };
}

/**
 * علت واقعی شکست دسترسی به میکروفون را به فارسی برمی‌گرداند.
 *
 * پیام یکسان برای همه‌ی حالت‌ها بی‌فایده بود: کاربر نمی‌فهمید باید از
 * طریق `https` یا `localhost` باز کند، یا باید اجازه‌ی دسترسی را در مرورگر
 * بدهد، یا اصلاً میکروفون ندارد.
 */
function describeMicFailure(error: unknown): string {
    // مرورگر فقط روی زمینه‌ی امن اجازه‌ی دسترسی به میکروفون می‌دهد؛ روی
    // http با آدرس شبکه‌ی محلی (مثل 192.168.x.x) همیشه رد می‌شود.
    if (!window.isSecureContext) {
        return "برای ضبط صدا باید سایت را با آدرس localhost یا https باز کنید.";
    }

    const name = error instanceof DOMException ? error.name : "";

    if (name === "NotAllowedError" || name === "SecurityError") {
        return "دسترسی به میکروفون داده نشده است. از تنظیمات مرورگر اجازه‌ی دسترسی را باز کنید.";
    }

    if (name === "NotFoundError" || name === "OverconstrainedError") {
        return "میکروفونی روی این دستگاه پیدا نشد.";
    }

    if (name === "NotReadableError") {
        return "میکروفون توسط برنامه‌ی دیگری اشغال شده است.";
    }

    return "دسترسی به میکروفون ممکن نشد.";
}

/**
 * ضبط پیام صوتی در مرورگر و تحویل فایل صوتی به کامپوزر.
 *
 * حین ضبط، موج از داده‌ی واقعی میکروفون می‌خواند تا هر چه بلندتر حرف بزنید
 * میله‌ها بلندتر شوند.
 */
export function VoiceRecorder({
    onRecorded,
    onCancel,
    disabled = false,
    autoStart = false,
}: VoiceRecorderProps) {
    const [elapsed, setElapsed] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startedAtRef = useRef(0);
    const timerRef = useRef<number | null>(null);
    const levelsRef = useMicLevelFrame(stream);

    useEffect(() => {
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
            if (recorderRef.current?.state === "recording")
                recorderRef.current.stop();
        };
    }, []);

    const start = useCallback(async () => {
        setError(null);

        if (
            !navigator.mediaDevices?.getUserMedia ||
            typeof MediaRecorder === "undefined"
        ) {
            setError("مرورگر شما از ضبط صدا پشتیبانی نمی‌کند.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data);
            };

            recorder.onstop = () => {
                stream.getTracks().forEach((track) => track.stop());
                const { mime, extension } = describeRecording(
                    recorder.mimeType,
                    chunksRef.current[0]?.type,
                );
                const blob = new Blob(chunksRef.current, { type: mime });
                const file = new File([blob], `voice-${Date.now()}.${extension}`, {
                    type: mime,
                });
                onRecorded(
                    file,
                    Math.max(
                        1,
                        Math.round((Date.now() - startedAtRef.current) / 1000),
                    ),
                );
            };

            startedAtRef.current = Date.now();
            setElapsed(0);
            setStream(stream);
            setIsRecording(true);
            recorder.start();

            timerRef.current = window.setInterval(() => {
                const seconds = Math.round(
                    (Date.now() - startedAtRef.current) / 1000,
                );
                setElapsed(seconds);
                if (seconds >= MAX_SECONDS) stop();
            }, 250);
        } catch (error) {
            setError(describeMicFailure(error));
            setIsRecording(false);
            setStream(null);
        }
    }, []);

    const stop = useCallback(() => {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (recorderRef.current?.state === "recording")
            recorderRef.current.stop();
        setIsRecording(false);
        setStream(null);
    }, []);

    // شروع خودکار؛ فقط بار اول تا ضبط دوباره از نو آغاز نشود.
    const startedRef = useRef(false);
    useEffect(() => {
        if (!autoStart || startedRef.current) return;
        startedRef.current = true;
        void start();
    }, [autoStart, start]);

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-danger-line bg-danger-soft px-3 py-2">
            {isRecording ? (
                <>
                    <span className="flex items-center gap-2 text-xs font-bold text-err-text">
                        {/* حلقه‌ی تپش هنگام ضبط */}
                        <span className="composer-tool is-recording size-2 border-0 p-0" />
                        در حال ضبط
                    </span>
                    <span dir="ltr" className="text-xs font-bold text-ink">
                        {toPersianDigits(formatDuration(elapsed))}
                    </span>
                    <VoiceWaveform
                        levelsRef={levelsRef}
                        progress={null}
                        className="min-w-[5rem] max-w-[12rem] flex-1"
                        activeClassName="bg-err-text"
                        idleClassName="bg-err-text/30"
                        ariaLabel="موج زنده‌ی صدای ضبط‌شده"
                    />
                    <span className="text-[11px] text-ink-2">
                        حداکثر {toPersianDigits(MAX_SECONDS)} ثانیه
                    </span>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={stop}
                        aria-label="پایان ضبط"
                    >
                        <Square className="fill-current" />
                    </Button>
                </>
            ) : (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={start}
                    disabled={disabled}
                    aria-label="شروع ضبط"
                >
                    {disabled ? <Loader2 className="animate-spin" /> : <Mic />}
                    شروع ضبط
                </Button>
            )}

            <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isRecording}
                aria-label="انصراف از ضبط"
            >
                <Trash2 />
                انصراف
            </Button>

            {error ? (
                <p className="text-xs font-medium text-err-text">{error}</p>
            ) : null}
        </div>
    );
}
