<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExportActivityReportRequest;
use App\Models\Shift;
use App\Models\User;
use App\Support\ActivityReportExcel;
use App\Support\ChatActivityReport;
use Carbon\CarbonImmutable;
use Symfony\Component\HttpFoundation\Response;

class ActivityReportController extends Controller
{
    private const MAX_EXPORTED_SHIFTS = 10000;

    public function export(
        ExportActivityReportRequest $request,
        ActivityReportExcel $excel,
    ): Response {
        $support = User::query()
            ->whereKey($request->integer('user_id'))
            ->where('role', 'support')
            ->firstOrFail();

        $from = CarbonImmutable::createFromFormat('!Y-m-d', (string) $request->input('from'));
        $to = CarbonImmutable::createFromFormat('!Y-m-d', (string) $request->input('to'))->endOfDay();

        $query = Shift::query()
            ->with('report')
            ->where('user_id', $support->id)
            ->whereBetween('start_time', [$from, $to]);

        if ((clone $query)->count() > self::MAX_EXPORTED_SHIFTS) {
            return response()->json([
                'message' => 'تعداد شیفت‌های این بازه بیش از حد مجاز است. بازه زمانی را کوتاه‌تر کنید.',
            ], 422);
        }

        $shifts = $query->orderBy('start_time')->get();
        $content = $excel->build(
            $support,
            $shifts,
            $from,
            $to,
            ChatActivityReport::forShifts($support, $shifts, $from, $to),
        );
        $filename = sprintf(
            'activity-report-%d-%s-%s.xls',
            $support->id,
            $from->format('Ymd'),
            $to->format('Ymd'),
        );

        return response($content, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => sprintf('attachment; filename="%s"', $filename),
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
            'Pragma' => 'no-cache',
        ]);
    }
}
