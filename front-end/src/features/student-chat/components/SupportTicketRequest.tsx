import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, MessageSquarePlus, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HttpApiError } from "@/shared/api/http";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { studentProfileKeys } from "@/features/student-account/services/student-profile-service";
import { chatKeys, createConversation, sendMessage } from "../services/chat-service";
import type { OutgoingAttachment } from "../types/chat";
import { getChatSendError } from "../utils/chat-error";
import { ChatAttachmentPreview } from "./ChatAttachmentPreview";

const MAX_SUBJECT_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 10_000 - MAX_SUBJECT_LENGTH - "موضوع: \n\n".length;

export function SupportTicketRequest() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(searchParams.get("request") === "support");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [attachment, setAttachment] = useState<OutgoingAttachment | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ subject?: string; message?: string }>({});
    const [conversationId, setConversationId] = useState<number | null>(null);
    const submitLockRef = useRef(false);
    const subjectInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleOpenChange(open: boolean) {
        if (submitLockRef.current) {
            return;
        }

        setIsOpen(open);
        if (!open && searchParams.get("request") === "support") {
            setSearchParams((current) => {
                const next = new URLSearchParams(current);
                next.delete("request");
                return next;
            }, { replace: true });
        }
        if (!open && isSubmitted) {
            setSubject("");
            setMessage("");
            setAttachment(null);
            setIsSubmitted(false);
            setError(null);
            setFieldErrors({});
            setConversationId(null);
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitLockRef.current || isSubmitted) {
            return;
        }

        const nextErrors = {
            subject: subject.trim() ? undefined : "موضوع درخواست را بنویسید.",
            message: message.trim() ? undefined : "متن درخواست را بنویسید.",
        };
        setFieldErrors(nextErrors);
        setError(null);
        if (nextErrors.subject || nextErrors.message) {
            if (nextErrors.subject) {
                subjectInputRef.current?.focus();
            } else {
                event.currentTarget.querySelector<HTMLTextAreaElement>("textarea")?.focus();
            }
            return;
        }

        submitLockRef.current = true;
        setIsSubmitting(true);

        try {
            let requestConversationId = conversationId;
            if (requestConversationId === null) {
                const response = await createConversation(subject.trim());
                requestConversationId = response.data.id;
                setConversationId(requestConversationId);
                void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
            }

            const response = await sendMessage({
                conversationId: requestConversationId,
                body: `موضوع: ${subject.trim()}\n\n${message.trim()}`,
                codeMode: false,
                attachment: attachment ?? undefined,
            });
            if (response.profile) {
                queryClient.setQueryData(studentProfileKeys.profile, { data: response.profile });
            }
            void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
            void queryClient.invalidateQueries({ queryKey: chatKeys.conversation(requestConversationId) });
            setIsSubmitted(true);
        } catch (failure) {
            setError(failure instanceof HttpApiError
                ? failure.message
                : getChatSendError(failure, attachment !== null));
        } finally {
            submitLockRef.current = false;
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
            <Dialog.Trigger asChild>
                <Button type="button" variant="ghost">
                    <MessageSquarePlus aria-hidden="true" />
                    درخواست تیکت پشتیبانی
                </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm" />
                <Dialog.Content
                    dir="rtl"
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        subjectInputRef.current?.focus();
                    }}
                    className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-3xl border border-hairline bg-surface p-5 shadow-2xl sm:p-6"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                            <Dialog.Title className="text-lg font-bold text-ink">
                                درخواست تیکت پشتیبانی
                            </Dialog.Title>
                            <Dialog.Description className="text-sm leading-7 text-ink-2">
                                موضوع و جزئیات درخواست را بنویسید. پاسخ را در گفتگوهای خود دریافت می‌کنید.
                            </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <Button type="button" variant="ghost" size="icon" disabled={isSubmitting} aria-label="بستن درخواست پشتیبانی" className="shrink-0">
                                <X aria-hidden="true" />
                            </Button>
                        </Dialog.Close>
                    </div>

                    {isSubmitted ? (
                        <div className="mt-5 space-y-4">
                            <Alert tone="success" role="status">
                                درخواست شما برای پشتیبانی ارسال شد.
                            </Alert>
                            <Button type="button" className="w-full" onClick={() => {
                                handleOpenChange(false);
                                navigate(`/chat?c=${conversationId}`);
                            }}>
                                <Check aria-hidden="true" />
                                مشاهده گفتگو
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4" noValidate aria-busy={isSubmitting}>
                            {error ? (
                                <Alert tone="danger">
                                    {error}
                                    {conversationId !== null ? (
                                        <p>گفتگو ساخته شده است. برای ارسال پیام، دوباره تلاش کنید.</p>
                                    ) : null}
                                </Alert>
                            ) : null}
                            <div className="space-y-2">
                                <Label htmlFor="support-ticket-subject">موضوع</Label>
                                <Input
                                    ref={subjectInputRef}
                                    id="support-ticket-subject"
                                    value={subject}
                                    onChange={(event) => setSubject(event.target.value)}
                                    maxLength={MAX_SUBJECT_LENGTH}
                                    required
                                    readOnly={conversationId !== null}
                                    disabled={isSubmitting}
                                    aria-invalid={Boolean(fieldErrors.subject)}
                                    aria-describedby={fieldErrors.subject ? "support-ticket-subject-error" : undefined}
                                />
                                {fieldErrors.subject ? <p id="support-ticket-subject-error" className="text-xs text-err-text">{fieldErrors.subject}</p> : null}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="support-ticket-message">متن درخواست</Label>
                                <Textarea
                                    id="support-ticket-message"
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    maxLength={MAX_MESSAGE_LENGTH}
                                    required
                                    disabled={isSubmitting}
                                    aria-invalid={Boolean(fieldErrors.message)}
                                    aria-describedby={fieldErrors.message ? "support-ticket-message-error" : undefined}
                                />
                                {fieldErrors.message ? <p id="support-ticket-message-error" className="text-xs text-err-text">{fieldErrors.message}</p> : null}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="support-ticket-attachment">پیوست (اختیاری)</Label>
                                <Input
                                    ref={fileInputRef}
                                    id="support-ticket-attachment"
                                    type="file"
                                    disabled={isSubmitting}
                                    className="h-auto min-h-11 py-2 file:me-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1 file:text-accent-ink"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        setAttachment(file ? { file } : null);
                                    }}
                                />
                                {attachment ? (
                                    <ChatAttachmentPreview attachment={attachment} disabled={isSubmitting} onRemove={() => {
                                        setAttachment(null);
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = "";
                                        }
                                    }} />
                                ) : null}
                            </div>
                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MessageSquarePlus aria-hidden="true" />}
                                {isSubmitting ? "در حال ارسال…" : error ? "تلاش مجدد" : "ارسال درخواست"}
                            </Button>
                            <span role="status" className="sr-only">{isSubmitting ? "در حال ارسال درخواست پشتیبانی" : ""}</span>
                        </form>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
