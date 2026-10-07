import { getJson, postJson, postMultipart } from "@/shared/api/http";
import type { PanelUser } from "@/shared/lib/auth-storage";
import type { StudentProfilePayload } from "@/features/student-account/types/student-profile";

export type LoginResponse = { user: PanelUser; token: string };

export type RegisterPayload = {
    name: string;
    phone: string;
    password: string;
    password_confirmation: string;
};

export type RegisterResponse = {
    message: string;
    user: PanelUser;
    token: string;
};

export type StudentRegisterPayload = {
    first_name: string;
    last_name: string;
    phone: string;
    password: string;
    password_confirmation: string;
    course: "offline" | "in_person" | "school";
    track?: "ai" | "web" | null;
    sessions?: number[];
    roadmap?: File | null;
};

export type StudentRegisterResponse = {
    message: string;
    user: PanelUser;
    profile: StudentProfilePayload;
    token: string;
};

export async function login(
    loginValue: string,
    password: string,
): Promise<LoginResponse> {
    return postJson<{ login: string; password: string }, LoginResponse>(
        "/api/login",
        {
            login: loginValue,
            password,
        },
    );
}

/**
 * ورود دانشجو با شماره موبایل.
 *
 * سرور برای شماره ناموجود، شماره نامعتبر و رمز غلط پیام یکسان برمی‌گرداند تا
 * وجود حساب لو نرود؛ کلاینت نباید این حالت‌ها را از هم تفکیک کند.
 */
export function loginStudent(
    phone: string,
    password: string,
): Promise<LoginResponse> {
    return postJson<{ phone: string; password: string }, LoginResponse>(
        "/api/login/student",
        { phone, password },
    );
}

export function impersonateObserverSupport(supportId: number): Promise<LoginResponse> {
    return postJson<Record<string, never>, LoginResponse>(
        `/api/support/conversations/managed-supports/${supportId}/impersonate`,
        {},
    );
}

export function registerStudent(
    payload: StudentRegisterPayload,
): Promise<StudentRegisterResponse> {
    if (payload.roadmap) {
        const form = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
            if (key === "roadmap" || value === undefined || value === null) return;
            if (Array.isArray(value)) value.forEach((item) => form.append(`${key}[]`, String(item)));
            else form.append(key, String(value));
        });
        form.append("roadmap", payload.roadmap);
        return postMultipart<StudentRegisterResponse>("/api/register/student", form);
    }

    const { roadmap: _roadmap, ...jsonPayload } = payload;
    return postJson<typeof jsonPayload, StudentRegisterResponse>("/api/register/student", jsonPayload);
}

export async function registerSupport(
    payload: RegisterPayload,
): Promise<RegisterResponse> {
    return postJson<RegisterPayload, RegisterResponse>(
        "/api/register-support",
        payload,
    );
}

export function getCurrentUser(): Promise<PanelUser> {
    return getJson<PanelUser>("/api/me");
}

export async function logout(): Promise<void> {
    try {
        await postJson("/api/logout", {});
    } catch {
        // خروج سمت کلاینت همیشه انجام می‌شود؛ خطای شبکه مانع خروج نمی‌شود
    }
}
