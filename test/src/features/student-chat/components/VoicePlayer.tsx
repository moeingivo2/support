import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatDuration } from "../utils/format";
import { toPersianDigits } from "../utils/persian";

const BARS = Array.from({ length: 36 }, (_, index) =>
    7 + ((index * 17 + index * index * 3) % 22),
);

export function VoicePlayer({ src, durationSeconds }: { src: string; durationSeconds: number | null }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(durationSeconds ?? 0);
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex min-w-56 items-center gap-2.5" dir="rtl">
            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onLoadedMetadata={(event) => {
                    if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration);
                }}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
            />
            <button
                type="button"
                aria-label={playing ? "مکث پیام صوتی" : "پخش پیام صوتی"}
                onClick={() => {
                    const audio = audioRef.current;
                    if (!audio) return;
                    if (audio.paused) void audio.play();
                    else audio.pause();
                }}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-active-blue text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
            >
                {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
            </button>
            <div className="relative min-w-0 flex-1">
                <div className="flex h-8 items-center justify-between gap-px overflow-hidden" aria-hidden="true">
                    {BARS.map((height, index) => (
                        <span key={index} className={`w-0.5 flex-1 rounded-full ${index / BARS.length * 100 <= progress ? "bg-active-blue" : "bg-ink-3/50"}`} style={{ height }} />
                    ))}
                </div>
                <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    step={0.1}
                    value={currentTime}
                    onChange={(event) => {
                        if (audioRef.current) audioRef.current.currentTime = Number(event.target.value);
                        setCurrentTime(Number(event.target.value));
                    }}
                    aria-label="موقعیت پخش پیام صوتی"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
            </div>
            <span className="shrink-0 text-xs text-ink-2" dir="ltr">
                {toPersianDigits(formatDuration(Math.floor(currentTime)))} / {toPersianDigits(formatDuration(Math.floor(duration)))}
            </span>
        </div>
    );
}
