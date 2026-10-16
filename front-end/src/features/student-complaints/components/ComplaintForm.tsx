import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Headset, MessageSquareWarning, Sparkles } from "lucide-react";
import { useCreateComplaint } from "../hooks/useComplaints";
import {
    complaintSchema,
    type ComplaintFormValues,
} from "../schemas/complaintSchema";
import { TYPE_OPTIONS } from "../services/complaint-service";
import type { ComplaintType } from "../types/complaint";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";

const TYPE_ICONS: Record<ComplaintType, typeof Headset> = {
    support: Headset,
    mentor: MessageSquareWarning,
    course: Sparkles,
};

type Props = {
    /** اگر دانشجو از داخل یک گفتگو آمده، برای ردیابی پشتیبان. */
    conversationId?: number | null;
    onDone?: () => void;
};

/**
 * فرم ثبت نارضایتی توسط دانشجو.
 *
 * دانشجو اول نوع را انتخاب می‌کند و بسته به نوع، فیلدهای مخصوص همان
 * نوع نمایش داده می‌شود؛ بقیه اصلاً رندر نمی‌شوند تا انتخاب‌های
 * بی‌ربط در فرم جمع نشوند.
 */
export function ComplaintForm({ conversationId, onDone }: Props) {
    const [type, setType] = useState<ComplaintType>("support");
    const [submitted, setSubmitted] = useState(false);

    const createComplaint = useCreateComplaint();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ComplaintFormValues>({
        resolver: zodResolver(complaintSchema),
        defaultValues: {
            type: "support",
            description: "",
            mentor_first_name: "",
            mentor_last_name: "",
            course_name: "",
        },
        mode: "onBlur",
    });

    function onSubmit(values: ComplaintFormValues) {
        createComplaint.mutate(
            {
                type: values.type,
                description: values.description.trim(),
                // فقط فیلدهای نوعِ انتخاب‌شده فرستاده می‌شوند.
                mentor_first_name:
                    values.type === "mentor"
                        ? values.mentor_first_name
                        : undefined,
                mentor_last_name:
                    values.type === "mentor"
                        ? values.mentor_last_name
                        : undefined,
                course_name:
                    values.type === "course" ? values.course_name : undefined,
                conversation_id: conversationId ?? undefined,
            },
            {
                onSuccess: () => {
                    setSubmitted(true);
                    reset();
                },
                onError: () => setSubmitted(false),
            },
        );
    }

    if (submitted) {
        return (
            <Card className="p-6 text-center md:p-8">
                <h2 className="text-lg font-semibold text-ink">
                    نارضایتی شما ثبت شد
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-2">
                    کارشناسان پیگیری می‌کنند و نتیجه از همین صفحه اعلام
                    می‌شود.
                </p>
                <div className="mt-5 flex justify-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSubmitted(false)}
                    >
                        ثبت نارضایتی دیگر
                    </Button>
                    {onDone ? (
                        <Button type="button" onClick={onDone}>
                            بازگشت
                        </Button>
                    ) : null}
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6 md:p-7">
            <h2 className="text-xl font-bold text-ink">ثبت نارضایتی</h2>
            <p className="mt-2 text-sm leading-6 text-ink-2">
                موضوع نارضایتی را انتخاب کنید و توضیح دهید.
            </p>

            <form className="mt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <fieldset className="space-y-3">
                    <legend className="mb-2 text-sm font-medium text-ink">
                        نوع نارضایتی
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {TYPE_OPTIONS.map((option) => {
                            const Icon = TYPE_ICONS[option.value];
                            const selected = type === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setType(option.value)}
                                    aria-pressed={selected}
                                    className={cn(
                                        "flex flex-col items-start gap-2 rounded-xl border p-4 text-right transition",
                                        selected
                                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                                            : "border-hairline hover:border-primary/40",
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "size-5",
                                            selected
                                                ? "text-primary"
                                                : "text-ink-2",
                                        )}
                                    />
                                    <span className="text-sm font-semibold text-ink">
                                        {option.label}
                                    </span>
                                    <span className="text-xs leading-5 text-ink-2">
                                        {option.hint}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </fieldset>

                {/* نوع «منتور» — نام و نام خانوادگی */}
                {type === "mentor" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="mentor_first_name">
                                نام منتور
                            </Label>
                            <Input
                                id="mentor_first_name"
                                placeholder="مثلاً رضا"
                                aria-invalid={Boolean(
                                    errors.mentor_first_name,
                                )}
                                {...register("mentor_first_name")}
                            />
                            {errors.mentor_first_name ? (
                                <p className="text-xs text-danger">
                                    {errors.mentor_first_name.message}
                                </p>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mentor_last_name">
                                نام خانوادگی منتور
                            </Label>
                            <Input
                                id="mentor_last_name"
                                placeholder="مثلاً محمدی"
                                aria-invalid={Boolean(
                                    errors.mentor_last_name,
                                )}
                                {...register("mentor_last_name")}
                            />
                            {errors.mentor_last_name ? (
                                <p className="text-xs text-danger">
                                    {errors.mentor_last_name.message}
                                </p>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                {/* نوع «دوره» — نام دوره */}
                {type === "course" ? (
                    <div className="space-y-2">
                        <Label htmlFor="course_name">نام دوره</Label>
                        <Input
                            id="course_name"
                            placeholder="مثلاً دوره برنامه‌نویسی پایتون"
                            aria-invalid={Boolean(errors.course_name)}
                            {...register("course_name")}
                        />
                        {errors.course_name ? (
                            <p className="text-xs text-danger">
                                {errors.course_name.message}
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {/* مشترک همه‌ی نوع‌ها */}
                <div className="space-y-2">
                    <Label htmlFor="description">توضیحات</Label>
                    <Textarea
                        id="description"
                        rows={7}
                        minLength={10}
                        maxLength={5000}
                        required
                        placeholder="درباره موضوع نارضایتی توضیح دهید…"
                        aria-invalid={Boolean(errors.description)}
                        {...register("description")}
                    />
                    {errors.description ? (
                        <p className="text-xs text-danger">
                            {errors.description.message}
                        </p>
                    ) : (
                        <p className="text-xs text-ink-2">
                            حداقل ۱۰ حرف بنویسید تا درخواست شما قابل پیگیری
                            باشد.
                        </p>
                    )}
                </div>

                {/* `type` در استیت بالاست، پس فرم باید همان را بفرستد. */}
                <input type="hidden" value={type} {...register("type")} />

                <Button
                    type="submit"
                    disabled={createComplaint.isPending}
                    className="w-full"
                >
                    {createComplaint.isPending
                        ? "در حال ثبت…"
                        : "ثبت نارضایتی"}
                </Button>

                {createComplaint.isError ? (
                    <p className="text-sm text-danger">
                        {createComplaint.error.message}
                    </p>
                ) : null}
            </form>
        </Card>
    );
}