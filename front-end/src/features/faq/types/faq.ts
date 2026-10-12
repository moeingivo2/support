import type { SupportChannel } from "@/shared/lib/content-channel";

export interface Faq {
    id: number;
    question: string;
    answer: string;
    channel: SupportChannel;
    order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
