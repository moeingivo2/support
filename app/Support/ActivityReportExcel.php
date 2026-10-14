<?php

namespace App\Support;

use App\Models\Shift;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;

class ActivityReportExcel extends SpreadsheetWorkbook
{
    public function __construct(
        private readonly SupportRatingReport $ratings = new SupportRatingReport,
    ) {}

    /**
     * گزارش فعالیت پشتیبان.
     *
     * برگه‌های «خلاصه»، «جزئیات فعالیت» و «گفتگو با دانشجویان» بدون تغییر
     * باقی می‌مانند و دو برگه‌ی امتیازدهی به انتهای گزارش **افزوده** می‌شود.
     *
     * @param  Collection<int, Shift>  $shifts
     */
    public function build(
        User $support,
        Collection $shifts,
        CarbonInterface $from,
        CarbonInterface $to,
        ?ChatActivityReport $chat = null,
    ): string {
        $chat ??= ChatActivityReport::forShifts($support, $shifts, $from, $to);
        $summary = $this->summary($shifts, $chat);
        $ratingSummary = $this->ratings->summaryFor($support);

        return $this->document(
            'گزارش فعالیت پشتیبان',
            'گزارش شیفت و فعالیت گفتگوی پشتیبان',
            $this->summaryWorksheet($support, $summary, $from, $to, $ratingSummary),
            $this->detailsWorksheet($support, $shifts, $chat),
            $this->conversationsWorksheet($chat),
            $this->ratingsWorksheet($support, $ratingSummary),
            $this->ratingDetailsWorksheet($support, $ratingSummary),
        );
    }

    /**
     * @param  array<string, int|float|string>  $summary
     * @param  array{average: float|null, total: int, distribution: array<int, int>}  $ratingSummary
     */
    private function summaryWorksheet(
        User $support,
        array $summary,
        CarbonInterface $from,
        CarbonInterface $to,
        array $ratingSummary,
    ): string {
        $rows = [
            $this->row([$this->textCell('گزارش فعالیت پشتیبان', 'Title')], 'Title', 32),
            $this->row([
                $this->textCell('پشتیبان', 'Label'),
                $this->textCell($support->name),
                $this->textCell('بازه زمانی', 'Label'),
                $this->textCell(JalaliDate::format($from).' تا '.JalaliDate::format($to)),
            ]),
            $this->row([
                $this->textCell('تاریخ تولید', 'Label'),
                $this->textCell(JalaliDate::formatWithTime(now())),
            ]),
            $this->row([$this->textCell('خلاصه عملکرد', 'Section')], 'Section', 24),
        ];

        $summaryLabels = [
            'shift_count' => 'تعداد شیفت',
            'worked_minutes' => 'مجموع مدت کار',
            'worked_hours' => 'مجموع ساعت کاری',
            'reports_count' => 'گزارش‌های ثبت‌شده',
            'missing_reports_count' => 'شیفت‌های بدون گزارش',
            'responded_students_count' => 'دانشجویان پاسخ‌داده‌شده',
            'unsatisfied_students_count' => 'دانشجویان ناراضی',
            'desk_requests_count' => 'درخواست‌های دسک',
        ];

        $chatLabels = [
            'conversations_count' => 'تعداد گفتگو',
            'students_count' => 'تعداد دانشجویان گفتگوکرده',
            'unsatisfied_students_chat_count' => 'دانشجویان ناراضی (نارضایتی ثبت‌شده)',
            'student_messages_count' => 'مجموع پیام‌های دانشجو',
            'support_messages_count' => 'مجموع پیام‌های پشتیبان',
            'average_first_response_minutes' => 'میانگین زمان اولین پاسخ (دقیقه)',
        ];

        foreach ($summaryLabels as $key => $label) {
            $rows[] = $this->row([
                $this->textCell($label, 'Label'),
                $this->valueCell($summary[$key]),
            ]);
        }

        $rows[] = $this->row([$this->textCell('آمار گفتگو', 'Section')], 'Section', 24);

        foreach ($chatLabels as $key => $label) {
            $rows[] = $this->row([
                $this->textCell($label, 'Label'),
                $this->valueCell($summary[$key]),
            ]);
        }

        // بخش رضایت دانشجویان — جدا از شیفت تا با هم اشتباه نشوند
        $rows[] = $this->row([$this->textCell('رضایت دانشجویان', 'Section')], 'Section', 24);
        $rows[] = $this->row([
            $this->textCell('میانگین امتیاز', 'Label'),
            $ratingSummary['average'] === null
                ? $this->textCell('—')
                : $this->numberCell($ratingSummary['average']),
        ]);
        $rows[] = $this->row([
            $this->textCell('مجموع امتیازها', 'Label'),
            $this->numberCell($ratingSummary['total']),
        ]);

        foreach ($ratingSummary['distribution'] as $star => $count) {
            $rows[] = $this->row([
                $this->textCell(str_repeat('★', $star).' '.$this->persian($star).' ستاره', 'Label'),
                $this->numberCell($count),
            ]);
        }

        return $this->worksheet('خلاصه', $rows, [170, 180, 130, 220], false);
    }

