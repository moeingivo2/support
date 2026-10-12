<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUpgradeRequest;
use App\Models\StudentProfile;
use App\Models\StudentUpgradeRequest;
use App\Support\CourseTrack;
use App\Support\CourseType;
use App\Support\StudentProfilePayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentProfileController extends Controller
{
    /**
     * اطلاعات کامل حساب دانشجو: نام، دوره، جلسات، تاریخ عضویت، منتور و سهمیه چت
     */
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => StudentProfilePayload::make($this->profile($request)),
        ]);
    }

    /**
     * ثبت درخواست ارتقای دوره یا افزایش تعداد چت
     *
     * کاربر می‌تواند همزمان چند دوره را انتخاب کند؛ برای هر دوره، رشته و
     * «نام دوره‌ای که در آن شرکت کرده» ثبت می‌شود تا پشتیبان صحتش را بسنجد.
     */
    public function upgrade(StoreUpgradeRequest $request): JsonResponse
    {
        $profile = $this->profile($request);

        $pending = StudentUpgradeRequest::query()
            ->where('student_id', $profile->user_id)
            ->where('status', 'pending')
            ->exists();

        if ($pending) {
            return response()->json([
                'message' => 'درخواست ارتقای باز شما در انتظار بررسی است.',
            ], 422);
        }

        $courses = $this->normalizeCourses($request->input('courses', []));

        StudentUpgradeRequest::create([
            'student_id' => $profile->user_id,
            'courses' => $courses,
            'extra_chats' => (int) $request->input('extra_chats'),
            'note' => $request->input('note'),
        ]);

        return response()->json([
            'message' => 'درخواست ارتقا ثبت شد و پس از تأیید اعمال می‌شود.',
            'data' => StudentProfilePayload::make($profile->fresh(['user', 'mentor'])),
        ], 201);
    }

    private function profile(Request $request): StudentProfile
    {
        $profile = StudentProfile::query()
            ->with(['user', 'mentor'])
            ->where('user_id', $request->user()->id)
            ->first();

        if ($profile === null) {
            abort(404, 'پروفایل دانشجو یافت نشد.');
        }

        return $profile;
    }

    /**
     * @param  array<int, mixed>  $items
     * @return array<int, array<string, mixed>>
     */
    private function normalizeCourses(array $items): array
    {
        $courses = [];

        foreach ($items as $item) {
            if (! is_array($item) || ! isset($item['course'])) {
                continue;
            }

            $course = CourseType::from((string) $item['course']);

            $usesTrack = $course !== CourseType::InPerson;

            $courses[] = [
                'course' => $course->value,
                'track' => $usesTrack && ! empty($item['track'])
                    ? CourseTrack::from((string) $item['track'])->value
                    : null,
                'sessions' => $usesTrack && $course === CourseType::Offline
                    ? $this->normalizeSessions($item['sessions'] ?? [])
                    : [],
                'attended_course' => isset($item['attended_course'])
                    ? trim((string) $item['attended_course'])
                    : null,
            ];
        }

        return $courses;
    }

    /**
     * @param  array<int, mixed>  $sessions
     * @return array<int, int>
     */
    private function normalizeSessions(array $sessions): array
    {
        $normalized = array_map('intval', $sessions);

        sort($normalized);

        return array_values(array_unique($normalized));
    }
}
