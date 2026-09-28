import { downloadFile, getJson, type DownloadedFile } from "@/shared/api/http";
import { rankKeys } from "@/features/student-chat/services/rank-invalidation";

export type SupportRankingRow = {
    support_agent_id: number;
    name: string;
    support_type: "web" | "ai" | null;
    total_ratings: number;
    average_rating: number | null;
    latest_rating_at: string | null;
    rank: number;
};

export type SupportRankingMeta = {
    total_ratings: number;
    /** قاعده شکست تساوی که سرور اعمال کرده است */
    tie_break_rule: string;
};

export type SupportRankingResponse = {
    data: SupportRankingRow[];
    meta: SupportRankingMeta;
};

export type SupportRatingDetail = {
    index: number;
    conversation_id: number;
    student: string;
    rating_value: number;
    closure_actor: string;
    conversation_status: string;
    closed_at: string | null;
    submitted_at: string | null;
};

export const supportRankingKeys = {
    // کلید برگه با کلید مشترکِ بی‌اعتبارسازی یکی است تا هر ثبت امتیاز
    // بلافاصله جدول را تازه کند
    board: rankKeys.board,
    detail: (agentId: number) =>
        ["admin", "support-ranking", agentId] as const,
};

export function getSupportRanking(): Promise<SupportRankingResponse> {
    return getJson<SupportRankingResponse>("/api/admin/support-ranking");
}

export function getSupportRankingDetail(agentId: number): Promise<{
    data: SupportRankingRow;
    ratings: SupportRatingDetail[];
}> {
    return getJson(`/api/admin/support-ranking/${agentId}`);
}

export function downloadSupportRanking(): Promise<DownloadedFile> {
    return downloadFile(
        "/api/admin/support-ranking/export",
        {},
        "support-ranking.xls",
    );
}
