<?php

namespace App\Console\Commands;

use App\Models\Shift;
use App\Support\ShiftReportGenerator;
use Illuminate\Console\Command;

/**
 * بازمحاسبه‌ی گزارش‌های شیفتِ موجود.
 *
 * چرا لازم است: گزارش‌های قدیمی با نسخه‌های پیشینِ شمارش ساخته شده‌اند که
 * بازه‌ی زمانیِ شیفت را رعایت نمی‌کرد؛ نتیجه اینکه مثلاً یک شیفتِ دو
 * ثانیه‌ای «۳۲۱ دانشجوی پاسخ‌داده‌شده» نشان می‌داد. این دستور همه‌ی
 * گزارش‌ها را با منطق فعلی دوباره می‌نویسد.
 */
class RecalculateShiftReports extends Command
{
    protected $signature = 'shifts:recalculate-reports {--shift= : فقط یک شیفتِ مشخص}';

    protected $description = 'شمارش گزارش‌های شیفت را با منطق فعلی بازمحاسبه می‌کند.';

    public function handle(): int
    {
        $query = Shift::query()->whereNotNull('end_time');

        if ($this->option('shift') !== null) {
            $query->whereKey((int) $this->option('shift'));
        }

        $changed = 0;
        $checked = 0;

        foreach ($query->orderBy('id')->cursor() as $shift) {
            $report = ShiftReportGenerator::refresh($shift);

            if ($report === null) {
                // شیفتِ بدون گزارش (هنوز ساخته نشده) را دست نمی‌زنیم؛
                // موقع پایان شیفت ساخته می‌شود.
                continue;
            }

            $checked++;
            $this->line(sprintf(
                '  شیفت #%d — پاسخ‌داده‌شده: %d، ناراضی: %d',
                $shift->id,
                $report->responded_students_count,
                $report->unsatisfied_students_count,
            ));
            $changed++;
        }

        $this->info("گزارش‌های بازمحاسبه‌شده: {$changed} (از {$checked} گزارش موجود)");

        return self::SUCCESS;
    }
}
