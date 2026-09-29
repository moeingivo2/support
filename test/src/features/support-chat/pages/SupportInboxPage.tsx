import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Bell,
    ChevronRight,
    Eye,
    GraduationCap,
    Lock,
    MessagesSquare,
    PanelRightClose,
    PanelRightOpen,
    Star,
    UserRound,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { HttpApiError } from "@/shared/api/http";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { StatusPill } from "@/shared/ui/status-pill";
import { useToast } from "@/shared/ui/toast";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
import { MessageList } from "@/features/student-chat/components/MessageList";
import type { OutgoingAttachment } from "@/features/student-chat/types/chat";
import { useAuth } from "@/shared/services/auth-context";
import { rankKeys } from "@/features/student-chat/services/rank-invalidation";
import {
    useNewMessageAlert,
    useSupportConversation,
    useSupportInbox,
} from "../hooks/useSupportChat";
import {
    closeSupportConversation,
    sendReply,
    supportChatKeys,
} from "../services/support-chat-service";
import { ConversationList } from "../components/ConversationList";
import { NotificationSoundToggle } from "../components/NotificationSoundToggle";
import { SupportCloseDialog } from "../components/SupportCloseDialog";
import { SupportComposer } from "../components/SupportComposer";

const EMPTY_HINT =
    "هنوز پیامی در این گفتگو ثبت نشده است. اولین پاسخ را بنویسید.";

