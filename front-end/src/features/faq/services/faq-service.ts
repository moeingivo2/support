import { deleteJson, getJson, postJson, putJson } from "@/shared/api/http";
import type { ChannelFilter, SupportChannel } from "@/shared/lib/content-channel";
import type { Faq } from "../types/faq";

export const faqKeys = {
    all: ["faqs"] as const,
    list: (search?: string, channel?: ChannelFilter) =>
        [...faqKeys.all, "list", { search, channel }] as const,
};

export function getFaqs(
    params: {
        search?: string;
        channel?: ChannelFilter;
    } = {},
): Promise<Faq[]> {
    return getJson<Faq[]>("/api/faqs", {
        search: params.search || undefined,
        // «هر دو» یعنی بدون فیلتر؛ سرور برای پشتیبان و ناظر اکانت در هر
        // حال این پارامتر را نادیده می‌گیرد و بخش خودشان را اعمال می‌کند.
        channel: params.channel === "all" ? undefined : params.channel,
    });
}

export type FaqPayload = {
    question: string;
    answer: string;
    /** فقط سوپر ادمین می‌تواند بخش را تعیین کند؛ برای بقیه نادیده گرفته می‌شود. */
    channel?: SupportChannel;
};

export async function createFaq(
    payload: FaqPayload,
): Promise<{ message: string; faq: Faq }> {
    return postJson<FaqPayload, { message: string; faq: Faq }>(
        "/api/faqs",
        payload,
    );
}

export async function updateFaq(
    id: number,
    payload: FaqPayload,
): Promise<{ message: string; faq: Faq }> {
    return putJson<FaqPayload, { message: string; faq: Faq }>(
        `/api/faqs/${id}`,
        payload,
    );
}

export async function deleteFaq(id: number): Promise<{ message: string }> {
    return deleteJson<{ message: string }>(`/api/faqs/${id}`);
}
