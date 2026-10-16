import { ChevronRight, MessageSquareWarning } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ComplaintForm } from "../components/ComplaintForm";
import {
    COMPLAINT_STATUS_LABELS,
    useMyComplaints,
    type MyComplaint,
} from "../services/studentComplaintService";
import { TYPE_LABELS } from "../services/complaint-service";
import { formatComplaintDateTime } from "../utils/formatComplaintDate";
import { Alert } from "@/shared/ui/alert";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatusPill } from "@/shared/ui/status-pill";

function statusTone(status: string): "info" | "warning" | "success" {
    if (status === "resolved") return "success";
    if (status === "in_progress") return "warning";

    return "info";
}

/**
 * صفحه‌ی «نارضایتی» دانشجو.
 *
 * دو کار را در یک صفحه جمع کرده تا دانشجو هم جای ثبت داشته باشد و هم
 * وضعیت نارضایتی‌های قبلی‌اش را ببیند؛ تغییر وضعیت از پنل سوپر ادمین با
 * اعلان به او اطلاع داده می‌شود و همین فهرست به‌روز می‌شود.
 *
 * اگر کاربر از داخل یک گفتگو آمده باشد، `conversation_id` در کوئری
 * می‌آید تا نارضایتیِ نوع «پشتیبانی» به همان گفتگو — و در نتیجه به همان
 * پشتیبان — نسبت داده شود.
 */
export default function MyComplaintsPage() {
    const [searchParams] = useSearchParams();
    const rawConversationId = Number(searchParams.get("conversation_id"));
    const conversationId =
        Number.isInteger(rawConversationId) && rawConversationId > 0
            ? rawConversationId
            : undefined;

    const myComplaints = useMyComplaints();
    const complaints = myComplaints.data ?? [];

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            <Card className="p-6 md:p-7">
                <div className="flex items-start gap-3">
                    <MessageSquareWarning className="mt-1 size-6 shrink-0 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold text-ink md:text-3xl">
                            نارضایتی
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-ink-2">
                            اگر از پشتیبانی، منتور یا دوره ناراضی هستید ثبت
                            کنید و پایین همین صفحه، وضعیت نارضایتی‌های قبلی‌تان
                            را ببینید.
                        </p>
                    </div>
                </div>

                <Link
                    to="/chat"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                    <ChevronRight className="size-4" />
                    بازگشت به گفتگو
                </Link>
            </Card>

            <ComplaintForm conversationId={conversationId} />

            <Card className="p-6 md:p-7">
                <h2 className="text-xl font-bold text-ink">
                    نارضایتی‌های من
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-2">
                    هر تغییر وضعیتی که کارشناسان روی نارضایتی شما بگذارند،
                    همین‌جا دیده می‌شود.
                </p>

                <div className="mt-5 space-y-3">
                    {myComplaints.isPending ? (
                        <>
                            <Skeleton className="h-28 rounded-2xl" />
                            <Skeleton className="h-28 rounded-2xl" />
                        </>
                    ) : myComplaints.isError ? (
                        <Alert tone="danger">
                            {myComplaints.error.message}
                        </Alert>
                    ) : complaints.length === 0 ? (
                        <p className="rounded-2xl border border-hairline bg-surface-2 px-4 py-8 text-center text-sm text-ink-2">
                            هنوز نارضایتی‌ای ثبت نکرده‌اید.
                        </p>
                    ) : (
                        complaints.map((complaint) => (
                            <MyComplaintCard
                                key={complaint.id}
                                complaint={complaint}
                            />
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
}

function MyComplaintCard({ complaint }: { complaint: MyComplaint }) {
    return (
        <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-3 px-3 py-1 text-xs font-medium text-ink">
                    {TYPE_LABELS[complaint.type] ?? complaint.type}
                </span>
                <span className="text-sm font-semibold text-ink">
                    {complaint.subject}
                </span>
                <StatusPill tone={statusTone(complaint.status)}>
                    {COMPLAINT_STATUS_LABELS[complaint.status] ??
                        complaint.status}
                </StatusPill>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink-2">
                {complaint.description}
            </p>
            <p className="mt-2 text-xs text-ink-2">
                {formatComplaintDateTime(complaint.created_at)}
            </p>
        </div>
    );
}