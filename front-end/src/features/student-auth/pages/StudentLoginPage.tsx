import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, LogIn, MessageSquarePlus, Phone, ShieldCheck } from "lucide-react";
import { useAuth } from "@/shared/services/auth-context";
import { HttpApiError } from "@/shared/api/http";
import { Logo } from "@/shared/api/logo";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { maskIranianPhoneInput } from "../utils/iranian-phone";
import {
    studentLoginSchema,
    type StudentLoginFormInput,
    type StudentLoginFormValues,
} from "../schemas/studentLoginSchema";

export default function StudentLoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isSupportRequest = searchParams.get("request") === "support";
    const { loginStudentAccount } = useAuth();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        formState: { errors, isSubmitting },
        handleSubmit,
        register,
        setFocus,
        setValue,
    } = useForm<StudentLoginFormInput, unknown, StudentLoginFormValues>({
        defaultValues: { phone: "", password: "" },
        mode: "onSubmit",
        resolver: zodResolver(studentLoginSchema),
    });

    const onSubmit = async (values: StudentLoginFormValues) => {
        setServerError(null);
        try {
            await loginStudentAccount(values.phone, values.password);

            // سرور نقش را بررسی می‌کند؛ پیام خطای نمایندگی هرگز افشا نمی‌شود
            navigate(isSupportRequest ? "/chat?request=support" : "/chat", { replace: true });
        } catch (error) {
            if (error instanceof HttpApiError && error.fieldErrors) {
                const fieldMessages = Object.values(error.fieldErrors).flat();
                setServerError(fieldMessages[0] ?? error.message);
            } else {
                setServerError(
                    error instanceof Error ? error.message : "ورود ناموفق بود.",
                );
            }
        }
    };

    return (
        <div dir="rtl" className="app-canvas relative min-h-screen px-4 py-10">
            <div className="relative mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md items-center justify-center">
                <div className="w-full space-y-6">
                    <header className="flex items-start gap-3 text-start sm:gap-4">
                        <span className="shrink-0">
                            <Logo size={58} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-xl font-bold text-ink sm:text-2xl">
                                ورود به aiosupport
                            </h1>
                            <p className="mt-2 text-sm leading-7 text-ink-2">
                                برای گفتگو با پشتیبانی و مشاهده وضعیت دوره وارد
                                شوید.
                            </p>
                        </div>
                        <ThemeToggle className="shrink-0" />
                    </header>

                    <Card className="p-6 md:p-7">
                        <form
                            className="space-y-5"
                            onSubmit={handleSubmit(onSubmit)}
                            noValidate
                        >
                            {serverError ? (
                                <Alert tone="danger">{serverError}</Alert>
                            ) : null}
                            {isSupportRequest ? (
                                <Alert tone="info" role="status">
                                    برای ارسال تیکت پشتیبانی وارد حساب خود شوید. فرم درخواست پس از ورود باز می‌شود.
                                </Alert>
                            ) : null}

                            <div className="space-y-2">
                                <Label htmlFor="student-phone">
                                    شماره موبایل
                                </Label>
                                <div className="relative">
                                    <Phone
                                        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-2"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="student-phone"
                                        dir="ltr"
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="tel"
                                        placeholder="0912 345 6789"
                                        className="pr-11 text-left"
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
                                ) : (
                                    <p className="text-xs text-ink-3">
                                        همان شماره‌ای که با آن ثبت‌نام کرده‌اید.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="student-password">
                                        رمز عبور
                                    </Label>
                                    <Link
                                        to="/forgot-password"
                                        className="rounded-md text-xs font-semibold text-accent-ink underline-offset-4 transition-colors hover:text-alret-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
                                    >
                                        فراموشی رمز عبور
                                    </Link>
                                </div>
                                <Input
                                    id="student-password"
                                    type="password"
                                    dir="ltr"
                                    autoComplete="current-password"
                                    placeholder="••••••••"
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
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <LogIn />
                                )}
                                {isSubmitting ? "در حال ورود..." : "ورود"}
                            </Button>
                        </form>
                    </Card>

                    <Button variant="ghost" asChild className="w-full">
                        <Link to="/login?request=support" onClick={() => setFocus("phone")}>
                            <MessageSquarePlus aria-hidden="true" />
                            درخواست تیکت پشتیبانی
                        </Link>
                    </Button>

                    <div className="space-y-3 text-center">
                        <p className="text-sm text-ink-2">
                            حساب کاربری ندارید؟{" "}
                            <Link
                                to={isSupportRequest ? "/register?request=support" : "/register"}
                                className="font-bold text-accent-ink underline-offset-4 transition-colors hover:text-alret-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
                            >
                                ثبت‌نام کنید
                            </Link>
                        </p>
                        <p className="flex items-center justify-center gap-2 text-xs text-ink-3">
                            <ShieldCheck className="size-4" />
                            <span>
                                اطلاعات ورود شما به‌صورت امن منتقل می‌شود.
                            </span>
                        </p>
                        <Link
                            to="/panel-login"
                            className="inline-block text-xs text-ink-3 underline-offset-4 transition-colors hover:text-ink hover:underline"
                        >
                            ورود به پنل پشتیبانی
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
