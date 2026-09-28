import { useQuery } from "@tanstack/react-query";
import {
    chatKeys,
    getConversation,
    getConversations,
} from "../services/chat-service";

const POLL_INTERVAL = 5000;

export function useConversations() {
    return useQuery({
        queryKey: chatKeys.conversations,
        queryFn: getConversations,
        refetchInterval: POLL_INTERVAL,
    });
}

export function useConversationMessages(conversationId: number | null) {
    return useQuery({
        queryKey: chatKeys.conversation(conversationId ?? 0),
        queryFn: () => getConversation(conversationId as number),
        enabled: conversationId !== null,
        refetchInterval: POLL_INTERVAL,
    });
}
