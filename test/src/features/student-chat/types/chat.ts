export type MessageType = "text" | "code" | "image" | "file" | "voice";

export type ActorRole = "student" | "support" | "observer" | "system";

/**
 * چرخه‌ی حیات گفتگو:
 *   open → در جریان
 *   closing_pending_rating → منتظر امتیاز دانشجو
 *   closed → بسته‌شده و برگشت‌ناپذیر
 */
export type ConversationStatus =
    | "open"
    | "closing_pending_rating"
    | "closed";

export type ChatSender = {
    id: number | null;
    name: string | null;
};

export type ChatMessage = {
    id: number;
    type: MessageType;
    body: string | null;
    language: string | null;
    attachment_name: string | null;
    attachment_mime: string | null;
    attachment_size: number | null;
    duration_seconds: number | null;
    url: string | null;
    actor_role: ActorRole;
    actor_role_label: string;
    /** نام نویسنده در لحظه‌ی ارسال — برای حسابرسی ناظر */
    actor_name: string | null;
    sender: ChatSender;
    is_edited: boolean;
    created_at: string | null;
};

export type ConversationRating = {
    rating_value: number;
    closure_actor: "student" | "support" | null;
    submitted_at: string | null;
};

export type ConversationSummary = {
    id: number;
    title: string;
    last_message_preview: string | null;
    last_message_at: string | null;
    unread_count: number;
    status: ConversationStatus;
    status_label: string;
    closure_actor: "student" | "support" | null;
    closed_at: string | null;
    /** پس از بستن توسط پشتیبان، دانشجو هنوز امتیاز نداده است */
    can_rate: boolean;
    has_rating: boolean;
    support: { id: number; name: string } | null;
};

export type ConversationDetail = {
    conversation: ConversationSummary;
    rating: ConversationRating | null;
    messages: ChatMessage[];
};

export type SendMessageResponse = {
    message: string;
    data: ChatMessage;
    profile?: import("@/features/student-account/types/student-profile").StudentProfilePayload;
};

export type OutgoingAttachment = {
    file: File;
    durationSeconds?: number;
};
