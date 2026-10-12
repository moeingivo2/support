import { useQuery } from "@tanstack/react-query";
import type { ChannelFilter } from "@/shared/lib/content-channel";
import { faqKeys, getFaqs } from "../services/faq-service";

export function useFaqs(search: string, channel: ChannelFilter = "all") {
    return useQuery({
        queryKey: faqKeys.list(search, channel),
        queryFn: () => getFaqs({ search, channel }),
    });
}