export default function SupportInboxPage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [sendError, setSendError] = useState<string | null>(null);
    const [isListOpen, setIsListOpen] = useState(false);
    const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
    const [dialogError, setDialogError] = useState<string | null>(null);

    // ناظر فقط‌خواندنی است: نه پاسخ می‌دهد و نه گفتگو را می‌بندد
    const isObserver = user?.role === "observer";

    const activeId = searchParams.get("c")
        ? Number(searchParams.get("c"))
        : null;
    const inboxQuery = useSupportInbox();
    const notificationsQuery = useNewMessageAlert(activeId);
    const conversationQuery = useSupportConversation(activeId);

    const conversations = inboxQuery.data?.data ?? [];
    const profile = conversationQuery.data?.data.profile ?? null;
    const unreadTotal = notificationsQuery.data?.unread_total ?? 0;
    const activeConversation = conversationQuery.data?.data.conversation ?? null;
    const isClosed = activeConversation?.is_closed ?? false;

    function selectConversation(id: number) {
        setSendError(null);
        setIsListOpen(false);
        setIsCloseDialogOpen(false);
        setDialogError(null);
        setSearchParams({ c: String(id) }, { replace: true });
    }

    const replyMutation = useMutation({
        mutationFn: ({
            body,
            codeMode,
            language,
            attachment,
        }: {
            body: string;
            codeMode: boolean;
            language: string;
            attachment?: OutgoingAttachment;
        }) => {
            if (activeId === null)
                throw new Error("ابتدا یک گفتگو انتخاب کنید.");
            return sendReply({
                conversationId: activeId,
                body,
                codeMode,
                language,
                attachment,
            });
        },
        onSuccess: () => {
            setSendError(null);
            if (activeId !== null) {
                void queryClient.invalidateQueries({
                    queryKey: supportChatKeys.conversation(activeId),
                });
            }
            void queryClient.invalidateQueries({
                queryKey: supportChatKeys.inbox,
            });
        },
        onError: (error: unknown) => {
            const message =
                error instanceof HttpApiError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "ارسال پاسخ ناموفق بود.";
            setSendError(message);
        },
    });

    const closeMutation = useMutation({
        mutationFn: () => {
            if (activeId === null)
                throw new Error("ابتدا یک گفتگو انتخاب کنید.");
            return closeSupportConversation(activeId);
        },
        onSuccess: (response) => {
            setIsCloseDialogOpen(false);
            setDialogError(null);
            if (activeId !== null) {
                void queryClient.invalidateQueries({
                    queryKey: supportChatKeys.conversation(activeId),
                });
            }
            void queryClient.invalidateQueries({
                queryKey: supportChatKeys.inbox,
            });
            // بستن گفتگو وضعیت امتیازدهی را تغییر می‌دهد
            void queryClient.invalidateQueries({ queryKey: rankKeys.board });
            toast.success(response.message);
        },
        onError: (error: unknown) => {
            setDialogError(
                error instanceof HttpApiError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "بستن گفتگو ناموفق بود.",
            );
        },
    });

    const list = (
        <ConversationList
            conversations={conversations}
            activeId={activeId}
            isPending={inboxQuery.isPending}
            onSelect={selectConversation}
        />
    );

    return (
        <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 gap-4">
            <Card className="hidden w-88 shrink-0 overflow-y-auto p-4 xl:block">
                {list}
            </Card>

            {isListOpen ? (
                <div className="fixed inset-0 z-40 xl:hidden">
                    <button
                        type="button"
                        aria-label="بستن فهرست گفتگوها"
                        onClick={() => setIsListOpen(false)}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />
                    <Card className="absolute inset-y-3 right-3 left-3 overflow-y-auto p-4 shadow-2xl">
                        {list}
                    </Card>
                </div>
            ) : null}

            <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <header className="flex flex-wrap items-center gap-2 border-b border-hairline bg-sunken px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
                    {/* برگشت به فهرست گفتگوها — فقط وقتی یک گفتگو باز است */}
                    {activeId !== null ? (
                        <button
                            type="button"
                            onClick={() => setSearchParams({}, { replace: true })}
                            aria-label="بازگشت به فهرست گفتگوها"
                            className="inline-flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink-2 transition-transform duration-[220ms] ease-spring-snappy hover:-translate-y-0.5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 active:scale-95 xl:hidden"
                        >
                            <ChevronRight className="size-4" aria-hidden="true" />
                            فهرست
                        </button>
                    ) : null}

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="xl:hidden"
                        onClick={() => setIsListOpen((current) => !current)}
                        aria-label="فهرست گفتگوها"
                        aria-expanded={isListOpen}
                    >
                        {isListOpen ? <PanelRightClose /> : <PanelRightOpen />}
                    </Button>

                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                        <MessagesSquare className="size-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-sm font-bold text-ink">
                            {activeId === null
                                ? "صندوق ورودی گفتگوها"
                                : (conversationQuery.data?.data.conversation
                                      .student?.name ?? "گفتگوی دانشجو")}
                        </h1>
                        <p className="truncate text-xs text-ink-2">
                            {activeId === null
                                ? "همه گفتگوهای دانشجویان برای همه پشتیبان‌ها قابل مشاهده است."
                                : (conversationQuery.data?.data.conversation
                                      .title ?? "")}
                        </p>
                    </div>

                    {isObserver ? (
                        <StatusPill tone="info">
                            <Eye className="size-3" />
                            دسترسی فقط‌خواندنی
                        </StatusPill>
                    ) : null}

                    {activeConversation?.is_closed ? (
                        <StatusPill tone="neutral">
                            <Lock className="size-3" />
                            {activeConversation.status_label}
                        </StatusPill>
                    ) : null}

                    {activeId !== null && !isClosed && !isObserver ? (
                        <Button
                            type="button"
                            variant="danger"
                            onClick={() => {
                                setDialogError(null);
                                setIsCloseDialogOpen(true);
                            }}
                            disabled={closeMutation.isPending}
                        >
                            <Lock />
                            پایان گفتگو
                        </Button>
                    ) : null}

                    {isObserver ? null : (
                        <NotificationSoundToggle />
                    )}

                    {unreadTotal > 0 ? (
                        <StatusPill tone="danger">
                            <Bell className="size-3" />
                            {toPersianDigits(unreadTotal)} خوانده‌نشده
                        </StatusPill>
                    ) : null}
                </header>

                {activeId === null ? (
                    <div className="grid flex-1 place-content-center gap-4 p-10 text-center">
                        <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary-soft text-accent-ink ring-1 ring-primary-ring">
                            <MessagesSquare className="size-7" />
                        </span>
                        <p className="max-w-md text-sm leading-8 text-ink-2">
                            از فهرست سمت راست یک گفتگو را انتخاب کنید تا
                            پیام‌های دانشجو را ببینید و پاسخ دهید.
                        </p>
                    </div>
                ) : (
                    <>
                        {profile && !isObserver ? (
                            <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-sunken px-4 py-2 text-[11px] text-ink-2">
                                <span className="flex items-center gap-1">
                                    <GraduationCap className="size-3.5 text-alret-gold" />
                                    {profile.course_label}
                                    {profile.track_label
                                        ? ` / ${profile.track_label}`
                                        : ""}
                                </span>
                                {profile.purchased_sessions.length > 0 ? (
                                    <span>
                                        جلسات:{" "}
                                        {toPersianDigits(
                                            profile.purchased_sessions.join(
                                                "، ",
                                            ),
                                        )}
                                    </span>
                                ) : null}
                                <span className="flex items-center gap-1">
                                    <UserRound className="size-3.5" />
                                    {profile.mentor_name ?? "بدون منتور"}
                                </span>
                                <span
                                    className={
                                        profile.is_low_on_chats
                                            ? "font-bold text-err-text"
                                            : "text-succ-txt"
                                    }
                                >
                                    {toPersianDigits(
                                        profile.remaining_percentage,
                                    )}
                                    ٪ چت باقی‌مانده
                                </span>
                            </div>
                        ) : null}

                        <MessageList
                            messages={
                                conversationQuery.data?.data.messages ?? []
                            }
                            currentUserId={user?.id ?? null}
                            isPending={conversationQuery.isPending}
                            isError={conversationQuery.isError}
                            emptyHint={EMPTY_HINT}
                            // ناظر باید ببیند هر پیام را چه کسی و با چه نقشی فرستاده
                            showAttribution={isObserver}
                        />

                        {isClosed || isObserver ? (
                            <div className="space-y-2 border-t border-hairline bg-sunken px-4 py-4 text-center">
                                {isClosed ? (
                                    <>
                                        <p className="text-sm font-bold text-ink">
                                            این گفتگو بسته شده است
                                        </p>
                                        {activeConversation?.rating_value ? (
                                            <div className="flex items-center justify-center gap-1" dir="rtl">
                                                <span className="text-xs text-ink-2">
                                                    امتیاز دانشجو:
                                                </span>
                                                {[
                                                    1, 2, 3, 4, 5,
                                                ].map((value) => (
                                                    <Star
                                                        key={value}
                                                        aria-hidden="true"
                                                        className={
                                                            value <=
                                                            (activeConversation
                                                                .rating_value ??
                                                                0)
                                                                ? "size-4 fill-alret-gold text-alret-gold"
                                                                : "size-4 text-ink-3"
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        ) : activeConversation
                                                  ?.awaiting_student_rating ? (
                                            <p className="text-xs leading-6 text-ink-2">
                                                از دانشجو خواسته شده تا از
                                                پاسخ‌گویی شما امتیاز بدهد.
                                            </p>
                                        ) : null}
                                    </>
                                ) : null}

                                {isObserver ? (
                                    <p className="text-xs leading-6 text-ink-2">
                                        شما با نقش ناظر وارد شده‌اید؛ مشاهده‌ی
                                        گفتگو مجاز است اما پاسخ‌دادن یا بستن آن
                                        نیست. هر دسترسی شما ثبت می‌شود.
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <SupportComposer
                                onSend={(body, options) =>
                                    replyMutation.mutate({ body, ...options })
                                }
                                isSending={replyMutation.isPending}
                                error={sendError}
                            />
                        )}
                    </>
                )}
            </Card>

            {isCloseDialogOpen ? (
                <SupportCloseDialog
                    isSubmitting={closeMutation.isPending}
                    error={dialogError}
                    onCancel={() => {
                        setIsCloseDialogOpen(false);
                        setDialogError(null);
                    }}
                    onConfirm={() => closeMutation.mutate()}
                />
            ) : null}
        </div>
    );
}
