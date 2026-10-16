<?php

namespace App\Models;

use App\Support\ComplaintStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * اعلانِ تغییر وضعیت نارضایتی برای دانشجو.
 *
 * عنوان و متن در لحظه‌ی ساخت ذخیره می‌شوند، نه در رندر؛ چون وضعیت نارضایتی
 * بعداً عوض می‌شود و اگر متن از روی وضعیتِ فعلی ساخته شود، اعلانِ قدیمی
 * هم وضعیطِ جدید را نشان می‌داد.
 */
class ComplaintNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'complaint_id',
        'title',
        'body',
        'status',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => ComplaintStatus::class,
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }

    public function isUnread(): bool
    {
        return $this->read_at === null;
    }
}
