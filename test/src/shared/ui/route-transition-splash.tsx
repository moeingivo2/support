import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Logo } from "@/shared/api/logo";
import { cn } from "@/shared/lib/utils";
import {
    SPLASH_LEAVE_MS as LEAVE_MS,
    SPLASH_MAX_MS as MAX_SPLASH_MS,
    SPLASH_MIN_MS as MIN_SPLASH_MS,
    waitForSplashReadiness,
} from "@/shared/ui/splash-timing";

export default function RouteTransitionSplash() {
    const location = useLocation();
    const previousLocationKey = useRef(location.key);
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        if (previousLocationKey.current === location.key) {
            return;
        }

        previousLocationKey.current = location.key;
        setIsVisible(true);
        setIsLeaving(false);

        const startedAt = Date.now();
        let leaveTimer: number | undefined;
        let hardStopTimer: number | undefined;
        let cancelled = false;

        const beginLeaving = () => {
            if (cancelled) return;
            setIsLeaving(true);
        };

        // زمان‌سنج اصلی: حداقل نمایش رعایت می‌شود و با آماده‌شدن صفحه زودتر
        // از حداقل فاصله نمی‌گیرد.
        const readinessTimer = window.setTimeout(() => {
            const elapsed = Date.now() - startedAt;
            const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
            leaveTimer = window.setTimeout(beginLeaving, wait);
        }, 0);

        void waitForSplashReadiness().then(() => {
            if (cancelled) return;
            const elapsed = Date.now() - startedAt;
            if (elapsed >= MIN_SPLASH_MS) {
                beginLeaving();
            }
        });

        // بازیابی: حتی اگر آماده‌شدن هرگز resolve نشد، اسپلش بسته می‌شود
        hardStopTimer = window.setTimeout(beginLeaving, MAX_SPLASH_MS);

        const hideTimer = window.setTimeout(
            () => setIsVisible(false),
            MAX_SPLASH_MS + LEAVE_MS,
        );

        return () => {
            cancelled = true;
            window.clearTimeout(readinessTimer);
            window.clearTimeout(hardStopTimer);
            window.clearTimeout(hideTimer);
            if (leaveTimer !== undefined) window.clearTimeout(leaveTimer);
        };
    }, [location.key]);

    if (!isVisible) {
        return null;
    }

    return (
        <div
            className={cn(
                "route-transition-splash",
                isLeaving && "route-transition-splash--leaving",
            )}
            role="status"
            aria-live="polite"
            aria-label="در حال انتقال بین صفحات"
        >
            <div className="route-transition-splash__grid" />
            <div className="route-transition-splash__glow route-transition-splash__glow--blue" />
            <div className="route-transition-splash__glow route-transition-splash__glow--gold" />
            <div className="route-transition-splash__content">
                <Logo size={64} />
                <svg
                    className="route-orbit-loader"
                    viewBox="0 0 64 64"
                    width="76"
                    height="76"
                    fill="none"
                    aria-hidden="true"
                >
                    <circle
                        className="route-orbit-loader__halo"
                        cx="32"
                        cy="32"
                        r="30"
                    />
                    <g className="route-orbit-loader__plane route-orbit-loader__plane--one">
                        <circle
                            className="route-orbit-loader__track"
                            cx="32"
                            cy="32"
                            r="20"
                        />
                        <circle
                            className="route-orbit-loader__bead"
                            cx="52"
                            cy="32"
                            r="2.6"
                        />
                    </g>
                    <g className="route-orbit-loader__plane route-orbit-loader__plane--two">
                        <circle
                            className="route-orbit-loader__track"
                            cx="32"
                            cy="32"
                            r="16"
                        />
                        <circle
                            className="route-orbit-loader__bead"
                            cx="48"
                            cy="32"
                            r="2.6"
                        />
                    </g>
                    <circle
                        className="route-orbit-loader__core"
                        cx="32"
                        cy="32"
                        r="2"
                    />
                </svg>
                <p className="route-transition-splash__title">در حال انتقال</p>
                <p className="route-transition-splash__subtitle">
                    در حال آماده‌سازی صفحه جدید
                </p>
                <span className="route-transition-splash__line" />
            </div>
        </div>
    );
}
