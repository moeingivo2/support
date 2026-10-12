import { getJson, postJson } from "@/shared/api/http";
import type { StudentProfilePayload } from "../types/student-profile";

export const studentProfileKeys = {
    profile: ["student", "profile"] as const,
};

export function getStudentProfile(): Promise<{ data: StudentProfilePayload }> {
    return getJson<{ data: StudentProfilePayload }>("/api/student/profile");
}

export type UpgradeCourseSelection = {
    course: "offline" | "in_person" | "school";
    track?: "ai" | "web" | null;
    sessions?: number[];
    attended_course: string;
};

export type UpgradePayload = {
    courses: UpgradeCourseSelection[];
    extra_chats: number;
    note?: string | null;
};

export function requestUpgrade(
    payload: UpgradePayload,
): Promise<{ message: string; data: StudentProfilePayload }> {
    return postJson<
        UpgradePayload,
        { message: string; data: StudentProfilePayload }
    >("/api/student/upgrade", payload);
}
