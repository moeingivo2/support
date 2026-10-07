import { downloadFile, type DownloadedFile } from "@/shared/api/http";

export type ActivityReportFilters = {
    user_id: string;
    from: string;
    to: string;
};

export function downloadActivityReport(
    filters: ActivityReportFilters,
    fallbackFilename: string,
): Promise<DownloadedFile> {
    return downloadFile(
        "/api/admin/activity-report/export",
        filters,
        fallbackFilename,
    );
}
