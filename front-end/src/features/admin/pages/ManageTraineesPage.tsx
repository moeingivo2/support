import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Loader2, Send, Trash2, UserPlus } from "lucide-react";
import {
    adminKeys,
    createTrainee,
    deleteTrainee,
    getTrainees,
    type TraineeListItem,
} from "../services/admin-service";
import {
    createTraineeSchema,
    type CreateTraineeFormInput,
    type CreateTraineeFormValues,
} from "../schemas/createTraineeSchema";
import { HttpApiError } from "@/shared/api/http";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { useToast } from "@/shared/ui/toast";

export default function ManageTraineesPage() {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<TraineeListItem | null>(
        null,
    );
    const [isDeleting, setIsDeleting] = useState(false);
    const queryClient = useQueryClient();
    const toast = useToast();
    const traineesQuery = useQuery({
        queryKey: adminKeys.trainees,
        queryFn: getTrainees,
    });

    const {
        formState: { errors, isSubmitting },
        handleSubmit,
        register,
        setError,
        reset,
    } = useForm<CreateTraineeFormInput, unknown, CreateTraineeFormValues>({
        defaultValues: {
            name: "",
            phone: "",
            password: "",
        },
        mode: "onSubmit",
        resolver: zodResolver(createTraineeSchema),
    });

    const onSubmit = async (values: CreateTraineeFormValues) => {
        setServerError(null);
        setSuccessMessage(null);
        try {
            const response = await createTrainee(values);
            setSuccessMessage(`${response.message} — ${values.name}`);
            toast.success(`${values.name} ثبت شد.`);
            reset();
            await queryClient.invalidateQueries({
                queryKey: adminKeys.trainees,
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
                        : "ثبت کارآموز ناموفق بود.",
                );
            }
        }
    };

    async function handleDeleteTrainee(): Promise<void> {
        if (!deleteTarget) return;
        setIsDeleting(true);
        setServerError(null);
        try {
            const response = await deleteTrainee(deleteTarget.id);
            toast.success(response.message);
            setDeleteTarget(null);
            await queryClient.invalidateQueries({
                queryKey: adminKeys.trainees,
            });
        } catch (error) {
            setDeleteTarget(null);
            setServerError(
                error instanceof Error
                    ? error.message
                    : "حذف کارآموز ناموفق بود.",
            );
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <Card className="p-6 md:p-7">
                <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">
                    ثبت کارآموز جدید
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-ink-2">
                    کارآموز یک حساب فقط‌خواندنی است؛ فقط متن گفتگوهای دانشجویان
                    را برای یادگیری می‌بیند و نمی‌تواند پاسخ دهد، گفتگو ببندد یا
                    به بقیه‌ی پنل دسترسی داشته باشد.
                </p>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="p-6 md:p-7">
                    <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                            <UserPlus className="size-5" />
                        </span>
                        <h2 className="text-xl font-bold text-ink">
                            ایجاد حساب کارآموز
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
                                placeholder="مثلاً علی رضایی"
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
                            {isSubmitting ? "در حال ثبت..." : "ثبت کارآموز"}
                        </Button>
                    </form>
                </Card>

                <Card className="p-6 md:p-7">
                    <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                            <GraduationCap className="size-5" />
                        </span>
                        <h2 className="text-xl font-bold text-ink">
                            کارآموزهای فعلی
                        </h2>
                    </div>
                    <p className="mt-2 text-sm text-ink-2">
                        فهرست حساب‌های کارآموزی که ساخته‌اید.
                    </p>

                    <div className="mt-5 space-y-3">
                        {traineesQuery.isPending ? (
                            Array.from({ length: 3 }, (_, index) => (
                                <Skeleton
                                    key={index}
                                    className="h-16 w-full rounded-3xl"
                                />
                            ))
                        ) : traineesQuery.isError ? (
                            <Alert tone="danger">
                                دریافت فهرست کارآموزها ناموفق بود.
                            </Alert>
                        ) : (traineesQuery.data?.data ?? []).length === 0 ? (
                            <p className="py-8 text-center text-sm text-ink-2">
                                هنوز کارآموزی ثبت نشده است.
                            </p>
                        ) : (
                            (traineesQuery.data?.data ?? []).map((trainee) => (
                                <div
                                    key={trainee.id}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-hairline bg-surface-2 p-4"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-ink">
                                            {trainee.name}
                                        </p>
                                        <p
                                            dir="ltr"
                                            className="mt-1 text-right text-xs text-ink-2"
                                        >
                                            {trainee.phone}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="danger"
                                        onClick={() =>
                                            setDeleteTarget(trainee)
                                        }
                                    >
                                        <Trash2 />
                                        حذف
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            <ConfirmDialog
                open={deleteTarget !== null}
                title="حذف کارآموز"
                description={
                    deleteTarget
                        ? `آیا از حذف کارآموز «${deleteTarget.name}» مطمئن هستید؟`
                        : ""
                }
                confirmLabel="حذف کارآموز"
                isPending={isDeleting}
                onConfirm={() => void handleDeleteTrainee()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}

function isFormField(
    field: string,
): field is "name" | "phone" | "password" {
    return ["name", "phone", "password"].includes(field);
}
