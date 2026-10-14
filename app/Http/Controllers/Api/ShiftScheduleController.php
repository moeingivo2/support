<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShiftSchedule;
use App\Models\ShiftScheduleAssignment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShiftScheduleController extends Controller
{
    /**
     * برنامه‌های شیفت.
     *
     * ناظر فقط چیزی را می‌بیند که خودش ساخته (برنامه‌ی تیم خودش)، ولی
     * سوپر ادمین همه را می‌بیند چون نظارت بر کل سازمان را دارد.
     */
    public function index(Request $request): JsonResponse
    {
        $schedules = ShiftSchedule::query()
            ->unless($request->user()->isAdmin(), fn ($query) => $query->where('created_by', $request->user()->id))
            ->when($request->filled('channel'), fn ($query) => $query->where('channel', $request->input('channel')))
            ->with(['creator:id,name', 'assignments.user:id,name,support_type'])
            ->orderByDesc('shift_date')
            ->limit(100)
            ->get();

        return response()->json(['data' => $schedules]);
    }

    /**
     * اعضای قابل انتخاب برای تقسیم شیفت.
     *
     * ادمین ‎support_type‎ ندارد، پس برخلاف ناظر باید کانال را خودش
     * انتخاب کند؛ بدون این پارامتر فهرست هر دو کانال برگردانده می‌شود.
     */
    public function team(Request $request): JsonResponse
    {
        $request->validate(['channel' => ['nullable', 'in:web,ai']]);

        $channel = $request->input('channel');

        $members = User::query()
            ->whereIn('role', ['support', 'account_observer'])
            ->when($channel !== null, fn ($query) => $query->where('support_type', $channel))
            ->orderBy('name')
            ->get(['id', 'name', 'role', 'support_type']);

        return response()->json(['data' => $members]);
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
            ->whereIn('role', ['support', 'account_observer'])
            ->where('support_type', $data['channel'])
            ->orderBy('id')->get();

        if ($supports->count() !== count($data['support_ids'])) {
            throw ValidationException::withMessages(['support_ids' => 'فهرست باید فقط شامل اعضای تیم همین نوع باشد.']);
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
            $schedule = ShiftSchedule::create([
                'created_by' => $request->user()->id,
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

    /**
     * اعضای تیم یک کانال: همه پشتیبان‌های هم‌نوع به‌علاوه‌ی ناظر اکانتِ همان
     * نوع. ناظر خودش هم عضو تیم است و باید بتواند شیفت بگیرد.
     *
     * @return Collection<int, User>
     */
    private function teamMembers(string $channel): Collection
    {
        return User::query()
            ->whereIn('role', ['support', 'account_observer'])
            ->where('support_type', $channel)
            ->orderBy('id')
            ->get(['id', 'name', 'support_type']);
    }

    /**
     * چرخش ماهانه‌ی شیفت: پیش‌نمایش تقسیم خودکار بدون ذخیره‌سازی.
     */
    public function rotationPreview(Request $request): JsonResponse
    {
        $data = $this->validateRotation($request);
        $team = $this->teamMembers($data['channel']);

        abort_if($team->isEmpty(), 422, 'برای این کانال هیچ عضو تیمی ثبت نشده است.');

        return response()->json($this->rotationPayload($data, $team));
    }

    /**
     * ذخیره‌ی چرخش ماهانه. ردیف‌هایی که با شیفت موجودِ همان عضو تداخل دارند
     * ساخته نمی‌شوند و شمارش‌شان در پاسخ برمی‌گردد.
     */
    public function rotationStore(Request $request): JsonResponse
    {
        $data = $this->validateRotation($request);
        $team = $this->teamMembers($data['channel']);

        abort_if($team->isEmpty(), 422, 'برای این کانال هیچ عضو تیمی ثبت نشده است.');

        $rows = $this->rotationPayload($data, $team);
        $createable = array_values(array_filter($rows['rows'], fn (array $row): bool => ! $row['conflict']));

        $created = count($createable);

        DB::transaction(function () use ($request, $data, $createable): void {
            foreach ($createable as $row) {
                $schedule = ShiftSchedule::create([
                    'created_by' => $request->user()->id,
                    'name' => $data['name'],
                    'channel' => $data['channel'],
                    'shift_date' => $row['shift_date'],
                    'starts_at' => $row['starts_at'].':00',
                    'ends_at' => $row['ends_at'].':00',
                ]);

                $schedule->assignments()->create([
                    'user_id' => $row['support_id'],
                    'starts_at' => $row['starts_at'].':00',
                    'ends_at' => $row['ends_at'].':00',
                ]);
            }
        });

        $skipped = count($rows['rows']) - $created;

        return response()->json([
            'message' => $skipped === 0
                ? 'چرخش شیفت ساخته و ابلاغ شد.'
                : 'چرخش شیفت ساخته شد؛ ردیف‌های تداخلی ساخته نشدند.',
            'created' => count($createable),
            'skipped' => $skipped,
            'team' => $rows['team'],
            'rows' => $rows['rows'],
        ], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateRotation(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'channel' => ['required', 'in:web,ai'],
            'starts_on' => ['required', 'date'],
            'weeks' => ['required', 'integer', 'min:1', 'max:12'],
            'slots' => ['required', 'array', 'min:1', 'max:14'],
            'slots.*.starts_at' => ['required', 'date_format:H:i'],
            'slots.*.ends_at' => ['required', 'date_format:H:i'],
        ]);

        $slots = collect($data['slots'])->sortBy('starts_at')->values();
        $previousEnd = null;

        foreach ($slots as $slot) {
            $start = $this->toMinute($slot['starts_at']);
            $end = $this->toMinute($slot['ends_at']);

            if ($end <= $start) {
                throw ValidationException::withMessages([
                    'slots' => 'پایان هر بازه باید بعد از شروع آن باشد.',
                ]);
            }

            if ($previousEnd !== null && $start < $previousEnd) {
                throw ValidationException::withMessages([
                    'slots' => 'بازه‌های شیفت نباید با هم هم‌پوشانی داشته باشند.',
                ]);
            }

            $previousEnd = $end;
        }

        $data['slots'] = $slots->all();

        return $data;
    }

    /**
     * تقسیم چرخشی: عضوِ تیم با اندیس «شماره بازه + شماره هفته» انتخاب می‌شود،
     * پس در هر هفته هر عضو یک بازه می‌گیرد و هر هفته جای بازه‌ها می‌چرخد.
     * نتیجه: با ۴ عضو و ۴ هفته، هر کدام ۴ شیفت در ۴ بازه‌ی متفاوت می‌گیرند.
     *
     * @param  array<string, mixed>  $data
     * @param  Collection<int, User>  $team
     * @return array<string, mixed>
     */
    private function rotationPayload(array $data, Collection $team): array
    {
        $teamCount = $team->count();
        $firstDate = Carbon::parse($data['starts_on'])->startOfDay();

        // بازه‌های ازپیش‌ثبت‌شده‌ی هر عضو در روزهای این چرخش، برای تشخیص تداخل.
        $booked = $this->bookedRanges($team->pluck('id')->all(), $data['starts_on'], $data['weeks']);

        $rows = [];

        for ($week = 0; $week < $data['weeks']; $week++) {
            $shiftDate = $firstDate->copy()->addWeeks($week)->toDateString();

            foreach ($data['slots'] as $slotIndex => $slot) {
                $member = $team[($slotIndex + $week) % $teamCount];
                $start = $this->toMinute($slot['starts_at']);
                $end = $this->toMinute($slot['ends_at']);
                $key = $member->id.'|'.$shiftDate;

                $conflict = false;
                foreach ($booked[$key] ?? [] as [$bookedStart, $bookedEnd]) {
                    if ($start < $bookedEnd && $bookedStart < $end) {
                        $conflict = true;
                        break;
                    }
                }

                // تداخل با ردیف‌های قبلی همین پیش‌نمایش هم بررسی می‌شود.
                $booked[$key][] = [$start, $end];

                $rows[] = [
                    'week' => $week + 1,
                    'shift_date' => $shiftDate,
                    'starts_at' => $slot['starts_at'],
                    'ends_at' => $slot['ends_at'],
                    'support_id' => $member->id,
                    'support_name' => $member->name,
                    'conflict' => $conflict,
                ];
            }
        }

        return [
            'team' => $team->map(fn (User $member): array => [
                'id' => $member->id,
                'name' => $member->name,
                'support_type' => $member->support_type,
            ])->all(),
            'weeks' => $data['weeks'],
            'slots' => $data['slots'],
            'rows' => $rows,
        ];
    }

    /**
     * ستون‌های `time` به شکل «HH:MM:SS» برمی‌گردند؛ برای محاسبه کوتاه می‌شوند.
     *
     * @param  array<int, int>  $userIds
     * @return array<string, array<int, array{int, int}>>
     */
    private function bookedRanges(array $userIds, string $startsOn, int $weeks): array
    {
        if ($userIds === []) {
            return [];
        }

        $firstDate = Carbon::parse($startsOn)->startOfDay();
        $dates = collect(range(0, $weeks - 1))
            ->map(fn (int $offset): string => $firstDate->copy()->addWeeks($offset)->toDateString())
            ->all();

        // join صریح به‌جای eager load: فقط بازه‌های همان اعضا و همان روزها
        // لازم است و شکل مقدار `time` مستقیم از خود دیتابیس خوانده می‌شود.
        // ستون `shift_date` به‌صورت «YYYY-MM-DD 00:00:00» ذخیره می‌شود، پس
        // مقایسه با `whereDate` انجام می‌شود نه `whereIn`.
        $rows = DB::table('shift_schedule_assignments as assignment')
            ->join('shift_schedules as schedule', 'schedule.id', '=', 'assignment.shift_schedule_id')
            ->whereIn('assignment.user_id', $userIds)
            ->where(function ($query) use ($dates): void {
                foreach ($dates as $date) {
                    $query->orWhereDate('schedule.shift_date', $date);
                }
            })
            ->get(['assignment.user_id', 'assignment.starts_at', 'assignment.ends_at', 'schedule.shift_date']);

        $ranges = [];

        foreach ($rows as $row) {
            $key = $row->user_id.'|'.Carbon::parse($row->shift_date)->toDateString();
            $ranges[$key][] = [
                $this->toMinute(substr($row->starts_at, 0, 5)),
                $this->toMinute(substr($row->ends_at, 0, 5)),
            ];
        }

        return $ranges;
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
