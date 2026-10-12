import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { HttpApiError } from "@/shared/api/http";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { useToast } from "@/shared/ui/toast";
import { cn } from "@/shared/lib/utils";
import {
    COURSE_OPTIONS,
    TOTAL_SESSIONS,
    TRACK_OPTIONS,
    type CourseOption,
} from "@/features/student-auth/constants/courses";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
import {
    studentProfileKeys,
    requestUpgrade,
} from "../services/student-profile-service";
import type {
    UpgradeCourseSelection,
} from "../services/student-profile-service";
import type { StudentProfilePayload } from "../types/student-profile";

type UpgradeDialogProps = {
    open: boolean;
    onClose: () => void;
    profile: StudentProfilePayload;
};

type CourseValue = "offline" | "in_person" | "school";
type TrackValue = "ai" | "web";

type CourseDraft = {
    course: CourseValue;
    enabled: boolean;
    track: TrackValue | null;
    sessions: number[];
    attendedCourse: string;
};

const needsTrack = (course: CourseValue) => course !== "in_person";

function buildDrafts(profile: StudentProfilePayload): CourseDraft[] {
    return COURSE_OPTIONS.map((option) => ({
        course: option.value,
        enabled: profile.course === option.value,
        track: needsTrack(option.value) ? profile.track : null,
        sessions: option.value === "offline" ? profile.purchased_sessions : [],
        attendedCourse: "",
    }));
}

