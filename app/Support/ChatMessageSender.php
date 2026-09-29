<?php

namespace App\Support;

use App\Http\Requests\SendChatMessageRequest;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * ثبت پیام روی گفتگو، به‌روزرسانی شمارنده‌های خوانده‌نشده و کسر سهمیه چت دانشجو.
 */
class ChatMessageSender
{
    public function __construct(private readonly AttachmentStorage $attachments) {}

    public function send(
        Conversation $conversation,
        User $sender,
        SendChatMessageRequest $request,
        bool $codeMode = false,
    ): Message {
        $type = $this->resolveType($request, $codeMode);
        $body = trim((string) $request->input('body'));

        $attachmentPath = null;
        $attachmentName = null;
        $attachmentMime = null;
        $attachmentSize = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentPath = $this->attachments->store($file);
            $attachmentName = $file->getClientOriginalName();
            $attachmentMime = $file->getClientMimeType();
            $attachmentSize = $file->getSize();
        }

        $message = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'actor_id' => $sender->id,
            'actor_role' => ActorRole::forRole((string) $sender->role),
            'type' => $type,
            'body' => $body === '' ? null : $body,
            'language' => $type === MessageType::Code ? ($request->input('language') ?: 'plain') : null,
            'attachment_path' => $attachmentPath,
            'attachment_name' => $attachmentName,
            'attachment_mime' => $attachmentMime,
            'attachment_size' => $attachmentSize,
            'duration_seconds' => $type === MessageType::Voice
                ? (int) $request->input('duration_seconds', 1)
                : null,
        ]);

        $isStudentSender = $sender->id === $conversation->student_id;

        $this->touchConversation($conversation, $message, $isStudentSender, $sender);

        if ($isStudentSender) {
            $this->consumeChatQuota($sender);
        }

        return $message;
    }

    /**
     * آیا دانشجو هنوز چت باقی‌مانده دارد؟
     */
    public function studentHasQuota(User $student): bool
    {
        $profile = StudentProfile::query()->where('user_id', $student->id)->first();

        return $profile !== null && $profile->remainingChats() > 0;
    }

    private function touchConversation(
        Conversation $conversation,
        Message $message,
        bool $isStudentSender,
        User $sender,
    ): void {
        $unreadColumn = $isStudentSender ? 'unread_support_count' : 'unread_student_count';

        // شمارنده باید اتمیک زیاد شود. نسخه‌ی قبل مقدار خوانده‌شده را در
        // PHP یکی اضافه می‌کرد؛ اگر چند پشتیبان هم‌زمان پاسخ می‌دادند،
        // هر کدام از یک عدد کهنه شروع می‌کردند و شمارنده کمتر از واقعیت
        // می‌شد — یعنی هرچه ترافیک بیشتر، اعلان‌ها دقیق‌تر غلط.
        $conversation->newQuery()->whereKey($conversation->id)->update([
            'title' => $conversation->title === 'گفتگوی جدید' && $message->body !== null
                ? mb_strimwidth($message->body, 0, 60, '…')
                : $conversation->title,
            'last_message_preview' => $message->preview(),
            'last_message_at' => $message->created_at,
            $unreadColumn => DB::raw('"'.$unreadColumn.'" + 1'),
            'support_id' => $isStudentSender ? $conversation->support_id : $sender->id,
        ]);

        $conversation->refresh();
    }

    private function resolveType(SendChatMessageRequest $request, bool $codeMode): MessageType
    {
        if (! $request->hasFile('attachment')) {
            return $codeMode ? MessageType::Code : MessageType::Text;
        }

        $file = $request->file('attachment');
        $mime = (string) $file->getClientMimeType();

        if (str_starts_with($mime, 'image/')) {
            return MessageType::Image;
        }

        if (str_starts_with($mime, 'audio/') || $this->isVoiceExtension($file->getClientOriginalExtension())) {
            return MessageType::Voice;
        }

        return MessageType::File;
    }

    private function isVoiceExtension(string $extension): bool
    {
        return in_array(strtolower($extension), ['webm', 'ogg', 'oga', 'mp3', 'm4a', 'wav', 'aac'], true);
    }

    private function consumeChatQuota(User $student): void
    {
        // کسر سهمیه باید اتمیک باشد و فقط وقتی رخ دهد که واقعاً چت
        // باقی‌مانده وجود دارد؛ وگرنه چند درخواست هم‌زمان می‌توانستند
        // یک چت باقی‌مانده را چند بار مصرف کنند.
        $consumed = StudentProfile::query()
            ->where('user_id', $student->id)
            ->whereColumn('used_chats', '<', 'total_chats')
            ->increment('used_chats');

        if ($consumed === 0) {
            throw new RuntimeException('سهمیه چت شما تمام شده است.');
        }
    }
}
