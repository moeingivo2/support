import { getJson, postJson, postMultipart } from "@/shared/api/http";
import type {
    ChatMessage,
    OutgoingAttachment,
} from "@/features/student-chat/types/chat";
import type {
    SupportConversationDetail,
    SupportConversationSummary,
    SupportInboxResponse,
    SupportNotifications,
    SupportStudentRow,
} from "../types/support-chat";

export const supportChatKeys = {
    inbox: (studentId: number | null) =>
        ["support", "conversations", { studentId }] as const,
    students: ["support", "students"] as const,
    conversation: (id: number) => ["support", "conversations", id] as const,
    notifications: ["support", "conversations", "notifications"] as const,
};

/** دانشجویان به‌همراه تعداد گفتگو، جدیدترین فعالیت اول. */
export function getSupportStudents(ownerId?: number): Promise<{
    data: SupportStudentRow[];
}> {
    return getJson<{ data: SupportStudentRow[] }>(
        "/api/support/conversations/students",
        { owner_id: ownerId },
    );
}

export function getObserverSupports(): Promise<{ data: import("@/features/admin/services/admin-service").SupportListItem[] }> {
    return getJson("/api/support/conversations/managed-supports");
}

export function getSupportInbox(
    studentId: number | null = null,
    ownerId?: number,
): Promise<SupportInboxResponse> {
    return getJson<SupportInboxResponse>("/api/support/conversations", {
        student_id: studentId ?? undefined,
        owner_id: ownerId,
    });
}

export function getSupportNotifications(ownerId?: number): Promise<SupportNotifications> {
    return getJson<SupportNotifications>(
        "/api/support/conversations/notifications",
        { owner_id: ownerId },
    );
}

export function getSupportConversation(
    id: number,
    afterId?: number,
    ownerId?: number,
): Promise<{ data: SupportConversationDetail }> {
    return getJson<{ data: SupportConversationDetail }>(
        `/api/support/conversations/${id}`,
        { after_id: afterId || undefined, owner_id: ownerId },
    );
}

export function getObserverConversation(id: number, afterId: number, ownerId?: number): Promise<{ data: SupportConversationDetail }> {
    return getJson<{ data: SupportConversationDetail }>(`/api/support/conversations/${id}`, {
        after_id: afterId || undefined,
        owner_id: ownerId,
    });
}

export type SendReplyInput = {
    conversationId: number;
    body: string;
    codeMode: boolean;
    language?: string;
    attachment?: OutgoingAttachment;
    signal?: AbortSignal;
    actingSupportId?: number;
    observerActorName?: string;
};

export function sendReply({
    conversationId,
    body,
    codeMode,
    language,
    attachment,
    signal,
    actingSupportId,
    observerActorName,
}: SendReplyInput): Promise<{ message: string; data: ChatMessage }> {
    const url = `/api/support/conversations/${conversationId}/messages`;

    if (attachment) {
        const formData = new FormData();
        formData.append("body", body);
        formData.append("code_mode", codeMode ? "1" : "0");
        if (language) formData.append("language", language);
        if (observerActorName) formData.append("actor_name", observerActorName);
        if (attachment.durationSeconds) {
            formData.append(
                "duration_seconds",
                String(attachment.durationSeconds),
            );
        }
        formData.append("attachment", attachment.file);

        if (actingSupportId) formData.append("acting_support_id", String(actingSupportId));
        return postMultipart(url, formData, signal);
    }

    return postJson(
        url,
        {
            body,
            code_mode: codeMode,
            language: language ?? null,
            acting_support_id: actingSupportId ?? null,
            actor_name: observerActorName ?? null,
        },
        signal,
    );
}

/**
 * بستن گفتگو توسط پشتیبان — بدون الزام امتیاز.
 * ناظر به این سرویس دسترسی ندارد و سرور هم درخواست او را رد می‌کند.
 */
export function closeSupportConversation(
    conversationId: number,
    closureReason?: string,
): Promise<{ message: string; data: SupportConversationSummary }> {
    return postJson(`/api/support/conversations/${conversationId}/close`, {
        closure_confirmed: true,
        closure_reason: closureReason ?? null,
    });
}
