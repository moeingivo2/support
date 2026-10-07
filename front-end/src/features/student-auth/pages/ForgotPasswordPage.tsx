import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, Phone } from "lucide-react";
import { HttpApiError, postJson } from "@/shared/api/http";
import { Logo } from "@/shared/api/logo";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { z } from "zod";
import {
    IRANIAN_PHONE_ERROR,
    isValidIranianPhone,
    maskIranianPhoneInput,
} from "../utils/iranian-phone";

const forgotPasswordSchema = z.object({
    phone: z
        .string()
        .trim()
        .min(1, "شماره موبایل را وارد کنید.")
        .refine(isValidIranianPhone, { message: IRANIAN_PHONE_ERROR }),
});

type ForgotPasswordValues = z.output<typeof forgotPasswordSchema>;
type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [serverError, setServerError] = useState<string | null>(null);
    const [sentMessage, setSentMessage] = useState<string | null>(null);

    const {
        formState: { errors, isSubmitting },
        handleSubmit,
        register,
        setValue,
    } = useForm<ForgotPasswordInput, unknown, ForgotPasswordValues>({
        defaultValues: { phone: "" },
        mode: "onSubmit",
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (values: ForgotPasswordValues) => {
        setServerError(null);
        setSentMessage(null);
        try {
            const response = await postJson<
                { phone: string },
                { message: string }
            >("/api/password/forgot", { phone: values.phone });
            setSentMessage(response.message);
        } catch (error) {
            setServerError(
                error instanceof HttpApiError
                    ? error.message
                    : "ثبت درخواست ناموفق بود.",
            );
        }
    };

    return (
        <div dir="rtl" className="app-canvas relative min-h-screen px-4 py-10">
            <ThemeToggle className="absolute top-5 left-5" />

            <div className="relative mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md items-center justify-center">
                <div className="w-full space-y-6">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <Logo size={54} />
                        <h1 className="text-2xl font-bold text-ink">
                            بازیابی رمز عبور
                        </h1>
                        <p className="text-sm leading-7 text-ink-2">
                            ایمیلی که با آن ثبت‌نام کرده‌اید را وارد کنید تا
                            درخواست شما ثبت شود.
                        </p>
                    </div>

                    <Card className="p-6 md:p-7">
                        {sentMessage ? (
                            <div className="space-y-5 text-center">
                                <span className="mx-auto grid size-14 place-items-center rounded-full bg-succ-btn text-succ-txt">
                                    <CheckCircle2 className="size-7" />
                                </span>
                                <p className="text-sm leading-7 text-ink">
                                    {sentMessage}
                                </p>
                                <Button
                                    asChild
                                    variant="ghost"
                                    className="w-full"
                                >
                                    <Link to="/login">
                                        <ArrowRight />
                                        بازگشت به صفحه ورود
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <form
                                className="space-y-5"
                                onSubmit={handleSubmit(onSubmit)}
                                noValidate
                            >
                                {serverError ? (
                                    <Alert tone="danger">{serverError}</Alert>
                                ) : null}

                                <div className="space-y-2">
                                    <Label htmlFor="forgot-phone">
                                        شماره موبایل
                                    </Label>
                                    <div className="relative">
                                        <Phone className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-2" />
                                        <Input
                                            id="forgot-phone"
                                            dir="ltr"
                                            type="tel"
                                            inputMode="numeric"
                                            autoComplete="tel"
                                            placeholder="0912 345 6789"
                                            className="pr-11 text-right"
                                            aria-invalid={Boolean(errors.phone)}
                                            {...register("phone", {
                                                onChange: (event) =>
                                                    setValue(
                                                        "phone",
                                                        maskIranianPhoneInput(
                                                            event.target.value,
                                                        ),
                                                        { shouldValidate: false },
                                                    ),
                                            })}
                                        />
                                    </div>
                                    {errors.phone ? (
                                        <p className="text-xs font-medium text-err-text">
                                            {errors.phone.message}
                                        </p>
                                    ) : null}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="animate-spin" />
                                    ) : (
                                        <Phone />
                                    )}
                                    {isSubmitting
                                        ? "در حال ثبت درخواست..."
                                        : "ثبت درخواست بازیابی"}
                                </Button>
                            </form>
                        )}
                    </Card>

                    <p className="text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-1 text-xs text-ink-3 underline-offset-4 transition-colors hover:text-ink hover:underline"
                        >
                            <ArrowRight className="size-3" />
                            بازگشت به صفحه ورود
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
