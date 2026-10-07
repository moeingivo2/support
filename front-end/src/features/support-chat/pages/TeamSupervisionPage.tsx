import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    CalendarClock,
    Eye,
    LogIn,
    MessagesSquare,
    RefreshCw,
} from "lucide-react";
import { useAuth } from "@/shared/services/auth-context";
import { getTeamSupervision, supportChatKeys } from "../services/support-chat-service";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatusPill } from "@/shared/ui/status-pill";
import { useToast } from "@/shared/ui/toast";
import { toPersianDigits } from "@/features/student-chat/utils/persian";

/**
 * «نظارت بر روی تیم» — نمای اختصاصی ناظر اکانت.
 *
 * ناظر اکانت خودش هم پشتیبان است و در صفحه‌ی گفتگوی خودش مثل بقیه کار می‌کند.
 * اینجا دو کار می‌تواند بکند: آمار کار هر عضو تیم را ببیند و به حساب همان
 * پشتیبان وارد شود. داخل حساب، صندوق ورودی به گفتگوهای همان پشتیبان محدود
 * می‌شود و پاسخ‌ها دقیقاً به نام او ثبت می‌شوند.
 */
export default function TeamSupervisionPage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { actAsSupport } = useAuth();

    const teamQuery = useQuery({
        queryKey: supportChatKeys.teamSupervision,
        queryFn: getTeamSupervision,
        refetchInterval: 30_000,
    });

    const enterAccount = useMutation({
        mutationFn: (supportId: number) => actAsSupport(supportId),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: supportChatKeys.inbox(null),
            });
            navigate("/inbox", { replace: true });
        },
        onError: (error: unknown) => {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "ورود به اکانت پشتیبان انجام نشد.",
            );
        },
    });

    const team = teamQuery.data?.data ?? [];
    const channelLabel = teamQuery.data?.support_type === "ai" ? "هوش مصنوعی" : "وب";

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <Card className="p-6 md:p-7">
                <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                        <Eye />
                    </span>
                    <div>
                        <h1 className="text-2xl font-bold text-ink md:text-3xl">
                            نظارت بر روی تیم
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-ink-2">
                            تیم پشتیبانی {channelLabel}. برای دیدن گفتگوهای یک
                            پشتیبان و پاسخ‌دادن دقیقاً به‌جای او، وارد حسابش
                            شوید؛ آن‌وقت فقط گفتگوهای همان پشتیبان دیده می‌شود.
                        </p>
                    </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/observer-schedules")}
                    >
                        <CalendarClock />
                        تعیین شیفت تیم
                    </Button>
                    <Button variant="ghost" onClick={() => navigate("/inbox")}>
                        <MessagesSquare />
                        صفحه‌ی گفتگوی من
                    </Button>
                </div>
            </Card>

            {teamQuery.isError ? (
                <Alert tone="danger">
                    دریافت فهرست تیم ناموفق بود.
                    <Button
                        variant="ghost"
                        onClick={() => void teamQuery.refetch()}
                    >
                        <RefreshCw />
                        تلاش دوباره
                    </Button>
                </Alert>
            ) : null}

            {teamQuery.isPending ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 2 }, (_, index) => (
                        <Card key={index} className="space-y-3 p-5">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-56" />
                        </Card>
                    ))}
                </div>
            ) : team.length === 0 ? (
                <Card className="flex flex-col items-center gap-3 p-10 text-center">
                    <MessagesSquare className="size-10 text-ink-3" />
                    <p className="text-base font-bold text-ink">
                        هنوز پشتیبان دیگری با این نوع پاسخگویی ثبت نشده است.
                    </p>
                    <p className="max-w-md text-sm text-ink-2">
                        همه پشتیبان‌های همین نوع به‌طور خودکار عضو تیم شما
                        می‌شوند.
                    </p>
                </Card>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {team.map((member) => (
                        <Card
                            key={member.id}
                            className="flex flex-col gap-4 p-5"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-ink">
                                        {member.name}
                                    </p>
                                    <p
                                        dir="ltr"
                                        className="mt-1 text-right text-xs text-ink-2"
                                    >
                                        {member.phone ?? "—"}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {member.on_shift ? (
                                        <StatusPill tone="success">
                                            در حال شیفت
                                        </StatusPill>
                                    ) : null}
                                    <StatusPill
                                        tone={
                                            member.support_type === "ai"
                                                ? "warning"
                                                : "info"
                                        }
                                    >
                                        {member.support_type === "ai"
                                            ? "هوش مصنوعی"
                                            : "وب"}
                                    </StatusPill>
                                </div>
                            </div>

                            <dl className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-surface-2 p-3">
                                    <dt className="text-xs text-ink-2">
                                        کل گفتگوها
                                    </dt>
                                    <dd className="mt-1 text-sm font-bold text-ink">
                                        {toPersianDigits(
                                            member.conversations_count,
                                        )}
                                    </dd>
                                </div>
                                <div className="rounded-2xl bg-surface-2 p-3">
                                    <dt className="text-xs text-ink-2">
                                        خوانده‌نشده
                                    </dt>
                                    <dd
                                        className={
                                            member.unread_conversations_count >
                                            0
                                                ? "mt-1 text-sm font-bold text-err-text"
                                                : "mt-1 text-sm font-bold text-ink"
                                        }
                                    >
                                        {toPersianDigits(
                                            member.unread_conversations_count,
                                        )}
                                    </dd>
                                </div>
                            </dl>

                            <Button
                                className="w-full"
                                disabled={enterAccount.isPending}
                                onClick={() =>
                                    enterAccount.mutate(member.id)
                                }
                            >
                                <LogIn />
                                ورود به اکانت {member.name}
                            </Button>
                        </Card>
                    ))}
                </div>
            )}

            <Card className="p-6 md:p-7">
                <h2 className="text-lg font-bold text-ink">حسابرسی دسترسی</h2>
                <p className="mt-2 text-sm leading-7 text-ink-2">
                    هر ورود به حساب یک پشتیبان و هر پاسخی که به‌جای او ثبت
                    می‌شود، همراه با زمان و نشانی IP در گزارش دسترسی ناظر
                    ثبت می‌شود.
                </p>
            </Card>
        </div>
    );
}