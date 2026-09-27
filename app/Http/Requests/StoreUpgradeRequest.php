<?php

namespace App\Http\Requests;

use App\Support\CourseTrack;
use App\Support\CourseType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreUpgradeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStudent() === true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'course' => ['required', Rule::in(CourseType::values())],
            'track' => ['nullable', Rule::in(CourseTrack::values())],
            'sessions' => ['nullable', 'array', 'max:20'],
            'sessions.*' => ['integer', 'min:1', 'max:'.config('aiosupport.sessions_per_track')],
            'extra_chats' => ['required', 'integer', 'min:1', 'max:500'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('course')) {
                    return;
                }

                if (CourseType::from((string) $this->input('course')) !== CourseType::Offline) {
                    return;
                }

                if (! $this->filled('track')) {
                    $validator->errors()->add('track', 'برای دوره آفلاین انتخاب رشته الزامی است.');
                }

                $sessions = $this->input('sessions', []);

                if (! is_array($sessions) || $sessions === []) {
                    $validator->errors()->add('sessions', 'حداقل یک جلسه را انتخاب کنید.');
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'course.required' => 'دوره درخواستی را انتخاب کنید.',
            'course.in' => 'دوره انتخاب‌شده معتبر نیست.',
            'track.in' => 'رشته انتخاب‌شده معتبر نیست.',
            'extra_chats.required' => 'تعداد چت اضافه را وارد کنید.',
            'extra_chats.min' => 'تعداد چت اضافه باید حداقل ۱ باشد.',
            'note.max' => 'توضیحات حداکثر ۱۰۰۰ کاراکتر است.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'course' => 'دوره',
            'track' => 'رشته',
            'sessions' => 'جلسات',
            'extra_chats' => 'چت اضافه',
            'note' => 'توضیحات',
        ];
    }
}
