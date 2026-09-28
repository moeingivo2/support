import { useEffect, useRef, useState } from "react";
import {
    SPLASH_LEAVE_MS,
    SPLASH_MAX_MS,
    SPLASH_MIN_MS,
    waitForSplashReadiness,
} from "@/shared/ui/splash-timing";

type LoginSplashProps = {
    onComplete: () => void;
};

/**
 * اسپلش ورود — دقیقاً همان زمان‌بندی و قواعد اسپلش انتقال بین صفحات:
 * حداقل نمایش، انتظار برای آماده‌شدن واقعی، و سقف سخت برای بازیابی.
 */
export default function LoginSplash({ onComplete }: LoginSplashProps) {
    const [progress, setProgress] = useState(0);
    const [leaving, setLeaving] = useState(false);
    const completed = useRef(false);
    const timers = useRef<number[]>([]);

    const complete = () => {
        if (completed.current) return;
        completed.current = true;
        setProgress(100);
        setLeaving(true);
        timers.current.push(
            window.setTimeout(onComplete, SPLASH_LEAVE_MS + 240),
        );
    };

    useEffect(() => {
        const startedAt = performance.now();
        const duration = SPLASH_MAX_MS;
        let frame = 0;
        let cancelled = false;

        const updateProgress = (now: number) => {
            if (cancelled) return;

            const ratio = Math.min((now - startedAt) / duration, 1);
            setProgress(Math.round((1 - Math.pow(1 - ratio, 3)) * 96));

            if (ratio < 1) {
                frame = requestAnimationFrame(updateProgress);
                return;
            }

            // آماده‌شدن واقعی صفحه، زودتر از پایان نوار پیشرفت کافی است،
            // ولی هرگز زودتر از حداقل نمایش بسته نمی‌شود.
            void waitForSplashReadiness().then(() => {
                if (cancelled) return;
                const elapsed = performance.now() - startedAt;
                if (elapsed >= SPLASH_MIN_MS) complete();
            });
        };

        frame = requestAnimationFrame(updateProgress);

        // بازیابی: حتی اگر آماده‌شدن هرگز resolve نشد، باز هم بسته می‌شود
        timers.current.push(
            window.setTimeout(() => {
                if (!cancelled) complete();
            }, SPLASH_MAX_MS),
        );

        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            timers.current.forEach((timer) => window.clearTimeout(timer));
            timers.current = [];
        };
    }, []);

    return (
        <section
            className={`login-splash${leaving ? " is-leaving" : ""}`}
            aria-label="در حال ورود به پنل"
            aria-live="polite"
        >
            <div className="login-splash__glow login-splash__glow--one" />
            <div className="login-splash__glow login-splash__glow--two" />
            <div className="login-splash__grid" />

            <div className="login-splash__content">
                <p className="login-splash__eyebrow">WELCOME BACK</p>
                <button
                    className="login-splash__mark"
                    type="button"
                    onClick={complete}
                    aria-label="ورود فوری به پنل"
                >
                    <span className="login-splash__orbit" />
                    <span className="login-splash__orbit login-splash__orbit--inner" />
                    <span className="login-splash__logo-wrap">
                        <img
                            src="/logo.png"
                            alt="AIO"
                            className="login-splash__logo"
                        />
                    </span>
                </button>
                <h1 className="login-splash__brand">
                    A<span>I</span>O
                </h1>
                <p className="login-splash__message">فضای کاری شما آماده است</p>
                <div className="login-splash__loader" aria-hidden="true">
                    <span className="login-splash__track">
                        <span
                            className="login-splash__fill"
                            style={{ width: `${progress}%` }}
                        />
                    </span>
                    <span className="login-splash__meta">
                        <span>LOADING</span>
                        <span>{String(progress).padStart(2, "0")}%</span>
                    </span>
                </div>
                <p className="login-splash__hint">
                    برای ورود فوری، روی لوگو کلیک کنید
                </p>
            </div>
        </section>
    );
}
