import { deleteJson, getJson, postJson, putJson } from "@/shared/api/http";
import type {
    Complaint,
    ComplaintFilters,
    ComplaintStatus,
    ComplaintStatusResponse,
    ComplaintSummary,
    ComplaintType,
    CreateComplaintPayload,
    CreateComplaintResponse,
    LaravelPagination,
} from "../types/complaint";

export const complaintKeys = {
    all: ["complaints"] as const,
    list: (filters: ComplaintFilters) =>
        [...complaintKeys.all, "list", filters] as const,
    summary: ["complaints", "summary"] as const,
};

export const TYPE_OPTIONS: ReadonlyArray<{
    value: ComplaintType;
    label: string;
    hint: string;
}> = [
    {
        value: "support",
        label: "پشتیبانی",
        hint: "از رفتار یا پاسخ پشتیبان ناراضی هستید",
    },
    {
        value: "mentor",
        label: "منتور",
        hint: "نام منتور را بنویسید و توضیح دهید",
    },
    {
        value: "course",
        label: "دوره",
        hint: "نام دوره را بنویسید و توضیح دهید",
    },
];

export const STATUS_OPTIONS = [
    { value: "open", label: "در انتظار بررسی" },
    { value: "in_progress", label: "در حال پیگیری" },
    { value: "resolved", label: "رسیدگی‌شده" },
] as const;

export const TYPE_LABELS: Record<string, string> = {
    support: "پشتیبانی",
    mentor: "منتور",
    course: "دوره",
};

export const STATUS_LABELS: Record<string, string> = {
    open: "در انتظار بررسی",
    in_progress: "در حال پیگیری",
    resolved: "رسیدگی‌شده",
};

/**
 * حذف پارامترهای خالی تا فیلترِ بی‌ربط به کوئری‌استرینگ اضافه نشود.
 */
export function buildComplaintQuery(
    filters: ComplaintFilters,
): Record<string, string | number> {
    const query: Record<string, string | number> = {};

    if (filters.type) {
        query.type = filters.type;
    }

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.from) {
        query.from = filters.from;
    }

    if (filters.to) {
        query.to = filters.to;
    }

    if (filters.page) {
        query.page = filters.page;
    }

    if (filters.per_page) {
        query.per_page = filters.per_page;
    }

    return query;
}

export function getComplaints(
    filters: ComplaintFilters,
): Promise<LaravelPagination<Complaint>> {
    return getJson<LaravelPagination<Complaint>>(
        "/api/complaints",
        buildComplaintQuery(filters),
    );
}

/** شمارش نشان قرمز: خوانده‌نشده‌ها و بازها. */
export function getComplaintSummary(): Promise<ComplaintSummary> {
    return getJson<ComplaintSummary>("/api/complaints/summary");
}

/** علامت‌زدن همه‌ی نارضایتی‌های خوانده‌نشده به‌عنوان «دیده‌شده». */
export function markComplaintsSeen(): Promise<{ message: string }> {
    return postJson<Record<string, never>, { message: string }>(
        "/api/complaints/mark-seen",
        {},
    );
}

export function createComplaint(
    payload: CreateComplaintPayload,
): Promise<CreateComplaintResponse> {
    return postJson<CreateComplaintPayload, CreateComplaintResponse>(
        "/api/complaints",
        payload,
    );
}

export function updateComplaintStatus(
    id: number,
    status: ComplaintStatus,
): Promise<ComplaintStatusResponse> {
    return putJson<{ status: ComplaintStatus }, ComplaintStatusResponse>(
        `/api/complaints/${id}`,
        { status },
    );
}

/** حذف نارضایتی بی‌ربط — فقط ناظر اکانت و سوپر ادمین. */
export function deleteComplaint(id: number): Promise<{ message: string }> {
    return deleteJson<{ message: string }>(`/api/complaints/${id}`);
}

export type { ComplaintStatus, ComplaintType } from "../types/complaint";