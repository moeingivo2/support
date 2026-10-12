import { getJson, postJson } from "@/shared/api/http";

export const upgradeRequestKeys = {
    list: (status?: UpgradeRequestStatus) =>
        ["upgrade-requests", "list", status ?? "all"] as const,
    detail: (id: number) => ["upgrade-requests", "detail", id] as const,
};

export type UpgradeRequestStatus = "pending" | "approved" | "rejected";

export type UpgradeCourse = {
    course: "offline" | "in_person" | "school";
    track: "ai" | "web" | null;
    sessions: number[];
    attended_course: string;
};

export type UpgradeRequestItem = {
    id: number;
    student_id: number;
    student_name: string | null;
    student_phone: string | null;
    courses: UpgradeCourse[];
    extra_chats: number;
    status: UpgradeRequestStatus;
    note: string | null;
    created_at: string | null;
};

export function getUpgradeRequests(
    status?: UpgradeRequestStatus,
): Promise<{ data: UpgradeRequestItem[] }> {
    return getJson<{ data: UpgradeRequestItem[] }>("/api/upgrade-requests", {
        status,
    });
}

export function approveUpgradeRequest(
    id: number,
): Promise<{ message: string; data: UpgradeRequestItem }> {
    return postJson<Record<string, never>, { message: string; data: UpgradeRequestItem }>(
        `/api/upgrade-requests/${id}/approve`,
        {},
    );
}

export function rejectUpgradeRequest(
    id: number,
): Promise<{ message: string; data: UpgradeRequestItem }> {
    return postJson<Record<string, never>, { message: string; data: UpgradeRequestItem }>(
        `/api/upgrade-requests/${id}/reject`,
        {},
    );
}
