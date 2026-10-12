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
            'courses' => ['required', 'array', 'min:1', 'max:3'],
            'courses.*.course' => ['required', Rule::in(CourseType::values())],
            'courses.*.track' => ['nullable', Rule::in(CourseTrack::values())],
            'courses.*.sessions' => ['nullable', 'array', 'max:20'],
            'courses.*.sessions.*' => ['integer', 'min:1', 'max:'.config('aiosupport.sessions_per_track')],
            'courses.*.attended_course' => ['required', 'string', 'max:150'],
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
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $items = $this->input('courses', []);
                $seenCourses = [];

                foreach ($items as $index => $item) {
                    if (! is_array($item) || ! isset($item['course'])) {
                        continue;
                    }

                    $courseValue = (string) $item['course'];

                    if (! in_array($courseValue, CourseType::values(), true)) {
                        continue;
                    }

                    if (in_array($courseValue, $seenCourses, true)) {
                        $validator->errors()->add(
                            "courses.$index.course",
                            'هر دوره را فقط یک بار می‌توانید انتخاب کنید.',
                        );
                    }
                    $seenCourses[] = $courseValue;

                    $course = CourseType::from($courseValue);

                    // آفلاین و مدرسه هر دو رشته دارند؛ حضوری نه.
                    if ($course === CourseType::InPerson) {
                        continue;
                    }

                    if (empty($item['track'])) {
                        $validator->errors()->add(
                            "courses.$index.track",
                            "برای دوره {$course->label()} انتخاب رشته الزامی است.",
                        );
                    }

                    if ($course === CourseType::Offline
                        && (empty($item['sessions']) || ! is_array($item['sessions']))) {
                        $validator->errors()->add(
                            "courses.$index.sessions",
                            'حداقل یک جلسه را برای دوره آفلاین انتخاب کنید.',
                        );
                    }
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
            'courses.required' => 'حداقل یک دوره را انتخاب کنید.',
            'courses.min' => 'حداقل یک دوره را انتخاب کنید.',
            'courses.max' => 'حداکثر سه دوره را می‌توانید انتخاب کنید.',
            'courses.*.course.required' => 'دوره درخواستی را انتخاب کنید.',
            'courses.*.course.in' => 'دوره انتخاب‌شده معتبر نیست.',
            'courses.*.track.in' => 'رشته انتخاب‌شده معتبر نیست.',
            'courses.*.attended_course.required' => 'نام دوره‌ای که شرکت کرده‌اید را وارد کنید.',
            'courses.*.attended_course.max' => 'نام دوره حداکثر ۱۵۰ کاراکتر است.',
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
            'courses' => 'دوره‌ها',
            'extra_chats' => 'چت اضافه',
            'note' => 'توضیحات',
        ];
    }
}
