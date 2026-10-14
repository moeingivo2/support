<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * خروجی اکسل رتبه‌بندی پشتیبان‌ها بر پایه‌ی امتیاز دانشجویان.
 */
class SupportRankingExcel extends SpreadsheetWorkbook
{
    /**
     * @param  array<int, array<string, mixed>>  $board
     * @param  array<int, array<string, mixed>>  $details
     */
    public function build(array $board, array $details): string
    {
        return $this->document(
            'رتبه‌بندی پشتیبان‌ها',
            'رتبه‌بندی پشتیبان‌ها بر اساس امتیاز دانشجویان',
            $this->boardWorksheet($board),
            $this->detailsWorksheet($details),
        );
    }

    /**
     * @param  array<int, array<string, mixed>>  $board
     */
    private function boardWorksheet(array $board): string
    {
        $rows = [
            $this->row([$this->textCell('رتبه‌بندی پشتیبان‌ها بر اساس امتیاز دانشجویان', 'Title')], 'Title', 32),
            $this->row([
                $this->textCell('تاریخ تولید', 'Label'),
                $this->textCell(JalaliDate::formatWithTime(now())),
            ]),
            $this->row([
                $this->textCell('قاعده شکست تساوی', 'Label'),
                $this->textCell(SupportRanking::TIE_BREAK_RULE),
            ]),
            $this->row([
                $this->textCell('مجموع امتیازهای ثبت‌شده', 'Label'),
                $this->numberCell(count(array_filter($board, fn (array $row): bool => $row['total_ratings'] > 0))),
            ]),
        ];

        $headers = ['رتبه', 'پشتیبان', 'نوع پشتیبانی', 'میانگین امتیاز', 'تعداد امتیاز', 'آخرین امتیاز'];
        $rows[] = $this->row(
            array_map(fn (string $header): string => $this->textCell($header, 'Header'), $headers),
            'Header',
            34,
        );

        foreach ($board as $row) {
            $rows[] = $this->row([
                $this->numberCell((int) $row['rank']),
                $this->textCell((string) $row['name']),
                $this->textCell($row['support_type'] === 'ai' ? 'هوش مصنوعی' : 'وب'),
                $row['average_rating'] === null
                    ? $this->textCell('—')
                    : $this->numberCell((float) $row['average_rating']),
                $this->numberCell((int) $row['total_ratings']),
                $this->textCell($this->formatDate($row['latest_rating_at'])),
            ]);
        }

        if ($board === []) {
            $rows[] = $this->row([$this->textCell('هنوز پشتیبانی ثبت نشده است.', 'Gold')], 'Gold', 24);
        }

        return $this->worksheet('رتبه‌بندی', $rows, [70, 180, 120, 120, 110, 150]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $details
     */
    private function detailsWorksheet(array $details): string
    {
        $headers = [
            'ردیف',
            'شناسه گفتگو',
            'دانشجو',
            'امتیاز',
            'بسته‌شده توسط',
            'وضعیت گفتگو',
            'زمان بستن',
            'زمان ثبت امتیاز',
        ];
        $rows = [
            $this->row(array_map(fn (string $header): string => $this->textCell($header, 'Header'), $headers), 'Header', 34),
        ];

        foreach ($details as $row) {
            $rows[] = $this->row([
                $this->numberCell((int) $row['index']),
                $this->numberCell((int) $row['conversation_id']),
                $this->textCell((string) $row['student']),
                $this->numberCell((int) $row['rating_value']),
                $this->textCell((string) $row['closure_actor']),
                $this->textCell((string) $row['conversation_status']),
                $this->textCell($this->formatDate($row['closed_at'])),
                $this->textCell($this->formatDate($row['submitted_at'])),
            ]);
        }

        if ($details === []) {
            $rows[] = $this->row([$this->textCell('در این بازه امتیازی ثبت نشده است.', 'Gold')], 'Gold', 24);
        }

        return $this->worksheet('جزئیات امتیازها', $rows, [
            45, 100, 170, 70, 120, 130, 140, 140,
        ]);
    }

    private function formatDate(mixed $value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return JalaliDate::formatWithTime($value);
        }

        // `CarbonImmutable::parse` روی رشته‌های غیرقابل‌تفسیر throw می‌کند و
        // کل خروجی اکسل را 500 می‌کند؛ اینجا مثل قبل فقط «—» برمی‌گردانیم.
        try {
            return JalaliDate::formatWithTime(CarbonImmutable::parse((string) $value));
        } catch (\Throwable) {
            return '—';
        }
    }
}
