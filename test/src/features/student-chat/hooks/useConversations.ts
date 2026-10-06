import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    chatKeys,
    getConversation,
    getConversations,
} from "../services/chat-service";

const LIST_POLL_INTERVAL = 15000;
const MESSAGE_POLL_INTERVAL = 5000;

export function useConversations() {
    return useQuery({
        queryKey: chatKeys.conversations,
        queryFn: getConversations,
        refetchInterval: LIST_POLL_INTERVAL,
    });
}

export function useConversationMessages(conversationId: number | null) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: chatKeys.conversation(conversationId ?? 0),
        queryFn: async () => {
            const queryKey = chatKeys.conversation(conversationId as number);
            const previous = queryClient.getQueryData<{ data: import("../types/chat").ConversationDetail }>(queryKey);
            const afterId = Math.max(0, ...(previous?.data.messages ?? []).map((message) => message.id));
            const response = await getConversation(conversationId as number, afterId);
            if (!previous || afterId === 0) return response;
            return { data: { ...response.data, messages: [...response.data.messages, ...previous.data.messages].sort((a, b) => b.id - a.id).slice(0, 200) } };
        },
        enabled: conversationId !== null,
        refetchInterval: MESSAGE_POLL_INTERVAL,
    });
}
