import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, Send } from "lucide-react";
import { getJson, postJson } from "@/shared/api/http";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useToast } from "@/shared/ui/toast";
import { useAuth } from "@/shared/services/auth-context";

type Support = { id: number; name: string; phone: string | null; support_type: "web" | "ai"; role: "support" };
type Assignment = { id: number; starts_at: string; ends_at: string; user: Support };
type Schedule = { id: number; name: string; channel: string; shift_date: string; starts_at: string; ends_at: string; assignments: Assignment[] };

function clock(value: string): string { return value.slice(0, 5); }

export default function ObserverSchedulesPage() {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const channel: "web" | "ai" = user?.support_type === "ai" ? "ai" : "web";
    const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
    const [startsAt, setStartsAt] = useState("09:00");
    const [endsAt, setEndsAt] = useState("17:00");
    const [selected, setSelected] = useState<number[]>([]);
    const supportsQuery = useQuery({ queryKey: ["observer", "supports", user?.id, channel], queryFn: () => getJson<{ data: Support[] }>("/api/support/conversations/managed-supports", { support_type: channel }) });
    const schedulesQuery = useQuery({ queryKey: ["observer", "schedules"], queryFn: () => getJson<{ data: Schedule[] }>("/api/observer/shift-schedules") });
    const createMutation = useMutation({
        mutationFn: () => postJson<Record<string, unknown>, { message: string }>("/api/observer/shift-schedules", { name, channel, shift_date: shiftDate, starts_at: startsAt, ends_at: endsAt, support_ids: selected }),
        onSuccess: async (response: { message: string }) => { toast.success(response.message); setSelected([]); setName(""); await queryClient.invalidateQueries({ queryKey: ["observer", "schedules"] }); },
    });
    const supports = supportsQuery.data?.data ?? [];

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6">
            <Card className="p-6"><h1 className="text-2xl font-bold text-ink">تعیین شیفت تیم</h1><p className="mt-2 text-sm text-ink-2">بازه را به دقیقه‌های کامل و بدون اعشار بین پشتیبان‌های انتخاب‌شده تقسیم و برای هر نفر ثبت کنید.</p></Card>
            <Card className="space-y-5 p-6">
                {createMutation.isError ? <Alert tone="danger">تقسیم شیفت ناموفق بود؛ نوع، بازه و پشتیبان‌ها را بررسی کنید.</Alert> : null}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="schedule-name">عنوان</Label><Input id="schedule-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="شیفت صبح" /></div>
                    <div className="space-y-2"><Label>نوع پاسخگویی</Label><p className="flex h-11 items-center rounded-xl border border-hairline bg-surface-2 px-3 text-sm font-semibold text-ink">{channel === "web" ? "پشتیبان وب" : "پشتیبان هوش مصنوعی"}</p><p className="text-xs text-ink-2">فقط پشتیبان‌های منتسب‌شده به شما از همین نوع در فهرست نمایش داده می‌شوند.</p></div>
                    <div className="space-y-2"><Label htmlFor="schedule-date">تاریخ</Label><Input id="schedule-date" type="date" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} /></div>
                    <div className="space-y-2"><Label>بازه کامل</Label><div className="flex items-center gap-2"><Input aria-label="شروع بازه" type="time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /><span>تا</span><Input aria-label="پایان بازه" type="time" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></div></div>
                </div>
                <fieldset className="space-y-3"><legend className="text-sm font-semibold text-ink">پشتیبان‌های {channel === "web" ? "وب" : "هوش مصنوعی"} ({supports.length})</legend>{supportsQuery.isError ? <Alert tone="danger">فهرست پشتیبان‌ها دریافت نشد.</Alert> : supports.length === 0 ? <p className="rounded-xl border border-hairline bg-surface-2 p-4 text-sm text-ink-2">هنوز پشتیبانی به تیم شما منتسب نشده است. انتساب پشتیبان با مدیر کل سامان است.</p> : <div className="grid gap-2 sm:grid-cols-2">{supports.map((support) => <div key={support.id} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2 p-3"><label className="flex min-w-0 flex-1 items-center gap-3"><input type="checkbox" checked={selected.includes(support.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, support.id] : current.filter((id) => id !== support.id))} /><span className="truncate text-sm font-semibold text-ink">{support.name}</span></label></div>)}</div>}</fieldset>
                <Button disabled={createMutation.isPending || !name.trim() || selected.length === 0 || endsAt <= startsAt}><Send />تقسیم و ابلاغ شیفت</Button>
            </Card>
            <section className="space-y-3"><h2 className="text-lg font-bold text-ink">شیفت‌های تعیین‌شده</h2>{(schedulesQuery.data?.data ?? []).map((schedule) => <Card key={schedule.id} className="space-y-3 p-5"><div className="flex items-center gap-2 font-semibold text-ink"><CalendarClock className="size-4" />{schedule.name} · {new Date(`${schedule.shift_date}T00:00:00`).toLocaleDateString("fa-IR")} · {clock(schedule.starts_at)} تا {clock(schedule.ends_at)}</div><div className="grid gap-2 sm:grid-cols-2">{schedule.assignments.map((assignment) => <p key={assignment.id} className="rounded-xl bg-surface-2 p-3 text-sm text-ink">{assignment.user.name}: {clock(assignment.starts_at)} تا {clock(assignment.ends_at)}</p>)}</div></Card>)}</section>
        </div>
    );
}
