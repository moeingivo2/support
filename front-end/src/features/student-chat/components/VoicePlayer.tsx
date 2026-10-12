import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Pause, Play } from "lucide-react";
import { fetchAuthenticatedBlob, HttpApiError } from "@/shared/api/http";
import { VoiceWaveform } from "@/shared/ui/voice-waveform";
import { formatDuration } from "../utils/format";
import { toPersianDigits } from "../utils/persian";

/**
 * پخش پیام صوتی با دریافت فایل احراز هویت‌شده و آزادسازی object URL.
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
    const [retryCount, setRetryCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    useEffect(() => {
        let cancelled = false;
        let created: string | null = null;
        setError(null);
        setIsLoading(true);
        setObjectUrl(null);
        setCurrentTime(0);
        setDuration(durationSeconds ?? 0);

        void fetchAuthenticatedBlob(src, mimeType)
            .then((blob) => {
                if (cancelled) return;
                created = URL.createObjectURL(blob);
                setObjectUrl(created);
                setIsLoading(false);
            })
            .catch((failure: unknown) => {
                if (cancelled) return;
                setError(navigator.onLine === false || (failure instanceof HttpApiError && failure.status === 0)
                    ? "اتصال اینترنت برقرار نیست."
                    : "دریافت پیام صوتی ناموفق بود.");
                setIsLoading(false);
            });

        return () => {
            cancelled = true;
            if (created) URL.revokeObjectURL(created);
        };
    }, [src, mimeType, retryCount, durationSeconds]);

    async function togglePlayback(): Promise<void> {
        const audio = audioRef.current;
        if (!audio || isLoading) return;
        if (!audio.paused) {
            audio.pause();
            return;
        }
        try {
            await audio.play();
            setError(null);
        } catch {
            setError("پخش پیام صوتی ناموفق بود.");
        }
    }

    if (error) {
        return (
            <div className="flex flex-wrap items-center gap-2 text-xs text-err-text" role="alert">
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
                <button type="button" className="font-bold underline underline-offset-2" onClick={() => setRetryCount((current) => current + 1)}>تلاش مجدد</button>
            </div>
        );
    }

    return (
        <div className="flex w-full min-w-0 items-center gap-2.5 rounded-2xl border border-hairline bg-sunken p-2.5 max-md:rounded-xl max-md:border-0 max-md:bg-transparent max-md:px-0 max-md:py-1" dir="rtl">
            <audio
                ref={audioRef}
                src={objectUrl ?? undefined}
                preload="metadata"
                onLoadedMetadata={(event) => {
                    if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration);
                }}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onError={() => { if (objectUrl) setError("پخش پیام صوتی ناموفق بود."); }}
            />
            <button type="button" aria-label={playing ? "مکث پیام صوتی" : "پخش پیام صوتی"} disabled={!objectUrl || isLoading} onClick={() => void togglePlayback()} className="grid size-10 shrink-0 place-items-center rounded-full bg-active-blue text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 disabled:opacity-50">
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
            </button>
            <div className="relative min-w-0 flex-1">
                <VoiceWaveform progress={progress} animateWhilePlaying={playing} className="h-8 w-full" activeClassName="bg-active-blue" idleClassName="bg-ink-3/50" ariaLabel="موج پیام صوتی" />
                <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime} onChange={(event) => {
                    if (audioRef.current && objectUrl) audioRef.current.currentTime = Number(event.target.value);
                    setCurrentTime(Number(event.target.value));
                }} aria-label="موقعیت پخش پیام صوتی" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </div>
            <span className="shrink-0 text-xs text-ink-2" dir="ltr">{toPersianDigits(formatDuration(Math.floor(currentTime)))} / {toPersianDigits(formatDuration(Math.floor(duration)))}</span>
        </div>
    );
}
