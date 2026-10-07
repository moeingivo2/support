import { HttpApiError } from "@/shared/api/http";

export function getChatSendError(error: unknown, hasAttachment: boolean): string {
    if (navigator.onLine === false || (error instanceof HttpApiError && error.status === 0)) {
        return "اتصال اینترنت برقرار نیست.";
    }

    return hasAttachment ? "ارسال فایل انجام نشد." : "ارسال پیام انجام نشد.";
}
