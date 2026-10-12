import { deleteJson, getJson, postJson, putJson } from "@/shared/api/http";
import type { PanelUser } from "@/shared/lib/auth-storage";

export const adminKeys = {
    supports: ["admin", "supports"] as const,
    admins: ["admin", "admins"] as const,
};

export type SupportType = "web" | "ai";

export type CreateSupportPayload = {
    name: string;
    phone: string;
    password: string;
    support_type: SupportType;
};

export type UpdateSupportPayload = {
    name: string;
    phone: string;
    password?: string;
};

export type SupportListItem = Pick<
    PanelUser,
    "id" | "name" | "phone" | "support_type"
> & {
    role?: "support" | "account_observer";
    created_at: string;
};

export type AdminListItem = {
    id: number;
    name: string;
    phone: string | null;
    role: "admin";
    created_at: string;
    updated_at: string;
};

export type CreateAdminPayload = {
    name: string;
    phone: string;
    password: string;
};

export type UpdateAdminPayload = Omit<CreateAdminPayload, "password"> & {
    password?: string;
};

export type AdminMutationResponse = {
    message: string;
    user: AdminListItem;
};

export function createSupport(
    payload: CreateSupportPayload,
): Promise<{ message: string; user: PanelUser }> {
    return postJson<CreateSupportPayload, { message: string; user: PanelUser }>(
        "/api/admin/supports",
        payload,
    );
}

export function getSupports(): Promise<{ data: SupportListItem[] }> {
    return getJson<{ data: SupportListItem[] }>("/api/admin/supports");
}

export function updateSupport(
    supportId: number,
    payload: UpdateSupportPayload,
): Promise<{ message: string; user: PanelUser }> {
    return putJson<UpdateSupportPayload, { message: string; user: PanelUser }>(
        `/api/admin/supports/${supportId}`,
        payload,
    );
}

export function deleteSupport(supportId: number): Promise<{ message: string }> {
    return deleteJson<{ message: string }>(`/api/admin/supports/${supportId}`);
}

export function setAccountObserver(supportId: number): Promise<{ message: string; user: PanelUser }> {
    return putJson(`/api/admin/supports/${supportId}/account-observer`, {});
}

export function revokeAccountObserver(supportId: number): Promise<{ message: string; user: PanelUser }> {
    return deleteJson(`/api/admin/supports/${supportId}/account-observer`);
}

export function getObservers(supportType: SupportType): Promise<{ data: SupportListItem[] }> {
    return getJson("/api/admin/supports", { support_type: supportType, role: "account_observer" });
}

export function getAdmins(): Promise<{ data: AdminListItem[] }> {
    return getJson<{ data: AdminListItem[] }>("/api/admin/admins");
}

export function createAdmin(
    payload: CreateAdminPayload,
): Promise<AdminMutationResponse> {
    return postJson<CreateAdminPayload, AdminMutationResponse>(
        "/api/admin/admins",
        payload,
    );
}

export function updateAdmin(
    adminId: number,
    payload: UpdateAdminPayload,
): Promise<AdminMutationResponse> {
    return putJson<UpdateAdminPayload, AdminMutationResponse>(
        `/api/admin/admins/${adminId}`,
        payload,
    );
}

export function deleteAdmin(adminId: number): Promise<{ message: string }> {
    return deleteJson<{ message: string }>(`/api/admin/admins/${adminId}`);
}
