import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    Check,
    FileUp,
    GraduationCap,
    Loader2,
    MessageSquarePlus,
    School,
    UserRound,
    Wifi,
} from "lucide-react";
import { useAuth } from "@/shared/services/auth-context";
import { HttpApiError } from "@/shared/api/http";
import { Logo } from "@/shared/api/logo";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { cn } from "@/shared/lib/utils";
import { maskIranianPhoneInput } from "../utils/iranian-phone";
import {
    studentRegisterSchema,
    type StudentRegisterFormInput,
    type StudentRegisterFormValues,
} from "../schemas/studentRegisterSchema";
import {
    COURSE_OPTIONS,
    TOTAL_SESSIONS,
    TRACK_OPTIONS,
    type CourseOption,
} from "../constants/courses";

type RegisterMode = "account" | "course";

/** فیلدهایی که در مرحله انتخاب دوره هستند و باید پیام خطا همان‌جا دیده شود */
const COURSE_FIELDS = new Set(["course", "track", "sessions"]);

const COURSE_ICONS = {
    offline: Wifi,
    in_person: UserRound,
    school: School,
} as const;

export default function StudentRegisterPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isSupportRequest = searchParams.get("request") === "support";
    const { registerStudentAccount } = useAuth();
    const [mode, setMode] = useState<RegisterMode>("account");
    const [serverError, setServerError] = useState<string | null>(null);
    const [selectedCourses, setSelectedCourses] = useState<CourseOption["value"][]>(["offline"]);
    const roadmapInputRef = useRef<HTMLInputElement | null>(null);

    const {
        formState: { errors, isSubmitting },
        handleSubmit,
        register,
        setValue,
        watch,
        trigger,
    } = useForm<StudentRegisterFormInput, unknown, StudentRegisterFormValues>({
        defaultValues: {
            first_name: "",
            last_name: "",
            phone: "",
            password: "",
            password_confirmation: "",
            course: "offline",
            track: null,
            sessions: [],
            roadmap: null,
        },
        mode: "onSubmit",
        resolver: zodResolver(studentRegisterSchema),
    });

    const course = watch("course");
    const track = watch("track");
    const sessions = watch("sessions") ?? [];

    const goToCourseStep = async () => {
        const valid = await trigger([
            "first_name",
            "last_name",
            "phone",
            "password",
            "password_confirmation",
        ]);
        if (valid) setMode("course");
    };

    const onSubmit = async (values: StudentRegisterFormValues) => {
        setServerError(null);
        if (selectedCourses.length === 0) {
            setMode("course");
            setServerError("حداقل یک دوره را انتخاب کنید.");
            return;
        }

        const isOffline = values.course === "offline";

        try {
            await registerStudentAccount({
                first_name: values.first_name,
                last_name: values.last_name,
                phone: values.phone,
                password: values.password,
                password_confirmation: values.password_confirmation,
                course: values.course,
                track: isOffline ? (values.track ?? null) : null,
                sessions: isOffline ? values.sessions : [],
                roadmap: isOffline ? (values.roadmap ?? null) : null,
            });
            navigate(isSupportRequest ? "/chat?request=support" : "/chat", { replace: true });
        } catch (error) {
            if (error instanceof HttpApiError && error.fieldErrors) {
                const fields = Object.keys(error.fieldErrors);
                const fieldMessages = Object.values(error.fieldErrors).flat();
                setServerError(fieldMessages[0] ?? error.message);

                // خطای مربوط به دوره باید کنار انتخاب دوره دیده شود، نه در مرحله حساب
                if (fields.some((field) => COURSE_FIELDS.has(field))) {
                    setMode("course");
                } else if (fieldMessages.length > 0) {
                    setMode("account");
                }
            } else {
                setServerError(
                    error instanceof Error
                        ? error.message
                        : "ثبت‌نام ناموفق بود.",
                );
            }
        }
    };

    function toggleSession(session: number) {
        const next = sessions.includes(session)
            ? sessions.filter((item) => item !== session)
            : [...sessions, session];
        setValue("sessions", next, { shouldValidate: true });
    }

    function selectPrimaryCourse(value: CourseOption["value"]) {
        setValue("course", value, { shouldValidate: true });
        if (value !== "offline") {
            setValue("roadmap", null);
            setValue("track", null);
            setValue("sessions", []);
            if (roadmapInputRef.current) {
                roadmapInputRef.current.value = "";
            }
        }
    }

    function toggleCourse(value: CourseOption["value"]) {
        const next = selectedCourses.includes(value)
            ? selectedCourses.filter((item) => item !== value)
            : [...selectedCourses, value];
        setSelectedCourses(next);

        const nextPrimaryCourse = next[0];
        if (nextPrimaryCourse !== undefined && !next.includes(course)) {
            selectPrimaryCourse(nextPrimaryCourse);
        }
    }

    return (
        <div dir="rtl" className="app-canvas relative min-h-screen px-4 py-10">
            <div className="relative mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-2xl items-center justify-center">
                <div className="w-full space-y-6">
                    <header className="flex items-start gap-3 text-start sm:gap-4">
                        <span className="shrink-0">
                            <Logo size={58} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-xl font-bold text-ink sm:text-2xl">
                                ثبت‌نام در aiosupport
                            </h1>
                            <p className="mt-2 text-sm leading-7 text-ink-2">
                                {mode === "account"
                                    ? "مرحله اول: اطلاعات حساب کاربری خود را وارد کنید."
                                    : "مرحله دوم: دوره‌هایی که خریداری کرده‌اید را انتخاب کنید."}
                            </p>
                        </div>
                        <ThemeToggle className="shrink-0" />
                    </header>

                    <div
                        className="flex items-center justify-center gap-2"
                        aria-hidden="true"
                    >
                        <StepBadge
                            label="اطلاعات حساب"
                            active={mode === "account"}
                            done={mode === "course"}
                        />
                        <span className="h-px w-10 bg-surface-3" />
                        <StepBadge
                            label="انتخاب دوره"
                            active={mode === "course"}
                            done={false}
                        />
                    </div>

                    <Card className="p-6 md:p-7">
                        <form
                            className="space-y-6"
                            onSubmit={handleSubmit(onSubmit)}
                            noValidate
                        >
                            {serverError ? (
                                <Alert tone="danger">{serverError}</Alert>
                            ) : null}
                            {isSupportRequest ? (
                                <Alert tone="info" role="status">
                                    پس از ثبت‌نام، فرم درخواست تیکت پشتیبانی باز می‌شود. اگر حساب دارید، وارد شوید.
                                </Alert>
                            ) : null}

                            <div
                                className={cn(
                                    "space-y-5",
                                    mode === "course" && "hidden",
                                )}
                            >
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name">نام</Label>
                                        <Input
                                            id="first_name"
                                            autoComplete="given-name"
                                            placeholder="مثلاً زهرا"
                                            aria-invalid={Boolean(
                                                errors.first_name,
                                            )}
                                            {...register("first_name")}
                                        />
                                        {errors.first_name ? (
                                            <p className="text-xs font-medium text-err-text">
                                                {errors.first_name.message}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name">
                                            نام خانوادگی
                                        </Label>
                                        <Input
                                            id="last_name"
                                            autoComplete="family-name"
                                            placeholder="مثلاً کریمی"
                                            aria-invalid={Boolean(
                                                errors.last_name,
                                            )}
                                            {...register("last_name")}
                                        />
                                        {errors.last_name ? (
                                            <p className="text-xs font-medium text-err-text">
                                                {errors.last_name.message}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="register-phone">
                                        شماره موبایل
                                    </Label>
                                    <Input
                                        id="register-phone"
                                        dir="ltr"
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="tel"
                                        placeholder="0912 345 6789"
                                        className="text-right"
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
                                    {errors.phone ? (
                                        <p className="text-xs font-medium text-err-text">
                                            {errors.phone.message}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="register-password">
                                            رمز عبور
                                        </Label>
                                        <Input
                                            id="register-password"
                                            type="password"
                                            dir="ltr"
                                            autoComplete="new-password"
                                            placeholder="••••••••"
                                            aria-invalid={Boolean(
                                                errors.password,
                                            )}
                                            {...register("password")}
                                        />
                                        {errors.password ? (
                                            <p className="text-xs font-medium text-err-text">
                                                {errors.password.message}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-password-confirm">
                                            تکرار رمز عبور
                                        </Label>
                                        <Input
                                            id="register-password-confirm"
                                            type="password"
                                            dir="ltr"
                                            autoComplete="new-password"
                                            placeholder="••••••••"
                                            aria-invalid={Boolean(
                                                errors.password_confirmation,
                                            )}
                                            {...register(
                                                "password_confirmation",
                                            )}
                                        />
                                        {errors.password_confirmation ? (
                                            <p className="text-xs font-medium text-err-text">
                                                {
                                                    errors.password_confirmation
                                                        .message
                                                }
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    className="w-full"
                                    onClick={goToCourseStep}
                                >
                                    <GraduationCap />
                                    ادامه: انتخاب دوره
                                </Button>
                            </div>

                            <div
                                className={cn(
                                    "space-y-6",
                                    mode === "account" && "hidden",
                                )}
                            >
                                <fieldset className="space-y-3" aria-describedby="student-courses-hint">
                                    <legend className="mb-3 text-sm font-semibold text-ink">
                                        دوره‌ها
                                    </legend>
                                    <p id="student-courses-hint" className="text-xs leading-6 text-ink-2">
                                        می‌توانید چند دوره را انتخاب کنید. ثبت‌نام با دوره اصلی انجام می‌شود.
                                    </p>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        {COURSE_OPTIONS.map((option) => {
                                            const Icon =
                                                COURSE_ICONS[option.value];
                                            const selected =
                                                selectedCourses.includes(option.value);
                                            return (
                                                <label
                                                    key={option.value}
                                                    className={cn(
                                                        "group relative flex cursor-pointer flex-col items-start gap-2 rounded-3xl border p-4 text-start transition-colors duration-150 ease-out focus-within:ring-2 focus-within:ring-primary-ring-2",
                                                        selected
                                                            ? "border-primary-line-2 bg-primary-soft shadow-[0_14px_34px_-22px_var(--c-glow-accent)]"
                                                            : "border-hairline bg-surface-2  hover:border-hairline hover:bg-surface-2",
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selected}
                                                        onChange={() => toggleCourse(option.value)}
                                                        aria-labelledby={`student-course-${option.value}-label`}
                                                        aria-describedby={`student-course-${option.value}-description`}
                                                        className="absolute top-4 end-4 size-5 cursor-pointer accent-active-blue focus-visible:outline-none"
                                                        disabled={isSubmitting}
                                                    />
                                                    <span
                                                        className={cn(
                                                            "grid size-10 place-items-center rounded-2xl transition-colors",
                                                            selected
                                                                ? "bg-primary-soft-2 text-accent-ink"
                                                                : "bg-surface-2 text-ink-2",
                                                        )}
                                                    >
                                                        <Icon className="size-5" />
                                                    </span>
                                                    <span id={`student-course-${option.value}-label`} className="text-sm font-bold text-ink">
                                                        {option.label}
                                                    </span>
                                                    <span id={`student-course-${option.value}-description`} className="text-xs leading-5 text-ink-2">
                                                        {option.description}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {selectedCourses.length === 0 ? (
                                        <p role="alert" className="text-xs font-medium text-err-text">
                                            حداقل یک دوره را انتخاب کنید.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label htmlFor="student-primary-course">دوره اصلی</Label>
                                            <select
                                                id="student-primary-course"
                                                value={course}
                                                onChange={(event) => selectPrimaryCourse(event.target.value as CourseOption["value"])}
                                                disabled={isSubmitting}
                                                className="h-11 w-full rounded-2xl border border-hairline bg-sunken px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 sm:text-sm"
                                            >
                                                {COURSE_OPTIONS.filter((option) => selectedCourses.includes(option.value)).map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {errors.course ? (
                                        <p className="text-xs font-medium text-err-text">
                                            {errors.course.message}
                                        </p>
                                    ) : null}
                                </fieldset>

                                {course === "offline" ? (
                                    <div className="space-y-5 rounded-3xl border border-hairline bg-sunken p-5">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                                            <span className="grid size-6 place-items-center rounded-full bg-primary-soft text-xs text-accent-ink">
                                                ۱
                                            </span>
                                            رشته دوره آفلاین را انتخاب کنید
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {TRACK_OPTIONS.map((option) => {
                                                const selected =
                                                    track === option.value;
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() =>
                                                            setValue(
                                                                "track",
                                                                option.value,
                                                                {
                                                                    shouldValidate: true,
                                                                },
                                                            )
                                                        }
                                                        aria-pressed={selected}
                                                        className={cn(
                                                            "flex items-center gap-3 rounded-2xl border p-4 text-right transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                                                            selected
                                                                ? "border-warn-line bg-warn-soft"
                                                                : "border-hairline bg-surface-2  hover:border-hairline hover:bg-surface-2",
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                                                                selected
                                                                    ? "border-alret-gold bg-alret-gold text-on-primary"
                                                                    : "border-hairline text-transparent",
                                                            )}
                                                        >
                                                            <Check className="size-3" />
                                                        </span>
                                                        <span>
                                                            <span className="block text-sm font-bold text-ink">
                                                                {option.label}
                                                            </span>
                                                            <span className="block text-xs text-ink-2">
                                                                {
                                                                    option.description
                                                                }
                                                            </span>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {errors.track ? (
                                            <p className="text-xs font-medium text-err-text">
                                                {errors.track.message}
                                            </p>
                                        ) : null}

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                                                <span className="grid size-6 place-items-center rounded-full bg-primary-soft text-xs text-accent-ink">
                                                    ۲
                                                </span>
                                                جلسات خریداری‌شده را انتخاب کنید
                                            </div>
                                            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                                                {Array.from(
                                                    { length: TOTAL_SESSIONS },
                                                    (_, index) => index + 1,
                                                ).map((session) => {
                                                    const selected =
                                                        sessions.includes(
                                                            session,
                                                        );
                                                    return (
                                                        <button
                                                            key={session}
                                                            type="button"
                                                            onClick={() =>
                                                                toggleSession(
                                                                    session,
                                                                )
                                                            }
                                                            aria-pressed={
                                                                selected
                                                            }
                                                            aria-label={`جلسه ${session}`}
                                                            className={cn(
                                                                "grid aspect-square place-items-center rounded-2xl border text-sm font-bold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                                                                selected
                                                                    ? "border-primary-line-2 bg-primary-soft-2 text-accent-ink shadow-[0_10px_24px_-16px_var(--c-glow-accent)]"
                                                                    : "border-hairline bg-surface-2 text-ink-2  hover:border-hairline hover:text-ink",
                                                            )}
                                                        >
                                                            {session}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-ink-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setValue(
                                                            "sessions",
                                                            Array.from(
                                                                {
                                                                    length: TOTAL_SESSIONS,
                                                                },
                                                                (_, i) => i + 1,
                                                            ),
                                                        )
                                                    }
                                                    className="rounded-md font-semibold text-accent-ink underline-offset-4 transition-colors hover:text-alret-gold hover:underline"
                                                >
                                                    انتخاب همه جلسات
                                                </button>
                                                <span>
                                                    {sessions.length} جلسه از{" "}
                                                    {TOTAL_SESSIONS} جلسه انتخاب
                                                    شده
                                                </span>
                                            </div>
                                        {errors.sessions ? (
                                                <p className="text-xs font-medium text-err-text">
                                                    {errors.sessions.message}
                                                </p>
                                        ) : null}

                                        <div className="space-y-2 rounded-2xl border border-dashed border-primary-line bg-primary-soft/40 p-4">
                                            <Label htmlFor="student-roadmap">رودمپ دوره (اختیاری)</Label>
                                            <p className="text-xs leading-6 text-ink-2">فایل رودمپ خریداری‌شده را بارگذاری کنید تا پشتیبان هنگام مشاهده حساب دانشجو به آن دسترسی داشته باشد. فرمت PDF یا تصویر، حداکثر ۱۰ مگابایت.</p>
                                            <input ref={roadmapInputRef} id="student-roadmap" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="sr-only" onChange={(event) => setValue("roadmap", event.target.files?.[0] ?? null, { shouldValidate: true })} />
                                            <div className="flex flex-wrap items-center gap-3">
                                                <Button type="button" variant="ghost" onClick={() => roadmapInputRef.current?.click()}><FileUp />انتخاب فایل رودمپ</Button>
                                                <span className="max-w-full truncate text-xs text-ink-2">{watch("roadmap")?.name ?? "فایلی انتخاب نشده"}</span>
                                                {watch("roadmap") ? <Button type="button" variant="ghost" onClick={() => { setValue("roadmap", null); if (roadmapInputRef.current) roadmapInputRef.current.value = ""; }}>حذف فایل</Button> : null}
                                            </div>
                                            {errors.roadmap ? <p className="text-xs font-medium text-err-text">{errors.roadmap.message}</p> : null}
                                        </div>
                                        </div>
                                    </div>
                                ) : (
                                    <Alert tone="info">
                                        برای دوره «
                                        {
                                            COURSE_OPTIONS.find(
                                                (item) => item.value === course,
                                            )?.label
                                        }
                                        » نیازی به انتخاب رشته یا جلسه نیست.
                                    </Alert>
                                )}

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Button
                                        type="submit"
                                        className="w-full sm:w-auto"
                                        disabled={isSubmitting || selectedCourses.length === 0}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="animate-spin" />
                                        ) : (
                                            <Check />
                                        )}
                                        {isSubmitting
                                            ? "در حال ثبت‌نام..."
                                            : "ثبت‌نام و ورود"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setMode("account")}
                                        disabled={isSubmitting}
                                        className="w-full sm:w-auto"
                                    >
                                        بازگشت به اطلاعات حساب
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Card>

                    <Button variant="ghost" asChild className="w-full">
                        <Link to="/register?request=support">
                            <MessageSquarePlus aria-hidden="true" />
                            درخواست تیکت پشتیبانی
                        </Link>
                    </Button>

                    <p className="text-center text-sm text-ink-2">
                        قبلاً ثبت‌نام کرده‌اید؟{" "}
                        <Link
                            to={isSupportRequest ? "/login?request=support" : "/login"}
                            className="font-bold text-accent-ink underline-offset-4 transition-colors hover:text-alret-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
                        >
                            وارد شوید
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

function StepBadge({
    label,
    active,
    done,
}: {
    label: string;
    active: boolean;
    done: boolean;
}) {
    return (
        <span
            className={cn(
                "rounded-full px-3 py-1 text-xs font-bold ring-1 transition-colors duration-150",
                active && "bg-primary-soft text-accent-ink ring-primary-ring",
                done && "bg-succ-btn text-succ-txt ring-success-line",
                !active && !done && "bg-surface-2 text-ink-2 ring-hairline",
            )}
        >
            {label}
        </span>
    );
}
