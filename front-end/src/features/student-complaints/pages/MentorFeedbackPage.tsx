import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MessageSquareWarning, Send } from "lucide-react";
import { useAuth } from "@/shared/services/auth-context";
import { Link } from "react-router-dom";
import { getJson, postJson, putJson } from "@/shared/api/http";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

type MentorFeedback = {
    id: number;
    mentor_name: string;
    description: string;
    status: "open" | "in_progress" | "resolved";
    created_at: string;
    student: { id: number; name: string; phone: string | null };
};
type Page<T> = { data: T[]; current_page: number; last_page: number; total: number };

const STATUS_LABEL: Record<MentorFeedback["status"], string> = {
    open: "در انتظار بررسی",
    in_progress: "در حال پیگیری",
    resolved: "رسیدگی‌شده",
};

export default function MentorFeedbackPage() {
    const { user } = useAuth();
    const isStudent = user?.role === "student";
    const isAdmin = user?.role === "admin";
    const backPath = isStudent ? "/chat" : isAdmin ? "/" : "/inbox";
    const backLabel = isStudent ? "بازگشت به گفتگو" : isAdmin ? "بازگشت به داشبورد" : "بازگشت به گفتگوها";
    const [mentorName, setMentorName] = useState("");
    const [description, setDescription] = useState("");
    const [success, setSuccess] = useState("");
    const queryClient = useQueryClient();
    const feedbackQuery = useQuery({
        queryKey: ["mentor-feedback"],
        queryFn: () => getJson<Page<MentorFeedback>>("/api/mentor-feedback", { per_page: 100 }),
        enabled: !isStudent,
    });
    const createMutation = useMutation({
        mutationFn: () => postJson("/api/mentor-feedback", { mentor_name: mentorName.trim(), description: description.trim() }),
        onSuccess: () => {
            setMentorName("");
            setDescription("");
            setSuccess("نارضایتی شما ثبت شد و برای بررسی به تیم پشتیبانی ارسال شد.");
        },
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: MentorFeedback["status"] }) => putJson(`/api/mentor-feedback/${id}`, { status }),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["mentor-feedback"] }),
    });

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6">
            <div className="flex justify-start">
                <Link to={backPath} className="ms-auto inline-flex h-11 items-center gap-1.5 rounded-2xl border border-hairline bg-surface-2 px-3 text-sm font-semibold text-ink-2 transition hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2">
                    <ChevronRight className="size-4" aria-hidden="true" />
                    {backLabel}
                </Link>
            </div>
            <Card className="p-6 md:p-7">
                <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-warn-soft text-alret-gold"><MessageSquareWarning /></span>
                    <div>
                        <h1 className="text-2xl font-bold text-ink">{isStudent ? "ثبت نارضایتی از منتور" : "نارضایتی از منتور"}</h1>
                        <p className="mt-2 text-sm text-ink-2">{isStudent ? "نام منتور و توضیحات را وارد کنید تا پشتیبانی پیگیری کند." : "درخواست‌های دانشجویان همراه با مشخصات و زمان ثبت."}</p>
                    </div>
                </div>
            </Card>

            {isStudent ? (
                <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
                <Card className="space-y-5 p-6 md:p-7">
                    {success ? <Alert tone="success">{success}</Alert> : null}
                    {createMutation.isError ? <Alert tone="danger">ثبت نارضایتی انجام نشد. دوباره تلاش کنید.</Alert> : null}
                    <div className="space-y-2"><Label htmlFor="mentor-name">نام و نام خانوادگی منتور</Label><Input id="mentor-name" value={mentorName} onChange={(event) => setMentorName(event.target.value)} maxLength={255} required /></div>
                    <div className="space-y-2"><Label htmlFor="mentor-feedback">توضیحات</Label><Textarea id="mentor-feedback" value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={5000} rows={6} required placeholder="درباره موضوع نارضایتی توضیح دهید…" /></div>
                    <Button type="submit" className="w-full sm:w-auto" disabled={createMutation.isPending || mentorName.trim().length < 2 || description.trim().length < 10}><Send />{createMutation.isPending ? "در حال ارسال…" : "ارسال نارضایتی"}</Button>
                </Card>
                </form>
            ) : feedbackQuery.isError ? <Alert tone="danger">دریافت نارضایتی‌ها ناموفق بود.</Alert> : (
                <div className="space-y-3">
                    {(feedbackQuery.data?.data ?? []).map((item) => (
                        <Card key={item.id} className="space-y-4 p-5">
                            <div className="flex flex-wrap justify-between gap-3">
                                <div><p className="font-bold text-ink">منتور: {item.mentor_name}</p><p className="mt-1 text-sm text-ink-2">دانشجو: {item.student.name} · {item.student.phone ?? "بدون شماره"}</p></div>
                                <div className="text-left text-xs text-ink-2">{new Date(item.created_at).toLocaleString("fa-IR")}<p className="mt-1">{STATUS_LABEL[item.status]}</p></div>
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-7 text-ink">{item.description}</p>
                            <div className="flex items-center gap-2"><Label htmlFor={`feedback-status-${item.id}`}>وضعیت</Label><select id={`feedback-status-${item.id}`} value={item.status} onChange={(event) => updateMutation.mutate({ id: item.id, status: event.target.value as MentorFeedback["status"] })} className="h-10 rounded-xl border border-hairline bg-surface-2 px-3 text-sm text-ink"><option value="open">در انتظار بررسی</option><option value="in_progress">در حال پیگیری</option><option value="resolved">رسیدگی‌شده</option></select></div>
                        </Card>
                    ))}
                    {feedbackQuery.data?.data.length === 0 ? <Card className="p-8 text-center text-sm text-ink-2">هنوز نارضایتی‌ای ثبت نشده است.</Card> : null}
                </div>
            )}
        </div>
    );
}