    /**
     * جایگزینی ارقام فارسی در متن‌های ثابت اکسل
     */
    private function persian(int $value): string
    {
        return strtr((string) $value, [
            '0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴',
            '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹',
        ]);
    }

    /**
     * @param  Collection<int, Shift>  $shifts
     */
    private function detailsWorksheet(User $support, Collection $shifts, ChatActivityReport $chat): string
    {
        $headers = [
            'ردیف',
            'شناسه شیفت',
            'پشتیبان',
            'روز',
            'تاریخ',
            'شروع',
            'پایان',
            'مدت (دقیقه)',
            'مدت کار',
            'کانال',
            'وضعیت',
            'گزارش',
            'پاسخ‌داده‌شده',
            'ناراضی',
            'درخواست دسک',
            'یادداشت',
            'گفتگو',
            'پیام دانشجو',
            'پیام پشتیبان',
            'گفتگوکرده',
        ];
        $rows = [
            $this->row(array_map(fn (string $header): string => $this->textCell($header, 'Header'), $headers), 'Header', 34),
        ];

        foreach ($shifts as $index => $shift) {
            $report = $shift->report;
            $durationMinutes = $this->durationInMinutes($shift);
            $metrics = $chat->forShift($shift->id);
            $rows[] = $this->row([
                $this->numberCell($index + 1),
                $this->numberCell($shift->id),
                $this->textCell($support->name),
                $this->textCell($this->dayName($shift->start_time)),
                $this->textCell(JalaliDate::format($shift->start_time)),
                $this->textCell($shift->start_time->format('H:i')),
                $this->textCell($shift->end_time?->format('H:i') ?? 'در حال انجام'),
                $this->numberCell($durationMinutes),
                $this->textCell($this->formatMinutes($durationMinutes)),
                $this->textCell($this->channelLabel($shift->channel)),
                $this->textCell($this->statusLabel($shift->status)),
                $this->textCell($report ? 'ثبت‌شده' : 'ثبت‌نشده'),
                $this->numberCell((int) ($report?->responded_students_count ?? 0)),
                $this->numberCell((int) ($report?->unsatisfied_students_count ?? 0)),
                $this->numberCell((int) ($report?->desk_requests_count ?? 0)),
                $this->textCell($report?->extra_notes ?? '—'),
                $this->numberCell($metrics['conversations']),
                $this->numberCell($metrics['student_messages']),
                $this->numberCell($metrics['support_messages']),
                $this->numberCell($metrics['students']),
            ]);
        }

        if ($shifts->isEmpty()) {
            $rows[] = $this->row([$this->textCell('در این بازه شیفتی ثبت نشده است.', 'Gold')], 'Gold', 24);
        }

        return $this->worksheet('جزئیات فعالیت', $rows, [
            45, 80, 150, 70, 100, 75, 75, 90, 90, 90, 90, 90, 110, 90, 90, 260, 70, 95, 100, 95,
        ]);
    }

