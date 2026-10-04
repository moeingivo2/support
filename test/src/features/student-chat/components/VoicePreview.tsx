import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { VoiceWaveform } from "@/shared/ui/voice-waveform";
import { formatDuration } from "../utils/format";
import { toPersianDigits } from "../utils/persian";

type VoicePreviewProps = {
    file: File;
    durationSeconds: number;
    disabled?: boolean;
    onDelete: () => void;
    onRerecord: () => void;
};

export function VoicePreview({
    file,
    durationSeconds,
    disabled = false,
    onDelete,
    onRerecord,
}: VoicePreviewProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(durationSeconds);
    const [playbackError, setPlaybackError] = useState(false);
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    return (
        <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-hairline bg-surface-2 p-2" dir="rtl" aria-label="پیش‌نمایش پیام صوتی">
            <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onDelete}
                disabled={disabled}
                aria-label="حذف پیام صوتی"
                className="max-sm:size-11 max-sm:shrink-0"
            >
                <Trash2 />
            </Button>
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
                onError={() => setPlaybackError(true)}
            />
            <button
                type="button"
                aria-label={playing ? "مکث پیش‌نمایش" : "پخش پیش‌نمایش"}
                disabled={!objectUrl || disabled}
                onClick={() => {
                    const audio = audioRef.current;
                    if (!audio) return;
                    if (audio.paused) {
                        void audio.play().then(() => setPlaybackError(false)).catch(() => setPlaybackError(true));
                    }
                    else audio.pause();
                }}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-active-blue text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 disabled:opacity-50"
            >
                {!objectUrl ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : playing ? (
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
                    ariaLabel="موج پیش‌نمایش پیام صوتی"
                />
                <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    step={0.1}
                    value={currentTime}
                    onChange={(event) => {
                        const nextTime = Number(event.target.value);
                        if (audioRef.current) audioRef.current.currentTime = nextTime;
                        setCurrentTime(nextTime);
                    }}
                    aria-label="موقعیت پخش پیش‌نمایش"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
            </div>
            {/* روی گوشی زمان حذف می‌شود تا موج صوتی فضای کافی داشته باشد؛
                هر دو زمان در aria-label پنهان می‌مانند. */}
            <span
                className="shrink-0 text-xs text-ink-2 max-sm:sr-only"
                dir="ltr"
                aria-label={`${formatDuration(Math.floor(currentTime))} از ${formatDuration(Math.floor(duration))}`}
            >
                {toPersianDigits(formatDuration(Math.floor(currentTime)))} /{" "}
                {toPersianDigits(formatDuration(Math.floor(duration)))}
            </span>
            {playbackError ? <span role="alert" className="sr-only">پخش پیش‌نمایش ناموفق بود.</span> : null}
            <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onRerecord}
                disabled={disabled}
                aria-label="ضبط دوباره پیام صوتی"
                title="ضبط دوباره پیام صوتی"
                className="max-sm:size-11 max-sm:shrink-0"
            >
                <Mic />
            </Button>
        </div>
    );
}
