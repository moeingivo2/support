import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DialogShell } from "@/shared/ui/dialog-shell";

/**
 * بستن گفتگو توسط پشتیبان.
 *
 * طبق سیاست، پشتیبان امتیازی دریافت نمی‌کند؛ فقط یک بار پرسیده می‌شود
 * که آیا می‌خواهد گفتگو را پایان دهد.
 */
export function SupportCloseDialog({
    isSubmitting = false,
    error = null,
    onCancel,
    onConfirm,
}: {
    isSubmitting?: boolean;
    error?: string | null;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <DialogShell
            title="پایان گفتگو"
            tone="warning"
            onClose={onCancel}
            icon={
                <span
                    className="grid size-12 place-items-center rounded-full bg-warn-soft text-alret-gold"
                    aria-hidden="true"
                >
                    <LogOut className="size-6" />
                </span>
            }
            description={
                <p className="font-semibold text-ink">
                    آیا می‌خواهید پایان بدهید چت را؟
                </p>
            }
        >
            {error ? (
                <p
                    className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-center text-xs font-medium text-err-text"
                    role="alert"
                >
                    {error}
                </p>
            ) : null}

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
                    variant="danger"
                    onClick={onConfirm}
                    disabled={isSubmitting}
                    className="flex-1"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                    {isSubmitting ? "در حال بستن..." : "بله، پایان بده"}
                </Button>
            </div>
        </DialogShell>
    );
}