    private function conversationsWorksheet(ChatActivityReport $chat): string
    {
        $headers = [
            'ردیف',
            'پشتیبان',
            'دانشجو',
            'دوره',
            'رشته',
            'تاریخ',
            'شروع',
            'پایان',
            'مدت (دقیقه)',
            'پیام دانشجو',
            'پیام پشتیبان',
            'وضعیت',
        ];
        $rows = [
            $this->row(array_map(fn (string $header): string => $this->textCell($header, 'Header'), $headers), 'Header', 34),
        ];

        foreach ($chat->conversationRows as $row) {
            $rows[] = $this->row([
                $this->numberCell($row['index']),
                $this->textCell($row['support']),
                $this->textCell($row['student']),
                $this->textCell($row['course']),
                $this->textCell($row['track']),
                $this->textCell($row['date']),
                $this->textCell($row['started_at']),
                $this->textCell($row['ended_at']),
                $this->numberCell($row['duration_minutes']),
                $this->numberCell($row['student_messages']),
                $this->numberCell($row['support_messages']),
                $this->textCell($row['status']),
            ]);
        }

        if ($chat->conversationRows === []) {
            $rows[] = $this->row([$this->textCell('در این بازه گفتگویی ثبت نشده است.', 'Gold')], 'Gold', 24);
        }

        return $this->worksheet('گفتگو با دانشجویان', $rows, [
            45, 150, 150, 90, 100, 100, 75, 75, 90, 100, 100, 130,
        ]);
    }

    /**
     * برگه‌ی «امتیاز گفتگو به گفتگو» — یک ردیف برای هر گفتگوی امتیازدار
     *
     * @param  array{average: float|null, total: int, distribution: array<int, int>}  $ratingSummary
     */
    private function ratingsWorksheet(User $support, array $ratingSummary): string
    {
        $headers = [
            'ردیف',
            'شناسه گفتگو',
            'عنوان گفتگو',
            'دانشجو',
            'امتیاز',
            'نمایش ستاره',
            'بسته‌شده توسط',
            'وضعیت گفتگو',
            'زمان بستن',
            'زمان ثبت امتیاز',
        ];
        $rows = [
            $this->row([$this->textCell('امتیازدهی گفتگو به گفتگو — '.$support->name, 'Title')], 'Title', 32),
            $this->row([
                $this->textCell('میانگین امتیاز', 'Label'),
                $ratingSummary['average'] === null
                    ? $this->textCell('—')
                    : $this->numberCell($ratingSummary['average']),
            ]),
            $this->row([
                $this->textCell('مجموع امتیازها', 'Label'),
                $this->numberCell($ratingSummary['total']),
            ]),
            $this->row(array_map(fn (string $header): string => $this->textCell($header, 'Header'), $headers), 'Header', 34),
        ];

        $detailRows = $this->ratings->rowsFor($support);

        foreach ($detailRows as $row) {
            $rows[] = $this->row([
                $this->numberCell((int) $row['index']),
                $this->numberCell((int) $row['conversation_id']),
                $this->textCell((string) $row['title']),
                $this->textCell((string) $row['student']),
                $this->numberCell((int) $row['rating_value']),
                $this->textCell((string) $row['stars']),
                $this->textCell((string) $row['closure_actor']),
                $this->textCell((string) $row['status']),
                $this->textCell((string) $row['closed_at']),
                $this->textCell((string) $row['submitted_at']),
            ]);
        }

        if ($detailRows === []) {
            $rows[] = $this->row([$this->textCell('برای این پشتیبان امتیازی ثبت نشده است.', 'Gold')], 'Gold', 24);
        }

        return $this->worksheet('امتیاز گفتگو به گفتگو', $rows, [
            45, 100, 200, 150, 70, 110, 110, 120, 140, 140,
        ]);
    }

