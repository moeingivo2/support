import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type ToastTone = "success" | "error" | "info" | "warning";

/** جای نمایش؛ پیش‌فرض پایین صفحه است تا رفتار بقیه‌ی توست‌ها عوض نشود. */
type ToastPosition = "bottom" | "top";

type ToastData = {
    id: number;
    tone: ToastTone;
    message: string;
    position: ToastPosition;
};

type ToastOptions = {
    position?: ToastPosition;
};

type ToastContextValue = {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string, options?: ToastOptions) => void;
    warning: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const POSITION_CLASSES: Record<ToastPosition, string> = {
    bottom: "bottom-4",
    top: "top-4",
};

const TONE_STYLES: Record<ToastTone, { container: string; icon: ReactNode }> = {
    success: {
        container: "border-success-line bg-succ-btn",
        icon: <CheckCircle2 className="size-5 text-succ-txt" />,
    },
    error: {
        container: "border-danger-line bg-danger-soft",
        icon: <XCircle className="size-5 text-err-text" />,
    },
    info: {
        container: "border-primary-line bg-primary-soft",
        icon: <Info className="size-5 text-accent-ink" />,
    },
    warning: {
        container: "border-warn-line bg-warn-soft",
        icon: <TriangleAlert className="size-5 text-alret-gold" />,
    },
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const nextId = useRef(1);

    const dismiss = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const push = useCallback(
        (tone: ToastTone, message: string, position: ToastPosition) => {
            const id = nextId.current++;
            setToasts((current) => [
                ...current.slice(-3),
                { id, tone, message, position },
            ]);
            window.setTimeout(() => dismiss(id), 4000);
        },
        [dismiss],
    );

    const value = useMemo<ToastContextValue>(
        () => ({
            success: (message) => push("success", message, "bottom"),
            error: (message) => push("error", message, "bottom"),
            warning: (message) => push("warning", message, "bottom"),
            info: (message, options) =>
                push("info", message, options?.position ?? "bottom"),
        }),
        [push],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            {(["top", "bottom"] as const).map((position) => {
                const visible = toasts.filter(
                    (toast) => toast.position === position,
                );

                if (visible.length === 0) {
                    return null;
                }

                return (
                    <div
                        key={position}
                        role="status"
                        aria-live="polite"
                        className={cn(
                            "pointer-events-none fixed left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col items-stretch gap-2 px-4",
                            POSITION_CLASSES[position],
                        )}
                    >
                        {visible.map((toast) => {
                            const style = TONE_STYLES[toast.tone];

                            return (
                                <div
                                    key={toast.id}
                                    className={cn(
                                        "pointer-events-auto flex animate-[toast-in_180ms_var(--motion-ease)] items-center gap-3 rounded-3xl border px-4 py-3 text-sm font-semibold text-ink shadow-[var(--c-shadow-soft),0_0_0_1px_var(--c-hairline)] backdrop-blur-xl",
                                        style.container,
                                    )}
                                >
                                    <span className="grid size-8 shrink-0 place-items-center rounded-2xl bg-surface-3">
                                        {style.icon}
                                    </span>
                                    <p className="leading-6 text-ink">
                                        {toast.message}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return context;
}
