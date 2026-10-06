import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CheckCircle2,
    Globe,
    Loader2,
    Pencil,
    Send,
    Sparkles,
    Trash2,
    UserPlus,
} from "lucide-react";
import {
    adminKeys,
    createSupport,
    deleteSupport,
    getSupports,
    assignSupportObserver,
    getObservers,
    setAccountObserver,
    revokeAccountObserver,
    type SupportListItem,
} from "../services/admin-service";
import {
    createSupportSchema,
    type CreateSupportFormInput,
    type CreateSupportFormValues,
} from "../schemas/createSupportSchema";
import { HttpApiError } from "@/shared/api/http";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EditSupportDialog } from "../components/EditSupportDialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatusPill } from "@/shared/ui/status-pill";
import { useToast } from "@/shared/ui/toast";
import { cn } from "@/shared/lib/utils";

export default function RegisterSupportPage() {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);
    const [editingSupport, setEditingSupport] =
        useState<SupportListItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SupportListItem | null>(
        null,
    );
    const [isDeleting, setIsDeleting] = useState(false);
    const queryClient = useQueryClient();
    const toast = useToast();
    const supportsQuery = useQuery({
        queryKey: adminKeys.supports,
        queryFn: getSupports,
    });
    const observersQuery = useQuery({
        queryKey: ["admin", "supports", "account-observers"],
        queryFn: async () => {
            const [web, ai] = await Promise.all([getObservers("web"), getObservers("ai")]);
            return { data: [...web.data, ...ai.data] };
        },
    });
    const accountObservers = (observersQuery.data?.data ?? []).filter((item) => item.role === "account_observer");

    const {
        formState: { errors, isSubmitting },
        handleSubmit,
        register,
        setError,
        reset,
        watch,
    } = useForm<CreateSupportFormInput, unknown, CreateSupportFormValues>({
        defaultValues: {
            name: "",
            phone: "",
            password: "",
            support_type: "web",
        },
        mode: "onSubmit",
        resolver: zodResolver(createSupportSchema),
    });

    const selectedType = watch("support_type");

    const onSubmit = async (values: CreateSupportFormValues) => {
        setServerError(null);
        setSuccessMessage(null);
        try {
            const response = await createSupport(values);
            setSuccessMessage(`${response.message} — ${values.name}`);
            toast.success(`${values.name} ثبت شد.`);
            reset();
            await queryClient.invalidateQueries({
                queryKey: adminKeys.supports,
            });
        } catch (error) {
            if (error instanceof HttpApiError && error.fieldErrors) {
                const fieldMessages = Object.values(error.fieldErrors).flat();
                setServerError(fieldMessages[0] ?? error.message);
                for (const [field, messages] of Object.entries(
                    error.fieldErrors,
                )) {
                    if (isFormField(field)) {
                        setError(field, {
                            type: "server",
                            message: messages[0],
                        });
                    }
                }
            } else {
                setServerError(
                    error instanceof Error
                        ? error.message
                        : "ثبت پشتیبان ناموفق بود.",
                );
            }
        }
    };

    async function handleDeleteSupport(): Promise<void> {
        if (!deleteTarget) return;
        setIsDeleting(true);
        setServerError(null);
        try {
            const response = await deleteSupport(deleteTarget.id);
            toast.success(response.message);
            setDeleteTarget(null);
            await queryClient.invalidateQueries({
                queryKey: adminKeys.supports,
            });
        } catch (error) {
            setDeleteTarget(null);
            setServerError(
                error instanceof Error
                    ? error.message
                    : "حذف پشتیبان ناموفق بود.",
            );
        } finally {
            setIsDeleting(false);
        }
    }

    async function handleObserverAssignment(support: SupportListItem, observerId: number | null): Promise<void> {
        try {
            const response = await assignSupportObserver(support.id, observerId);
            toast.success(response.message);
            await queryClient.invalidateQueries({ queryKey: adminKeys.supports });
        } catch (error) {
            setServerError(error instanceof Error ? error.message : "تغییر انتساب ناظر ناموفق بود.");
        }
    }

    async function handleObserverRole(support: SupportListItem): Promise<void> {
        try {
            const response = support.role === "account_observer"
                ? await revokeAccountObserver(support.id)
                : await setAccountObserver(support.id);
            toast.success(response.message);
            await queryClient.invalidateQueries({ queryKey: adminKeys.supports });
            await queryClient.invalidateQueries({ queryKey: ["admin", "supports", "account-observers"] });
        } catch (error) {
            setServerError(error instanceof Error ? error.message : "تغییر نقش ناظر انجام نشد.");
        }
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <Card className="p-6 md:p-7">
                <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">
                    ثبت پشتیبان جدید
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-ink-2">
                    حساب پشتیبان جدید بسازید و نوع پشتیبانی (وب یا هوش مصنوعی)
                    او را تعیین کنید. این نوع برای همیشه روی پشتیبان می‌ماند و
                    کانال شیفت‌های او را مشخص می‌کند.
                </p>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="p-6 md:p-7">
                    <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                            <UserPlus className="size-5" />
                        </span>
                        <h2 className="text-xl font-bold text-ink">
                            ایجاد حساب پشتیبان
                        </h2>
                    </div>

                    <form
                        className="mt-6 space-y-5"
                        onSubmit={handleSubmit(onSubmit)}
                        noValidate
                    >
                        {serverError ? (
                            <Alert tone="danger">{serverError}</Alert>
                        ) : null}
                        {successMessage ? (
                            <Alert tone="success">{successMessage}</Alert>
                        ) : null}

                        <div className="space-y-2">
                            <Label htmlFor="name">نام و نام خانوادگی</Label>
                            <Input
                                id="name"
                                autoComplete="off"
                                placeholder="مثلاً سارا محمدی"
                                aria-invalid={Boolean(errors.name)}
                                {...register("name")}
                            />
                            {errors.name ? (
                                <p className="text-xs font-medium text-err-text">
                                    {errors.name.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">شماره موبایل</Label>
                            <Input
                                id="phone"
                                dir="ltr"
                                inputMode="tel"
                                placeholder="09123456789"
                                aria-invalid={Boolean(errors.phone)}
                                {...register("phone")}
                            />
                            {errors.phone ? (
                                <p className="text-xs font-medium text-err-text">
                                    {errors.phone.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">رمز عبور</Label>
                            <Input
                                id="password"
                                type="password"
                                dir="ltr"
                                autoComplete="new-password"
                                placeholder="حداقل ۸ کاراکتر"
                                aria-invalid={Boolean(errors.password)}
                                {...register("password")}
                            />
                            {errors.password ? (
                                <p className="text-xs font-medium text-err-text">
                                    {errors.password.message}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label>نوع پشتیبانی</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <TypeOption
                                    active={selectedType === "web"}
                                    icon={<Globe className="size-5" />}
                                    label="پشتیبان وب"
                                    hint="پاسخگویی چت وب"
                                    inputProps={register("support_type")}
                                    value="web"
                                />
                                <TypeOption
                                    active={selectedType === "ai"}
                                    icon={<Sparkles className="size-5" />}
                                    label="پشتیبان هوش مصنوعی"
                                    hint="پاسخگویی دستیار AI"
                                    inputProps={register("support_type")}
                                    value="ai"
                                />
                            </div>
                            {errors.support_type ? (
                                <p className="text-xs font-medium text-err-text">
                                    {errors.support_type.message}
                                </p>
                            ) : null}
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto"
                        >
                            {isSubmitting ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <Send />
                            )}
                            {isSubmitting ? "در حال ثبت..." : "ثبت پشتیبان"}
                        </Button>
                    </form>
                </Card>

                <Card className="p-6 md:p-7">
                    <h2 className="text-xl font-bold text-ink">
                        پشتیبان‌های فعلی
                    </h2>
                    <p className="mt-2 text-sm text-ink-2">
                        فهرست پشتیبان‌های ثبت‌شده تیم
                    </p>

                    <div className="mt-5 space-y-3">
                        {supportsQuery.isPending ? (
                            Array.from({ length: 3 }, (_, index) => (
                                <Skeleton
                                    key={index}
                                    className="h-16 w-full rounded-3xl"
                                />
                            ))
                        ) : supportsQuery.isError ? (
                            <Alert tone="danger">
                                دریافت فهرست پشتیبان‌ها ناموفق بود.
                            </Alert>
                        ) : (supportsQuery.data?.data ?? []).filter((item) => item.role === "support").length === 0 ? (
                            <p className="py-8 text-center text-sm text-ink-2">
                                هنوز پشتیبانی ثبت نشده است.
                            </p>
                        ) : (
                            (supportsQuery.data?.data ?? []).filter((item) => item.role === "support").map((support) => (
                                <div
                                    key={support.id}
                                    className="space-y-4 rounded-3xl border border-hairline bg-surface-2 p-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-ink">
                                                {support.name}
                                            </p>
                                            <p
                                                dir="ltr"
                                                className="mt-1 text-right text-xs text-ink-2"
                                            >
                                                {support.phone}
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
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            onClick={() =>
                                                setEditingSupport(support)
                                            }
                                        >
                                            <Pencil />
                                            ویرایش
                                        </Button>
                                        <Button
                                            variant="danger"
                                            onClick={() =>
                                                setDeleteTarget(support)
                                            }
                                        >
                                            <Trash2 />
                                            حذف
                                        </Button>
                                    </div>
                                    {support.role !== "account_observer" ? (
                                        <div className="flex justify-end">
                                            <Button type="button" variant="ghost" onClick={() => void handleObserverRole(support)}>
                                                تبدیل به ناظر اکانت {support.support_type === "ai" ? "هوش مصنوعی" : "وب"}
                                            </Button>
                                        </div>
                                    ) : null}
                                    {support.role === "support" ? <div className="space-y-2 border-t border-hairline pt-3">
                                        <Label htmlFor={`observer-assignment-${support.id}`}>انتساب این پشتیبان به ناظر {support.support_type === "ai" ? "هوش مصنوعی" : "وب"}</Label>
                                        <select id={`observer-assignment-${support.id}`} value={support.observer_id ?? ""} onChange={(event) => void handleObserverAssignment(support, event.target.value ? Number(event.target.value) : null)} className="h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-sm text-ink">
                                            <option value="">انتساب به ناظر</option>
                                            {accountObservers.filter((observer) => observer.support_type === support.support_type && observer.id !== support.id).map((observer) => <option key={observer.id} value={observer.id}>{observer.name}</option>)}
                                        </select>
                                    </div> : null}
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            <EditSupportDialog
                support={editingSupport}
                onClose={() => setEditingSupport(null)}
                onSaved={(message) => {
                    setSuccessMessage(message);
                    toast.success(message);
                    void queryClient.invalidateQueries({
                        queryKey: adminKeys.supports,
                    });
                }}
            />
            <ConfirmDialog
                open={deleteTarget !== null}
                title="حذف پشتیبان"
                description={
                    deleteTarget
                        ? `آیا از حذف پشتیبان «${deleteTarget.name}» مطمئن هستید؟ سوابق شیفت و گزارش‌های او نیز حذف می‌شود.`
                        : ""
                }
                confirmLabel="حذف پشتیبان"
                isPending={isDeleting}
                onConfirm={() => void handleDeleteSupport()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}

type TypeOptionProps = {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    hint: string;
    value: string;
    inputProps: UseFormRegisterReturn;
};

function TypeOption({
    active,
    hint,
    icon,
    inputProps,
    label,
    value,
}: TypeOptionProps) {
    return (
        <label
            className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-3xl border p-4 transition",
                active
                    ? "border-primary-line-2 bg-primary-soft ring-2 ring-primary-ring"
                    : "border-hairline bg-surface-2 hover:bg-surface-3",
            )}
        >
            <input
                type="radio"
                value={value}
                className="sr-only"
                {...inputProps}
            />
            <span
                className={cn(
                    "flex items-center gap-2",
                    active ? "text-accent-ink" : "text-ink",
                )}
            >
                {icon}
                {active ? <CheckCircle2 className="size-4" /> : null}
            </span>
            <span
                className={cn(
                    "text-sm font-bold",
                    active ? "text-ink" : "text-ink",
                )}
            >
                {label}
            </span>
            <span className="text-xs text-ink-2">{hint}</span>
        </label>
    );
}

function isFormField(
    field: string,
): field is "name" | "phone" | "password" | "support_type" {
    return ["name", "phone", "password", "support_type"].includes(field);
}
