import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, RefreshCw, Repeat, Send, Trash2 } from "lucide-react";
import { getJson, postJson } from "@/shared/api/http";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { StatusPill } from "@/shared/ui/status-pill";
import { useToast } from "@/shared/ui/toast";
import { useAuth } from "@/shared/services/auth-context";
import { toPersianDigits } from "@/features/student-chat/utils/persian";

type Support = { id: number; name: string; phone: string | null; support_type: "web" | "ai" };
type Assignment = { id: number; starts_at: string; ends_at: string; user: Support };
type Schedule = { id: number; name: string; channel: string; shift_date: string; starts_at: string; ends_at: string; assignments: Assignment[] };
type Slot = { starts_at: string; ends_at: string };
type RotationRow = { week: number; shift_date: string; starts_at: string; ends_at: string; support_id: number; support_name: string; conflict: boolean };
type RotationPayload = { team: { id: number; name: string }[]; weeks: number; rows: RotationRow[] };

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

    const [rotationName, setRotationName] = useState("چرخش ماهانه");
    const [rotationStart, setRotationStart] = useState(new Date().toISOString().slice(0, 10));
    const [rotationWeeks, setRotationWeeks] = useState(4);
    const [rotationSlots, setRotationSlots] = useState<Slot[]>([
        { starts_at: "09:00", ends_at: "13:00" },
        { starts_at: "13:00", ends_at: "17:00" },
    ]);
    const rotationBody = { name: rotationName.trim(), channel, starts_on: rotationStart, weeks: rotationWeeks, slots: rotationSlots };
    const canPreview = rotationName.trim().length > 0 && rotationSlots.length > 0
        && rotationSlots.every((slot) => slot.ends_at > slot.starts_at);

    const previewMutation = useMutation({
        mutationFn: () => postJson<Record<string, unknown>, RotationPayload>("/api/observer/shift-schedules/rotation/preview", rotationBody),
    });
    const rotationStoreMutation = useMutation({
        mutationFn: () => postJson<Record<string, unknown>, { message: string }>("/api/observer/shift-schedules/rotation", rotationBody),
        onSuccess: async (response: { message: string }) => {
            toast.success(response.message);
            await queryClient.invalidateQueries({ queryKey: ["observer", "schedules"] });
        },
    });
    const preview = previewMutation.data;
    const conflicts = (preview?.rows ?? []).filter((row) => row.conflict).length;

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6">
            <Card className="p-6"><h1 className="text-2xl font-bold text-ink">تعیین شیفت تیم</h1><p className="mt-2 text-sm text-ink-2">بازه را به دقیقه‌های کامل و بدون اعشار بین اعضای انتخاب‌شده تقسیم و برای هر نفر ثبت کنید.</p></Card>
            <Card className="space-y-5 p-6">
                {createMutation.isError ? <Alert tone="danger">تقسیم شیفت ناموفق بود؛ نوع، بازه و پشتیبان‌ها را بررسی کنید.</Alert> : null}
                <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="schedule-name">عنوان</Label><Input id="schedule-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="شیفت صبح" /></div>
                    <div className="space-y-2"><Label>نوع پاسخگویی</Label><p className="flex h-11 items-center rounded-xl border border-hairline bg-surface-2 px-3 text-sm font-semibold text-ink">{channel === "web" ? "پشتیبان وب" : "پشتیبان هوش مصنوعی"}</p><p className="text-xs text-ink-2">همه اعضای همین نوع — از جمله خودِ ناظر — در تیم شما هستند.</p></div>
                    <div className="space-y-2"><Label htmlFor="schedule-date">تاریخ</Label><Input id="schedule-date" type="date" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} /></div>
                    <div className="space-y-2"><Label>بازه کامل</Label><div className="flex items-center gap-2"><Input aria-label="شروع بازه" type="time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /><span>تا</span><Input aria-label="پایان بازه" type="time" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></div></div>
                </div>
                <fieldset className="space-y-3"><legend className="text-sm font-semibold text-ink">اعضای تیم {channel === "web" ? "وب" : "هوش مصنوعی"} ({supports.length})</legend>{supportsQuery.isError ? <Alert tone="danger">فهرست اعضای تیم دریافت نشد.</Alert> : supports.length === 0 ? <p className="rounded-xl border border-hairline bg-surface-2 p-4 text-sm text-ink-2">هنوز عضوی با این نوع پاسخگویی ثبت نشده است.</p> : <div className="grid gap-2 sm:grid-cols-2">{supports.map((support) => <div key={support.id} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2 p-3"><label className="flex min-w-0 flex-1 items-center gap-3"><input type="checkbox" checked={selected.includes(support.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, support.id] : current.filter((id) => id !== support.id))} /><span className="truncate text-sm font-semibold text-ink">{support.name}{support.id === user?.id ? " (خودِ ناظر)" : ""}</span></label></div>)}</div>}</fieldset>
                <Button type="submit" disabled={createMutation.isPending || !name.trim() || selected.length === 0 || endsAt <= startsAt}><Send />تقسیم و ابلاغ شیفت</Button>
                </form>
            </Card>

            <Card className="space-y-5 p-6">
                <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring"><Repeat /></span>
                    <div>
                        <h2 className="text-xl font-bold text-ink">چرخش خودکار ماهانه</h2>
                        <p className="mt-1 text-sm text-ink-2">
                            بازه‌های هفتگی را وارد کنید؛ نوبت‌ها خودکار می‌چرخد تا در
                            هر هفته هر عضو یک بازه بگیرد و بازه‌ها هفته‌به‌هفته جابه‌جا شوند.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2"><Label htmlFor="rotation-name">عنوان</Label><Input id="rotation-name" value={rotationName} onChange={(event) => setRotationName(event.target.value)} placeholder="چرخش ماهانه" /></div>
                    <div className="space-y-2"><Label htmlFor="rotation-start">روز شروع</Label><Input id="rotation-start" type="date" value={rotationStart} onChange={(event) => setRotationStart(event.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="rotation-weeks">تعداد هفته</Label><Input id="rotation-weeks" type="number" min={1} max={12} value={rotationWeeks} onChange={(event) => setRotationWeeks(Math.max(1, Math.min(12, Number(event.target.value) || 1)))} /></div>
                </div>

                <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-ink">بازه‌های هر روز ({toPersianDigits(rotationSlots.length)})</legend>
                    <div className="space-y-2">
                        {rotationSlots.map((slot, index) => (
                            <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-2 p-3">
                                <span className="text-xs font-semibold text-ink-2">بازه {toPersianDigits(index + 1)}</span>
                                <Input aria-label={`شروع بازه ${index + 1}`} type="time" className="w-36" value={slot.starts_at} onChange={(event) => setRotationSlots((current) => current.map((item, i) => i === index ? { ...item, starts_at: event.target.value } : item))} />
                                <span className="text-xs text-ink-2">تا</span>
                                <Input aria-label={`پایان بازه ${index + 1}`} type="time" className="w-36" value={slot.ends_at} onChange={(event) => setRotationSlots((current) => current.map((item, i) => i === index ? { ...item, ends_at: event.target.value } : item))} />
                                <Button type="button" variant="ghost" aria-label={`حذف بازه ${index + 1}`} disabled={rotationSlots.length === 1} onClick={() => setRotationSlots((current) => current.filter((_, i) => i !== index))}><Trash2 /></Button>
                            </div>
                        ))}
                    </div>
                    <Button type="button" variant="ghost" disabled={rotationSlots.length >= 14} onClick={() => setRotationSlots((current) => [...current, { starts_at: "17:00", ends_at: "21:00" }])}>افزودن بازه</Button>
                </fieldset>

                {previewMutation.isError ? <Alert tone="danger">ساخت پیش‌نمایش ناموفق بود؛ بازه‌ها نباید روی هم بیفتند و پایان هر بازه باید بعد از شروعش باشد.</Alert> : null}
                {rotationStoreMutation.isError ? <Alert tone="danger">ثبت چرخش ناموفق بود.</Alert> : null}

                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" disabled={!canPreview || previewMutation.isPending} onClick={() => { previewMutation.mutate(); }}><RefreshCw />پیش‌نمایش چرخش</Button>
                    <Button type="button" disabled={!preview || previewMutation.isPending || rotationStoreMutation.isPending} onClick={() => rotationStoreMutation.mutate()}><Repeat />ثبت و ابلاغ چرخش</Button>
                </div>

                {preview ? (
                    <section className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-ink">
                                پیش‌نمایش {toPersianDigits(preview.weeks)} هفته برای {toPersianDigits(preview.team.length)} عضو
                            </h3>
                            {conflicts > 0 ? <StatusPill tone="danger">{toPersianDigits(conflicts)} ردیف تداخلی — ثبت نمی‌شود</StatusPill> : null}
                        </div>
                        <div className="space-y-3">
                            {Array.from({ length: preview.weeks }, (_, index) => index + 1).map((week) => (
                                <div key={week} className="rounded-2xl border border-hairline bg-surface-2 p-4">
                                    <p className="text-xs font-bold text-ink-2">هفته {toPersianDigits(week)}</p>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                        {preview.rows.filter((row) => row.week === week).map((row) => (
                                            <div key={`${row.week}-${row.starts_at}`} className="flex items-center justify-between gap-2 rounded-xl bg-surface p-3 text-sm">
                                                <span className="truncate font-semibold text-ink">{row.support_name}</span>
                                                <span className="flex shrink-0 items-center gap-2 text-xs text-ink-2">
                                                    {clock(row.starts_at)} تا {clock(row.ends_at)}
                                                    {row.conflict ? <StatusPill tone="danger">تداخل</StatusPill> : null}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}
            </Card>

            <section className="space-y-3"><h2 className="text-lg font-bold text-ink">شیفت‌های تعیین‌شده</h2>{(schedulesQuery.data?.data ?? []).map((schedule) => <Card key={schedule.id} className="space-y-3 p-5"><div className="flex items-center gap-2 font-semibold text-ink"><CalendarClock className="size-4" />{schedule.name} · {new Date(`${schedule.shift_date}T00:00:00`).toLocaleDateString("fa-IR")} · {clock(schedule.starts_at)} تا {clock(schedule.ends_at)}</div><div className="grid gap-2 sm:grid-cols-2">{schedule.assignments.map((assignment) => <p key={assignment.id} className="rounded-xl bg-surface-2 p-3 text-sm text-ink">{assignment.user.name}: {clock(assignment.starts_at)} تا {clock(assignment.ends_at)}</p>)}</div></Card>)}</section>
        </div>
    );
}
