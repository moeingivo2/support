import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import {
    COMPLAINT_STATUS_LABELS,
    useComplaintNotifications,
    useMarkNotificationsRead,
} from "@/features/student-complaints/services/studentComplaintService";
import { Button } from "@/shared/ui/button";
import { StatusPill } from "@/shared/ui/status-pill";
import { cn } from "@/shared/lib/utils";

/**
 * زنگ اعلان‌های دانشجو.
 *
 * تنها اعلانِ امروز، تغییر وضعیت نارضایتی در پنل سوپر ادمین است، پس هر
 * اعلان لینک مستقیم به همان نارضایتی دارد تا دانشجو با یک کلیک ببیندش.
 * اعلان‌ها وقتی خوانده‌شده علامت می‌خورند که کاربر پنجره را باز کند، نه با
 * باز شدن صفحه — وگرنه کاربر بی‌خبر می‌ماند که اعلان دیده شده.
 */
export function StudentNotificationsBell() {
    const [open, setOpen] = useState(false);
    const notificationsQuery = useComplaintNotifications();
    const markRead = useMarkNotificationsRead();

    const unread = notificationsQuery.data?.unread ?? 0;
    const notifications = notificationsQuery.data?.data ?? [];

    // با باز شدن پنجره، اعلان‌های دیده‌شده خوانده می‌شوند تا بج قرمز
    // بی‌دلیل باقی نماند.
    useEffect(() => {
        if (open && unread > 0 && !markRead.isPending) {
            markRead.mutate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen((current) => !current)}
                aria-label={
                    unread > 0
                        ? `اعلان‌ها (${unread} خوانده‌نشده)`
                        : "اعلان‌ها"
                }
                aria-expanded={open}
                className="size-10 rounded-xl border-hairline bg-surface"
            >
                <Bell />
                {unread > 0 ? (
                    <span
                        className={cn(
                            "absolute -top-1 -left-1 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white",
                            "h-5",
                        )}
                    >
                        {unread > 9 ? "۹+" : unread.toLocaleString("fa-IR")}
                    </span>
                ) : null}
            </Button>

            {open ? (
                <>
                    {/* کلیک بیرون پنجره را می‌بندد. */}
                    <button
                        type="button"
                        aria-hidden="true"
                        tabIndex={-1}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-30 cursor-default"
                    />

                    <div className="absolute left-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-hairline bg-surface shadow-[var(--c-shadow-soft)]">
                        <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
                            <p className="text-sm font-bold text-ink">اعلان‌ها</p>
                            {notifications.length > 0 ? (
                                <CheckCheck className="size-4 text-ink-3" />
                            ) : null}
                        </div>

                        {notifications.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-ink-2">
                                اعلانی ندارید.
                            </p>
                        ) : (
                            <ul className="max-h-80 overflow-y-auto">
                                {notifications.map((notification) => (
                                    <li key={notification.id}>
                                        <Link
                                            to={`/complaints`}
                                            onClick={() => setOpen(false)}
                                            className={cn(
                                                "block space-y-1 border-b border-hairline px-4 py-3 last:border-b-0 transition-colors hover:bg-surface-2",
                                                !notification.read_at &&
                                                    "bg-primary-soft/40",
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-ink">
                                                    {notification.title}
                                                </p>
                                                <StatusPill
                                                    tone={
                                                        notification.status ===
                                                        "resolved"
                                                            ? "success"
                                                            : notification.status ===
                                                                "in_progress"
                                                              ? "warning"
                                                              : "info"
                                                    }
                                                >
                                                    {COMPLAINT_STATUS_LABELS[
                                                        notification.status
                                                    ] ?? notification.status}
                                                </StatusPill>
                                            </div>
                                            <p className="text-xs leading-6 text-ink-2">
                                                {notification.body}
                                            </p>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            ) : null}
        </div>
    );
}