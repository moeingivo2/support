<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShiftSchedule;
use App\Models\ShiftScheduleAssignment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShiftScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $schedules = ShiftSchedule::query()
            ->where('created_by', $request->user()->id)
            ->with('assignments.user:id,name,support_type')
            ->orderByDesc('shift_date')
            ->limit(100)
            ->get();

        return response()->json(['data' => $schedules]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'channel' => ['required', 'in:web,ai'],
            'shift_date' => ['required', 'date'],
            'starts_at' => ['required', 'date_format:H:i'],
            'ends_at' => ['required', 'date_format:H:i', 'after:starts_at'],
            'support_ids' => ['required', 'array', 'min:1', 'max:100'],
            'support_ids.*' => ['required', 'integer', 'distinct', 'exists:users,id'],
        ]);

        $supports = User::query()->whereIn('id', $data['support_ids'])
            ->where('role', 'support')
            ->where('observer_id', $request->user()->id)
            ->where('support_type', $data['channel'])
            ->orderBy('id')->get();

        if ($supports->count() !== count($data['support_ids'])) {
            throw ValidationException::withMessages(['support_ids' => 'فهرست باید فقط شامل پشتیبان‌های همان نوع باشد.']);
        }

        $startMinute = $this->toMinute($data['starts_at']);
        $endMinute = $this->toMinute($data['ends_at']);
        $totalMinutes = $endMinute - $startMinute;
        if ($supports->count() > $totalMinutes) {
            throw ValidationException::withMessages(['support_ids' => 'تعداد پشتیبان‌ها از دقیقه‌های بازه بیشتر است.']);
        }
        $baseDuration = intdiv($totalMinutes, $supports->count());
        $extraMinutes = $totalMinutes % $supports->count();

        $schedule = DB::transaction(function () use ($request, $data, $supports, $startMinute, $baseDuration, $extraMinutes): ShiftSchedule {
            $observerId = $request->user()->role === 'account_observer'
                ? ($request->user()->observer_id ?? $request->user()->id)
                : $request->user()->id;
            $schedule = ShiftSchedule::create([
                'created_by' => $observerId,
                'name' => $data['name'],
                'channel' => $data['channel'],
                'shift_date' => $data['shift_date'],
                'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'],
            ]);

            $cursor = $startMinute;
            foreach ($supports as $index => $support) {
                $duration = $baseDuration + ($index < $extraMinutes ? 1 : 0);
                $next = $cursor + $duration;
                $schedule->assignments()->create([
                    'user_id' => $support->id,
                    'starts_at' => $this->fromMinute($cursor),
                    'ends_at' => $this->fromMinute($next),
                ]);
                $cursor = $next;
            }

            return $schedule;
        });

        return response()->json(['message' => 'شیفت بین پشتیبان‌ها تقسیم و ابلاغ شد.', 'data' => $schedule->load('assignments.user:id,name,support_type')], 201);
    }

    public function current(Request $request): JsonResponse
    {
        $assignment = ShiftScheduleAssignment::query()
            ->where('user_id', $request->user()->id)
            ->whereHas('schedule', fn ($query) => $query->whereDate('shift_date', now()->toDateString()))
            ->with('schedule:id,name,channel,shift_date', 'user:id,name')
            ->orderBy('starts_at')->first();

        if ($assignment && $assignment->notified_at === null) {
            $assignment->forceFill(['notified_at' => now()])->save();
        }

        return response()->json(['data' => $assignment]);
    }

    public function notification(Request $request): JsonResponse
    {
        $assignments = ShiftScheduleAssignment::query()
            ->with('schedule:id,name,channel,shift_date')
            ->where('user_id', $request->user()->id)
            ->whereHas('schedule', fn ($query) => $query->whereDate('shift_date', '>=', now()->toDateString()))
            ->orderBy('starts_at')->get();

        $pendingNotifications = $assignments->whereNull('notified_at');
        if ($pendingNotifications->isNotEmpty()) {
            ShiftScheduleAssignment::query()->whereIn('id', $pendingNotifications->pluck('id'))->update(['notified_at' => now()]);
        }

        return response()->json(['data' => $assignments]);
    }

    private function toMinute(string $time): int
    {
        [$hours, $minutes] = array_map('intval', explode(':', $time));

        return $hours * 60 + $minutes;
    }

    private function fromMinute(int $minute): string
    {
        return sprintf('%02d:%02d:00', intdiv($minute, 60), $minute % 60);
    }
}
