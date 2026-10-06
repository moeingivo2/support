import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Code2, Lock, MessageSquareWarning, MessagesSquare, Star } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { HttpApiError } from "@/shared/api/http";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { useToast } from "@/shared/ui/toast";
import { useAuth } from "@/shared/services/auth-context";
import { studentProfileKeys } from "@/features/student-account/services/student-profile-service";
import { rankKeys } from "../services/rank-invalidation";
import {
    useConversationMessages,
    useConversations,
} from "../hooks/useConversations";
import {
    closeConversation,
    createConversation,
    rateConversation,
    sendMessage,
} from "../services/chat-service";
import type { OutgoingAttachment } from "../types/chat";
import { ChatComposer } from "../components/ChatComposer";
import { ChatSidebar } from "../components/ChatSidebar";
import { CloseConversationDialog } from "../components/CloseConversationDialog";
import { RateConversationDialog } from "../components/RateConversationDialog";
import { MessageList } from "../components/MessageList";

const EMPTY_HINT =
    "پیام خود را بنویسید یا تصویر، فایل و پیام صوتی بفرستید. برای خوانایی بیشتر پشتیبانی، دکمه «حالت کد» را روشن کنید.";

type LifecycleDialogMode = "close" | "rate" | null;

export default function ChatPage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isOnline = useOnlineStatus();
    const [searchParams, setSearchParams] = useSearchParams();
    const [codeMode, setCodeMode] = useState(false);
    const [messageSearch, setMessageSearch] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<LifecycleDialogMode>(null);
    const [dialogError, setDialogError] = useState<string | null>(null);

    const activeId = searchParams.get("c")
        ? Number(searchParams.get("c"))
        : null;
    const conversationsQuery = useConversations();
    const messagesQuery = useConversationMessages(activeId);
    const activeConversation = messagesQuery.data?.data.conversation ?? null;
    const isClosed = activeConversation?.status === "closed";

    const selectConversation = (id: number) => {
        setMessageSearch("");
        setDialogMode(null);
        setDialogError(null);
        setIsSidebarOpen(false);
        setSearchParams({ c: String(id) }, { replace: true });
    };

    const invalidateConversation = (id: number | null) => {
        void queryClient.invalidateQueries({
            queryKey: ["student", "conversations"],
        });
        if (id !== null) {
            void queryClient.invalidateQueries({
                queryKey: ["student", "conversations", id],
            });
        }
        // امتیاز جدید بلافاصله باید در رتبه‌بندی پشتیبان‌ها دیده شود
        void queryClient.invalidateQueries({ queryKey: rankKeys.board });
    };

    const createMutation = useMutation({
        mutationFn: () => createConversation(),
        onSuccess: (response) => {
            void queryClient.invalidateQueries({
                queryKey: ["student", "conversations"],
            });
            selectConversation(response.data.id);
            toast.success("گفتگوی جدید ساخته شد.");
        },
        onError: (error: unknown) => {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "ساخت گفتگو ناموفق بود.",
            );
        },
    });

    const sendMutation = useMutation({
        mutationFn: ({
            body,
            codeMode: asCode,
            language,
            attachment,
            signal,
        }: {
            body: string;
            codeMode: boolean;
            language: string;
            attachment?: OutgoingAttachment;
            signal?: AbortSignal;
        }) => {
            if (activeId === null)
                throw new Error("ابتدا یک گفتگو انتخاب کنید.");
            return sendMessage({
                conversationId: activeId,
                body,
                codeMode: asCode,
                language,
                attachment,
                signal,
            });
        },
        onSuccess: (response) => {
            if (activeId !== null) {
                void queryClient.invalidateQueries({
                    queryKey: ["student", "conversations", activeId],
                });
            }
            void queryClient.invalidateQueries({
                queryKey: ["student", "conversations"],
            });
            if (response.profile) {
                queryClient.setQueryData(studentProfileKeys.profile, {
                    data: response.profile,
                });
            }
        },
    });

    const messages = messagesQuery.data?.data.messages ?? [];

    const closeMutation = useMutation({
        mutationFn: (ratingValue: number) => {
            if (activeId === null)
                throw new Error("ابتدا یک گفتگو انتخاب کنید.");
            return closeConversation(activeId, ratingValue);
        },
        onSuccess: (response) => {
            setDialogMode(null);
            setDialogError(null);
            invalidateConversation(activeId);
            toast.success(response.message);
        },
        onError: (error: unknown) => {
            const message =
                error instanceof HttpApiError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "بستن گفتگو ناموفق بود.";
            setDialogError(message);
        },
    });

    const rateMutation = useMutation({
        mutationFn: (ratingValue: number) => {
            if (activeId === null)
                throw new Error("ابتدا یک گفتگو انتخاب کنید.");
            return rateConversation(activeId, ratingValue);
        },
        onSuccess: (response) => {
            setDialogMode(null);
            setDialogError(null);
            invalidateConversation(activeId);
            toast.success(response.message);
        },
        onError: (error: unknown) => {
            const message =
                error instanceof HttpApiError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "ثبت امتیاز ناموفق بود.";
            setDialogError(message);
        },
    });

    const sidebar = (
        <ChatSidebar
            conversations={conversationsQuery.data?.data ?? []}
            activeId={activeId}
            isPending={conversationsQuery.isPending}
            isError={conversationsQuery.isError}
            onRetry={() => void conversationsQuery.refetch()}
            isCreating={createMutation.isPending}
            onSelect={selectConversation}
            onCreate={() => createMutation.mutate()}
        />
    );

    return (
        // روی گوشی فاصله‌ها صفر می‌شود تا چت تمام صفحه را بگیرد؛ فهرست
        // گفتگوها و پروفایل در منوی همبرگری پوسته می‌مانند.
        <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 gap-4 md:gap-4">
            {/* lg:flex لازم است: Card ذاتاً display:block است و بدون آن
                flex-column بی‌اثر می‌ماند، ارتفاع کارت بی‌کران می‌شود و
                اسکرول داخلی از کار می‌افتد. */}
            <Card className="hidden w-80 shrink-0 flex-col overflow-hidden lg:flex xl:w-[22rem]">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                    {sidebar}
                </div>
            </Card>

            {isSidebarOpen ? (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <button
                        type="button"
                        aria-label="بستن فهرست گفتگوها"
                        onClick={() => setIsSidebarOpen(false)}
                        className="absolute inset-0 bg-overlay backdrop-blur-sm"
                    />
                    <Card className="absolute inset-y-3 right-3 left-3 flex flex-col overflow-hidden shadow-2xl">
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                            {sidebar}
                        </div>
                    </Card>
                </div>
            ) : null}

            <Card className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 md:rounded-3xl md:border">
                {/* روی گوشی فقط نام گفتگو و وضعیت می‌ماند؛ فهرست به منوی
                    همبرگری رفته و تنها «بستن گفتگو» دسترسی می‌ماند. */}
                <header className="flex shrink-0 items-center gap-2 border-b border-hairline bg-sunken px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
                    <span className="hidden size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring sm:grid">
                        <MessagesSquare className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-sm font-bold text-ink">
                            {activeId === null
                                ? "گفتگو با پشتیبانی"
                                : (messagesQuery.data?.data.conversation
                                      .title ?? "گفتگو با پشتیبانی")}
                        </h1>
                        <p className="truncate text-xs text-ink-2">
                            {activeId === null
                                ? "برای شروع یک گفتگوی جدید از منو انتخاب کنید."
                                : messagesQuery.data?.data.conversation.support
                                        ?.name
                                  ? `پشتیبان: ${messagesQuery.data.data.conversation.support.name}`
                                  : "در انتظار تخصیص پشتیبان"}
                        </p>
                    </div>

                    {/* کنش‌ها سمت چپ هدر می‌نشینند تا بالا خلوت بماند. */}
                    <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                            type="button"
                            variant={codeMode ? "primary" : "ghost"}
                            onClick={() => setCodeMode((current) => !current)}
                            aria-pressed={codeMode}
                            title="پیام را داخل بلوک کد ارسال کن"
                            disabled={isClosed}
                            className="max-sm:px-2.5"
                        >
                            <Code2 />
                            <span className="max-sm:hidden">
                                {codeMode
                                    ? "حالت کد: فعال"
                                    : "حالت کد"}
                            </span>
                        </Button>

                        {activeId !== null && !isClosed ? (
                            <Button
                                type="button"
                                variant="danger"
                                onClick={() => {
                                    setDialogError(null);
                                    setDialogMode("close");
                                }}
                                className="max-sm:px-2.5"
                            >
                                <Lock />
                                <span className="max-sm:hidden">
                                    بستن گفتگو
                                </span>
                            </Button>
                        ) : null}
                    </div>
                </header>

                {activeId === null ? (
                    <div className="grid flex-1 place-content-center gap-4 p-10 text-center">
                        <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                            <MessagesSquare className="size-7" />
                        </span>
                        <p className="max-w-md text-sm leading-8 text-ink-2">
                            {EMPTY_HINT}
                        </p>
                        <div className="flex justify-center">
                            <Button
                                onClick={() => createMutation.mutate()}
                                disabled={createMutation.isPending}
                            >
                                <MessagesSquare />
                                شروع گفتگوی جدید
                            </Button>
                        </div>
                        <Button type="button" variant="ghost" onClick={() => window.location.assign("/mentor-feedback")}>
                            <MessageSquareWarning />ثبت نارضایتی از منتور
                        </Button>
                    </div>
                ) : (
                    <>
        <MessageList
                            messages={messages}
                            currentUserId={user?.id ?? null}
                            isPending={messagesQuery.isPending}
                            isError={messagesQuery.isError}
            emptyHint={EMPTY_HINT}
            conversationId={activeId}
            search={messageSearch}
            onSearchChange={setMessageSearch}
        />
                        {isClosed ? (
                            <div className="space-y-3 border-t border-hairline bg-sunken px-4 py-5 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <span
                                        className="grid size-10 place-items-center rounded-full bg-danger-soft text-err-text"
                                        aria-hidden="true"
                                    >
                                        <Lock className="size-5" />
                                    </span>
                                    <p className="text-sm font-bold text-ink">
                                        این گفتگو بسته شده است
                                    </p>
                                    <p className="text-xs leading-6 text-ink-2">
                                        {activeConversation?.has_rating
                                            ? "از همراهی شما سپاسگزاریم. برای ادامه گفتگوی تازه‌ای بسازید."
                                            : activeConversation?.can_rate
                                              ? "اگر از پاسخ‌گویی راضی بودید، می‌توانید امتیاز بدهید."
                                              : "برای ادامه، گفتگوی جدیدی بسازید."}
                                    </p>
                                </div>

                                {activeConversation?.has_rating ? (
                                    <div className="flex items-center justify-center gap-1" dir="rtl">
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <Star
                                                key={value}
                                                aria-hidden="true"
                                                className={
                                                    value <=
                                                    (messagesQuery.data?.data.rating
                                                        ?.rating_value ?? 0)
                                                        ? "size-5 fill-alret-gold text-alret-gold"
                                                        : "size-5 text-ink-3"
                                                }
                                            />
                                        ))}
                                    </div>
                                ) : null}

                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    {activeConversation?.can_rate ? (
                                        <Button
                                            variant="primary"
                                            onClick={() => {
                                                setDialogError(null);
                                                setDialogMode("rate");
                                            }}
                                        >
                                            <Star />
                                            ثبت امتیاز
                                        </Button>
                                    ) : null}
                                    <Button
                                        variant="ghost"
                                        onClick={() =>
                                            createMutation.mutate()
                                        }
                                        disabled={createMutation.isPending}
                                    >
                                        <MessagesSquare />
                                        گفتگوی جدید
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <ChatComposer
                                onSend={(body, options) =>
                                    sendMutation.mutateAsync({ body, ...options })
                                }
                                codeMode={codeMode}
                                isSending={sendMutation.isPending}
                                isOnline={isOnline}
                            />
                        )}
                    </>
                )}

                {codeMode && activeId !== null && !isClosed ? (
                    <p className="border-t border-warn-line bg-warn-soft px-4 py-2 text-[11px] text-alret-gold">
                        پیام بعدی داخل بلوک کد ارسال می‌شود تا پشتیبانی بتواند
                        کد را راحت بخواند.
                    </p>
                ) : null}
            </Card>

            {dialogMode === "close" ? (
                <CloseConversationDialog
                    isSubmitting={closeMutation.isPending}
                    error={dialogError}
                    onCancel={() => {
                        setDialogMode(null);
                        setDialogError(null);
                    }}
                    onConfirm={(ratingValue) => closeMutation.mutate(ratingValue)}
                />
            ) : null}

            {dialogMode === "rate" ? (
                <RateConversationDialog
                    isSubmitting={rateMutation.isPending}
                    error={dialogError}
                    onCancel={() => {
                        setDialogMode(null);
                        setDialogError(null);
                    }}
                    onConfirm={(ratingValue) => rateMutation.mutate(ratingValue)}
                />
            ) : null}
        </div>
    );
}
