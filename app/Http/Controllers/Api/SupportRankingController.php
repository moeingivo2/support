<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\SupportRanking;
use App\Support\SupportRankingExcel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * رتبه‌بندی پشتیبان‌ها بر پایه‌ی امتیاز دانشجویان — فقط سوپر ادمین.
 */
class SupportRankingController extends Controller
{
    public function __construct(
        private readonly SupportRanking $ranking,
        private readonly SupportRankingExcel $excel,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->ranking->board(),
            'meta' => [
                'total_ratings' => $this->ranking->totalRatings(),
                'tie_break_rule' => SupportRanking::TIE_BREAK_RULE,
            ],
        ]);
    }

    /**
     * جزئیات امتیازهای یک پشتیبان — برای بازبینی
     */
    public function show(int $agent): JsonResponse
    {
        $row = $this->ranking->forAgent($agent);

        if ($row === null) {
            return response()->json(['message' => 'پشتیبان یافت نشد.'], 404);
        }

        return response()->json([
            'data' => $row,
            'ratings' => $this->ranking->ratingDetails($agent),
        ]);
    }

    /**
     * خروجی اکسل رتبه‌بندی پشتیبان‌ها
     */
    public function export(): Response
    {
        $board = $this->ranking->board();
        $details = [];

        foreach ($board as $row) {
            foreach ($this->ranking->ratingDetails((int) $row['support_agent_id']) as $detail) {
                $details[] = $detail;
            }
        }

        $content = $this->excel->build($board, $details);

        return response($content, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => sprintf(
                'attachment; filename="support-ranking-%s.xls"',
                now()->format('Ymd-His'),
            ),
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
            'Pragma' => 'no-cache',
        ]);
    }
}
