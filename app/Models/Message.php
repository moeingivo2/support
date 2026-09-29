<?php

namespace App\Models;

use App\Support\ActorRole;
use App\Support\MessageType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'type',
        'body',
        'language',
        'attachment_path',
        'attachment_name',
        'attachment_mime',
        'attachment_size',
        'duration_seconds',
        'read_at',
        'actor_role',
        'actor_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => MessageType::class,
            'read_at' => 'datetime',
            'actor_role' => ActorRole::class,
            'is_edited' => 'boolean',
        ];
    }

    /**
     * هویت ثبت‌کننده پس از ثبت پیام تغییر نمی‌کند تا حسابرسی معتبر بماند.
     */
    protected static function booted(): void
    {
        static::updating(function (self $message): void {
            $message->actor_role = $message->getOriginal('actor_role');
            $message->actor_id = $message->getOriginal('actor_id');
        });
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function isFromStudent(): bool
    {
        return $this->conversation !== null && $this->sender_id === $this->conversation->student_id;
    }

    /**
     * پیوست‌ها نباید با نوع واقعی‌شان سرو شوند: یک فایل html یا svg می‌تواند
     * در مرورگر اجرا شود و از همان مبدأ به توکن دسترسی دست بزند.
     */
    public function attachmentUrl(): ?string
    {
        if ($this->attachment_path === null) {
            return null;
        }

        return route('attachments.show', ['path' => $this->attachment_path]);
    }

    public function preview(): string
    {
        if ($this->body !== null && trim($this->body) !== '') {
            return mb_strimwidth(trim($this->body), 0, 90, '…');
        }

        return match ($this->type) {
            MessageType::Image => '🖼 تصویر',
            MessageType::Voice => '🎤 پیام صوتی',
            MessageType::File => '📎 '.$this->attachment_name,
            default => '',
        };
    }
}
