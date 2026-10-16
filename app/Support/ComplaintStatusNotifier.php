<?php

namespace App\Support;

use App\Models\Complaint;
use App\Models\ComplaintNotification;

/**
 * ساخت اعلانِ تغییر وضعیت نارضایتی برای دانشجو.
 *
 * چرا جدا از کنترلر: همین پیام باید از هر جایی که وضعیت نارضایتی عوض
 * می‌شود (فعلاً فقط پنل سوپر ادمین) ساخته شود و متن و وضعیتِ ذخیره‌شده باید
 * هر دو با هم هماهنگ بمانند.
 */
final class ComplaintStatusNotifier
{
    /**
     * برچسبِ کوتاهِ موضوع نارضایتی.
     *
     * هم در متن اعلان و هم در فهرستِ «نارضایتی‌های من» استفاده می‌شود، پس
     * عمداً یک‌جاست تا دانشجو هر دو را یکسان ببیند و این دو مسیر با هم
     * واگرا نشوند.
     */
    public static function subject(Complaint $complaint): string
    {
        if ($complaint->type === ComplaintType::Mentor) {
            return self::prefixed('منتور', $complaint->mentorFullName());
        }

        if ($complaint->type === ComplaintType::Course) {
            return self::prefixed('دوره', $complaint->course_name);
        }

        return 'پشتیبانی';
    }

    /**
     * پیشوندِ موضوع را فقط وقتی اضافه می‌کند که خودِ نام با آن شروع نشود.
     *
     * بدون این نگهبان، نامی که خودِ دانشجو نوشته (مثلاً «دوره پایتون»)
     * دو بار پیشوند می‌گیرد و متن اعلان «دوره دوره پایتون» می‌شود.
     */
    private static function prefixed(string $prefix, ?string $name): string
    {
        $name = trim((string) $name);

        if ($name === '') {
            return $prefix;
        }

        return str_starts_with($name, $prefix)
            ? $name
            : $prefix.' '.$name;
    }

    /**
     * @return array{title: string, body: string, status: string}
     */
    public static function contentFor(Complaint $complaint): array
    {
        $status = $complaint->status;

        return [
            'title' => 'نارضایتی شما تغییر وضعیت داد',
            // `subject()` خودش کوتاه است («پشتیبانی» یا «منتور رضا محمدی»)،
            // پس در متن دوباره «نارضایتی» تکرار نمی‌شود.
            'body' => sprintf(
                '«%s» به وضعیت «%s» تغییر کرد.',
                self::subject($complaint),
                $status->label(),
            ),
            'status' => $status->value,
        ];
    }

    public static function notifyStatusChanged(Complaint $complaint): ComplaintNotification
    {
        return ComplaintNotification::create([
            'user_id' => $complaint->user_id,
            'complaint_id' => $complaint->id,
            ...self::contentFor($complaint),
        ]);
    }
}
