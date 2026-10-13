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
    // کلید پایه‌ی «صندوق ورودی» جدا از کلید «یک گفتگو» و «اعلان‌ها» است تا
    // بتوان همه‌ی نمای‌های فهرست (هر `studentId`) را با یک پیشوند باطل کرد؛
    // وگرنه پس از خواندن/پاسخ، ردیف‌های فهرست تا poll بعدی کهنه می‌ماندند.
    inboxAll: ["support", "inbox"] as const,
    inbox: (studentId: number | null) =>
        ["support", "inbox", { studentId }] as const,
    students: ["support", "students"] as const,
    conversation: (id: number) => ["support", "conversation", id] as const,
    notifications: ["support", "notifications"] as const,
    teamSupervision: ["observer", "team-supervision"] as const,
};

/** یک عضو تیم در نمای «نظارت بر روی تیم». */
export type TeamMember = {
    id: number;
    name: string;
    phone: string | null;
    support_type: "web" | "ai" | null;
    conversations_count: number;
    unread_conversations_count: number;
    on_shift: boolean;
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

/**
 * «نظارت بر روی تیم»: اعضای هم‌نوع ناظر با آمار گفتگو و شیفت. متن گفتگو
 * اینجا برنمی‌گردد؛ برای خواندن باید به حساب همان پشتیبان وارد شود.
 */
export function getTeamSupervision(): Promise<{
    data: TeamMember[];
    support_type: "web" | "ai" | null;
}> {
    return getJson("/api/observer/team-supervision");
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
};

export function sendReply({
    conversationId,
    body,
    codeMode,
    language,
    attachment,
    signal,
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

        return postMultipart(url, formData, signal);
    }

    return postJson(
        url,
        {
            body,
            code_mode: codeMode,
            language: language ?? null,
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
