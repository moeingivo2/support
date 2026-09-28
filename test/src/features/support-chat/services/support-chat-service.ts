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
} from "../types/support-chat";

export const supportChatKeys = {
    inbox: ["support", "conversations"] as const,
    conversation: (id: number) => ["support", "conversations", id] as const,
    notifications: ["support", "conversations", "notifications"] as const,
};

export function getSupportInbox(): Promise<SupportInboxResponse> {
    return getJson<SupportInboxResponse>("/api/support/conversations");
}

export function getSupportNotifications(): Promise<SupportNotifications> {
    return getJson<SupportNotifications>(
        "/api/support/conversations/notifications",
    );
}

export function getSupportConversation(
    id: number,
): Promise<{ data: SupportConversationDetail }> {
    return getJson<{ data: SupportConversationDetail }>(
        `/api/support/conversations/${id}`,
    );
}

export type SendReplyInput = {
    conversationId: number;
    body: string;
    codeMode: boolean;
    language?: string;
    attachment?: OutgoingAttachment;
};

export function sendReply({
    conversationId,
    body,
    codeMode,
    language,
    attachment,
}: SendReplyInput): Promise<{ message: string; data: ChatMessage }> {
    const url = `/api/support/conversations/${conversationId}/messages`;

    if (attachment) {
        const formData = new FormData();
        formData.append("body", body);
        formData.append("code_mode", codeMode ? "1" : "0");
        if (language) formData.append("language", language);
        if (attachment.durationSeconds) {
            formData.append(
                "duration_seconds",
                String(attachment.durationSeconds),
            );
        }
        formData.append("attachment", attachment.file);

        return postMultipart(url, formData);
    }

    return postJson(url, {
        body,
        code_mode: codeMode,
        language: language ?? null,
    });
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