export function UpgradeDialog({ open, onClose, profile }: UpgradeDialogProps) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [drafts, setDrafts] = useState<CourseDraft[]>(() => buildDrafts(profile));
    const [extraChats, setExtraChats] = useState(10);
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setDrafts(buildDrafts(profile));
        setExtraChats(10);
        setNote("");
        setError(null);
    }, [open, profile]);

    const updateDraft = (
        course: CourseValue,
        patch: Partial<CourseDraft>,
    ): void => {
        setDrafts((current) =>
            current.map((draft) =>
                draft.course === course ? { ...draft, ...patch } : draft,
            ),
        );
    };

    const toggleCourse = (course: CourseValue, next: boolean): void => {
        updateDraft(course, { enabled: next });
    };

    const selectionError = (): string | null => {
        const active = drafts.filter((draft) => draft.enabled);
        if (active.length === 0) {
            return "حداقل یک دوره را انتخاب کنید.";
        }
        for (const draft of active) {
            if (needsTrack(draft.course) && !draft.track) {
                const label =
                    COURSE_OPTIONS.find((option) => option.value === draft.course)
                        ?.label ?? "";
                return `برای دوره ${label} انتخاب رشته الزامی است.`;
            }
            if (draft.course === "offline" && draft.sessions.length === 0) {
                return "برای دوره آفلاین حداقل یک جلسه را انتخاب کنید.";
            }
            if (draft.attendedCourse.trim() === "") {
                return "نام دوره‌ای که در آن شرکت کرده‌اید را برای هر دوره وارد کنید.";
            }
        }
        return null;
    };

    const mutation = useMutation({
        mutationFn: () => {
            const courses: UpgradeCourseSelection[] = drafts
                .filter((draft) => draft.enabled)
                .map((draft) => ({
                    course: draft.course,
                    track: needsTrack(draft.course) ? draft.track : null,
                    sessions: draft.course === "offline" ? draft.sessions : [],
                    attended_course: draft.attendedCourse.trim(),
                }));

            return requestUpgrade({
                courses,
                extra_chats: extraChats,
                note: note.trim() === "" ? null : note.trim(),
            });
        },
        onSuccess: (response) => {
            queryClient.setQueryData(studentProfileKeys.profile, {
                data: response.data,
            });
            toast.success(response.message);
            onClose();
        },
        onError: (mutationError: unknown) => {
            setError(
                mutationError instanceof HttpApiError
                    ? mutationError.message
                    : "ثبت درخواست ارتقا ناموفق بود.",
            );
        },
    });

    const submit = (): void => {
        const validation = selectionError();
        if (validation !== null) {
            setError(validation);
            return;
        }
        mutation.mutate();
    };

    return (
        <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 space-y-5 overflow-y-auto rounded-4xl border border-hairline dialog-surface p-6 md:p-7">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <Dialog.Title className="flex items-center gap-2 text-xl font-bold text-ink">
                                <Sparkles className="size-5 text-alret-gold" />
                                درخواست ارتقا
                            </Dialog.Title>
                            <Dialog.Description className="mt-2 text-sm leading-7 text-ink-2">
                                می‌توانید همزمان چند دوره را انتخاب کنید.
                                برای هر دوره، رشته و نام دوره‌ای که در آن
                                شرکت کرده‌اید را وارد کنید. درخواست پس از
                                تأیید پشتیبان اعمال می‌شود.
                            </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="بستن"
                            >
                                <X />
                            </Button>
                        </Dialog.Close>
                    </div>

                    <div className="space-y-4">
                        {error ? <Alert tone="danger">{error}</Alert> : null}

                        <fieldset className="space-y-2">
                            <legend className="text-sm font-semibold text-ink">
                                دوره‌های درخواستی
                            </legend>
                            <div className="space-y-3">
                                {drafts.map((draft) => (
                                    <CourseCard
                                        key={draft.course}
                                        draft={draft}
                                        option={
                                            COURSE_OPTIONS.find(
                                                (item) =>
                                                    item.value === draft.course,
                                            ) as CourseOption
                                        }
                                        onToggle={(next) =>
                                            toggleCourse(draft.course, next)
                                        }
                                        onUpdate={(patch) =>
                                            updateDraft(draft.course, patch)
                                        }
                                    />
                                ))}
                            </div>
                        </fieldset>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="extra-chats">چت اضافه</Label>
                                <Input
                                    id="extra-chats"
                                    type="number"
                                    min={1}
                                    max={500}
                                    dir="ltr"
                                    value={extraChats}
                                    onChange={(event) =>
                                        setExtraChats(
                                            Number(event.target.value),
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="upgrade-note">
                                    توضیحات (اختیاری)
                                </Label>
                                <Textarea
                                    id="upgrade-note"
                                    rows={2}
                                    placeholder="مثلاً پیوستن به جلسه ۶ دوره وب"
                                    value={note}
                                    onChange={(event) =>
                                        setNote(event.target.value)
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                            type="button"
                            onClick={submit}
                            disabled={mutation.isPending}
                            className="w-full sm:w-auto"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <Sparkles />
                            )}
                            {mutation.isPending
                                ? "در حال ثبت..."
                                : "ثبت درخواست ارتقا"}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="w-full sm:w-auto"
                        >
                            انصراف
                        </Button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function CourseCard({
    draft,
    option,
    onToggle,
    onUpdate,
}: {
    draft: CourseDraft;
    option: CourseOption;
    onToggle: (next: boolean) => void;
    onUpdate: (patch: Partial<CourseDraft>) => void;
}) {
    const showsTrack = needsTrack(draft.course);
    const showsSessions = draft.course === "offline";

    return (
        <div
            className={cn(
                "rounded-2xl border p-4 transition-colors duration-150 ease-out",
                draft.enabled
                    ? "border-primary-line-2 bg-primary-soft"
                    : "border-hairline bg-surface-2",
            )}
        >
            <button
                type="button"
                onClick={() => onToggle(!draft.enabled)}
                aria-pressed={draft.enabled}
                className="flex w-full items-center gap-3 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2"
            >
                <span
                    className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-md border",
                        draft.enabled
                            ? "border-primary-line-2 bg-alret-gold text-on-primary"
                            : "border-hairline text-transparent",
                    )}
                >
                    <Check className="size-3" />
                </span>
                <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">
                        {option.label}
                    </span>
                    <span className="block text-xs text-ink-2">
                        {option.description}
                    </span>
                </span>
            </button>

            {draft.enabled ? (
                <div className="mt-4 space-y-4 border-t border-hairline pt-4">
                    {showsTrack ? (
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-ink-2">
                                رشته
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                {TRACK_OPTIONS.map((track) => (
                                    <button
                                        key={track.value}
                                        type="button"
                                        onClick={() =>
                                            onUpdate({ track: track.value })
                                        }
                                        aria-pressed={
                                            draft.track === track.value
                                        }
                                        className={cn(
                                            "rounded-2xl border px-4 py-2.5 text-sm font-bold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                                            draft.track === track.value
                                                ? "border-warn-line bg-warn-soft text-alret-gold"
                                                : "border-hairline bg-surface-2 text-ink hover:border-hairline-strong",
                                        )}
                                    >
                                        {track.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {showsSessions ? (
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-ink-2">
                                جلسات (
                                {toPersianDigits(draft.sessions.length)} از{" "}
                                {toPersianDigits(TOTAL_SESSIONS)})
                            </span>
                            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                                {Array.from(
                                    { length: TOTAL_SESSIONS },
                                    (_, index) => index + 1,
                                ).map((session) => {
                                    const selected =
                                        draft.sessions.includes(session);
                                    return (
                                        <button
                                            key={session}
                                            type="button"
                                            onClick={() =>
                                                onUpdate({
                                                    sessions:
                                                        draft.sessions.includes(
                                                            session,
                                                        )
                                                            ? draft.sessions.filter(
                                                                  (item) =>
                                                                      item !==
                                                                      session,
                                                              )
                                                            : [
                                                                  ...draft.sessions,
                                                                  session,
                                                              ],
                                                })
                                            }
                                            aria-pressed={selected}
                                            aria-label={`جلسه ${session}`}
                                            className={cn(
                                                "grid aspect-square place-items-center rounded-2xl border text-sm font-bold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                                                selected
                                                    ? "border-primary-line-2 bg-primary-soft-2 text-accent-ink"
                                                    : "border-hairline bg-surface-2 text-ink-2 hover:border-hairline",
                                            )}
                                        >
                                            {session}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    <div className="space-y-2">
                        <Label htmlFor={`attended-${draft.course}`}>
                            نام دوره‌ای که در آن شرکت کرده‌اید
                        </Label>
                        <Input
                            id={`attended-${draft.course}`}
                            value={draft.attendedCourse}
                            placeholder="مثلاً دوره جامع وب تابستان ۱۴۰۳"
                            onChange={(event) =>
                                onUpdate({
                                    attendedCourse: event.target.value,
                                })
                            }
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
