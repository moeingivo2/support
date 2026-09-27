<?php

namespace App\Models;

use App\Support\MessageType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

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
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => MessageType::class,
            'read_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function isFromStudent(): bool
    {
        return $this->conversation !== null && $this->sender_id === $this->conversation->student_id;
    }

    public function attachmentUrl(): ?string
    {
        if ($this->attachment_path === null) {
            return null;
        }

        return Storage::disk(config('aiosupport.attachments.disk'))->url($this->attachment_path);
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