    /**
     * برگه‌ی توزیع ستاره‌ها — برای مقایسه‌ی سریع کیفیت
     *
     * @param  array{average: float|null, total: int, distribution: array<int, int>}  $ratingSummary
     */
    private function ratingDetailsWorksheet(User $support, array $ratingSummary): string
    {
        $rows = [
            $this->row([$this->textCell('توزیع امتیازهای '.$support->name, 'Title')], 'Title', 32),
            $this->row(array_map(
                fn (string $header): string => $this->textCell($header, 'Header'),
                ['امتیاز', 'تعداد گفتگو', 'سهم از کل (٪)'],
            ), 'Header', 34),
        ];

        $total = max(1, $ratingSummary['total']);

        foreach ($ratingSummary['distribution'] as $star => $count) {
            $rows[] = $this->row([
                $this->textCell(str_repeat('★', $star)),
                $this->numberCell($count),
                $this->numberCell(round($count / $total * 100, 1)),
            ]);
        }

        $rows[] = $this->row([
            $this->textCell('جمع', 'Total'),
            $this->numberCell($ratingSummary['total']),
            $this->textCell('—', 'Total'),
        ], 'Total');

        return $this->worksheet('توزیع امتیازها', $rows, [120, 120, 120]);
    }

    /**
     * @param  Collection<int, Shift>  $shifts
     * @return array<string, int|float|string>
     */
    private function summary(Collection $shifts, ChatActivityReport $chat): array
    {
        $summary = [
            'shift_count' => 0,
            'worked_minutes' => 0,
            'worked_hours' => 0.0,
            'reports_count' => 0,
            'missing_reports_count' => 0,
            'responded_students_count' => 0,
            'unsatisfied_students_count' => 0,
            'desk_requests_count' => 0,
            'conversations_count' => $chat->conversationsCount,
            'students_count' => $chat->studentsCount,
            'unsatisfied_students_chat_count' => $chat->unsatisfiedStudentsCount,
            'student_messages_count' => $chat->studentMessagesCount,
            'support_messages_count' => $chat->supportMessagesCount,
            'average_first_response_minutes' => $chat->averageFirstResponseMinutes,
        ];

        foreach ($shifts as $shift) {
            $summary['shift_count']++;
            $summary['worked_minutes'] += $this->durationInMinutes($shift);
            $summary['reports_count'] += $shift->report ? 1 : 0;
            $summary['missing_reports_count'] += $shift->report ? 0 : 1;
            $summary['responded_students_count'] += (int) ($shift->report?->responded_students_count ?? 0);
            $summary['unsatisfied_students_count'] += (int) ($shift->report?->unsatisfied_students_count ?? 0);
            $summary['desk_requests_count'] += (int) ($shift->report?->desk_requests_count ?? 0);
        }

        $summary['worked_hours'] = round($summary['worked_minutes'] / 60, 2);

        return $summary;
    }

    private function durationInMinutes(Shift $shift): int
    {
        if (! $shift->start_time) {
            return 0;
        }

        $end = $shift->end_time ?? now();

        return max(0, (int) $shift->start_time->diffInMinutes($end));
    }

    private function formatMinutes(int $minutes): string
    {
        $hours = intdiv($minutes, 60);
        $remainingMinutes = $minutes % 60;

        return sprintf('%02d:%02d', $hours, $remainingMinutes);
    }

    private function dayName(CarbonInterface $date): string
    {
        return match ($date->dayOfWeek) {
            0 => 'یکشنبه',
            1 => 'دوشنبه',
            2 => 'سه‌شنبه',
            3 => 'چهارشنبه',
            4 => 'پنج‌شنبه',
            5 => 'جمعه',
            6 => 'شنبه',
            default => '-',
        };
    }

    private function channelLabel(string $channel): string
    {
        return match ($channel) {
            'ai' => 'هوش مصنوعی',
            'phone' => 'تلفن',
            default => 'وب',
        };
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'active' => 'فعال',
            'ended' => 'پایان‌یافته',
            default => $status,
        };
    }
}
