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
import { fetchAuthenticatedBlob } from "@/shared/api/http";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { StatusPill } from "@/shared/ui/status-pill";
import { useToast } from "@/shared/ui/toast";
import { toPersianDigits } from "@/features/student-chat/utils/persian";
import { MessageList } from "@/features/student-chat/components/MessageList";
import { ChatComposer } from "@/features/student-chat/components/ChatComposer";
import type { OutgoingAttachment } from "@/features/student-chat/types/chat";
import { useAuth } from "@/shared/services/auth-context";
import { rankKeys } from "@/features/student-chat/services/rank-invalidation";
import {
    useNewMessageAlert,
    useSupportConversation,
    useSupportInbox,
    useSupportStudents,
} from "../hooks/useSupportChat";
import {
    closeSupportConversation,
    sendReply,
    supportChatKeys,
} from "../services/support-chat-service";
import { ConversationList } from "../components/ConversationList";
import { NotificationSoundToggle } from "../components/NotificationSoundToggle";
import { StudentList } from "../components/StudentList";
import { SupportCloseDialog } from "../components/SupportCloseDialog";

const EMPTY_HINT =
    "هنوز پیامی در این گفتگو ثبت نشده است. اولین پاسخ را بنویسید.";

export default function SupportInboxPage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const { user, observerUser } = useAuth();
    const isOnline = useOnlineStatus();
    const [searchParams, setSearchParams] = useSearchParams();
    const [messageSearch, setMessageSearch] = useState("");
    const [isListOpen, setIsListOpen] = useState(false);
    const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
    const [dialogError, setDialogError] = useState<string | null>(null);
    // حالت کد در کادر ارسال مشترک با چت دانشجو نگه‌داری می‌شود.
    const [codeMode, setCodeMode] = useState(false);

    // ناظر فقط‌خواندنی است: نه پاسخ می‌دهد و نه گفتگو را می‌بندد
    const isObserver = user?.role === "observer";
    const isReadOnlyObserver = user?.role === "observer";
    const isImpersonatingSupport = Boolean(observerUser);

    const activeId = searchParams.get("c")
        ? Number(searchParams.get("c"))
        : null;
    // حین impersonation، نشست جاری پشتیبان است؛ owner_id باید همان پشتیبان
    // باشد تا صندوق ورودی به گفتگوهای همان اکانت محدود بماند.
    const ownerId = isImpersonatingSupport ? user?.id : undefined;

    // ?s=<studentId> یعنی فقط گفتگوهای همان دانشجو باز است؛ بدون آن
    // پنل روی فهرست دانشجویان می‌نشیند.
    const studentId = searchParams.get("s")
        ? Number(searchParams.get("s"))
        : null;

    const studentsQuery = useSupportStudents(ownerId);
    const inboxQuery = useSupportInbox(studentId, ownerId);
    const notificationsQuery = useNewMessageAlert(
        activeId,
        ownerId,
        !isReadOnlyObserver,
    );
    const conversationQuery = useSupportConversation(activeId, ownerId);
    const students = studentsQuery.data?.data ?? [];
    const conversations = inboxQuery.data?.data ?? [];
    const selectedStudent =
        students.find((row) => row.student.id === studentId) ?? null;
    const profile = conversationQuery.data?.data.profile ?? null;
    const unreadTotal = notificationsQuery.data?.unread_total ?? 0;
    const activeConversation = conversationQuery.data?.data.conversation ?? null;
    const isClosed = activeConversation?.is_closed ?? false;

    function selectConversation(id: number) {
        setMessageSearch("");
        setIsListOpen(false);
        setIsCloseDialogOpen(false);
        setDialogError(null);
        setSearchParams({ c: String(id) }, { replace: true });
    }

    /** باز کردن پروفایل یک دانشجو: فقط گفتگوهای همان نفر. */
    function selectStudent(id: number) {
        setMessageSearch("");
        setIsListOpen(false);
        setSearchParams({ s: String(id) }, { replace: true });
    }

    /** برگشت به فهرست همه‌ی دانشجویان. */
    function backToStudents() {
        setIsListOpen(false);
        setSearchParams({}, { replace: true });
    }

    const replyMutation = useMutation({
        mutationFn: ({
            body,
            codeMode,
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
            return sendReply({
                conversationId: activeId,
                body,
                codeMode,
                language,
                attachment,
                signal,
            });
        },
        onSuccess: () => {
            if (activeId !== null) {
                void queryClient.invalidateQueries({
                    queryKey: supportChatKeys.conversation(activeId),
                });
            }
            void queryClient.invalidateQueries({
                queryKey: supportChatKeys.inbox(studentId),
            });
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
                queryKey: supportChatKeys.inbox(studentId),
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

    // دو نما: فهرست دانشجویان (پیش‌فرض) و گفتگوهای یک دانشجوی مشخص.
    const list =
        studentId === null ? (
            <StudentList
                students={students}
                isPending={studentsQuery.isPending}
                isError={studentsQuery.isError}
                onRetry={() => void studentsQuery.refetch()}
                onSelect={selectStudent}
            />
        ) : (
            <div className="space-y-3">
                {/* در RTL سمت راست یعنی ابتدای سطر؛ دکمه هم‌عرض با باکس
                    دانشجو تا لبه‌ی کادر بخواند. */}
                <button
                    type="button"
                    onClick={backToStudents}
                    className="flex w-full items-center gap-1.5 rounded-2xl border border-hairline bg-surface-2 px-3 py-3 text-sm font-semibold text-ink transition-[background-color,border-color,box-shadow,opacity,color] duration-150 ease-out hover:border-hairline-strong hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2 "
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                    بازگشت به همه‌ی دانشجویان
                </button>

                {selectedStudent ? (
                    <div className="rounded-2xl border border-hairline bg-surface-2 px-3 py-3 text-right">
                        <p className="truncate text-sm font-bold text-ink">
                            {selectedStudent.student.name}
                        </p>
                        <p className="text-xs text-ink-2">
                            {toPersianDigits(
                                selectedStudent.conversations_count,
                            )}{" "}
                            گفتگو
                        </p>
                    </div>
                ) : null}

                <ConversationList
                    conversations={conversations}
                    activeId={activeId}
                    isPending={inboxQuery.isPending}
                    isError={inboxQuery.isError}
                    onRetry={() => void inboxQuery.refetch()}
                    onSelect={selectConversation}
                />
            </div>
        );

    return (
        <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 gap-4 md:gap-4">
            {/* lg:flex لازم است: Card ذاتاً display:block است و بدون آن
                flex-column بی‌اثر می‌ماند و اسکرول داخلی از کار می‌افتد. */}
            <Card className="hidden w-80 shrink-0 flex-col overflow-hidden lg:flex xl:w-[22rem]">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                    {list}
                </div>
            </Card>

            {isListOpen ? (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <button
                        type="button"
                        aria-label="بستن فهرست گفتگوها"
                        onClick={() => setIsListOpen(false)}
                        className="absolute inset-0 bg-overlay backdrop-blur-sm"
                    />
                    <Card className="absolute inset-y-3 right-3 left-3 flex flex-col overflow-hidden shadow-2xl">
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                            {list}
                        </div>
                    </Card>
                </div>
            ) : null}

            <Card className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 md:rounded-3xl md:border">
                <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-hairline bg-sunken px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
                    {/* برگشت به فهرست گفتگوها — فقط وقتی یک گفتگو باز است */}
                    {activeId !== null ? (
                        <button
                            type="button"
                            onClick={() => setSearchParams({}, { replace: true })}
                            aria-label="بازگشت به فهرست گفتگوها"
                            className="inline-flex h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink-2 transition-colors duration-150 ease-out  hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring-2  xl:hidden"
                        >
                            <ChevronRight className="size-4" aria-hidden="true" />
                            فهرست
                        </button>
                    ) : null}

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setIsListOpen((current) => !current)}
                        aria-label="فهرست گفتگوها"
                        aria-expanded={isListOpen}
                    >
                        {isListOpen ? <PanelRightClose /> : <PanelRightOpen />}
                    </Button>

                    <span className="hidden size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-ink ring-1 ring-primary-ring sm:grid">
                        <MessagesSquare className="size-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-sm font-bold text-ink">
                            {activeId === null
                                ? "گفتگو با دانشجویان"
                                : (conversationQuery.data?.data.conversation
                                      .student?.name ?? "گفتگوی دانشجو")}
                        </h1>
                        <p className="truncate text-xs text-ink-2">
                            {activeId === null
                                ? `گفتگوی دانشجویان حوزه‌ی ${
                                      user?.support_type === "ai"
                                          ? "هوش مصنوعی"
                                          : "وب"
                                  } برای همه پشتیبان‌های همین حوزه قابل مشاهده است.`
                                : (conversationQuery.data?.data.conversation
                                      .title ?? "")}
                        </p>
                    </div>

                    {/* همان چیدمان هدر چت دانشجو: کنش‌ها در یک ردیف جمع می‌شوند
                        تا بالای صفحه یک‌خط بماند و ارتفاع پیام‌ها کم نشود. */}
                    <div className="flex shrink-0 items-center gap-1.5">
                        {isOnline ? (
                            <span
                                className="hidden items-center gap-1 text-[11px] text-succ-txt sm:inline-flex"
                                role="status"
                            >
                                <span aria-hidden="true">●</span> آنلاین
                            </span>
                        ) : null}

                        {isObserver ? (
                            <StatusPill tone="info" className="max-sm:hidden">
                                <Eye className="size-3" />
                                فقط‌خواندنی
                            </StatusPill>
                        ) : null}

                        {activeConversation?.is_closed ? (
                            <StatusPill tone="neutral">
                                <Lock className="size-3" />
                                <span className="max-sm:hidden">
                                    {activeConversation.status_label}
                                </span>
                            </StatusPill>
                        ) : null}

                        {isImpersonatingSupport ? (
                            <StatusPill tone="warning" className="max-sm:hidden">
                                مشاهدهٔ حساب پشتیبان
                            </StatusPill>
                        ) : null}

                        {unreadTotal > 0 ? (
                            <StatusPill tone="danger">
                                <Bell className="size-3" />
                                <span className="max-sm:hidden">
                                    {toPersianDigits(unreadTotal)} خوانده‌نشده
                                </span>
                            </StatusPill>
                        ) : null}

                        {isReadOnlyObserver ? null : (
                            <NotificationSoundToggle />
                        )}

                        {activeId !== null &&
                        !isClosed &&
                        !isReadOnlyObserver ? (
                            <Button
                                type="button"
                                variant="danger"
                                onClick={() => {
                                    setDialogError(null);
                                    setIsCloseDialogOpen(true);
                                }}
                                disabled={closeMutation.isPending}
                                className="max-sm:px-2.5"
                            >
                                <Lock />
                                <span className="max-sm:hidden">
                                    پایان گفتگو
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
                            از فهرست سمت راست یک گفتگو را انتخاب کنید تا
                            پیام‌های دانشجو را ببینید و پاسخ دهید.
                        </p>
                    </div>
                ) : (
                    <>
                        {profile && !isReadOnlyObserver ? (
                            <div className="flex shrink-0 items-center gap-2 overflow-x-auto whitespace-nowrap border-b border-hairline bg-sunken px-4 py-2 text-[11px] text-ink-2">
                                <span className="flex shrink-0 items-center gap-1">
                                    <GraduationCap className="size-3.5 text-alret-gold" />
                                    {profile.course_label}
                                    {profile.track_label
                                        ? ` / ${profile.track_label}`
                                        : ""}
                                </span>
                                {profile.purchased_sessions.length > 0 ? (
                                    <span className="shrink-0">
                                        جلسات:{" "}
                                        {toPersianDigits(
                                            profile.purchased_sessions.join(
                                                "، ",
                                            ),
                                        )}
                                    </span>
                                ) : null}
                                <span className="flex shrink-0 items-center gap-1">
                                    <UserRound className="size-3.5" />
                                    {profile.mentor_name ?? "بدون منتور"}
                                </span>
                                <span
                                    className={
                                        profile.is_low_on_chats
                                            ? "shrink-0 font-bold text-err-text"
                                            : "shrink-0 text-succ-txt"
                                    }
                                >
                                    {toPersianDigits(
                                        profile.remaining_percentage,
                                    )}
                                    ٪ چت باقی‌مانده
                                </span>
                            </div>
                        ) : null}

                        {profile?.roadmap_url && !isReadOnlyObserver ? (
                            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline bg-primary-soft px-4 py-2">
                                <div><p className="text-sm font-bold text-ink">رودمپ دوره آفلاین</p><p className="mt-1 text-xs text-ink-2">فایل بارگذاری‌شده هنگام ثبت‌نام دانشجو</p></div>
                                <Button type="button" variant="ghost" onClick={async () => {
                                    const blob = await fetchAuthenticatedBlob(profile.roadmap_url!, "application/pdf");
                                    const url = URL.createObjectURL(blob);
                                    window.open(url, "_blank", "noopener,noreferrer");
                                }} className="inline-flex h-10 items-center rounded-xl border border-primary-line bg-surface px-3 text-sm font-semibold text-accent-ink hover:bg-surface-2">مشاهده رودمپ</Button>
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
                            conversationId={activeId}
                            search={messageSearch}
                            onSearchChange={setMessageSearch}
                            // ناظر فقط‌خواندنی باید ببیند هر پیام را چه کسی
                            // و با چه نقشی فرستاده؛ ناظر اکانت خودش پشتیبان
                            // است و مثل بقیه پاسخ می‌دهد.
                            showAttribution={isObserver}
                        />

                        {isClosed || isReadOnlyObserver ? (
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

                                {isReadOnlyObserver ? (
                                    <p className="text-xs leading-6 text-ink-2">
                                        شما با نقش ناظر وارد شده‌اید؛ مشاهده‌ی
                                        گفتگو مجاز است اما پاسخ‌دادن یا بستن آن
                                        نیست. هر دسترسی شما ثبت می‌شود.
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <ChatComposer
                                codeMode={codeMode}
                                onCodeModeChange={setCodeMode}
                                onSend={(body, options) =>
                                    replyMutation.mutateAsync({
                                        body,
                                        ...options,
                                    })
                                }
                                isSending={replyMutation.isPending}
                                isOnline={isOnline}
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
