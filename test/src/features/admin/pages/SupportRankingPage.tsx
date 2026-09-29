import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Loader2, Star, Trophy } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { useToast } from "@/shared/ui/toast";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
import {
    downloadSupportRanking,
    getSupportRanking,
    getSupportRankingDetail,
    supportRankingKeys,
    type SupportRankingRow,
} from "../services/support-ranking-service";

/** بازه‌ی به‌روزرسانی خودکار جدول رتبه‌بندی */
const RANKING_POLL_MS = 15000;

function Stars({ value }: { value: number | null }) {
    if (value === null) {
        return <span className="text-ink-3">—</span>;
    }

    return (
        <span className="inline-flex items-center gap-0.5" dir="rtl">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    aria-hidden="true"
                    className={
                        star <= value
                            ? "size-4 fill-alret-gold text-alret-gold"
                            : "size-4 text-ink-3"
                    }
                />
            ))}
        </span>
    );
}

function rankTone(rank: number): string {
    if (rank === 1) return "bg-alret-gold/20 text-alret-gold";
    if (rank === 2) return "bg-ink-3/20 text-ink-2";
    if (rank === 3) return "bg-danger-soft text-err-text";
    return "bg-surface-2 text-ink-2";
}

export default function SupportRankingPage() {
    const toast = useToast();
    const [expandedAgentId, setExpandedAgentId] = useState<number | null>(null);

    const rankingQuery = useQuery({
        queryKey: supportRankingKeys.board,
        queryFn: getSupportRanking,
        // جدول رتبه‌بندی باید همیشه به‌روز باشد
        refetchInterval: RANKING_POLL_MS,
        refetchOnWindowFocus: true,
    });

    const detailQuery = useQuery({
        queryKey: supportRankingKeys.detail(expandedAgentId ?? -1),
        queryFn: () => getSupportRankingDetail(expandedAgentId!),
        enabled: expandedAgentId !== null,
    });

    const downloadMutation = useMutation({
        mutationFn: downloadSupportRanking,
        onSuccess: ({ blob, filename }) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("خروجی اکسل رتبه‌بندی آماده شد.");
        },
        onError: (error: unknown) => {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "دریافت خروجی اکسل ناموفق بود.",
            );
        },
    });

    const rows: SupportRankingRow[] = rankingQuery.data?.data ?? [];

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                        <Trophy className="size-5" />
                    </span>
                    <div>
                        <h1 className="text-lg font-bold text-ink">
                            رتبه‌بندی پشتیبان‌ها
                        </h1>
                        <p className="text-xs text-ink-2">
                            بر پایه‌ی امتیازهای ثبت‌شده توسط دانشجویان
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => downloadMutation.mutate()}
                    disabled={downloadMutation.isPending}
                >
                    {downloadMutation.isPending ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <Download />
                    )}
                    دریافت خروجی اکسل
                </Button>
            </header>

            <Card className="p-4">
                <p className="mb-4 text-xs leading-6 text-ink-2">
                    <span className="font-bold text-ink">قاعده شکست تساوی: </span>
                    {rankingQuery.data?.meta.tie_break_rule ??
                        "در حال بارگذاری…"}
                </p>

                {rankingQuery.isPending ? (
                    <div className="space-y-2">
                        {[0, 1, 2].map((index) => (
                            <div
                                key={index}
                                className="h-14 animate-pulse rounded-2xl bg-surface-2"
                            />
                        ))}
                    </div>
                ) : rankingQuery.isError ? (
                    <p className="text-sm text-err-text">
                        دریافت رتبه‌بندی ناموفق بود.
                    </p>
                ) : rows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-ink-2">
                        هنوز پشتیبانی ثبت نشده است.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {rows.map((row) => {
                            const isExpanded = expandedAgentId === row.support_agent_id;

                            return (
                                <li key={row.support_agent_id}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpandedAgentId(
                                                isExpanded ? null : row.support_agent_id,
                                            )
                                        }
                                        aria-expanded={isExpanded}
                                        className="flex w-full items-center gap-3 rounded-2xl border border-hairline bg-surface-2 px-4 py-3 text-right transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 active:scale-[.99]"
                                    >
                                        <span
                                            className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${rankTone(row.rank)}`}
                                        >
                                            {toPersianDigits(row.rank)}
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold text-ink">
                                                {row.name}
                                            </span>
                                            <span className="block text-xs text-ink-2">
                                                {row.support_type === "ai"
                                                    ? "پشتیبانی هوش مصنوعی"
                                                    : "پشتیبانی وب"}
                                            </span>
                                        </span>

                                        <span className="flex shrink-0 flex-col items-end gap-1">
                                            <Stars value={row.average_rating} />
                                            <span className="text-xs text-ink-2">
                                                {row.average_rating === null
                                                    ? "بدون امتیاز"
                                                    : `${toPersianDigits(row.average_rating)} از ۵`}
                                                {" · "}
                                                {toPersianDigits(row.total_ratings)}{" "}
                                                امتیاز
                                            </span>
                                        </span>
                                    </button>

                                    {isExpanded ? (
                                        <div className="mt-2 max-h-80 overflow-y-auto overflow-x-auto overscroll-x-contain rounded-2xl border border-hairline bg-surface px-4 py-3">
                                            {detailQuery.isPending ? (
                                                <p className="py-4 text-center text-xs text-ink-2">
                                                    در حال بارگذاری جزئیات…
                                                </p>
                                            ) : (
                                                <table className="w-full min-w-[26rem] text-right text-xs">
                                                    <thead className="text-ink-2">
                                                        <tr>
                                                            <th className="py-2 font-semibold">رتبه</th>
                                                            <th className="py-2 font-semibold">
                                                                دانشجو
                                                            </th>
                                                            <th className="py-2 font-semibold">
                                                                امتیاز
                                                            </th>
                                                            <th className="py-2 font-semibold">
                                                                بسته توسط
                                                            </th>
                                                            <th className="py-2 font-semibold">
                                                                تاریخ
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(
                                                            detailQuery.data
                                                                ?.ratings ?? []
                                                        ).map((rating) => (
                                                            <tr
                                                                key={rating.conversation_id}
                                                                className="border-t border-hairline"
                                                            >
                                                                <td className="py-2 text-ink-2">{toPersianDigits(rating.index)}</td>
                                                                <td className="py-2 text-ink">
                                                                    {
                                                                        rating.student
                                                                    }
                                                                </td>
                                                                <td className="py-2">
                                                                    <span className="inline-flex items-center gap-0.5" dir="rtl">
                                                                        {[
                                                                            1, 2, 3, 4, 5,
                                                                        ]
                                                                            .slice(
                                                                                0,
                                                                                rating.rating_value,
                                                                            )
                                                                            .map(
                                                                                (star) => (
                                                                                    <Star
                                                                                        key={
                                                                                            star
                                                                                        }
                                                                                        aria-hidden="true"
                                                                                        className="size-3.5 fill-alret-gold text-alret-gold"
                                                                                    />
                                                                                ),
                                                                            )}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2 text-ink-2">
                                                                    {
                                                                        rating.closure_actor
                                                                    }
                                                                </td>
                                                                <td className="py-2 text-ink-2">
                                                                    {rating.submitted_at
                                                                        ? new Date(
                                                                              rating.submitted_at,
                                                                          ).toLocaleDateString(
                                                                              "fa-IR",
                                                                          )
                                                                        : "—"}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>
        </div>
    );
}
