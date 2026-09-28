import { getJson, postJson, postMultipart } from "@/shared/api/http";
import type {
    ConversationDetail,
    ConversationRating,
    ConversationSummary,
    OutgoingAttachment,
    SendMessageResponse,
} from "../types/chat";

export const chatKeys = {
    conversations: ["student", "conversations"] as const,
    conversation: (id: number) => ["student", "conversations", id] as const,
};

export function getConversations(): Promise<{ data: ConversationSummary[] }> {
    return getJson<{ data: ConversationSummary[] }>("/api/conversations");
}

export function createConversation(
    title?: string,
): Promise<{ data: ConversationSummary }> {
    return postJson("/api/conversations", { title: title ?? null });
}

export function getConversation(
    id: number,
): Promise<{ data: ConversationDetail }> {
    return getJson<{ data: ConversationDetail }>(`/api/conversations/${id}`);
}

export type SendMessageInput = {
    conversationId: number;
    body: string;
    codeMode: boolean;
    language?: string;
    attachment?: OutgoingAttachment;
};

export function sendMessage({
    conversationId,
    body,
    codeMode,
    language,
    attachment,
}: SendMessageInput): Promise<SendMessageResponse> {
    const url = `/api/conversations/${conversationId}/messages`;

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

        return postMultipart<SendMessageResponse>(url, formData);
    }

    return postJson<Record<string, unknown>, SendMessageResponse>(url, {
        body,
        code_mode: codeMode,
        language: language ?? null,
    });
}

export type CloseConversationResponse = {
    message: string;
    data: {
        conversation: ConversationSummary;
        rating: ConversationRating | null;
    };
};

/**
 * بستن گفتگو توسط دانشجو — دروازه‌ی امتیاز اجباری است.
 */
export function closeConversation(
    conversationId: number,
    ratingValue: number,
): Promise<CloseConversationResponse> {
    return postJson<Record<string, unknown>, CloseConversationResponse>(
        `/api/conversations/${conversationId}/close`,
        { rating_value: ratingValue, closure_confirmed: true },
    );
}

/**
 * امتیازدهی پس از بستن توسط پشتیبان (دعوت داخل گفتگوی بسته)
 */
export function rateConversation(
    conversationId: number,
    ratingValue: number,
): Promise<CloseConversationResponse> {
    return postJson<Record<string, unknown>, CloseConversationResponse>(
        `/api/conversations/${conversationId}/rate`,
        { rating_value: ratingValue },
    );
}
