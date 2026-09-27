<?php

namespace App\Http\Requests;

use App\Support\CourseTrack;
use App\Support\CourseType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class RegisterStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'min:2', 'max:120'],
            'last_name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:190', 'confirmed'],
            'course' => ['required', Rule::in(CourseType::values())],
            'track' => ['nullable', Rule::in(CourseTrack::values())],
            'sessions' => ['nullable', 'array', 'max:20'],
            'sessions.*' => ['integer', 'min:1', 'max:'.config('aiosupport.sessions_per_track')],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('course')) {
                    return;
                }

                $course = CourseType::from((string) $this->input('course'));

                if ($course !== CourseType::Offline) {
                    if ($this->hasTrackSelection()) {
                        $validator->errors()->add('track', 'انتخاب رشته فقط برای دوره آفلاین است.');
                    }

                    if ($this->hasSessionSelection()) {
                        $validator->errors()->add('sessions', 'انتخاب جلسات فقط برای دوره آفلاین است.');
                    }

                    return;
                }

                if (! $this->hasTrackSelection()) {
                    $validator->errors()->add('track', 'برای دوره آفلاین انتخاب رشته الزامی است.');
                }

                $sessions = $this->input('sessions', []);

                if (! is_array($sessions) || $sessions === []) {
                    $validator->errors()->add('sessions', 'حداقل یک جلسه را انتخاب کنید.');
                }

                if (is_array($sessions) && count(array_unique($sessions)) !== count($sessions)) {
                    $validator->errors()->add('sessions', 'جلسات انتخابی تکراری است.');
                }
            },
        ];
    }

    /**
     * فقط زمانی خطا می‌دهد که کلاینت واقعاً رشته‌ای فرستاده باشد.
     *
     * filled() برای آرایه خالی هم true است، بنابراین ارسال track: null یا
     * sessions: [] نباید به‌عنوان انتخاب تلقی شود.
     */
    private function hasTrackSelection(): bool
    {
        $track = $this->input('track');

        return is_string($track) && $track !== '';
    }

    private function hasSessionSelection(): bool
    {
        $sessions = $this->input('sessions');

        return is_array($sessions) && $sessions !== [];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'first_name.required' => 'نام الزامی است.',
            'first_name.min' => 'نام باید حداقل ۲ حرف باشد.',
            'last_name.required' => 'نام خانوادگی الزامی است.',
            'last_name.min' => 'نام خانوادگی باید حداقل ۲ حرف باشد.',
            'email.required' => 'ایمیل الزامی است.',
            'email.email' => 'قالب ایمیل معتبر نیست.',
            'email.unique' => 'این ایمیل قبلاً ثبت شده است.',
            'password.required' => 'رمز عبور الزامی است.',
            'password.min' => 'رمز عبور باید حداقل ۸ کاراکتر باشد.',
            'password.confirmed' => 'تکرار رمز عبور مطابقت ندارد.',
            'course.required' => 'انتخاب دوره الزامی است.',
            'course.in' => 'دوره انتخاب‌شده معتبر نیست.',
            'track.in' => 'رشته انتخاب‌شده معتبر نیست.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'first_name' => 'نام',
            'last_name' => 'نام خانوادگی',
            'email' => 'ایمیل',
            'password' => 'رمز عبور',
            'course' => 'دوره',
            'track' => 'رشته',
            'sessions' => 'جلسات',
        ];
    }
}
