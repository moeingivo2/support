import { useEffect, useRef } from "react";
import {
    useMyComplaints,
    type MyComplaint,
} from "../services/studentComplaintService";
import { useToast } from "@/shared/ui/toast";

/**
 * کلیدِ اسنپ‌شاتِ وضعیت نارضایتی‌ها در مرورگر دانشجو.
 *
 * عمداً در `localStorage` است و نه روی سرور: اعلانِ وضعیت چیزی نیست که
 * لازم باشد تا ابد نگه داشته شود، و کاربر فقط می‌خواهد بفهمد «الان» وضعیت
 * عوض شده یا نه. با این کار نیازی به جدول اعلان، بج قرمز یا زنگ نیست.
 */
const SNAPSHOT_KEY = "aio_complaint_statuses";

function readSnapshot(): Record<string, string> | null {
    try {
        const raw = localStorage.getItem(SNAPSHOT_KEY);

        return raw === null ? null : (JSON.parse(raw) as Record<string, string>);
    } catch {
        return null;
    }
}

function writeSnapshot(complaints: MyComplaint[]): void {
    const snapshot = Object.fromEntries(
        complaints.map((complaint) => [String(complaint.id), complaint.status]),
    );

    try {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch {
        // حالت مرور خصوصی یا پر بودن حافظه: بی‌خیال، فقط توست از دست می‌رود.
    }
}

function statusChanged(
    snapshot: Record<string, string>,
    complaints: MyComplaint[],
): boolean {
    return complaints.some((complaint) => {
        const previous = snapshot[String(complaint.id)];

        // نارضایتیِ تازه که قبلاً ندیده‌ایم «تغییر» حساب نمی‌شود؛ خودِ
        // ثبتش را در فهرست می‌بیند.
        return (
            previous !== undefined &&
            previous !== complaint.status
        );
    });
}

/**
 * توستِ بالای صفحه وقتی وضعیت نارضایتی عوض شده.
 *
 * خودش دوره‌ای فهرست نارضایتی‌های دانشجو را می‌خواند و با اسنپ‌شاتِ
 * ذخیره‌شده در مرورگر مقایسه می‌کند؛ اگر چیزی تغییر کرده باشد یک توست
 * بالای صفحه نشان می‌دهد و خودبه‌خود محو می‌شود. اولین بار فقط اسنپ‌شات
 * ثبت می‌شود تا توست الکی نشود.
 */
export function ComplaintStatusToast() {
    const complaintsQuery = useMyComplaints();
    const toast = useToast();
    const seeded = useRef(false);

    useEffect(() => {
        const complaints = complaintsQuery.data;

        if (complaints === undefined || seeded.current) {
            return;
        }

        seeded.current = true;

        const snapshot = readSnapshot();

        // اولین بازدید در این مرورگر: فقط ثبتِ وضعیتِ فعلی.
        if (snapshot !== null && statusChanged(snapshot, complaints)) {
            toast.info("وضعیت نارضایتی شما تغییر کرد", {
                position: "top",
            });
        }

        writeSnapshot(complaints);
    }, [complaintsQuery.data, toast]);

    return null;
}