import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

type AppErrorBoundaryProps = {
    children: ReactNode;
};

type AppErrorBoundaryState = {
    hasError: boolean;
    reference: string | null;
};

/**
 * مرز خطای رندر برنامه.
 *
 * خطای داخلی React نباید صفحه‌ی سفید یا stack trace فنی به کاربر نشان دهد.
 * جزئیات فقط در کنسول توسعه ثبت می‌شوند و رابط یک کد پیگیری تصادفی نشان
 * می‌دهد که کاربر می‌تواند برای پشتیبانی ارسال کند.
 */
export class AppErrorBoundary extends Component<
    AppErrorBoundaryProps,
    AppErrorBoundaryState
> {
    state: AppErrorBoundaryState = {
        hasError: false,
        reference: null,
    };

    static getDerivedStateFromError(): AppErrorBoundaryState {
        return {
            hasError: true,
            reference: `UI-${Date.now().toString(36).toUpperCase()}`,
        };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error("AIO support UI render error", {
            error,
            componentStack: info.componentStack,
            reference: this.state.reference,
        });
    }

    render(): ReactNode {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <main
                dir="rtl"
                className="app-canvas grid min-h-dvh place-items-center px-4 py-8"
            >
                <Card className="w-full max-w-lg space-y-5 p-6 text-center md:p-8">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-soft text-err-text">
                        <AlertTriangle className="size-7" aria-hidden="true" />
                    </span>
                    <div className="space-y-2">
                        <h1 className="text-xl font-bold text-ink">
                            بارگذاری این صفحه با خطا روبه‌رو شد
                        </h1>
                        <p className="text-sm leading-7 text-ink-2">
                            صفحه را دوباره بارگذاری کنید. اگر خطا تکرار شد، کد
                            زیر را برای پشتیبانی بفرستید.
                        </p>
                        <p className="font-mono text-xs text-ink-3">
                            {this.state.reference}
                        </p>
                    </div>
                    <Button onClick={() => window.location.reload()} className="mx-auto">
                        <RefreshCw aria-hidden="true" />
                        بارگذاری مجدد
                    </Button>
                </Card>
            </main>
        );
    }
}
