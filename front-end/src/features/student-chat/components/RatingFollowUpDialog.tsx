import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, X } from "lucide-react";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

const MAX_EXPLANATION_LENGTH = 500;

export type RatingFollowUp = {
    studentId: number;
    conversationId: number;
    ratingValue: number;
};

function feedbackStorageKey(studentId: number, conversationId: number): string {
    return `aio_rating_feedback:${studentId}:${conversationId}`;
}

/**
 * پرسش تکمیلی اختیاری پس از امتیاز پایین (۱ تا ۳ ستاره).
 *
 * امتیاز پیش‌تر روی سرور ثبت شده و این لایه هیچ درخواستی نمی‌فرستد؛ توضیح
 * اختیاری فقط در همین مرورگر (localStorage) نگه داشته می‌شود. کاربر می‌تواند
 * آن را رد کند و امتیازِ ثبت‌شده بدون تغییر باقی می‌ماند.
 */
export function RatingFollowUpDialog({
    followUp,
    onClose,
}: {
    followUp: RatingFollowUp;
    onClose: () => void;
}) {
    const [explanation, setExplanation] = useState("");
    const [isSaved, setIsSaved] = useState(false);
    const [storageError, setStorageError] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const doneButtonRef = useRef<HTMLButtonElement>(null);

    const canSave = explanation.trim().length > 0;

    useEffect(() => {
        if (isSaved) {
            doneButtonRef.current?.focus();
        }
    }, [isSaved]);

    function handleSave() {
        if (!canSave) {
            return;
        }

        try {
            window.localStorage.setItem(
                feedbackStorageKey(
                    followUp.studentId,
                    followUp.conversationId,
                ),
                JSON.stringify({
                    ratingValue: followUp.ratingValue,
                    explanation: explanation.trim(),
                }),
            );
            setStorageError(false);
            setIsSaved(true);
        } catch {
            setStorageError(true);
        }
    }

    return (
        <Dialog.Root
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm" />
                <Dialog.Content
                    dir="rtl"
                    aria-describedby={undefined}
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        textareaRef.current?.focus();
                    }}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                    }}
                    className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-3xl border border-hairline bg-surface p-5 shadow-2xl sm:p-6"
                >
                    <div className="flex items-start justify-between gap-3">
                        <Dialog.Title className="text-lg font-bold text-ink">
                            چه مشکلی پیش آمد؟
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="بستن پرسش تکمیلی"
                                className="shrink-0"
                            >
                                <X aria-hidden="true" />
                            </Button>
                        </Dialog.Close>
                    </div>

                    {isSaved ? (
                        <div className="mt-5 space-y-4">
                            <Alert tone="success" role="status">
                                فقط در این مرورگر ذخیره شد
                            </Alert>
                            <Button
                                ref={doneButtonRef}
                                type="button"
                                className="w-full"
                                onClick={onClose}
                            >
                                <Check aria-hidden="true" />
                                تمام
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-5 space-y-4">
                            <p className="text-sm leading-7 text-ink-2">
                                می‌خواهید کوتاه بنویسید چه چیزی باعث
                                نارضایتی شد؟ این متن فقط در همین مرورگر ذخیره
                                می‌شود و برای پشتیبانی ارسال نمی‌گردد.
                            </p>

                            {storageError ? (
                                <Alert tone="danger">
                                    ذخیره در این مرورگر امکان‌پذیر نیست.
                                </Alert>
                            ) : null}

                            <div className="space-y-2 text-right">
                                <Label htmlFor="rating-follow-up-explanation">
                                    توضیح کوتاه (اختیاری)
                                </Label>
                                <Textarea
                                    ref={textareaRef}
                                    id="rating-follow-up-explanation"
                                    value={explanation}
                                    onChange={(event) =>
                                        setExplanation(event.target.value)
                                    }
                                    maxLength={MAX_EXPLANATION_LENGTH}
                                />
                            </div>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row">
                                <Button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!canSave}
                                    className="flex-1"
                                >
                                    ذخیره در این مرورگر
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="flex-1"
                                >
                                    رد کردن
                                </Button>
                            </div>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
