<?php

namespace App\Support\Concerns;

use App\Models\StudentProfile;
use App\Models\User;
use App\Support\CourseTrack;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * تفکیک محتوای پنل به دو بخش «وب» و «هوش مصنوعی».
 *
 * سوپر ادمین به هر دو بخش دسترسی دارد و می‌تواند به هر کدام که خواست اضافه
 * کند؛ پشتیبان و ناظر اکانت فقط بخش هم‌نوع خودشان را می‌بینند و مالک محتوای
 * ثبت‌شده‌شان‌اند. دانشجو هم محتوای همان مسیری را می‌گیرد که در آن ثبت‌نام
 * کرده است.
 */
trait ScopesBySupportChannel
{
    /**
     * کانال‌های قابل مشاهده برای این کاربر؛ `null` یعنی بدون محدودیت
     * (سوپر ادمین هر دو کانال را می‌بیند).
     *
     * @return array<int, string>|null
     */
    private function visibleChannels(User $user): ?array
    {
        if ($user->isAdmin()) {
            return null;
        }

        return $user->support_type !== null ? [$user->support_type] : [];
    }

    /**
     * @param  Builder<covariant \Illuminate\Database\Eloquent\Model>  $query
     */
    private function applyVisibleChannel(Builder $query, User $user, string $column = 'channel'): void
    {
        $channels = $this->visibleChannels($user);

        if ($channels === null) {
            return;
        }

        // کاربری که نوع پشتیبانی ندارد (مثلاً ناظر فقط‌خواندنی) هیچ بخشی
        // را نمی‌بیند؛ به‌جای نشت دادن محتوای هر دو کانال، نتیجه خالی است.
        $query->whereIn($column, $channels === [] ? [''] : $channels);
    }

    /**
     * فقط سوپر ادمین اجازه دارد بخش دلخواه را فیلتر یا اضافه کند؛ برای بقیه
     * پارامتر ارسالی نادیده گرفته می‌شود و کانال از خودِ کاربر می‌آید.
     *
     * @return array<int, string>|null
     */
    private function requestedChannels(Request $request): ?array
    {
        if (! $request->user()->isAdmin() || ! $request->filled('channel')) {
            return null;
        }

        $channel = $request->string('channel')->toString();

        if ($channel === 'all') {
            return null;
        }

        return [$channel];
    }

    /** کانالی که محتوای جدید زیر آن ثبت می‌شود. */
    private function channelForNewContent(Request $request): string
    {
        if ($request->user()->isAdmin() && $request->filled('channel')) {
            return $request->string('channel')->toString();
        }

        return $request->user()->support_type ?? 'web';
    }

    /**
     * کانال‌هایی که یک دانشجو باید محتوایشان را ببیند.
     *
     * مسیر دانشجو فقط برای دوره‌ی آفلاین انتخاب می‌شود؛ اگر هنوز مسیری
     * ثبت نشده باشد هر دو بخش نمایش داده می‌شود تا دانشجو محتوایی را از
     * دست ندهد.
     *
     * @return array<int, string>
     */
    private function studentChannels(User $student): array
    {
        $track = StudentProfile::query()
            ->where('user_id', $student->id)
            ->value('track');

        if ($track instanceof CourseTrack) {
            return [$track->value];
        }

        return is_string($track) && $track !== '' ? [$track] : ['web', 'ai'];
    }
}
