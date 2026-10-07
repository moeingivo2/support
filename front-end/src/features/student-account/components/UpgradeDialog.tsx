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
} from "@/features/student-auth/constants/courses";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
import {
    studentProfileKeys,
    requestUpgrade,
} from "../services/student-profile-service";
import type { StudentProfilePayload } from "../types/student-profile";

type UpgradeDialogProps = {
    open: boolean;
    onClose: () => void;
    profile: StudentProfilePayload;
};

export function UpgradeDialog({ open, onClose, profile }: UpgradeDialogProps) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [course, setCourse] = useState(profile.course);
    const [track, setTrack] = useState<"ai" | "web" | null>(profile.track);
    const [sessions, setSessions] = useState<number[]>(
        profile.purchased_sessions,
    );
    const [extraChats, setExtraChats] = useState(10);
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setCourse(profile.course);
        setTrack(profile.track);
        setSessions(profile.purchased_sessions);
        setExtraChats(10);
        setNote("");
        setError(null);
    }, [open, profile]);

    const mutation = useMutation({
        mutationFn: () =>
            requestUpgrade({
                course,
                track: course === "offline" ? track : null,
                sessions: course === "offline" ? sessions : [],
                extra_chats: extraChats,
                note: note.trim() === "" ? null : note.trim(),
            }),
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
                                دوره یا تعداد چت مورد نظرتان را انتخاب کنید.
                                درخواست شما پس از تأیید اعمال می‌شود.
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

                    <div className="space-y-5">
                        {error ? <Alert tone="danger">{error}</Alert> : null}

                        <fieldset className="space-y-2">
                            <legend className="text-sm font-semibold text-ink">
                                دوره درخواستی
                            </legend>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                {COURSE_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            setCourse(option.value);
                                            if (option.value !== "offline") {
                                                setTrack(null);
                                                setSessions([]);
                                            }
                                        }}
                                        aria-pressed={course === option.value}
                                        className={cn(
                                            "rounded-2xl border px-4 py-3 text-sm font-bold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                                            course === option.value
                                                ? "border-primary-line-2 bg-primary-soft text-accent-ink"
                                                : "border-hairline bg-surface-2 text-ink  hover:border-hairline hover:bg-surface-2",
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </fieldset>

                        {course === "offline" ? (
                            <>
                                <fieldset className="space-y-2">
                                    <legend className="text-sm font-semibold text-ink">
                                        رشته
                                    </legend>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TRACK_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() =>
                                                    setTrack(option.value)
                                                }
                                                aria-pressed={
                                                    track === option.value
                                                }
                                                className={cn(
                                                    "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2",
                                                    track === option.value
                                                        ? "border-warn-line bg-warn-soft text-alret-gold"
                                                        : "border-hairline bg-surface-2 text-ink  hover:border-hairline",
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "grid size-4 place-items-center rounded-full border",
                                                        track === option.value
                                                            ? "border-alret-gold bg-alret-gold text-on-primary"
                                                            : "border-hairline text-transparent",
                                                    )}
                                                >
                                                    <Check className="size-2.5" />
                                                </span>
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>

                                <fieldset className="space-y-2">
                                    <legend className="text-sm font-semibold text-ink">
                                        جلسات (
                                        {toPersianDigits(sessions.length)} از{" "}
                                        {toPersianDigits(TOTAL_SESSIONS)})
                                    </legend>
                                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                                        {Array.from(
                                            { length: TOTAL_SESSIONS },
                                            (_, index) => index + 1,
                                        ).map((session) => {
                                            const selected =
                                                sessions.includes(session);
                                            return (
                                                <button
                                                    key={session}
                                                    type="button"
                                                    onClick={() =>
                                                        setSessions(
                                                            (current) =>
                                                                current.includes(
                                                                    session,
                                                                )
                                                                    ? current.filter(
                                                                          (
                                                                              item,
                                                                          ) =>
                                                                              item !==
                                                                              session,
                                                                      )
                                                                    : [
                                                                          ...current,
                                                                          session,
                                                                      ],
                                                        )
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
                                </fieldset>
                            </>
                        ) : null}

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
                            onClick={() => mutation.mutate()}
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
