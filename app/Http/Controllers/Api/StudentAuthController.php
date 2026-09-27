<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterStudentRequest;
use App\Models\StudentProfile;
use App\Models\User;
use App\Support\CourseTrack;
use App\Support\CourseType;
use App\Support\StudentProfilePayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class StudentAuthController extends Controller
{
    /**
     * ثبت‌نام دانشجو به‌همراه دوره، رشته و جلسات خریداری‌شده
     */
    public function register(RegisterStudentRequest $request): JsonResponse
    {
        $course = CourseType::from((string) $request->input('course'));

        [$user, $profile] = DB::transaction(function () use ($request, $course): array {
            $user = User::create([
                'name' => trim($request->input('first_name').' '.$request->input('last_name')),
                'email' => $request->input('email'),
                'password' => Hash::make($request->input('password')),
                'role' => 'student',
            ]);

            $profile = StudentProfile::create([
                'user_id' => $user->id,
                'course' => $course,
                'track' => $course === CourseType::Offline
                    ? CourseTrack::from((string) $request->input('track'))
                    : null,
                'purchased_sessions' => $course === CourseType::Offline
                    ? $this->normalizeSessions($request->input('sessions', []))
                    : null,
                'total_chats' => config('aiosupport.chat_quota.'.$course->value, 0),
                'used_chats' => 0,
                'membership_date' => now(),
            ]);

            return [$user, $profile];
        });

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'ثبت‌نام با موفقیت انجام شد.',
            'user' => $user,
            'profile' => StudentProfilePayload::make($profile),
            'token' => $token,
        ], 201);
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
