import { useEffect, useRef, type RefObject } from "react";
import { cn } from "@/shared/lib/utils";

/** تعداد میله‌های موج. بیشتر از این روی موبایل فقط هزینه‌ی رندر دارد. */
export const WAVE_BAR_COUNT = 28;
/** بالاترین ارتفاع میله بر حسب درصد. */
const BAR_MAX = 100;
/** میله‌ها در حالت بی‌صدا هم کمی جان دارند تا ضبط خالی مرده به نظر نرسد. */
const IDLE_HEIGHT = 18;

type VoiceWaveformProps = {
    className?: string;
    barCount?: number;
    /** درصد پخش‌شده. null یعنی ضبط زنده که درصد ندارد. */
    progress?: number | null;
    /**
     * داده‌ی زنده‌ی بلندی صدا. آرایه درجا به‌روزرسانی می‌شود و به همین
     * دلیل نباید در state رفت؛ وگرنه هر فریم یک رندر کامل می‌سازد.
     */
    levelsRef?: RefObject<ArrayLike<number> | null> | null;
    activeClassName?: string;
    idleClassName?: string;
    /** در حالت پخش، میله‌های پخش‌شده آرام تپش می‌کنند تا حس زنده بدهد. */
    animateWhilePlaying?: boolean;
    ariaLabel?: string;
};

/**
 * موج صوتی به سبک تلگرام.
 *
 * میله‌ها مستقیم با `style` به‌روزرسانی می‌شوند و هیچ رندری در چرخه‌ی
 * ۶۰ فریم بر ثانیه اتفاق نمی‌افتد.
 */
export function VoiceWaveform({
    className,
    barCount = WAVE_BAR_COUNT,
    progress = null,
    levelsRef = null,
    activeClassName = "bg-active-blue",
    idleClassName = "bg-ink-3/50",
    animateWhilePlaying = false,
    ariaLabel,
}: VoiceWaveformProps) {
    const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
    const progressRef = useRef(progress);
    const phaseRef = useRef(0);

    progressRef.current = progress;

    useEffect(() => {
        const live = Boolean(levelsRef?.current) || animateWhilePlaying;
        if (!live) {
            barsRef.current.forEach((bar) => {
                if (bar) bar.style.height = `${IDLE_HEIGHT}%`;
            });
            return;
        }

        let frame = 0;
        const tick = () => {
            phaseRef.current += 0.09;
            const count = barsRef.current.length;
            const levels = levelsRef?.current ?? null;

            for (let index = 0; index < count; index += 1) {
                const bar = barsRef.current[index];
                if (!bar) continue;

                let height: number;
                if (levels && levels.length > 0) {
                    // داده‌ی آنالایزر کوتاه‌تر از تعداد میله‌هاست؛ درون‌یابی خطی پر می‌شود.
                    const position = (index / Math.max(1, count - 1)) * (levels.length - 1);
                    const low = Math.floor(position);
                    const high = Math.min(levels.length - 1, low + 1);
                    const level =
                        (levels[low] ?? 0) + ((levels[high] ?? 0) - (levels[low] ?? 0)) * (position - low);
                    height = Math.max(8, Math.min(BAR_MAX, level * BAR_MAX * 1.35));
                } else {
                    const cut = progressRef.current ?? 0;
                    const played = (index / Math.max(1, count - 1)) * 100 <= cut;
                    // موج مسافرتی: میله‌های پخش‌شده بلندتر و ثابت‌اند، بقیه نوسان دارند.
                    const wave =
                        32 +
                        Math.sin(phaseRef.current + index * 0.42) * 13 +
                        Math.cos(phaseRef.current * 0.6 + index * 0.19) * 8;
                    height = played ? 64 : wave;
                }

                bar.style.height = `${height}%`;
            }

            frame = window.requestAnimationFrame(tick);
        };

        frame = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(frame);
    }, [levelsRef, animateWhilePlaying, barCount]);

    const cut = progress ?? 0;

    return (
        <div
            className={cn("flex h-8 items-center gap-[2px] overflow-hidden", className)}
            role="img"
            aria-label={ariaLabel}
        >
            {Array.from({ length: barCount }, (_, index) => {
                const played = progress !== null && (index / Math.max(1, barCount - 1)) * 100 <= cut;
                return (
                    <span
                        key={index}
                        ref={(node) => {
                            barsRef.current[index] = node;
                        }}
                        className={cn(
                            "min-h-[3px] flex-1 rounded-full transition-colors duration-200",
                            played || (progress === null && animateWhilePlaying)
                                ? activeClassName
                                : idleClassName,
                        )}
                        style={{ height: `${IDLE_HEIGHT}%` }}
                    />
                );
            })}
        </div>
    );
}

/**
 * داده‌ی بلندی صدای زنده از میکروفون.
 *
 * `AnalyserNode` به میکروفون وصل می‌شود و مقادیر را درجا در یک آرایه
 * می‌نویسد. آرایه `null` می‌ماند اگر مرورگر Web Audio نداشته باشد یا
 * دسترسی رد شود، تا مصرف‌کننده به حالت انتظار برگردد.
 */
export function useMicLevelFrame(
    stream: MediaStream | null,
    barCount: number = WAVE_BAR_COUNT,
): RefObject<Float32Array | null> {
    const frameRef = useRef<Float32Array | null>(null);

    useEffect(() => {
        if (!stream) {
            frameRef.current = null;
            return;
        }

        const AudioContextCtor =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
            frameRef.current = null;
            return;
        }

        const context = new AudioContextCtor();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;

        const source = context.createMediaStreamSource(stream);
        source.connect(analyser);

        const bins = new Uint8Array(analyser.frequencyBinCount);
        // زیر ۲۰۰ هرتز حذف می‌شود تا لرزش و همهمه‌ی محیط موج را تکان ندهد.
        const startBin = Math.max(1, Math.floor((200 / (context.sampleRate / 2)) * bins.length));
        const usableBins = Math.max(1, bins.length - startBin);
        const frame = new Float32Array(barCount);
        frameRef.current = frame;

        let raf = 0;
        const tick = () => {
            analyser.getByteFrequencyData(bins);
            for (let index = 0; index < barCount; index += 1) {
                const bin = startBin + Math.floor((index / barCount) * usableBins);
                frame[index] = Math.min(1, ((bins[bin] ?? 0) / 255) * 1.9);
            }
            raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);

        return () => {
            window.cancelAnimationFrame(raf);
            source.disconnect();
            void context.close().catch(() => undefined);
            frameRef.current = null;
        };
    }, [stream, barCount]);

    return frameRef;
}
