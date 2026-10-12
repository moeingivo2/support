import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import {
    AlertTriangle,
    CalendarDays,
    ChevronRight,
    GraduationCap,
    Phone,
    Sparkles,
    UserRound,
    UserRoundCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatusPill } from "@/shared/ui/status-pill";
import {
    getStudentProfile,
    studentProfileKeys,
} from "../services/student-profile-service";
import { formatMembershipDate } from "@/features/student-chat/utils/format";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
import { RemainingChatsWaterTank } from "../components/RemainingChatsWaterTank";
import { UpgradeDialog } from "../components/UpgradeDialog";
import { Input } from "@/shared/ui/input";
import { SessionSourceList } from "@/features/session-sources/components/SessionSourceList";
import { getStudentSessionSources, sessionSourceKeys } from "@/features/session-sources/services/resourceService";
import type { Faq } from "@/features/faq/types/faq";
import { faqKeys } from "@/features/faq/services/faq-service";
import { getJson } from "@/shared/api/http";
import { Search } from "lucide-react";

export default function AccountPage() {
    const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
    const [faqSearch, setFaqSearch] = useState("");
    const debouncedFaqSearch = useDebouncedValue(faqSearch, 300);
    const sessionSourcesQuery = useQuery({
        queryKey: sessionSourceKeys.list({ page: 1 }),
        queryFn: () => getStudentSessionSources({ page: 1 }),
    });
    const studentFaqsQuery = useQuery({
        queryKey: faqKeys.list(debouncedFaqSearch),
        queryFn: () => getJson<Faq[]>("/api/student/faqs", {
            search: debouncedFaqSearch || undefined,
        }),
    });
    const profileQuery = useQuery({
        queryKey: studentProfileKeys.profile,
        queryFn: getStudentProfile,
    });
    const profile = profileQuery.data?.data;

    return (
        // اسکرول در همین ستون می‌ماند تا هدرِ چسبانِ پوسته و این صفحه
        // با هم سر جای خود بمانند.
        <div className="mx-auto w-full max-w-6xl space-y-6 overflow-y-auto pb-6">
            {/* در RTL گوشه‌ی چپ یعنی انتهای سطر؛ همان‌جا دکمه‌ی بازگشت
                به چت قرار می‌گیرد. */}
            <div className="flex justify-start">
                <Link
                    to="/chat"
                    className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-hairline bg-surface-2 px-3 text-sm font-semibold text-ink-2 transition-[background-color,border-color,box-shadow,opacity,color] duration-150 ease-out  hover:border-hairline-strong hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                    بازگشت به گفتگو
                </Link>
            </div>

            <Card className="p-6 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                            <UserRoundCheck className="size-6" />
                        </span>
                        <div>
                            <h1 className="text-2xl font-bold text-ink md:text-3xl">
                                حساب کاربری
                            </h1>
                            <p className="mt-2 text-sm text-ink-2">
                                اطلاعات دوره، تاریخ عضویت و سهمیه چت شما در این
                                صفحه نمایش داده می‌شود.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setIsUpgradeOpen(true)}
                        disabled={!profile}
                    >
                        <Sparkles />
                        ارتقای دوره یا چت
                    </Button>
                </div>
            </Card>

            {profileQuery.isError ? (
                <Alert tone="danger">
                    دریافت اطلاعات حساب ناموفق بود. صفحه را دوباره بارگذاری
                    کنید.
                </Alert>
            ) : null}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
                <div className="space-y-6">
                    <Card className="p-6 md:p-7">
                        <h2 className="text-lg font-bold text-ink">
                            اطلاعات دانشجو
                        </h2>
                        {profile ? (
                            <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <InfoRow
                                    icon={<UserRound className="size-4" />}
                                    label="نام و نام خانوادگی"
                                    value={profile.full_name}
                                />
                                <InfoRow
                                    icon={<GraduationCap className="size-4" />}
                                    label="دوره خریداری‌شده"
                                    value={profile.course_label}
                                />
                                {profile.course === "offline" ? (
                                    <InfoRow
                                        icon={
                                            <GraduationCap className="size-4" />
                                        }
                                        label="رشته دوره آفلاین"
                                        value={profile.track_label ?? "—"}
                                    />
                                ) : null}
                                <InfoRow
                                    icon={<CalendarDays className="size-4" />}
                                    label="تاریخ عضویت"
                                    value={formatMembershipDate(
                                        profile.membership_date,
                                    )}
                                />
                                <InfoRow
                                    icon={<UserRoundCheck className="size-4" />}
                                    label="نام منتور"
                                    value={
                                        profile.mentor_name ??
                                        "منتوری تخصیص نیافته"
                                    }
                                />
                                <InfoRow
                                    icon={<Phone className="size-4" />}
                                    label="شماره موبایل"
                                    value={profile.phone_display ?? "—"}
                                />
                            </dl>
                        ) : (
                            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {Array.from({ length: 6 }, (_, index) => (
                                    <Skeleton key={index} className="h-16" />
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card className="p-6 md:p-7">
                        <h2 className="text-lg font-bold text-ink">
                            جلسات خریداری‌شده
                        </h2>
                        {profile?.course !== "offline" ? (
                            <p className="mt-4 text-sm leading-7 text-ink-2">
                                برای دوره‌های حضوری و مدرسه، جلسات به‌صورت
                                جلسه‌ای ثبت می‌شود و انتخاب دوره‌ای وجود ندارد.
                            </p>
                        ) : (
                            <>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {Array.from(
                                        { length: profile.total_sessions },
                                        (_, index) => index + 1,
                                    ).map((session) => {
                                        const owned =
                                            profile.purchased_sessions.includes(
                                                session,
                                            );
                                        return (
                                            <span
                                                key={session}
                                                className={`grid size-10 place-items-center rounded-2xl border text-sm font-bold transition-colors ${
                                                    owned
                                                        ? "border-success-line bg-succ-btn text-succ-txt"
                                                        : "border-hairline bg-surface-2 text-ink-3"
                                                }`}
                                                title={
                                                    owned
                                                        ? `جلسه ${session} خریداری شده`
                                                        : `جلسه ${session} خریداری نشده`
                                                }
                                            >
                                                {toPersianDigits(session)}
                                            </span>
                                        );
                                    })}
                                </div>
                                <p className="mt-4 text-xs text-ink-2">
                                    {toPersianDigits(
                                        profile.purchased_sessions.length,
                                    )}{" "}
                                    جلسه از{" "}
                                    {toPersianDigits(profile.total_sessions)}{" "}
                                    جلسه دوره در اختیار شماست.
                                </p>
                            </>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6 md:p-7">
                        <h2 className="text-center text-lg font-bold text-ink">
                            چت‌های باقی‌مانده
                        </h2>
                        {profile ? (
                            <>
                                <div className="mx-auto mt-6 w-48">
                                    <RemainingChatsWaterTank
                                        percentage={
                                            profile.remaining_percentage
                                        }
                                        remainingChats={profile.remaining_chats}
                                        totalChats={profile.total_chats}
                                    />
                                </div>

                                {profile.is_low_on_chats ? (
                                    <Alert tone="danger" className="mt-6">
                                        <span className="flex items-center justify-center gap-2 font-bold">
                                            <AlertTriangle className="size-4" />
                                            {toPersianDigits(
                                                profile.remaining_chats,
                                            )}{" "}
                                            چت باقی مانده
                                        </span>
                                    </Alert>
                                ) : null}

                                <dl className="mt-6 space-y-3 text-sm">
                                    <div className="flex items-center justify-between">
                                        <dt className="text-ink-2">کل سهمیه</dt>
                                        <dd className="num-fa font-bold text-ink">
                                            {toPersianDigits(
                                                profile.total_chats,
                                            )}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <dt className="text-ink-2">
                                            استفاده‌شده
                                        </dt>
                                        <dd className="num-fa font-bold text-ink">
                                            {toPersianDigits(
                                                profile.used_chats,
                                            )}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <dt className="text-ink-2">
                                            باقی‌مانده
                                        </dt>
                                        <dd>
                                            <StatusPill
                                                tone={
                                                    profile.is_low_on_chats
                                                        ? "danger"
                                                        : "info"
                                                }
                                            >
                                                {toPersianDigits(
                                                    profile.remaining_chats,
                                                )}
                                            </StatusPill>
                                        </dd>
                                    </div>
                                </dl>

                                <Button
                                    className="mt-6 w-full"
                                    onClick={() => setIsUpgradeOpen(true)}
                                    variant={
                                        profile.is_low_on_chats
                                            ? "primary"
                                            : "ghost"
                                    }
                                >
                                    <Sparkles />
                                    افزایش سهمیه چت
                                </Button>
                            </>
                        ) : (
                            <Skeleton className="mx-auto mt-6 aspect-square w-48 rounded-full" />
                        )}
                    </Card>
                </div>
            </div>

            <section className="space-y-4" aria-labelledby="student-faq-title">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 id="student-faq-title" className="text-xl font-bold text-ink">
                            سوالات متداول
                        </h2>
                        <p className="mt-1 text-sm text-ink-2">
                            پاسخ پرسش‌های پرتکرار دوره و سامانه
                        </p>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
                        <Input
                            type="search"
                            value={faqSearch}
                            onChange={(event) => setFaqSearch(event.target.value)}
                            placeholder="جستجو در سوالات…"
                            aria-label="جستجو در سوالات متداول"
                            className="pr-9"
                        />
                    </div>
                </div>
                {studentFaqsQuery.isError ? (
                    <Alert tone="danger" className="flex items-center justify-between gap-3">
                        <span>دریافت سوالات متداول ناموفق بود.</span>
                        <Button variant="ghost" onClick={() => void studentFaqsQuery.refetch()}>تلاش مجدد</Button>
                    </Alert>
                ) : studentFaqsQuery.isPending ? (
                    <Card className="p-5 text-sm text-ink-2">در حال بارگذاری سوالات…</Card>
                ) : (studentFaqsQuery.data ?? []).length === 0 ? (
                    <Card className="p-5 text-sm text-ink-2">سوالی یافت نشد.</Card>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {studentFaqsQuery.data?.map((faq) => (
                            <details key={faq.id} className="rounded-2xl border border-hairline bg-glass p-4">
                                <summary className="cursor-pointer text-sm font-bold text-ink">{faq.question}</summary>
                                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-2">{faq.answer}</p>
                            </details>
                        ))}
                    </div>
                )}
            </section>

            <section className="space-y-4" aria-labelledby="student-session-sources-title">
                <div>
                    <h2 id="student-session-sources-title" className="text-xl font-bold text-ink">سورس جلسات</h2>
                    <p className="mt-1 text-sm text-ink-2">فایل‌ها و کدهای آموزشی جلسات شما</p>
                </div>
                {sessionSourcesQuery.isError ? (
                    <Alert tone="danger">دریافت سورس جلسات ناموفق بود.</Alert>
                ) : sessionSourcesQuery.isPending ? (
                    <Card className="p-5 text-sm text-ink-2">در حال بارگذاری سورس‌ها…</Card>
                ) : (
                    <SessionSourceList resources={sessionSourcesQuery.data?.items ?? []} />
                )}
            </section>

            {profile ? (
                <UpgradeDialog
                    open={isUpgradeOpen}
                    onClose={() => setIsUpgradeOpen(false)}
                    profile={profile}
                />
            ) : null}
        </div>
    );
}

function InfoRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-hairline bg-surface-2 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-accent-ink">
                {icon}
            </span>
            <div className="min-w-0">
                <dt className="text-xs text-ink-2">{label}</dt>
                <dd className="truncate text-sm font-bold text-ink">{value}</dd>
            </div>
        </div>
    );
}
