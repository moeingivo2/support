import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    CalendarRange,
    Download,
    FileSpreadsheet,
    Filter,
    Loader2,
    Users,
} from "lucide-react";
import { getSupports, adminKeys } from "../services/admin-service";
import {
    downloadActivityReport,
    type ActivityReportFilters,
} from "../services/activity-report-service";
import { HttpApiError } from "@/shared/api/http";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { JalaliDateInput } from "@/shared/ui/jalali-date-input";
import { Label } from "@/shared/ui/label";
import { useToast } from "@/shared/ui/toast";

export default function ActivityReportPage() {
    const toast = useToast();
    const [filters, setFilters] = useState<ActivityReportFilters>(() => ({
        user_id: "",
        from: toInputDate(addDays(new Date(), -29)),
        to: toInputDate(new Date()),
    }));
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const supportsQuery = useQuery({
        queryKey: adminKeys.supports,
        queryFn: getSupports,
    });
    const supports = supportsQuery.data?.data ?? [];
    const selectedSupport = useMemo(
        () =>
            supports.find((support) => String(support.id) === filters.user_id),
        [filters.user_id, supports],
    );

    function updateFilter<Key extends keyof ActivityReportFilters>(
        key: Key,
        value: ActivityReportFilters[Key],
    ): void {
        setFilters((current) => ({ ...current, [key]: value }));
        setErrorMessage(null);
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();
        setErrorMessage(null);

        if (!filters.user_id || !filters.from || !filters.to) {
            setErrorMessage("پشتیبان و بازه زمانی را انتخاب کنید.");
            return;
        }

        setIsDownloading(true);
        try {
            const file = await downloadActivityReport(
                filters,
                `activity-report-${filters.user_id}-${filters.from}-${filters.to}.xls`,
            );
            const objectUrl = URL.createObjectURL(file.blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = file.filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
            toast.success("فایل Excel گزارش فعالیت آماده دانلود شد.");
        } catch (error) {
            const message =
                error instanceof HttpApiError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "دریافت فایل Excel ناموفق بود.";
            setErrorMessage(message);
        } finally {
            setIsDownloading(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <Card className="p-6 md:p-7">
                <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                        <FileSpreadsheet className="size-6" />
                    </span>
                    <div>
                        <h1 className="mt-1 text-3xl font-bold text-ink md:text-4xl">
                            گزارش فعالیت پشتیبان
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-2">
                            گزارش فعالیت هر پشتیبان را فقط به‌صورت فایل Excel
                            دریافت کنید؛ روز، تاریخ، ساعت شروع و پایان، مدت کار
                            و آمار پاسخ‌گویی در یک فایل قابل بررسی آماده می‌شود.
                        </p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_.9fr]">
                <Card className="p-6 md:p-7">
                    <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-2xl bg-warn-soft text-alret-gold ring-1 ring-warn-ring">
                            <Filter className="size-5" />
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-ink">
                                انتخاب بازه و پشتیبان
                            </h2>
                            <p className="mt-1 text-xs text-ink-2">
                                خروجی نهایی به‌صورت فایل .xls قابل بازشدن در
                                Excel
                            </p>
                        </div>
                    </div>

                    <form
                        className="mt-6 space-y-5"
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        {errorMessage ? (
                            <Alert tone="danger">{errorMessage}</Alert>
                        ) : null}

                        <div className="space-y-2">
                            <Label htmlFor="activity-support">پشتیبان</Label>
                            <select
                                id="activity-support"
                                required
                                className="h-11 w-full rounded-2xl border border-hairline bg-surface-2 px-4 text-sm text-ink outline-none transition focus-visible:border-primary-line-2 focus-visible:ring-2 focus-visible:ring-primary-ring"
                                value={filters.user_id}
                                onChange={(event) =>
                                    updateFilter("user_id", event.target.value)
                                }
                                disabled={
                                    supportsQuery.isPending || isDownloading
                                }
                            >
                                <option value="">انتخاب پشتیبان</option>
                                {supports.map((support) => (
                                    <option key={support.id} value={support.id}>
                                        {support.name}
                                    </option>
                                ))}
                            </select>
                            {supportsQuery.isError ? (
                                <p className="text-xs text-err-text">
                                    دریافت فهرست پشتیبان‌ها ناموفق بود.
                                </p>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="activity-from">از تاریخ</Label>
                                <JalaliDateInput
                                    id="activity-from"
                                    value={filters.from}
                                    onChange={(value) => updateFilter("from", value)}
                                    max={filters.to || undefined}
                                    disabled={isDownloading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="activity-to">تا تاریخ</Label>
                                <JalaliDateInput
                                    id="activity-to"
                                    value={filters.to}
                                    onChange={(value) => updateFilter("to", value)}
                                    min={filters.from || undefined}
                                    disabled={isDownloading}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full sm:w-auto"
                            disabled={
                                isDownloading ||
                                supportsQuery.isPending ||
                                supports.length === 0
                            }
                        >
                            {isDownloading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <Download />
                            )}
                            {isDownloading
                                ? "در حال آماده‌سازی فایل..."
                                : "دریافت خروجی Excel"}
                        </Button>
                    </form>
                </Card>

                <Card className="h-fit p-6 md:p-7">
                    <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                            <Users className="size-5" />
                        </span>
                        <h2 className="text-xl font-bold text-ink">
                            این گزارش شامل چه چیزی است؟
                        </h2>
                    </div>
                    <ul className="mt-6 space-y-4 text-sm leading-7 text-ink">
                        <li className="flex gap-3">
                            <CalendarRange className="mt-1 size-4 shrink-0 text-accent-ink" />
                            <span>
                                نام روز هفته، تاریخ شروع و پایان هر شیفت
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-alret-gold" />
                            <span>مدت کار به دقیقه و قالب ساعت و دقیقه</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-alret-gold" />
                            <span>
                                تعداد پاسخ‌داده‌شده، ناراضی و درخواست‌های دسک
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-alret-gold" />
                            <span>وضعیت ثبت گزارش و یادداشت‌های هر شیفت</span>
                        </li>
                    </ul>
                    {selectedSupport ? (
                        <Alert tone="info" className="mt-6">
                            فایل برای{" "}
                            <span className="font-bold">
                                {selectedSupport.name}
                            </span>{" "}
                            آماده می‌شود.
                        </Alert>
                    ) : (
                        <Alert tone="info" className="mt-6">
                            یک پشتیبان را انتخاب کنید تا فایل اختصاصی او دریافت
                            شود.
                        </Alert>
                    )}
                </Card>
            </div>
        </div>
    );
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
