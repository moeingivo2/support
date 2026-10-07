import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DialogShell } from "@/shared/ui/dialog-shell";
import { StarRating } from "@/features/student-chat/components/StarRating";

/**
 * امتیازدهی پس از آنکه پشتیبان گفتگو را بست.
 *
 * دانشجو خودش داوطلبانه این صفحه را باز می‌کند (با کلیک روی دعوت امتیازدهی
 * داخل گفتگوی بسته)، ولی همان منطق مرحله‌ی سوم بستن اعمال می‌شود:
 * پیش‌فرض ۵ ستاره، قابل کم کردن، و نیازمند تأیید صریح.
 */
export function RateConversationDialog({
    isSubmitting = false,
    error = null,
    onCancel,
    onConfirm,
}: {
    isSubmitting?: boolean;
    error?: string | null;
    onCancel: () => void;
    onConfirm: (ratingValue: number) => void;
}) {
    const [rating, setRating] = useState(5);
    const [hasRated, setHasRated] = useState(false);

    return (
        <DialogShell
            title="امتیازدهی به پشتیبان"
            description="اگر از پاسخ‌گویی راضی بودید، لطفاً امتیاز بدهید. این امتیاز در رتبه‌بندی پشتیبان‌ها ثبت می‌شود."
            tone="neutral"
            onClose={onCancel}
            icon={
                <span
                    className="grid size-12 place-items-center rounded-full bg-warn-soft text-alret-gold"
                    aria-hidden="true"
                >
                    <Star className="size-6" />
                </span>
            }
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
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="flex-1"
                >
                    انصراف
                </Button>
                <Button
                    type="button"
                    onClick={() => onConfirm(rating)}
                    disabled={!hasRated || isSubmitting}
                    className="flex-1"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                    {isSubmitting ? "در حال ثبت..." : "ثبت امتیاز"}
                </Button>
            </div>
        </DialogShell>
    );
}
