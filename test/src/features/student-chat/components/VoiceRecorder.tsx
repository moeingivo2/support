import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Square, Trash2 } from "lucide-react";
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
 * OGG را برای ضبط انتخاب می‌کند، اگر مرورگر واقعاً آن را پشتیبانی کند.
 * در غیر این صورت، MediaRecorder با قالب بومی مرورگر ساخته می‌شود تا فایل
 * معتبر بماند و پسوند از MIME واقعی خروجی تعیین شود.
 */
function createMediaRecorder(stream: MediaStream): MediaRecorder {
    const oggMimeTypes = ["audio/ogg;codecs=opus", "audio/ogg"];
    const supportedOggMimeType = oggMimeTypes.find((mimeType) =>
        MediaRecorder.isTypeSupported(mimeType),
    );

    return supportedOggMimeType
        ? new MediaRecorder(stream, { mimeType: supportedOggMimeType })
        : new MediaRecorder(stream);
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
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startedAtRef = useRef(0);
    const timerRef = useRef<number | null>(null);
    const requestIdRef = useRef(0);
    const isMountedRef = useRef(true);
    const levelsRef = useMicLevelFrame(stream);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            requestIdRef.current += 1;
            if (timerRef.current !== null) {
                window.clearInterval(timerRef.current);
            }
            const recorder = recorderRef.current;
            if (recorder) {
                recorder.ondataavailable = null;
                recorder.onstop = null;
                if (recorder.state === "recording") recorder.stop();
            }
            streamRef.current?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    const stop = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        const recorder = recorderRef.current;
        if (recorder?.state === "recording") recorder.stop();
        setIsRecording(false);
        setStream(null);
    }, []);

    const cancel = useCallback(() => {
        requestIdRef.current += 1;
        if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        const recorder = recorderRef.current;
        if (recorder) {
            recorder.ondataavailable = null;
            recorder.onstop = null;
            if (recorder.state === "recording") recorder.stop();
            recorder.stream.getTracks().forEach((track) => track.stop());
        }
        recorderRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStream(null);
        setIsRecording(false);
        setIsStarting(false);
        onCancel();
    }, [onCancel]);

    const start = useCallback(async () => {
        setError(null);

        if (
            !navigator.mediaDevices?.getUserMedia ||
            typeof MediaRecorder === "undefined"
        ) {
            setError("مرورگر شما از ضبط صدا پشتیبانی نمی‌کند.");
            return;
        }

        const requestId = ++requestIdRef.current;
        setIsStarting(true);
        let acquiredStream: MediaStream | null = null;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            acquiredStream = stream;
            if (!isMountedRef.current || requestId !== requestIdRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            const recorder = createMediaRecorder(stream);
            chunksRef.current = [];
            recorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data);
            };

            recorder.onstop = () => {
                stream.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
                recorderRef.current = null;
                setIsStarting(false);
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
            streamRef.current = stream;
            setStream(stream);
            setIsRecording(true);
            setIsStarting(false);
            recorder.start();

            timerRef.current = window.setInterval(() => {
                const seconds = Math.round(
                    (Date.now() - startedAtRef.current) / 1000,
                );
                setElapsed(seconds);
                if (seconds >= MAX_SECONDS) stop();
            }, 250);
        } catch (error) {
            if (!isMountedRef.current || requestId !== requestIdRef.current) {
                return;
            }
            setError(describeMicFailure(error));
            setIsRecording(false);
            setIsStarting(false);
            acquiredStream?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setStream(null);
        }
    }, [stop]);

    useEffect(() => {
        if (autoStart) void start();
    }, [autoStart, start]);

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-danger-line bg-danger-soft px-3 py-2">
            {isRecording ? (
                <>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={cancel}
                        aria-label="حذف و لغو ضبط"
                    >
                        <Trash2 />
                    </Button>
                    <span
                        className="flex items-center gap-2 text-xs font-bold text-err-text"
                        aria-label="در حال ضبط"
                    >
                        <span className="composer-tool is-recording size-2 border-0 p-0" />
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
                    disabled={disabled || isStarting}
                    aria-label="شروع دوباره ضبط"
                >
                    {isStarting ? <Loader2 className="animate-spin" /> : <Square />}
                    {isStarting ? "در حال اتصال به میکروفون" : "تلاش دوباره"}
                </Button>
            )}

            {!isRecording ? (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={cancel}
                    aria-label="لغو ضبط"
                >
                    <Trash2 />
                    لغو
                </Button>
            ) : null}

            {error ? (
                <p className="text-xs font-medium text-err-text">{error}</p>
            ) : null}
        </div>
    );
}
