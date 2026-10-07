import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Loader2, Save, Sparkles, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { updateSupport, type SupportListItem } from "../services/admin-service";
import {
    updateSupportSchema,
    type UpdateSupportFormInput,
    type UpdateSupportFormValues,
} from "../schemas/createSupportSchema";
import { HttpApiError } from "@/shared/api/http";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { StatusPill } from "@/shared/ui/status-pill";

type EditSupportDialogProps = {
    support: SupportListItem | null;
    onClose: () => void;
    onSaved: (message: string) => void;
};

export function EditSupportDialog({
    onClose,
    onSaved,
    support,
}: EditSupportDialogProps) {
    const [serverError, setServerError] = useState<string | null>(null);
    const {
        formState: { errors, isSubmitting },
        handleSubmit,
        register,
        reset,
    } = useForm<UpdateSupportFormInput, unknown, UpdateSupportFormValues>({
        defaultValues: {
            name: support?.name ?? "",
            phone: support?.phone ?? "",
            password: "",
        },
        resolver: zodResolver(updateSupportSchema),
    });

    useEffect(() => {
        if (!support) return;
        reset({
            name: support.name,
            phone: support.phone ?? "",
            password: "",
        });
        setServerError(null);
    }, [reset, support]);

    if (!support) return null;

    async function onSubmit(values: UpdateSupportFormValues): Promise<void> {
        if (!support) return;
        setServerError(null);
        try {
            const response = await updateSupport(support.id, {
                name: values.name,
                phone: values.phone,
                ...(values.password ? { password: values.password } : {}),
            });
            onSaved(response.message);
            onClose();
        } catch (error) {
            if (error instanceof HttpApiError) {
                const firstFieldMessage = error.fieldErrors
                    ? Object.values(error.fieldErrors).flat()[0]
                    : undefined;
                setServerError(firstFieldMessage ?? error.message);
            } else {
                setServerError(
                    error instanceof Error
                        ? error.message
                        : "ویرایش پشتیبان ناموفق بود.",
                );
            }
        }
    }

    return (
        <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
                <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 space-y-6 overflow-y-auto rounded-4xl border border-hairline dialog-surface p-6 md:p-7">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogPrimitive.Title className="text-xl font-bold text-ink">
                                ویرایش پشتیبان
                            </DialogPrimitive.Title>
                            <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-ink-2">
                                نام، شماره موبایل و رمز عبور را ویرایش کنید. نوع
                                پشتیبانی ثابت می‌ماند.
                            </DialogPrimitive.Description>
                        </div>
                        <DialogPrimitive.Close asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="بستن"
                            >
                                <X />
                            </Button>
                        </DialogPrimitive.Close>
                    </div>

                    <div className="flex items-center justify-between rounded-3xl border border-hairline bg-surface-2 p-4">
                        <div>
                            <p className="text-xs text-ink-2">نوع پشتیبانی</p>
                            <p className="mt-1 text-sm font-bold text-ink">
                                {support.name}
                            </p>
                        </div>
                        <StatusPill
                            tone={
                                support.support_type === "ai"
                                    ? "warning"
                                    : "info"
                            }
                        >
                            {support.support_type === "ai" ? (
                                <Sparkles className="size-3" />
                            ) : (
                                <Globe className="size-3" />
                            )}
                            {support.support_type === "ai"
                                ? "هوش مصنوعی"
                                : "وب"}
                        </StatusPill>
                    </div>

                    <form
                        className="space-y-5"
                        onSubmit={handleSubmit(onSubmit)}
                        noValidate
                    >
                        {serverError ? (
                            <Alert tone="danger">{serverError}</Alert>
                        ) : null}

                        <div className="space-y-2">
                            <Label htmlFor="edit-support-name">
                                نام و نام خانوادگی
                            </Label>
                            <Input
                                id="edit-support-name"
                                required
                                defaultValue={support.name}
                                {...register("name")}
                                aria-invalid={Boolean(errors.name)}
                            />
                            {errors.name ? (
                                <p className="text-xs text-err-text">
                                    {errors.name.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-support-phone">
                                شماره موبایل
                            </Label>
                            <Input
                                id="edit-support-phone"
                                type="tel"
                                dir="ltr"
                                required
                                defaultValue={support.phone ?? ""}
                                {...register("phone")}
                                aria-invalid={Boolean(errors.phone)}
                            />
                            {errors.phone ? (
                                <p className="text-xs text-err-text">
                                    {errors.phone.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-support-password">
                                رمز عبور جدید
                            </Label>
                            <Input
                                id="edit-support-password"
                                type="password"
                                dir="ltr"
                                autoComplete="new-password"
                                placeholder="برای حفظ رمز فعلی خالی بگذارید"
                                {...register("password")}
                                aria-invalid={Boolean(errors.password)}
                            />
                            {errors.password ? (
                                <p className="text-xs text-err-text">
                                    {errors.password.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                انصراف
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Save />
                                )}
                                {isSubmitting
                                    ? "در حال ذخیره..."
                                    : "ذخیره تغییرات"}
                            </Button>
                        </div>
                    </form>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
