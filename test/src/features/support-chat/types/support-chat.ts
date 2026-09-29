export type SupportConversationSummary = {
    id: number;
    title: string;
    last_message_preview: string | null;
    last_message_at: string | null;
    unread_count: number;
    status: import("@/features/student-chat/types/chat").ConversationStatus;
    status_label: string;
    closure_actor: "student" | "support" | null;
    closed_at: string | null;
    closure_reason: string | null;
    is_closed: boolean;
    /** گفتگو توسط پشتیبان بسته شده و دانشجو هنوز امتیاز نداده است */
    awaiting_student_rating: boolean;
    rating_value: number | null;
    student: {
        id: number;
        name: string;
        email: string | null;
        phone: string | null;
    } | null;
    support: { id: number; name: string } | null;
};

export type SupportConversationDetail = {
    conversation: SupportConversationSummary;
    profile:
        | import("@/features/student-account/types/student-profile").StudentProfilePayload
        | null;
    messages: import("@/features/student-chat/types/chat").ChatMessage[];
};

export type SupportInboxResponse = {
    data: SupportConversationSummary[];
    unread_total: number;
};

export type SupportNotifications = {
    unread_total: number;
    unread_conversations: number;
    /** طبق سیاست حریم خصوصی، فقط نام دانشجو — بدون پیش‌نمایش متن پیام */
    unread: {
        conversation_id: number;
        student_name: string | null;
        last_message_at: string | null;
    }[];
};
