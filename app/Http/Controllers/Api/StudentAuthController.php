<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterStudentRequest;
use App\Models\StudentProfile;
use App\Models\User;
use App\Support\AttachmentStorage;
use App\Support\CourseTrack;
use App\Support\CourseType;
use App\Support\IranianPhone;
use App\Support\StudentProfilePayload;
use App\Support\UnsupportedAttachmentException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

/**
 * ورود دانشجو با شماره موبایل.
 *
 * امنیت خنثی: برای شماره ناموجود، شماره نامعتبر و رمز غلط، یک پاسخ یکسان
 * برگردانده می‌شود تا نه وجود حساب و نه نوع نقش لو نرود.
 */
class StudentAuthController extends Controller
{
    private const INVALID_CREDENTIALS = 'شماره موبایل یا رمز عبور اشتباه است.';

    /**
     * ثبت‌نام دانشجو به‌همراه دوره، رشته و جلسات خریداری‌شده
     */
    public function register(RegisterStudentRequest $request, AttachmentStorage $attachments): JsonResponse
    {
        $course = CourseType::from((string) $request->input('course'));
        $phone = IranianPhone::normalize((string) $request->input('phone'));

        if ($phone === null) {
            return response()->json(['message' => 'شماره موبایل معتبر نیست.'], 422);
        }

        if (User::query()->where('phone', $phone)->exists()) {
            return response()->json(['message' => 'این شماره موبایل قبلاً ثبت شده است.'], 422);
        }

        try {
            [$user, $profile] = DB::transaction(function () use ($request, $course, $phone, $attachments): array {
                $roadmapPath = $request->hasFile('roadmap')
                    ? $attachments->store($request->file('roadmap'), 'roadmaps', AttachmentStorage::ALLOWED_ROADMAP_EXTENSIONS)
                    : null;
                $user = User::create([
                    'name' => trim($request->input('first_name').' '.$request->input('last_name')),
                    'phone' => $phone,
                    'email' => null,
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
                    'roadmap_path' => $roadmapPath,
                ]);

                return [$user, $profile];
            });
        } catch (UnsupportedAttachmentException $exception) {
            return response()->json(['message' => $exception->getMessage(), 'errors' => ['roadmap' => [$exception->getMessage()]]], 422);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'ثبت‌نام با موفقیت انجام شد.',
            'user' => $user,
            'profile' => StudentProfilePayload::make($profile),
            'token' => $token,
        ], 201);
    }

    /**
     * ورود با موبایل — پاسخ خطا یکسان برای همه‌ی حالت‌های ناموفق
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $throttleKey = 'student-login:'.strtolower((string) $request->input('phone'));

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            return response()->json(['message' => 'تلاش‌های ناموفق زیاد بود. کمی بعد دوباره امتحان کنید.'], 429);
        }

        $phone = IranianPhone::normalize((string) $request->input('phone'));
        $user = $phone === null
            ? null
            : User::query()->where('phone', $phone)->where('role', 'student')->first();

        if ($user === null || ! Hash::check((string) $request->input('password'), $user->password)) {
            RateLimiter::hit($throttleKey, 60);

            return response()->json(['message' => self::INVALID_CREDENTIALS], 401);
        }

        RateLimiter::clear($throttleKey);

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('auth_token')->plainTextToken,
        ]);
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
