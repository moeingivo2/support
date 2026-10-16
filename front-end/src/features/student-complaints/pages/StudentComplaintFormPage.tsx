import { ChevronRight, MessageSquareWarning } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ComplaintForm } from "../components/ComplaintForm";
import { Card } from "@/shared/ui/card";

/**
 * صفحه‌ی ثبت نارضایتی توسط دانشجو.
 *
 * جای «نارضایتی از منتور» قبلی را می‌گیرد، ولی حالا هر سه نوع در یک
 * صفحه‌اند: پشتیبانی، منتور و دوره.
 *
 * اگر کاربر از داخل یک گفتگو آمده باشد، `conversation_id` در کوئری
 * می‌آید تا نارضایتیِ نوع «پشتیبانی» به همان گفتگو — و در نتیجه به همان
 * پشتیبان — نسبت داده شود.
 */
export default function StudentComplaintFormPage() {
    const [searchParams] = useSearchParams();
    const conversationId = Number(searchParams.get("conversation_id"));
    const validConversationId =
        Number.isInteger(conversationId) && conversationId > 0
            ? conversationId
            : undefined;

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            <Card className="p-6 md:p-7">
                <div className="flex items-start gap-3">
                    <MessageSquareWarning className="mt-1 size-6 shrink-0 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold text-ink md:text-3xl">
                            ثبت نارضایتی
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-ink-2">
                            اگر از پشتیبانی، منتور یا دوره ناراضی هستید همین‌جا
                            بنویسید. کارشناسان بررسی می‌کنند و پیگیری می‌شود.
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

            <ComplaintForm conversationId={validConversationId} />
        </div>
    );
}