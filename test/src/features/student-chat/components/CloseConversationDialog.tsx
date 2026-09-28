import { useState } from "react";
import { Loader2, TriangleAlert, Wallet } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DialogShell } from "@/shared/ui/dialog-shell";
import { StarRating } from "./StarRating";

/**
 * مرحله‌های بستن گفتگو توسط دانشجو:
 *   1) «مطمئن هستید؟»
 *   2) هشدار قرمز + کسر از سهمیه چت
 *   3) امتیازدهی اجباری (پیش‌فرض ۵ ستاره)
 *
 * تا وقتی کاربر در مرحله‌ی سوم امتیازی ثبت نکند، امکان بستن وجود ندارد.
 */
type Stage = "confirm" | "warning" | "rating";

export type CloseConversationDialogProps = {
    /** فقط وقتی true که امتیاز اجباری است (بستن توسط دانشجو) */
    requireRating?: boolean;
    isSubmitting?: boolean;
    error?: string | null;
    onCancel: () => void;
    onConfirm: (ratingValue: number) => void;
};

export function CloseConversationDialog({
    requireRating = true,
    isSubmitting = false,
    error = null,
    onCancel,
    onConfirm,
}: CloseConversationDialogProps) {
    // پیش‌فرض ۵ ستاره است؛ کاربر می‌تواند آن را کم کند
    const [stage, setStage] = useState<Stage>("confirm");
    const [rating, setRating] = useState(5);
    const [hasRated, setHasRated] = useState(false);

    // فقط جابه‌جایی بین مراحل؛ لغو واقعی با onCancel انجام می‌شود
    const backTo = (target: Stage) => () => setStage(target);

    // ---------------------------------------------------------------- مرحله ۱
    if (stage === "confirm") {
        return (
            <DialogShell
                title="مطمئن هستید؟"
                description="اگر می‌خواهید گفتگوی فعلی را ببندید، در مرحله‌ی بعد جزئیات آن را می‌بینید."
                tone="neutral"
                onClose={onCancel}
            >
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="flex-1"
                    >
                        لغو
                    </Button>
                    <Button
                        type="button"
                        onClick={() => setStage("warning")}
                        disabled={isSubmitting}
                        className="flex-1"
                    >
                        بله، ادامه
                    </Button>
                </div>
            </DialogShell>
        );
    }

    // ---------------------------------------------------------------- مرحله ۲
    if (stage === "warning") {
        return (
            <DialogShell
                title="بستن گفتگو"
                tone="danger"
                onClose={backTo("confirm")}
                icon={
                    <span
                        className="grid size-12 place-items-center rounded-full bg-danger-soft text-err-text"
                        aria-hidden="true"
                    >
                        <TriangleAlert className="size-6" />
                    </span>
                }
                description={
                    <div className="space-y-3 text-right">
                        <p className="font-semibold text-err-text">
                            با بستن این گفتگو، دیگر نمی‌توانید آن را ادامه
                            دهید.
                        </p>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2">
                                <span
                                    className="mt-2 size-1.5 shrink-0 rounded-full bg-err-text"
                                    aria-hidden="true"
                                />
                                <span>
                                    این گفتگو برای همیشه بسته می‌شود و پیام
                                    تازه‌ای در آن پذیرفته نمی‌شود.
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span
                                    className="mt-2 size-1.5 shrink-0 rounded-full bg-err-text"
                                    aria-hidden="true"
                                />
                                <span>
                                    برای ادامه باید{" "}
                                    <strong>گفتگوی جدیدی</strong> آغاز کنید.
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span
                                    className="mt-2 size-1.5 shrink-0 rounded-full bg-err-text"
                                    aria-hidden="true"
                                />
                                <span className="flex items-center gap-1.5">
                                    <Wallet
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        شروع گفتگوی جدید از{" "}
                                        <strong>
                                            سهمیه چت شما کسر می‌شود
                                        </strong>
                                        .
                                    </span>
                                </span>
                            </li>
                        </ul>
                        <p className="pt-1 font-semibold text-ink">
                            آیا مایل هستید چت را ببندید؟
                        </p>
                    </div>
                }
            >
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={backTo("confirm")}
                        disabled={isSubmitting}
                        className="flex-1"
                    >
                        لغو
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        onClick={() => setStage("rating")}
                        disabled={isSubmitting}
                        className="flex-1"
                    >
                        بله، گفتگو را ببندید
                    </Button>
                </div>
            </DialogShell>
        );
    }

    // ---------------------------------------------------------------- مرحله ۳
    return (
        <DialogShell
            title="رضایت شما از پشتیبان"
            description={
                requireRating
                    ? "برای بستن گفتگو، ابتدا امتیاز بدهید. این امتیاز در رتبه‌بندی پشتیبان‌ها ثبت می‌شود."
                    : "امتیاز شما در رتبه‌بندی پشتیبان‌ها ثبت می‌شود."
            }
            tone="neutral"
            onClose={backTo("warning")}
        >
            <StarRating
                value={rating}
                onChange={(next) => {
                    setRating(next);
                    setHasRated(true);
                }}
                disabled={isSubmitting}
            />

            {error ? (
                <p
                    className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-center text-xs font-medium text-err-text"
                    role="alert"
                >
                    {error}
                </p>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={backTo("warning")}
                    disabled={isSubmitting}
                    className="flex-1"
                >
                    بازگشت
                </Button>
                <Button
                    type="button"
                    variant="danger"
                    onClick={() => onConfirm(rating)}
                    // تا وقتی کاربر امتیازی ثبت نکرده، امکان بستن نیست
                    disabled={!hasRated || isSubmitting}
                    className="flex-1"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                    {isSubmitting ? "در حال بستن..." : "ثبت امتیاز و بستن گفتگو"}
                </Button>
            </div>
        </DialogShell>
    );
}
