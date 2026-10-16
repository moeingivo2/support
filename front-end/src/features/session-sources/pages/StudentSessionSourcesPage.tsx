import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getStudentSessionSources } from "../services/resourceService";
import { SessionSourceFilters } from "../components/SessionSourceFilters";
import { SessionSourceList } from "../components/SessionSourceList";
import { SessionSourcePagination } from "../components/SessionSourcePagination";
import { Alert } from "@/shared/ui/alert";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

/**
 * سورس جلسات برای دانشجو — فقط‌خواندنی.
 *
 * بخش (وب یا هوش مصنوعی) را سرور از مسیرِ خودِ دانشجو تعیین می‌کند
 * (`ResourceController::studentSessionSources`)، پس این‌جا فیلتر بخش و
 * ابزارهای ویرایش وجود ندارد.
 */
export function useStudentSessionSources(page: number, search: string) {
    return useQuery({
        queryKey: ["session-sources", "student", { page, search }],
        queryFn: () =>
            getStudentSessionSources({ page, search: search || undefined }),
        placeholderData: keepPreviousData,
    });
}

export default function StudentSessionSourcesPage() {
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const sourcesQuery = useStudentSessionSources(page, search);
    const sources = sourcesQuery.data?.items ?? [];

    function applySearch() {
        setSearch(searchInput);
        setPage(1);
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <Card className="p-6 md:p-7">
                <h1 className="text-2xl font-bold text-ink md:text-3xl">
                    سورس جلسات
                </h1>
                <p className="mt-3 text-sm leading-6 text-ink-2">
                    سورس‌های مربوط به بخش و دوره‌ی خودتان را اینجا می‌بینید و
                    می‌توانید دانلود کنید.
                </p>
            </Card>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <SessionSourceFilters
                    search={searchInput}
                    onSearchChange={setSearchInput}
                    onSearchSubmit={applySearch}
                />
            </div>

            {sourcesQuery.isError ? (
                <Alert tone="danger">{sourcesQuery.error.message}</Alert>
            ) : null}

            {sourcesQuery.isPending ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-40 rounded-4xl" />
                    ))}
                </div>
            ) : (
                <SessionSourceList resources={sources} />
            )}

            {sourcesQuery.data?.pagination ? (
                <SessionSourcePagination
                    pagination={sourcesQuery.data.pagination}
                    onPageChange={setPage}
                />
            ) : null}
        </div>
    );
}