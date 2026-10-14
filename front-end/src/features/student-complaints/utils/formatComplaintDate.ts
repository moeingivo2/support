import { formatJalaliDateTime } from "@/shared/lib/jalali";

/** تاریخ و ساعت ثبت نارضایتی، شمسی: «۲۲ مهر ۱۴۰۵، ۱۴:۳۰». */
export function formatComplaintDateTime(date: string): string {
    return formatJalaliDateTime(date);
}