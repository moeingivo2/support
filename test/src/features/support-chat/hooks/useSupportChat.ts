import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/shared/ui/toast";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
import { playNewMessageSound } from "../utils/notification-sound";
import {
    getSupportConversation,
    getObserverConversation,
    getSupportInbox,
    getSupportNotifications,
    getSupportStudents,
    supportChatKeys,
} from "../services/support-chat-service";
import type { SupportNotifications } from "../types/support-chat";

const LIST_POLL_INTERVAL = 15000;
const MESSAGE_POLL_INTERVAL = 5000;

export function useSupportInbox(studentId: number | null = null, ownerId?: number) {
    return useQuery({
        queryKey: [...supportChatKeys.inbox(studentId), ownerId],
        queryFn: () => getSupportInbox(studentId, ownerId),
        refetchInterval: LIST_POLL_INTERVAL,
    });
}

/** فهرست دانشجویان با تعداد گفتگو؛ نمای پیش‌فرض پنل پشتیبان. */
export function useSupportStudents(ownerId?: number) {
    return useQuery({
        queryKey: [...supportChatKeys.students, ownerId],
        queryFn: () => getSupportStudents(ownerId),
        refetchInterval: LIST_POLL_INTERVAL,
    });
}

export function useSupportConversation(conversationId: number | null, ownerId?: number) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: [...supportChatKeys.conversation(conversationId ?? 0), ownerId],
        queryFn: async () => {
            const queryKey = supportChatKeys.conversation(conversationId as number);
            const previous = queryClient.getQueryData<{ data: import("../types/support-chat").SupportConversationDetail }>(queryKey);
            const afterId = Math.max(0, ...(previous?.data.messages ?? []).map((message) => message.id));
            const response = ownerId === undefined
                ? await getSupportConversation(conversationId as number, afterId)
                : await getObserverConversation(conversationId as number, afterId, ownerId);
            if (!previous || afterId === 0) return response;
            return {
                data: {
                    ...response.data,
                    messages: [...response.data.messages, ...previous.data.messages].sort((a, b) => b.id - a.id).slice(0, 100),
                },
            };
        },
        enabled: conversationId !== null,
        refetchInterval: MESSAGE_POLL_INTERVAL,
    });
}

/**
 * نظرسنجی دوره‌ای صندوق ورودی به‌همراه اعلان پیام جدید برای گفتگوهایی که
 * پشتیبان در حال حاضر روی آن‌ها باز نکرده است.
 */
export function useNewMessageAlert(activeConversationId: number | null, ownerId?: number) {
    const toast = useToast();
    const seenRef = useRef<Set<string> | null>(null);

    const query = useQuery({
        queryKey: [...supportChatKeys.notifications, ownerId],
        queryFn: () => getSupportNotifications(ownerId),
        refetchInterval: LIST_POLL_INTERVAL,
        refetchOnWindowFocus: true,
    });

    const unreadConversations = query.data?.unread;

    useEffect(() => {
        if (!unreadConversations) return;

        const stamps = unreadConversations.map((item) =>
            `${item.conversation_id}:${item.last_message_at ?? ""}`,
        );

        if (seenRef.current === null) {
            seenRef.current = new Set(stamps);
            return;
        }

        const previouslySeen = seenRef.current;
        const newMessages = unreadConversations.filter((item) =>
            !previouslySeen.has(`${item.conversation_id}:${item.last_message_at ?? ""}`) &&
            item.conversation_id !== activeConversationId,
        );
        seenRef.current = new Set(stamps);
        if (newMessages.length === 0) return;

        playNewMessageSound();

        // طبق سیاست حریم خصوصی، اعلان فقط نام دانشجو و تعداد پیام را نشان می‌دهد
        const unread = query.data?.unread_total ?? 0;

        const firstMessage = newMessages[0];
        toast.warning(
            newMessages.length === 1
                ? `پیام جدید از ${firstMessage?.student_name ?? "دانشجو"} — مجموع ${toPersianDigits(unread)} پیام خوانده‌نشده`
                : `پیام جدید در ${toPersianDigits(newMessages.length)} گفتگو — مجموع ${toPersianDigits(unread)} پیام خوانده‌نشده`,
        );
    }, [unreadConversations, activeConversationId, query.data?.unread_total, toast]);

    return query;
}

export function supportUnreadBadge(
    notifications: SupportNotifications | undefined,
): number {
    return notifications?.unread_total ?? 0;
}
