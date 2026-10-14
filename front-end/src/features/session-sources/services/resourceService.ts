import { deleteJson, getJson, postJson, putJson } from "@/shared/api/http";
import type { SupportChannel, ChannelFilter } from "@/shared/lib/content-channel";
import type { LaravelPagination, Resource } from "../types/resource";
import { formatJalaliDate } from "@/shared/lib/jalali";

export type SessionSourcesFilters = {
    page: number;
    search?: string;
    channel?: ChannelFilter;
};

export type SessionSourcesPagination = Omit<
    LaravelPagination<Resource>,
    "data"
>;

export type SessionSourcesPage = {
    items: Resource[];
    pagination: SessionSourcesPagination;
};

export type ResourcePayload = {
    title: string;
    description: string;
    file_url: string;
    channel?: SupportChannel;
};

export const sessionSourceKeys = {
    all: ["session-sources"] as const,
    list: (filters: SessionSourcesFilters) =>
        [...sessionSourceKeys.all, "list", filters] as const,
};

export function formatResourceDate(date: string): string {
    return formatJalaliDate(date);
}

// فیلتر type/search سمت سرور اعمال می‌شود و صفحه‌بندی لاراول حفظ می‌شود.
export async function getSessionSources(
    filters: SessionSourcesFilters,
): Promise<SessionSourcesPage> {
    const response = await getJson<LaravelPagination<Resource>>(
        "/api/resources",
        {
            page: filters.page,
            type: "session_source",
            search: filters.search?.trim() || undefined,
            channel: filters.channel === "all" ? undefined : filters.channel,
        },
    );

    return {
        items: response.data,
        pagination: getPagination(response),
    };
}

/**
 * فهرست فقط‌خواندنی سورس‌ها برای حساب دانشجو.
 *
 * بخش را سرور از مسیر خودِ دانشجو تعیین می‌کند، پس این‌جا پارامتری فرستاده
 * نمی‌شود.
 */
export async function getStudentSessionSources(
    filters: SessionSourcesFilters,
): Promise<SessionSourcesPage> {
    const response = await getJson<LaravelPagination<Resource>>(
        "/api/student/session-sources",
        {
            page: filters.page,
            search: filters.search?.trim() || undefined,
        },
    );

    return {
        items: response.data,
        pagination: getPagination(response),
    };
}

function getPagination(
    response: LaravelPagination<Resource>,
): SessionSourcesPagination {
    return {
        current_page: response.current_page,
        first_page_url: response.first_page_url,
        from: response.from,
        last_page: response.last_page,
        last_page_url: response.last_page_url,
        links: response.links,
        next_page_url: response.next_page_url,
        path: response.path,
        per_page: response.per_page,
        prev_page_url: response.prev_page_url,
        to: response.to,
        total: response.total,
    };
}

export async function createSessionSource(
    payload: ResourcePayload,
): Promise<{ message: string; resource: Resource }> {
    return postJson<
        ResourcePayload & { type: string },
        { message: string; resource: Resource }
    >("/api/resources", { ...payload, type: "session_source" });
}

export async function updateSessionSource(
    id: number,
    payload: ResourcePayload,
): Promise<{ message: string; resource: Resource }> {
    return putJson<ResourcePayload, { message: string; resource: Resource }>(
        `/api/resources/${id}`,
        payload,
    );
}

export async function deleteSessionSource(
    id: number,
): Promise<{ message: string }> {
    return deleteJson<{ message: string }>(`/api/resources/${id}`);
}
