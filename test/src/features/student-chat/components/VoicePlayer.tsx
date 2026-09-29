import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Pause, Play } from "lucide-react";
import { fetchAuthenticatedBlob } from "@/shared/api/http";
import { VoiceWaveform } from "@/shared/ui/voice-waveform";
import { formatDuration } from "../utils/format";
import { toPersianDigits } from "../utils/persian";

/**
 * پخش پیام صوتی.
 *
 * فایل با هدر Authorization گرفته می‌شود، چون `<audio src>` نمی‌تواند توکن
 * بفرستد و پیوست‌ها پشت احراز هویت هستند. نوع فایل از خود پیام می‌آید چون
 * سرور عمداً همه‌چیز را octet-stream می‌فرستد.
 */
export function VoicePlayer({
    src,
    durationSeconds,
    mimeType = "audio/webm",
}: {
    src: string;
    durationSeconds: number | null;
    mimeType?: string;
}) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(durationSeconds ?? 0);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    useEffect(() => {
        let cancelled = false;
        let created: string | null = null;

        setError(null);
        setObjectUrl(null);

        fetchAuthenticatedBlob(src, mimeType)
            .then((blob) => {
                if (cancelled) return;
                created = URL.createObjectURL(blob);
                setObjectUrl(created);
            })
            .catch(() => {
                if (cancelled) return;
                setError("دریافت پیام صوتی ناموفق بود.");
            });

        return () => {
            cancelled = true;
            // نشتی object URL در لیست پیام‌های طولانی انباشته می‌شد.
            if (created) URL.revokeObjectURL(created);
        };
    }, [src, mimeType]);

    if (error) {
        return (
            <div className="flex items-center gap-2 text-xs text-err-text" role="alert">
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                {error}
            </div>
        );
    }

    return (
        <div className="flex w-full min-w-0 items-center gap-2.5" dir="rtl">
            <audio
                ref={audioRef}
                src={objectUrl ?? undefined}
                preload="metadata"
                onLoadedMetadata={(event) => {
                    if (Number.isFinite(event.currentTarget.duration)) {
                        setDuration(event.currentTarget.duration);
                    }
                }}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
            />
            <button
                type="button"
                aria-label={playing ? "مکث پیام صوتی" : "پخش پیام صوتی"}
                disabled={!objectUrl}
                onClick={() => {
                    const audio = audioRef.current;
                    if (!audio) return;
                    if (audio.paused) void audio.play();
                    else audio.pause();
                }}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-active-blue text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 disabled:opacity-50"
            >
                {playing ? (
                    <Pause className="size-4 fill-current" />
                ) : (
                    <Play className="size-4 fill-current" />
                )}
            </button>
            <div className="relative min-w-0 flex-1">
                <VoiceWaveform
                    progress={progress}
                    animateWhilePlaying={playing}
                    className="h-8 w-full"
                    activeClassName="bg-active-blue"
                    idleClassName="bg-ink-3/50"
                    ariaLabel="موج پیام صوتی"
                />
                <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    step={0.1}
                    value={currentTime}
                    onChange={(event) => {
                        if (audioRef.current) {
                            audioRef.current.currentTime = Number(event.target.value);
                        }
                        setCurrentTime(Number(event.target.value));
                    }}
                    aria-label="موقعیت پخش پیام صوتی"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
            </div>
            <span className="shrink-0 text-xs text-ink-2" dir="ltr">
                {toPersianDigits(formatDuration(Math.floor(currentTime)))} /{" "}
                {toPersianDigits(formatDuration(Math.floor(duration)))}
            </span>
        </div>
    );
}
