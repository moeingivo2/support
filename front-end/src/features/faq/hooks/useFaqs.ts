import { useQuery } from "@tanstack/react-query";
import type { ChannelFilter } from "@/shared/lib/content-channel";
import { faqKeys, getFaqs } from "../services/faq-service";

export function useFaqs(
    category: string,
    search: string,
    channel: ChannelFilter = "all",
) {
    return useQuery({
        queryKey: faqKeys.list(category, search, channel),
        queryFn: () => getFaqs({ category, search, channel }),
    });
}